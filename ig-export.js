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
      const config={codec,width,height,framerate:fps,bitrate,latencyMode:'quality',avc:{format:'avc'}};
      try{const result=await VideoEncoder.isConfigSupported(config);if(result.supported)return result.config}catch(error){}
    }
    throw new Error('Encoder H.264 non disponibile in questo browser');
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
      const muxer=new Mp4Muxer.Muxer({target,video:{codec:'avc',width,height,frameRate:fps},fastStart:'in-memory'});
      let encoderError=null;
      const encoder=new VideoEncoder({output:(chunk,meta)=>muxer.addVideoChunk(chunk,meta),error:error=>{encoderError=error}});
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
