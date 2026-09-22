(function(){
  const W=1080,H=1350,DURATION=5000,POP_W=780,POP_H=520,BG=['#08090B','#151619','#242529','#3A3B3F','#5A5B5E','#858588','#C5C3C4'];
  const canvas=document.getElementById('eventCanvas'),ctx=canvas.getContext('2d'),$=id=>document.getElementById(id);
  const state={bg:BG[1],image:null,imageURL:null,playing:false,started:0,dir:null,recorder:null,drag:null,popups:[{date:'12.03.2027',title:'TITOLO DELL’EVENTO',description:'Descrizione dell’evento, programma, orari e informazioni specifiche.',partners:'PARTNERS / COLLABORAZIONI',x:(W-POP_W)/2,y:355}]};
  function coverImage(img,zoom=1){
    const scale=Math.max(W/img.width,H/img.height)*zoom,sw=W/scale,sh=H/scale,sx=(img.width-sw)/2,sy=(img.height-sh)/2;
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,sx,sy,sw,sh,0,0,W,H);
  }
  function ticker(text,y,direction,now){
    ctx.save();ctx.fillStyle='#050505';ctx.fillRect(0,y,W,58);ctx.font='900 27px Helvetica,Arial,sans-serif';ctx.fillStyle='#fff';ctx.textBaseline='middle';
    const unit=(text||'—')+'   ✦   ',tw=Math.max(120,ctx.measureText(unit).width),offset=((now/1000*Number($('tickerSpeed').value))%tw+tw)%tw;
    for(let x=-tw*2;x<W+tw*2;x+=tw)ctx.fillText(unit,x+(direction>0?offset:-offset),y+29);ctx.restore();
  }
  function wrapText(text,x,y,maxWidth,lineHeight,maxLines){
    const paragraphs=String(text||'').split(/\n/),lines=[];
    paragraphs.forEach(paragraph=>{let line='';paragraph.split(/\s+/).filter(Boolean).forEach(word=>{const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test});if(line)lines.push(line)});
    lines.slice(0,maxLines).forEach((line,i)=>ctx.fillText(i===maxLines-1&&lines.length>maxLines?line.replace(/[.…]*$/,'')+'…':line,x,y+i*lineHeight));
  }
  function popup(item,progress){
    const eased=1-Math.pow(1-Math.max(0,Math.min(1,progress)),3),w=POP_W,h=POP_H,x=item.x,y=item.y;
    ctx.save();ctx.translate(x+w/2,y+h/2);const popupScale=.86+.14*eased;ctx.scale(popupScale,popupScale);ctx.translate(-(x+w/2),-(y+h/2));ctx.globalAlpha=eased;
    ctx.fillStyle='#F5F5F7';ctx.strokeStyle='#050505';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(x,y,w,h,20);ctx.fill();ctx.stroke();
    ctx.fillStyle='#ECECEF';ctx.beginPath();ctx.roundRect(x,y,w,52,[20,20,0,0]);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,.42)';[x+25,x+47,x+69].forEach(px=>{ctx.beginPath();ctx.arc(px,y+26,7,0,Math.PI*2);ctx.fill()});
    ctx.fillStyle='#050505';ctx.textAlign='left';ctx.textBaseline='top';ctx.font='20px Helvetica,Arial,sans-serif';ctx.fillText(item.date,x+42,y+88);
    ctx.font='900 58px Helvetica,Arial,sans-serif';wrapText(item.title,x+42,y+128,w-84,62,2);
    ctx.font='25px Helvetica,Arial,sans-serif';wrapText(item.description,x+42,y+270,w-84,34,5);
    ctx.font='900 18px Helvetica,Arial,sans-serif';ctx.fillStyle='#ff61b6';ctx.fillText('PARTNERS',x+42,y+h-72);ctx.fillStyle='#050505';ctx.fillText(item.partners,x+150,y+h-72);
    ctx.restore();
  }
  function renderFrame(now,forceFinal=false){
    const elapsed=state.playing?now-state.started:DURATION;
    ctx.fillStyle=state.bg;ctx.fillRect(0,0,W,H);if(state.image)coverImage(state.image,state.playing?1+Math.min(elapsed,DURATION)/DURATION*.025:1);
    ctx.fillStyle=`rgba(0,0,0,${Number($('overlay').value)})`;ctx.fillRect(0,0,W,H);state.popups.forEach((item,index)=>popup(item,forceFinal?1:Math.max(0,Math.min(1,(elapsed-550-index*250)/500))));
    if($('tickerOn').checked){ticker($('tickerTop').value,0,1,now);ticker($('tickerBottom').value,H-58,-1,now)}
    if(state.playing&&elapsed>=DURATION){state.playing=false;$('play').textContent='▶ PLAY SEQUENZA';$('status').textContent='✓ FINE 5 SEC'}
  }
  function loop(now){renderFrame(now);requestAnimationFrame(loop)}
  function outputCanvas(story=false){renderFrame(performance.now(),true);if(!story){const out=document.createElement('canvas');out.width=W;out.height=H;out.getContext('2d').drawImage(canvas,0,0);return out}const out=document.createElement('canvas');out.width=1080;out.height=1920;const ox=out.getContext('2d');ox.fillStyle=state.bg;ox.fillRect(0,0,out.width,out.height);ox.drawImage(canvas,0,(1920-H)/2);return out}
  async function saveBlob(blob,name){if(state.dir){const file=await state.dir.getFileHandle(name,{create:true}),writer=await file.createWritable();await writer.write(blob);await writer.close();return}const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1800)}
  function savePNG(story){const out=outputCanvas(story);out.toBlob(async blob=>{await saveBlob(blob,`ex-casa-post03-${story?'story-9x16':'post-4x5'}-${Date.now()}.png`);$('status').textContent=`✓ PNG ${story?'STORY 1080×1920':'POST 1080×1350'} · ${(blob.size/1024/1024).toFixed(1)} MB`;out.width=out.height=1},'image/png')}
  function popupField(label,key,item,multiline=false){
    const field=document.createElement('div'),caption=document.createElement('label'),input=document.createElement(multiline?'textarea':'input');
    field.className='field';caption.textContent=label;input.value=item[key];input.addEventListener('input',()=>item[key]=input.value);field.append(caption,input);return field;
  }
  function renderPopupEditors(){
    const list=$('popupList');list.replaceChildren();state.popups.forEach((item,index)=>{
      const card=document.createElement('div'),head=document.createElement('div'),name=document.createElement('span'),remove=document.createElement('button');
      card.className='popup-card';head.className='popup-card-head';name.textContent=`POPUP ${String(index+1).padStart(2,'0')}`;remove.className='popup-remove';remove.type='button';remove.textContent='RIMUOVI';remove.disabled=state.popups.length===1;remove.onclick=()=>{if(state.popups.length>1){state.popups.splice(index,1);renderPopupEditors()}};head.append(name,remove);card.append(head,popupField('Data','date',item),popupField('Titolo','title',item),popupField('Descrizione','description',item,true),popupField('Partners','partners',item));list.appendChild(card);
    });
  }
  function canvasPoint(event){const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*W/rect.width,y:(event.clientY-rect.top)*H/rect.height}}
  canvas.addEventListener('pointerdown',event=>{const point=canvasPoint(event);for(let i=state.popups.length-1;i>=0;i--){const item=state.popups[i];if(point.x>=item.x&&point.x<=item.x+POP_W&&point.y>=item.y&&point.y<=item.y+POP_H){state.drag={item,dx:point.x-item.x,dy:point.y-item.y};canvas.setPointerCapture(event.pointerId);canvas.classList.add('dragging');event.preventDefault();break}}});
  canvas.addEventListener('pointermove',event=>{if(!state.drag)return;const point=canvasPoint(event),item=state.drag.item;item.x=Math.max(0,Math.min(W-POP_W,point.x-state.drag.dx));item.y=Math.max(58,Math.min(H-58-POP_H,point.y-state.drag.dy));});
  function stopDrag(event){if(!state.drag)return;state.drag=null;canvas.classList.remove('dragging');if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId)}
  canvas.addEventListener('pointerup',stopDrag);canvas.addEventListener('pointercancel',stopDrag);
  $('addPopup').onclick=()=>{const index=state.popups.length,offset=(index%4)*34;state.popups.push({date:'DATA EVENTO',title:'NUOVO POPUP',description:'Descrizione dell’evento.',partners:'PARTNERS / COLLABORAZIONI',x:Math.min(W-POP_W,(W-POP_W)/2+offset),y:Math.min(H-58-POP_H,355+offset)});renderPopupEditors();$('panel').scrollTop=$('popupList').offsetTop+$('popupList').offsetHeight};
  $('play').onclick=()=>{state.playing=!state.playing;state.started=performance.now();$('play').textContent=state.playing?'■ STOP':'▶ PLAY SEQUENZA'};
  $('rec').onclick=async()=>{if(state.recorder)return;try{state.playing=true;state.started=performance.now();$('play').textContent='■ STOP';$('status').textContent='● MP4 H.264 · 1080×1350 · 5 SEC';state.recorder=IGExport.startMP4({canvas,duration:DURATION,onProgress:p=>$('status').textContent=`● MP4 H.264 · ${Math.round(p*100)}%`});const blob=await state.recorder.promise;await saveBlob(blob,`ex-casa-post03-animation-${Date.now()}.mp4`);$('status').textContent=`✓ MP4 POST 1080×1350 · ${(blob.size/1024/1024).toFixed(1)} MB`}catch(error){if(error.name!=='AbortError'){console.error(error);$('status').textContent=`MP4 ERROR · ${error.message||error}`}}finally{state.recorder=null;state.playing=false;$('play').textContent='▶ PLAY SEQUENZA'}};
  $('save').onclick=()=>savePNG(false);$('saveStory').onclick=()=>savePNG(true);
  $('folder').onclick=async()=>{if(!window.showDirectoryPicker){$('status').textContent='OUTPUT: DOWNLOADS';return}try{state.dir=await showDirectoryPicker({mode:'readwrite'});$('status').textContent='OUTPUT: '+state.dir.name}catch(error){if(error.name!=='AbortError')console.error(error)}};
  $('backgroundImage').onchange=e=>{const file=e.target.files&&e.target.files[0];if(!file)return;if(state.imageURL)URL.revokeObjectURL(state.imageURL);state.imageURL=URL.createObjectURL(file);const image=new Image();image.onload=()=>{state.image=image;$('status').textContent='✓ BACKGROUND CARICATO'};image.src=state.imageURL};
  $('removeImage').onclick=()=>{state.image=null;if(state.imageURL)URL.revokeObjectURL(state.imageURL);state.imageURL=null;$('backgroundImage').value='';$('status').textContent='BACKGROUND RIMOSSO'};
  BG.forEach(color=>{const button=document.createElement('button');button.className='swatch';button.style.background=color;button.title=color;button.onclick=()=>state.bg=color;$('palette').appendChild(button)});
  renderPopupEditors();
  requestAnimationFrame(loop);
})();
