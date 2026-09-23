(function(global){
  const DEFAULT_FPS=30,DEFAULT_BITRATE=10000000;
  function nativeMP4Mime(canvas){
    if(!global.MediaRecorder||!canvas.captureStream)return null;
    const types=['video/mp4;codecs=avc1.42E01E','video/mp4;codecs=avc1','video/mp4;codecs=h264','video/mp4'];
    return types.find(type=>{try{return MediaRecorder.isTypeSupported(type)}catch(error){return false}})||null;
  }
  function startNativeMP4(options,mime){
    const canvas=options.canvas,duration=Math.max(1,Number(options.duration)||5000),fps=options.fps||DEFAULT_FPS,bitrate=options.bitrate||DEFAULT_BITRATE;
    let recorder=null,stream=null,timer=0,raf=0,settled=false,rejectPromise=null;
    const promise=new Promise((resolve,reject)=>{
      rejectPromise=reject;
      try{
        stream=canvas.captureStream(fps);
        const chunks=[];
        recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:bitrate});
        recorder.ondataavailable=event=>{if(event.data&&event.data.size)chunks.push(event.data)};
        recorder.onerror=event=>{if(settled)return;settled=true;reject(event.error||new Error('Errore encoder MP4 nativo'))};
        recorder.onstop=()=>{
          if(settled)return;
          settled=true;cancelAnimationFrame(raf);stream.getTracks().forEach(track=>track.stop());
          const blob=new Blob(chunks,{type:'video/mp4'});
          if(blob.size<1024)reject(new Error('MP4 vuoto'));else resolve(blob);
        };
        const started=performance.now();
        const progress=now=>{if(settled)return;if(options.onProgress)options.onProgress(Math.min(1,(now-started)/duration));raf=requestAnimationFrame(progress)};
        recorder.start(250);raf=requestAnimationFrame(progress);
        timer=setTimeout(()=>{if(recorder&&recorder.state!=='inactive')recorder.stop()},duration);
      }catch(error){settled=true;if(stream)stream.getTracks().forEach(track=>track.stop());reject(error)}
    });
    const cancel=()=>{if(settled)return;settled=true;clearTimeout(timer);cancelAnimationFrame(raf);if(recorder&&recorder.state!=='inactive'){recorder.onstop=null;recorder.stop()}if(stream)stream.getTracks().forEach(track=>track.stop());if(rejectPromise)rejectPromise(new DOMException('Export annullato','AbortError'))};
    return{promise,cancel,encoder:'mediarecorder'};
  }
  async function pickConfig(width,height,fps,bitrate){
    if(!global.VideoEncoder||!global.VideoFrame)throw new Error('Questo browser non supporta export MP4 H.264');
    const codecs=['avc1.640032','avc1.4d0032','avc1.42002a'];
    for(const codec of codecs){
      const config={codec,width,height,framerate:fps,bitrate,latencyMode:'quality',avc:{format:'annexb'}};
      try{const result=await VideoEncoder.isConfigSupported(config);if(result.supported)return result.config}catch(error){}
    }
    throw new Error('Encoder H.264 non disponibile in questo browser');
  }
  function annexBUnits(data){
    const starts=[];
    for(let i=0;i<data.length-3;i++){
      if(data[i]===0&&data[i+1]===0&&data[i+2]===1){starts.push({at:i,size:3});i+=2}
      else if(i<data.length-4&&data[i]===0&&data[i+1]===0&&data[i+2]===0&&data[i+3]===1){starts.push({at:i,size:4});i+=3}
    }
    if(!starts.length)return[];
    return starts.map((start,index)=>data.slice(start.at+start.size,index+1<starts.length?starts[index+1].at:data.length)).filter(unit=>unit.length);
  }
  function avccSample(units){
    const size=units.reduce((sum,unit)=>sum+4+unit.length,0),out=new Uint8Array(size);let offset=0;
    units.forEach(unit=>{const n=unit.length;out[offset++]=(n>>>24)&255;out[offset++]=(n>>>16)&255;out[offset++]=(n>>>8)&255;out[offset++]=n&255;out.set(unit,offset);offset+=n});
    return out;
  }
  function avcDescription(sps,pps){
    const out=new Uint8Array(11+sps.length+pps.length);let i=0;
    out[i++]=1;out[i++]=sps[1]||66;out[i++]=sps[2]||0;out[i++]=sps[3]||42;out[i++]=255;out[i++]=225;
    out[i++]=(sps.length>>>8)&255;out[i++]=sps.length&255;out.set(sps,i);i+=sps.length;out[i++]=1;out[i++]=(pps.length>>>8)&255;out[i++]=pps.length&255;out.set(pps,i);
    return out;
  }
  function safeDecoderMeta(meta,units,config,width,height){
    const supplied=meta&&meta.decoderConfig;
    if(supplied){return{...meta,decoderConfig:{...supplied,colorSpace:supplied.colorSpace||{primaries:'bt709',transfer:'bt709',matrix:'bt709',fullRange:false}}}}
    const sps=units.find(unit=>(unit[0]&31)===7),pps=units.find(unit=>(unit[0]&31)===8);
    if(!sps||!pps)return meta;
    return{decoderConfig:{codec:config.codec,codedWidth:width,codedHeight:height,description:avcDescription(sps,pps),colorSpace:{primaries:'bt709',transfer:'bt709',matrix:'bt709',fullRange:false}}};
  }
  function startMP4(options){
    const nativeMime=nativeMP4Mime(options.canvas);
    if(nativeMime)return startNativeMP4(options,nativeMime);
    const canvas=options.canvas,duration=Math.max(1,Number(options.duration)||5000),fps=options.fps||DEFAULT_FPS,bitrate=options.bitrate||DEFAULT_BITRATE;
    let cancelled=false,raf=0;
    const cancel=()=>{cancelled=true;if(raf)cancelAnimationFrame(raf)};
    const promise=(async()=>{
      if(!global.Mp4Muxer)throw new Error('Modulo MP4 non caricato');
      const width=canvas.width,height=canvas.height,config=await pickConfig(width,height,fps,bitrate);
      const target=new Mp4Muxer.ArrayBufferTarget();
      const muxer=new Mp4Muxer.Muxer({target,video:{codec:'avc',width,height,frameRate:fps},fastStart:'in-memory',firstTimestampBehavior:'offset'});
      let encoderError=null;
      const encoder=new VideoEncoder({output:(chunk,meta)=>{try{const raw=new Uint8Array(chunk.byteLength);chunk.copyTo(raw);const units=annexBUnits(raw),data=units.length?avccSample(units):raw,safeMeta=safeDecoderMeta(meta,units,config,width,height);muxer.addVideoChunkRaw(data,chunk.type,chunk.timestamp,chunk.duration||frameDuration,safeMeta)}catch(error){encoderError=error}},error:error=>{encoderError=error}});
      encoder.configure(config);
      const started=performance.now(),frameDuration=Math.round(1000000/fps),total=Math.ceil(duration/1000*fps);
      let frameIndex=0;
      await new Promise((resolve,reject)=>{
        const capture=now=>{
          if(cancelled){reject(new DOMException('Export annullato','AbortError'));return}
          if(encoderError){reject(encoderError);return}
          const expected=Math.min(total,Math.floor((now-started)/1000*fps)+1);
          while(frameIndex<expected){
            const frame=new VideoFrame(canvas,{timestamp:frameIndex*frameDuration,duration:frameDuration});
            encoder.encode(frame,{keyFrame:frameIndex%(fps*2)===0});frame.close();frameIndex++;
          }
          if(frameIndex>=total){resolve();return}
          if(options.onProgress)options.onProgress(frameIndex/total);
          raf=requestAnimationFrame(capture);
        };
        raf=requestAnimationFrame(capture);
      });
      await encoder.flush();encoder.close();muxer.finalize();
      const blob=new Blob([target.buffer],{type:'video/mp4'});
      if(blob.size<1024)throw new Error('MP4 vuoto');
      return blob;
    })();
    return {promise,cancel,encoder:'webcodecs'};
  }
  global.IGExport={startMP4};
})(window);
