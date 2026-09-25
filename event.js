(function(){
  const W=1080,H=1350,DURATION=5000,POP_W=540,POP_H=300,POP_GRAB=64,BG=['#08090B','#151619','#242529','#3A3B3F','#5A5B5E','#858588','#C5C3C4'];
  const canvas=document.getElementById('eventCanvas'),ctx=canvas.getContext('2d'),$=id=>document.getElementById(id);
  const state={bg:BG[1],image:null,imageDataURL:null,brandLogo:null,arciLogo:null,footerLogos:[null,null,null],logoSources:{brandLogo:null,arciLogo:null,footerLogo0:null,footerLogo1:null,footerLogo2:null},playing:false,started:0,dir:null,recorder:null,drag:null,popups:[
    {date:'ORE 18:00',title:'ATTIVITÀ 01',description:'Descrizione e informazioni specifiche della prima attività.',partners:'',x:70,y:275},
    {date:'ORE 21:00',title:'ATTIVITÀ 02',description:'Descrizione e informazioni specifiche della seconda attività.',partners:'',x:470,y:560},
    {date:'ORE 23:00',title:'ATTIVITÀ 03',description:'Descrizione e informazioni specifiche della terza attività.',partners:'',x:150,y:845}
  ]};
  function coverImage(img,zoom=1){
    const scale=Math.max(W/img.width,H/img.height)*zoom,sw=W/scale,sh=H/scale,sx=(img.width-sw)/2,sy=(img.height-sh)/2;
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,sx,sy,sw,sh,0,0,W,H);
  }
  function ticker(text,y,direction,now){
    ctx.save();ctx.fillStyle='#050505';ctx.fillRect(0,y,W,58);ctx.font='900 27px Helvetica,Arial,sans-serif';ctx.fillStyle='#fff';ctx.textBaseline='middle';
    const unit=(text||'—')+'   ✦   ',tw=Math.max(120,ctx.measureText(unit).width),offset=((now/1000*Number($('tickerSpeed').value))%tw+tw)%tw;
    for(let x=-tw*2;x<W+tw*2;x+=tw)ctx.fillText(unit,x+(direction>0?offset:-offset),y+29);ctx.restore();
  }
  function wrappedLines(text,maxWidth){
    const paragraphs=String(text||'').split(/\n/),lines=[];
    paragraphs.forEach(paragraph=>{let line='';paragraph.split(/\s+/).filter(Boolean).forEach(word=>{const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test});if(line)lines.push(line)});
    return lines.length?lines:[''];
  }
  function wrapText(text,x,y,maxWidth,lineHeight,maxLines=Infinity){
    const lines=wrappedLines(text,maxWidth);
    lines.slice(0,maxLines).forEach((line,i)=>ctx.fillText(i===maxLines-1&&lines.length>maxLines?line.replace(/[.…]*$/,'')+'…':line,x,y+i*lineHeight));
  }
  function drawLogoImage(image,x,y,maxW,maxH){
    const scale=Math.min(maxW/image.width,maxH/image.height);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(image,x,y,image.width*scale,image.height*scale);
  }
  function drawBrand(){
    if(!$('brandOn').checked)return;
    ctx.save();
    if(state.brandLogo)drawLogoImage(state.brandLogo,55,76,610,64);
    else{
      ctx.textAlign='left';ctx.textBaseline='top';ctx.font='900 42px Helvetica,Arial,sans-serif';
      ctx.fillStyle='#ff61b6';ctx.fillText('EX CASA DEL CUSTODE',61,85);
      ctx.lineJoin='round';ctx.strokeStyle='#050505';ctx.lineWidth=5;ctx.strokeText('EX CASA DEL CUSTODE',55,79);
      ctx.fillStyle='#ffffff';ctx.fillText('EX CASA DEL CUSTODE',55,79);
    }
    if(state.arciLogo)drawLogoImage(state.arciLogo,930,71,96,96);
    else{ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='76px Helvetica,Arial,sans-serif';ctx.fillStyle='#ffffff';ctx.fillText('★',980,118)}
    ctx.restore();
  }
  function drawCredits(){
    if(!$('brandOn').checked)return;
    ctx.save();
    const labels=['ASAP','CUSTODIA','BOLOGNA'];
    state.footerLogos.forEach((image,i)=>{
      const cx=740+i*135,cy=1256,size=112;
      if($('logoBg').value==='white'){ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(cx,cy,size/2,0,Math.PI*2);ctx.fill()}
      if(image){
        const max=$('logoBg').value==='white'?size*.72:size*.92,scale=Math.min(max/image.width,max/image.height);
        ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,cx-image.width*scale/2,cy-image.height*scale/2,image.width*scale,image.height*scale);
      }else{ctx.fillStyle=$('logoBg').value==='white'?'#050505':'#ffffff';ctx.font='900 14px Helvetica,Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(labels[i],cx,cy)}
    });
    ctx.restore();
  }
  function drawCopyright(){
    if(!$('brandOn').checked)return;
    ctx.save();ctx.textBaseline='bottom';ctx.textAlign='left';ctx.font='12px Helvetica,Arial,sans-serif';ctx.fillStyle='#ffffff';
    ctx.fillText($('copyright').value||'',55,$('tickerOn').checked?H-72:H-26);ctx.restore();
  }
  function eventHeader(now,forceFinal){
    const title=String($('eventTitle').value||''),date=String($('eventDate').value||'').trim(),titleColor=$('eventTitleColor').value||'#ffffff';
    const size=Number($('eventTitleSize').value)||56,mode=$('eventTitleAnimation').value,local=state.playing&&!forceFinal?Math.max(0,now-state.started):now;
    const x=55,y=$('brandOn').checked?147:82,maxWidth=W-110,lineHeight=Math.round(size*1.09);
    ctx.save();ctx.textAlign='left';ctx.textBaseline='top';ctx.font=`italic ${size}px "Times New Roman",Georgia,serif`;
    const titleLines=wrappedLines(title,maxWidth).slice(0,3);
    const ease=t=>1-Math.pow(1-Math.max(0,Math.min(1,t)),3);
    let dx=0,dy=0,rotation=0,scale=1;
    if(mode==='float')dy=Math.sin(local/520)*12;
    else if(mode==='shake'){dx=Math.sin(local*.095)*7;dy=Math.sin(local*.137)*4;rotation=Math.sin(local*.081)*.018}
    else if(mode==='pulse')scale=1+Math.sin(local/300)*.075;
    else if(mode==='slide'&&state.playing&&!forceFinal)dx=(-W-110)*(1-ease(local/850));
    else if(mode==='spin')rotation=Math.sin(local/620)*.13;
    ctx.translate(x+dx,y+dy);ctx.rotate(rotation);ctx.scale(scale,scale);ctx.fillStyle=titleColor;
    const allText=titleLines.join('\n');let visible=state.playing&&!forceFinal&&mode==='type'?Math.floor(local/75):allText.length;
    titleLines.forEach((line,index)=>{
      const shown=[...line].slice(0,Math.max(0,visible)).join('');visible-=line.length+1;
      if(mode==='wave'){
        let charX=0;[...shown].forEach((char,i)=>{ctx.fillText(char,charX,index*lineHeight+Math.sin(local/230+i*.7)*13);charX+=ctx.measureText(char).width});
      }else ctx.fillText(shown,0,index*lineHeight);
    });
    ctx.restore();
    if(date){
      ctx.save();
      ctx.font='900 22px Helvetica,Arial,sans-serif';const pillW=Math.max(98,ctx.measureText(date).width+38),pillH=44,pillX=x,pillY=y+Math.max(1,titleLines.length)*lineHeight+14;
      ctx.fillStyle='#dfff00';ctx.strokeStyle='#050505';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(pillX,pillY,pillW,pillH,pillH/2);ctx.fill();ctx.stroke();ctx.fillStyle='#050505';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(date,pillX+pillW/2,pillY+pillH/2+1);
      ctx.restore();
    }
  }
  function popupMetrics(item){
    const w=POP_W,partnerText=String(item.partners||'').trim();ctx.save();ctx.font='900 40px Helvetica,Arial,sans-serif';const titleLines=wrappedLines(item.title,w-64).length;ctx.font='21px Helvetica,Arial,sans-serif';const descriptionLines=wrappedLines(item.description,w-64).length;ctx.font='900 15px Helvetica,Arial,sans-serif';const partnerLines=partnerText?wrappedLines(partnerText,w-64).length:0;ctx.restore();
    const titleHeight=Math.max(1,titleLines)*44,descriptionY=99+titleHeight+24,bottomSpace=partnerLines?partnerLines*20+37:24,naturalHeight=descriptionY+Math.max(1,descriptionLines)*28+bottomSpace;
    const baseHeight=partnerLines?POP_H:POP_H-35;
    return{w,h:Math.min(H-116,Math.max(baseHeight,naturalHeight)),titleLines,titleHeight,descriptionY,partnerLines,bottomSpace};
  }
  function popup(item,progress){
    const eased=1-Math.pow(1-Math.max(0,Math.min(1,progress)),3),metrics=popupMetrics(item),w=metrics.w,h=metrics.h,x=item.x,y=item.y;
    ctx.save();ctx.translate(x+w/2,y+h/2);const popupScale=.86+.14*eased;ctx.scale(popupScale,popupScale);ctx.translate(-(x+w/2),-(y+h/2));ctx.globalAlpha=eased;
    ctx.fillStyle='#F5F5F7';ctx.beginPath();ctx.roundRect(x,y,w,h,16);ctx.fill();
    ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,16);ctx.clip();ctx.fillStyle='#ECECEF';ctx.fillRect(x,y,w,42);ctx.restore();
    ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y+42);ctx.lineTo(x+w,y+42);ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,.42)';[x+20,x+38,x+56].forEach(px=>{ctx.beginPath();ctx.arc(px,y+21,6,0,Math.PI*2);ctx.fill()});
    ctx.fillStyle='#050505';ctx.textAlign='left';ctx.textBaseline='top';ctx.font='17px Helvetica,Arial,sans-serif';ctx.fillText(item.date,x+32,y+62);
    ctx.font='900 40px Helvetica,Arial,sans-serif';wrapText(item.title,x+32,y+99,w-64,44,metrics.titleLines);
    ctx.font='21px Helvetica,Arial,sans-serif';const descriptionMax=Math.max(1,Math.floor((h-metrics.descriptionY-metrics.bottomSpace)/28));wrapText(item.description,x+32,y+metrics.descriptionY,w-64,28,descriptionMax);
    if(metrics.partnerLines){ctx.font='900 15px Helvetica,Arial,sans-serif';ctx.fillStyle='#ff61b6';wrapText(String(item.partners).trim(),x+32,y+h-43-(metrics.partnerLines-1)*20,w-64,20,metrics.partnerLines)}
    ctx.restore();
  }
  function renderFrame(now,forceFinal=false){
    const elapsed=state.playing?now-state.started:DURATION;
    ctx.fillStyle=state.bg;ctx.fillRect(0,0,W,H);if(state.image)coverImage(state.image,state.playing?1+Math.min(elapsed,DURATION)/DURATION*.025:1);
    ctx.fillStyle=`rgba(0,0,0,${Number($('overlay').value)})`;ctx.fillRect(0,0,W,H);drawBrand();eventHeader(now,forceFinal);drawCredits();state.popups.forEach((item,index)=>popup(item,forceFinal?1:Math.max(0,Math.min(1,(elapsed-550-index*250)/500))));
    if($('tickerOn').checked){ticker($('tickerTop').value,0,1,now);ticker($('tickerBottom').value,H-58,-1,now)}
    drawCopyright();
    if(state.playing&&elapsed>=DURATION){state.playing=false;$('play').textContent='▶ PLAY SEQUENZA';$('status').textContent='✓ FINE 5 SEC'}
  }
  function loop(now){renderFrame(now);requestAnimationFrame(loop)}
  function outputCanvas(story=false){renderFrame(performance.now(),true);const out=document.createElement('canvas');out.width=2160;out.height=story?3840:2700;const ox=out.getContext('2d');ox.imageSmoothingEnabled=true;ox.imageSmoothingQuality='high';ox.fillStyle=state.bg;ox.fillRect(0,0,out.width,out.height);ox.drawImage(canvas,0,story?570:0,2160,2700);return out}
  async function saveBlob(blob,name){if(state.dir){const file=await state.dir.getFileHandle(name,{create:true}),writer=await file.createWritable();await writer.write(blob);await writer.close();return}const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1800)}
  function eventPackage(){return{type:'ex-casa-post03-package',version:1,savedAt:new Date().toISOString(),data:{bg:state.bg,eventTitle:$('eventTitle').value,eventDate:$('eventDate').value,eventTitleColor:$('eventTitleColor').value,eventTitleSize:$('eventTitleSize').value,eventTitleAnimation:$('eventTitleAnimation').value,brandOn:$('brandOn').checked,logoBg:$('logoBg').value,copyright:$('copyright').value,overlay:$('overlay').value,tickerOn:$('tickerOn').checked,tickerTop:$('tickerTop').value,tickerBottom:$('tickerBottom').value,tickerSpeed:$('tickerSpeed').value,popups:state.popups.map(item=>({...item}))},assets:{background:state.imageDataURL,logos:{...state.logoSources}}}}
  async function saveJSON(){const blob=new Blob([JSON.stringify(eventPackage(),null,2)],{type:'application/json'});await saveBlob(blob,`ex-casa-post03-event-${Date.now()}.json`);$('status').textContent='✓ JSON SALVATO'}
  function loadBackgroundSource(src){return new Promise((resolve,reject)=>{if(!src){state.image=null;state.imageDataURL=null;resolve();return}const image=new Image();image.onload=()=>{state.image=image;state.imageDataURL=src;resolve()};image.onerror=reject;image.src=src})}
  function loadLogoSource(id,src){
    const assign=image=>{state.logoSources[id]=src||null;if(id==='brandLogo')state.brandLogo=image;else if(id==='arciLogo')state.arciLogo=image;else state.footerLogos[Number(id.slice(-1))]=image};
    return new Promise((resolve,reject)=>{
      if(!src){assign(null);resolve();return}
      const image=new Image();image.onload=()=>{assign(image);resolve()};image.onerror=reject;image.src=src;
    });
  }
  function loadJSONFile(file){if(!file)return;const reader=new FileReader();reader.onload=async()=>{try{const pkg=JSON.parse(reader.result);if(pkg?.type!=='ex-casa-post03-package'||!pkg.data)throw new Error('JSON POST 03 non riconosciuto');const d=pkg.data;state.bg=BG.includes(d.bg)?d.bg:state.bg;$('eventTitle').value=String(d.eventTitle??'');$('eventDate').value=String(d.eventDate??'');$('eventTitleColor').value=d.eventTitleColor||'#ffffff';$('eventTitleSize').value=String(Math.max(24,Math.min(120,Number(d.eventTitleSize)||56)));$('eventTitleSizeValue').textContent=$('eventTitleSize').value;$('eventTitleAnimation').value=['float','static','wave','shake','pulse','type','slide','spin'].includes(d.eventTitleAnimation)?d.eventTitleAnimation:'float';$('brandOn').checked=d.brandOn!==false;$('logoBg').value=d.logoBg==='white'?'white':'none';$('copyright').value=String(d.copyright??'ASAP RAT ENGINE');$('overlay').value=String(d.overlay??'0.2');$('tickerOn').checked=d.tickerOn!==false;$('tickerTop').value=String(d.tickerTop??'');$('tickerBottom').value=String(d.tickerBottom??'');$('tickerSpeed').value=String(d.tickerSpeed??'85');if(Array.isArray(d.popups)&&d.popups.length)state.popups=d.popups.map(item=>({...item}));await loadBackgroundSource(pkg.assets?.background||null);await Promise.all(Object.keys(state.logoSources).map(id=>loadLogoSource(id,pkg.assets?.logos?.[id]||null)));renderPopupEditors();$('backgroundImage').value='';Object.keys(state.logoSources).forEach(id=>$(id).value='');$('status').textContent='✓ JSON CARICATO'}catch(error){console.error(error);$('status').textContent='ERRORE JSON';alert(error.message||'File JSON non valido')}};reader.readAsText(file)}
  function savePNG(story){const out=outputCanvas(story);out.toBlob(async blob=>{await saveBlob(blob,`ex-casa-post03-${story?'story-9x16':'post-4x5'}-${Date.now()}.png`);$('status').textContent=`✓ PNG ${story?'STORY 2160×3840':'POST 2160×2700'} · ${(blob.size/1024/1024).toFixed(1)} MB`;out.width=out.height=1},'image/png')}
  function popupField(label,key,item,multiline=false){
    const field=document.createElement('div'),caption=document.createElement('label'),input=document.createElement(multiline?'textarea':'input');
    field.className='field';caption.textContent=label;input.value=item[key];input.addEventListener('input',()=>{item[key]=input.value;fitPopup(item)});field.append(caption,input);return field;
  }
  function renderPopupEditors(){
    const list=$('popupList');list.replaceChildren();state.popups.forEach((item,index)=>{
      const card=document.createElement('div'),head=document.createElement('div'),name=document.createElement('span'),remove=document.createElement('button');
      card.className='popup-card';head.className='popup-card-head';name.textContent=`ATTIVITÀ ${String(index+1).padStart(2,'0')}`;remove.className='popup-remove';remove.type='button';remove.textContent='RIMUOVI';remove.disabled=state.popups.length===1;remove.onclick=()=>{if(state.popups.length>1){state.popups.splice(index,1);renderPopupEditors()}};head.append(name,remove);card.append(head,popupField('Orario / data attività','date',item),popupField('Titolo attività','title',item,true),popupField('Descrizione','description',item,true),popupField('Partners','partners',item));list.appendChild(card);
    });
  }
  function canvasPoint(event){const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*W/rect.width,y:(event.clientY-rect.top)*H/rect.height}}
  function fitPopup(item){const metrics=popupMetrics(item);item.x=Math.max(-metrics.w+POP_GRAB,Math.min(W-POP_GRAB,item.x));item.y=Math.max(-metrics.h+POP_GRAB,Math.min(H-POP_GRAB,item.y))}
  canvas.addEventListener('pointerdown',event=>{const point=canvasPoint(event);for(let i=state.popups.length-1;i>=0;i--){const item=state.popups[i],metrics=popupMetrics(item);if(point.x>=item.x&&point.x<=item.x+metrics.w&&point.y>=item.y&&point.y<=item.y+metrics.h){state.drag={item,dx:point.x-item.x,dy:point.y-item.y};canvas.setPointerCapture(event.pointerId);canvas.classList.add('dragging');event.preventDefault();break}}});
  canvas.addEventListener('pointermove',event=>{if(!state.drag)return;const point=canvasPoint(event),item=state.drag.item;item.x=point.x-state.drag.dx;item.y=point.y-state.drag.dy;fitPopup(item)});
  function stopDrag(event){if(!state.drag)return;state.drag=null;canvas.classList.remove('dragging');if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId)}
  canvas.addEventListener('pointerup',stopDrag);canvas.addEventListener('pointercancel',stopDrag);
  $('addPopup').onclick=()=>{const index=state.popups.length,offset=(index%5)*38;state.popups.push({date:'ORE 00:00',title:`ATTIVITÀ ${String(index+1).padStart(2,'0')}`,description:'Descrizione e informazioni specifiche dell’attività.',partners:'',x:(W-POP_W)/2+offset,y:300+offset});renderPopupEditors();$('panel').scrollTop=$('popupList').offsetTop+$('popupList').offsetHeight};
  $('play').onclick=()=>{state.playing=!state.playing;state.started=performance.now();$('play').textContent=state.playing?'■ STOP':'▶ PLAY SEQUENZA'};
  $('rec').onclick=async()=>{if(state.recorder)return;try{state.playing=true;state.started=performance.now();$('play').textContent='■ STOP';$('status').textContent='● MP4 H.264 · 2160×2700 · 5 SEC';state.recorder=IGExport.startMP4({canvas,scale:2,duration:DURATION,onProgress:p=>$('status').textContent=`● MP4 H.264 · ${Math.round(p*100)}%`});const blob=await state.recorder.promise;await saveBlob(blob,`ex-casa-post03-animation-${Date.now()}.mp4`);$('status').textContent=`✓ MP4 POST 2160×2700 · ${(blob.size/1024/1024).toFixed(1)} MB`}catch(error){if(error.name!=='AbortError'){console.error(error);$('status').textContent=`MP4 ERROR · ${error.message||error}`}}finally{state.recorder=null;state.playing=false;$('play').textContent='▶ PLAY SEQUENZA'}};
  $('save').onclick=()=>savePNG(false);$('saveStory').onclick=()=>savePNG(true);$('saveJSON').onclick=saveJSON;$('loadJSON').onclick=()=>$('loadJSONFile').click();$('loadJSONFile').onchange=event=>{loadJSONFile(event.target.files&&event.target.files[0]);event.target.value=''};
  $('folder').onclick=async()=>{if(!window.showDirectoryPicker){$('status').textContent='OUTPUT: DOWNLOADS';return}try{state.dir=await showDirectoryPicker({mode:'readwrite'});$('folderName').value=state.dir.name||'CARTELLA SELEZIONATA';$('status').textContent='OUTPUT: '+state.dir.name}catch(error){if(error.name!=='AbortError')console.error(error)}};
  $('backgroundImage').onchange=e=>{const file=e.target.files&&e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=async()=>{try{await loadBackgroundSource(reader.result);$('status').textContent='✓ BACKGROUND CARICATO'}catch(error){console.error(error);$('status').textContent='ERRORE BACKGROUND'}};reader.readAsDataURL(file)};
  $('removeImage').onclick=()=>{state.image=null;state.imageDataURL=null;$('backgroundImage').value='';$('status').textContent='BACKGROUND RIMOSSO'};
  Object.keys(state.logoSources).forEach(id=>{
    $(id).onchange=event=>{
      const file=event.target.files&&event.target.files[0];if(!file)return;
      const reader=new FileReader();reader.onload=async()=>{try{await loadLogoSource(id,reader.result);$('status').textContent='✓ LOGO CARICATO'}catch(error){console.error(error);$('status').textContent='ERRORE LOGO'}};reader.readAsDataURL(file);
    };
  });
  document.querySelectorAll('.clear-logo').forEach(button=>button.onclick=()=>{const id=button.dataset.logo;loadLogoSource(id,null);$(id).value='';$('status').textContent='LOGO RIMOSSO'});
  BG.forEach(color=>{const button=document.createElement('button');button.className='swatch';button.style.background=color;button.title=color;button.onclick=()=>state.bg=color;$('palette').appendChild(button)});
  $('eventTitleSize').oninput=()=>{$('eventTitleSizeValue').textContent=$('eventTitleSize').value};
  renderPopupEditors();
  requestAnimationFrame(loop);
})();
