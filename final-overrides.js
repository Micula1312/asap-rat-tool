// STEP 28 — final hold + dynamic places + fluid rats + soft arrivals + pill labels + packages + export folder + REC self-check

const FINAL_HOLD_MS=2500;
const BUILD_END_MS=SEQUENCE_MS*.86;
const FINAL_SCENE_MS=SEQUENCE_MS-BUILD_END_MS;
const TOTAL_SEQUENCE_MS=BUILD_END_MS+FINAL_HOLD_MS+FINAL_SCENE_MS;
const PACKAGE_RESTORE_KEY='ex-casa-package-restore-v1';

// -------- EXPORT DESTINATION --------
// Browsers cannot accept a typed Windows path for security reasons. On Chrome/Edge
// the user selects a folder once with the system picker; we keep the handle in this
// page session and route packages, PNGs and REC files there. Fallback = Downloads.
state.exportDirectoryHandle=null;
state.exportFolderName='DOWNLOADS';
state._recCheck=null;

async function chooseExportFolder(){
  if(!window.showDirectoryPicker){
    alert('Il browser non permette di scegliere direttamente una cartella. I file continueranno ad andare in Download. Usa Chrome o Edge aggiornato per il selettore cartella.');
    return;
  }
  try{
    const handle=await window.showDirectoryPicker({mode:'readwrite'});
    state.exportDirectoryHandle=handle;
    state.exportFolderName=handle.name||'CARTELLA SELEZIONATA';
    updateExportFolderUI();
    if(statusEl)setStatus(`✓ OUTPUT → ${state.exportFolderName}`);
  }catch(e){
    if(e?.name!=='AbortError'){
      console.error('folder picker',e);
      if(statusEl)setStatus('ERRORE CARTELLA OUTPUT');
    }
  }
}
function updateExportFolderUI(){
  const el=document.getElementById('export-folder-name');
  if(el)el.value=state.exportFolderName||'DOWNLOADS';
}
async function writeBlobToExport(blob,filename){
  const dir=state.exportDirectoryHandle;
  if(dir){
    try{
      const permission=await dir.queryPermission({mode:'readwrite'});
      if(permission==='granted'||await dir.requestPermission({mode:'readwrite'})==='granted'){
        const fh=await dir.getFileHandle(filename,{create:true});
        const writable=await fh.createWritable();
        await writable.write(blob);
        await writable.close();
        return {ok:true,where:dir.name||'cartella selezionata'};
      }
    }catch(e){console.warn('write selected folder',e)}
  }
  const u=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),1800);
  return {ok:true,where:'Download'};
}
async function writeDataURLToExport(dataURL,filename){
  const blob=await (await fetch(dataURL)).blob();
  return writeBlobToExport(blob,filename);
}

// Restore serialisable package data before setup builds the editor.
let _pendingPackageAssets=null;
try{
  const raw=localStorage.getItem(PACKAGE_RESTORE_KEY);
  if(raw){
    const pkg=JSON.parse(raw),d=pkg?.data||{};
    if(d.bgColor)state.bgColor=d.bgColor;
    if(typeof d.showGrid==='boolean')state.showGrid=d.showGrid;
    if(Number.isFinite(d.gridAlpha))state.gridAlpha=d.gridAlpha;
    if(typeof d.title==='string')state.title=d.title;
    if(typeof d.year==='string')state.year=d.year;
    if(typeof d.info==='string')state.info=d.info;
    if(typeof d.footer==='string')state.footer=d.footer;
    if(d.scales)state.scales={...state.scales,...d.scales};
    if(Array.isArray(d.popups))state.popups=d.popups.map(p=>({...p}));
    if(Array.isArray(d.popupPositions))state.popupPositions=d.popupPositions.map(p=>({...p}));
    if(Array.isArray(d.places))state.places=d.places.map(p=>({...p}));
    if(Number.isFinite(d.ratCount))state.ratCount=d.ratCount;
    if(Array.isArray(d.rats))state.rats=d.rats.map(r=>({...r}));
    if(Array.isArray(d.logoLabels))state.logoLabels=[...d.logoLabels];
    if(Array.isArray(d.logoIcons))state.logoIcons=[...d.logoIcons];
    if(typeof d.finalCaption==='string')state.finalCaption=d.finalCaption;
    _pendingPackageAssets=pkg.assets||null;
    localStorage.removeItem(PACKAGE_RESTORE_KEY);
    try{localStorage.setItem(PLACE_STORAGE_KEY,JSON.stringify(state.places))}catch(e){}
    try{localStorage.setItem(RAT_STORAGE_KEY,JSON.stringify({ratCount:state.ratCount,rats:state.rats}))}catch(e){}
  }
}catch(e){console.warn('package restore',e)}

const _setupBeforePackage=setup;
setup=function(){
  _setupBeforePackage();
  if(_pendingPackageAssets){
    (_pendingPackageAssets.logos||[]).forEach((src,i)=>{if(src)loadImage(src,img=>{state.logos[i]=img},err=>console.warn('logo restore',err))});
    if(_pendingPackageAssets.arciLogo)loadImage(_pendingPackageAssets.arciLogo,img=>{state.arciLogo=img},err=>console.warn('ARCI restore',err));
  }
};

// Keep the finished post visible before the closing scene.
draw=function(){
  background(state.bgColor);
  const active=sequence.mode==='play'||sequence.mode==='rec';
  let shouldFinish=false;
  if(active){
    sequence.elapsed=millis()-sequence.startedAt;
    if(sequence.elapsed>=TOTAL_SEQUENCE_MS){sequence.elapsed=TOTAL_SEQUENCE_MS;shouldFinish=true;}
  }
  view.artViewportW=max(320,width-PANEL_W);const m=18;
  view.s=min((view.artViewportW-m*2)/BASE_W,(height-m*2)/BASE_H);
  view.ox=max(m,(view.artViewportW-BASE_W*view.s)/2);view.oy=(height-BASE_H*view.s)/2;
  push();translate(view.ox,view.oy);scale(view.s);
  if(active&&sequence.elapsed>=BUILD_END_MS+FINAL_HOLD_MS){
    const actualElapsed=sequence.elapsed;
    const local=constrain((actualElapsed-(BUILD_END_MS+FINAL_HOLD_MS))/FINAL_SCENE_MS,0,1);
    sequence.elapsed=BUILD_END_MS+local*FINAL_SCENE_MS;drawStrobeFinal();sequence.elapsed=actualElapsed;
  }else if(active&&sequence.elapsed>=BUILD_END_MS){
    drawBackground();drawBlockedDots();drawIdentity();drawPlaceLabels();drawFinalComposition();
  }else{
    drawBackground();drawBlockedDots();drawIdentity();drawPlaceLabels();
    if(sequence.mode==='compose'||sequence.mode==='final')drawFinalComposition();else drawAnimatedSequence();
  }
  pop();if(shouldFinish)finishSequence();
};

// ---------- FLUID RAT MOVEMENT ----------
drawRat=function(x,y,i){
  const S=state.scales.rat;push();drawingContext.globalAlpha=1;translate(x,y);if(i%2)scale(-1,1);
  textAlign(CENTER,CENTER);textSize(48*S);noStroke();text('🐁',0,0);drawingContext.globalAlpha=1;pop();
};
function ratFluidEase(x){x=constrain(x,0,1);return x*x*(3-2*x)}
function simplifyRoute(points){
  if(!points||points.length<3)return points||[];const out=[points[0]];
  for(let i=1;i<points.length-1;i++){
    const a=out[out.length-1],b=points[i],c=points[i+1];
    const sameX=abs(a.x-b.x)<.01&&abs(b.x-c.x)<.01,sameY=abs(a.y-b.y)<.01&&abs(b.y-c.y)<.01;
    if(!sameX&&!sameY)out.push(b);
  }out.push(points[points.length-1]);return out;
}
function roundedRoute(points,radius=18){
  const pts=simplifyRoute(points);if(!pts||pts.length<3)return pts||[];const out=[pts[0]];
  for(let i=1;i<pts.length-1;i++){
    const a=pts[i-1],b=pts[i],c=pts[i+1],lenA=dist(a.x,a.y,b.x,b.y),lenB=dist(b.x,b.y,c.x,c.y),cut=min(radius,lenA*.28,lenB*.28);
    if(cut<1){out.push(b);continue;}
    const inP={x:lerp(b.x,a.x,cut/lenA),y:lerp(b.y,a.y,cut/lenA)},outP={x:lerp(b.x,c.x,cut/lenB),y:lerp(b.y,c.y,cut/lenB)};
    out.push(inP);for(let s=1;s<=4;s++){const q=s/4,iq=1-q;out.push({x:iq*iq*inP.x+2*iq*q*b.x+q*q*outP.x,y:iq*iq*inP.y+2*iq*q*b.y+q*q*outP.y});}
  }out.push(pts[pts.length-1]);return out;
}
const RAT_FIRST_FINISH=.335,RAT_FINISH_STAGGER=.018;
drawAnimatedSequence=function(){
  const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1),popupStart=.43,popupEnd=.69,logos=.73;
  for(let i=0;i<state.ratCount;i++){
    const delay=i*.025,finish=RAT_FIRST_FINISH+i*RAT_FINISH_STAGGER,local=constrain((t-delay)/(finish-delay),0,1);
    const pos=pointOnPolyline(roundedRoute(buildRatRoute(i),20),ratFluidEase(local));drawRat(pos.x,pos.y,i);
  }
  const n=max(1,state.popups.length);for(let i=0;i<n;i++){const s=popupStart+(popupEnd-popupStart)*(i/max(1,n-1));if(t>=s)drawPopupCard(i,popupEase(t,s));}
  drawLogoHeartSequence(t,logos);
};

housePressAmount=function(){
  if(sequence.mode!=='play'&&sequence.mode!=='rec')return 0;
  const rs=state.rats.slice(0,state.ratCount).map((r,i)=>({r,i})).filter(o=>(o.r?.to??0)===0);if(!rs.length)return 0;
  const first=min(...rs.map(o=>RAT_FIRST_FINISH+o.i*RAT_FINISH_STAGGER)),t=constrain(sequence.elapsed/SEQUENCE_MS,0,1),start=first-.008,end=first+.065;
  if(t<start||t>end)return 0;const q=(t-start)/(end-start);if(q<.38)return easeOutBack(q/.38);return 1-constrain((q-.38)/.62,0,1);
};
houseWaveAmount=function(){
  if(sequence.mode!=='play'&&sequence.mode!=='rec')return 0;
  const rs=state.rats.slice(0,state.ratCount).map((r,i)=>({r,i})).filter(o=>(o.r?.to??0)===0);if(!rs.length)return 0;
  const first=min(...rs.map(o=>RAT_FIRST_FINISH+o.i*RAT_FINISH_STAGGER)),t=constrain(sequence.elapsed/SEQUENCE_MS,0,1),start=first+.035,end=first+.13;
  if(t<start||t>end)return 0;return constrain((t-start)/(end-start),0,1);
};
function arrivalBounceForPlace(placeIndex){
  if(sequence.mode!=='play'&&sequence.mode!=='rec')return 0;const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1);let best=0;
  for(let i=0;i<state.ratCount;i++){
    if((state.rats[i]?.to??0)!==placeIndex)continue;const arrival=RAT_FIRST_FINISH+i*RAT_FINISH_STAGGER,q=(t-arrival)/.09;
    if(q>=0&&q<=1)best=max(best,sin(q*PI)*11*(1-q));
  }return -best;
}

// ---------- SOFT PLACE LABELS ----------
drawPlaceLabels=function(){
  const press=housePressAmount(),wave=houseWaveAmount();
  for(let i=0;i<state.places.length;i++){
    const p=state.places[i],S=state.scales.label,labelH=32,isHouse=i===0,bounce=arrivalBounceForPlace(i);
    push();translate(p.x,p.y+(isHouse?12*press*S:0));scale(S);
    if(isHouse){translate(p.w/2,79);scale(1+.05*press,1-.20*press);translate(-p.w/2,-79);}
    push();translate(0,bounce);drawingContext.globalAlpha=1;noStroke();textAlign(CENTER,CENTER);textSize(42);text(p.icon||'',p.w/2,34);pop();
    textFont('Helvetica');textStyle(BOLD);textSize(11);const pillW=constrain(textWidth(p.name||'')+24,72,p.w),pillX=(p.w-pillW)/2;
    if(isHouse&&press>.02)fill(lerpColor(color(COLORS.acid),color('#8B5CF6'),constrain(press,0,1)));else fill(i%2===0?COLORS.acid:COLORS.white);
    stroke(COLORS.black);strokeWeight(2+press*2);rect(pillX,63,pillW,labelH,labelH/2);
    noStroke();fill(COLORS.black);textAlign(CENTER,CENTER);text(p.name,p.w/2,79);pop();
    if(isHouse&&wave>0)drawPinkWaves(p.x+(p.w*S)/2,p.y+34*S,wave,145*S,4);
  }
};

// ---------- PACKAGE SAVE / LOAD ----------
function p5ImageToDataURL(img){
  try{if(!img)return null;if(img.canvas&&typeof img.canvas.toDataURL==='function')return img.canvas.toDataURL('image/png');if(img.elt&&img.elt instanceof HTMLCanvasElement)return img.elt.toDataURL('image/png');}catch(e){console.warn('image serialise',e)}return null;
}
function renderCompositionPNGDataURL(){
  const out=document.createElement('canvas');out.width=BASE_W;out.height=BASE_H;const ctx=out.getContext('2d');ctx.fillStyle=state.bgColor;ctx.fillRect(0,0,BASE_W,BASE_H);
  ctx.drawImage(canvas,view.ox,view.oy,BASE_W*view.s,BASE_H*view.s,0,0,BASE_W,BASE_H);return out.toDataURL('image/png');
}
function packageSlug(){return (state.title||'ex-casa').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'ex-casa'}
function makePackage(){
  const preview=renderCompositionPNGDataURL();return {type:'ex-casa-rat-tool-package',version:1,savedAt:new Date().toISOString(),data:{
    bgColor:state.bgColor,showGrid:state.showGrid,gridAlpha:state.gridAlpha,title:state.title,year:state.year,info:state.info,footer:state.footer,scales:{...state.scales},
    popups:state.popups.map(p=>({...p})),popupPositions:state.popupPositions.map(p=>({...p})),places:state.places.map(p=>({...p})),ratCount:state.ratCount,rats:state.rats.map(r=>({...r})),
    logoLabels:[...state.logoLabels],logoIcons:[...(state.logoIcons||[])],finalCaption:state.finalCaption||'2026 edition'
  },assets:{logos:(state.logos||[]).map(p5ImageToDataURL),arciLogo:p5ImageToDataURL(state.arciLogo),previewPNG:preview}};
}
async function savePackage(){
  const oldMode=sequence.mode;sequence.mode='final';redraw();
  setTimeout(async()=>{
    const pkg=makePackage(),slug=packageSlug(),jsonBlob=new Blob([JSON.stringify(pkg,null,2)],{type:'application/json'});
    await writeBlobToExport(jsonBlob,`${slug}-package.json`);await writeDataURLToExport(pkg.assets.previewPNG,`${slug}-post.png`);
    sequence.mode=oldMode==='play'||oldMode==='rec'?'compose':oldMode;if(statusEl)setStatus(`✓ PACCHETTO + PNG → ${state.exportFolderName}`);
  },50);
}
function loadPackageFile(file){
  if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const pkg=JSON.parse(reader.result);if(pkg?.type!=='ex-casa-rat-tool-package'||!pkg.data)throw new Error('Pacchetto non riconosciuto');localStorage.setItem(PACKAGE_RESTORE_KEY,JSON.stringify(pkg));location.reload();}catch(e){console.error(e);if(statusEl)setStatus('ERRORE PACCHETTO');alert('Questo file non sembra un pacchetto valido del tool.');}};reader.readAsText(file);
}

// ---------- REC: DUAL EXPORT + SELF CHECK ----------
// This replaces the previous downloader while keeping the same two hidden
// recording canvases created in patch.js.
startRecording=function(){
  try{
    if(typeof MediaRecorder==='undefined')throw new Error('MediaRecorder non disponibile');
    if(!HTMLCanvasElement.prototype.captureStream)throw new Error('canvas.captureStream non disponibile');
    const targets=ensureRecordTargets();copyArtboardToTargets();
    const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':(MediaRecorder.isTypeSupported('video/webm;codecs=vp8')?'video/webm;codecs=vp8':'video/webm');
    const stamp=Date.now();state._recCheck={started:true,mime,files:0,bytes:0,errors:[]};
    targets.forEach(t=>{
      t.chunks=[];const stream=t.canvas.captureStream(60);t.recorder=new MediaRecorder(stream,{mimeType:mime});
      t.recorder.onerror=e=>{state._recCheck.errors.push(String(e?.error?.message||e?.error||'MediaRecorder error'));};
      t.recorder.ondataavailable=e=>{if(e.data&&e.data.size)t.chunks.push(e.data)};
      t.recorder.onstop=async()=>{
        try{
          const blob=new Blob(t.chunks,{type:mime});
          if(blob.size<1024)throw new Error(`${t.label}: registrazione vuota (${blob.size} B)`);
          await writeBlobToExport(blob,`ex-casa-${t.label}-${stamp}.webm`);
          state._recCheck.files++;state._recCheck.bytes+=blob.size;
          if(state._recCheck.files===targets.length){
            const mb=(state._recCheck.bytes/1024/1024).toFixed(1);setStatus(`✓ REC OK · 2 FILE · ${mb} MB · ${state.exportFolderName}`);
          }
        }catch(e){console.error(e);state._recCheck.errors.push(String(e.message||e));setStatus('REC ERROR — CONTROLLA CONSOLE');}
      };
      t.recorder.start(500);
    });
    sequence.recorder=targets[0].recorder;recordCopyLoop();
    setStatus(`● RECORDING · ${mime.replace('video/','')} · → ${state.exportFolderName}`);
  }catch(e){console.error(e);state._recCheck={started:false,errors:[String(e.message||e)]};setStatus(`REC ERROR · ${e.message||e}`);}
};
stopRecording=function(save=true){
  if(state._recordRAF){cancelAnimationFrame(state._recordRAF);state._recordRAF=null;}
  (state._recordTargets||[]).forEach(t=>{if(t.recorder&&t.recorder.state!=='inactive'){if(!save)t.recorder.onstop=null;try{t.recorder.requestData();}catch(e){}t.recorder.stop();}});
};

// -------- DYNAMIC PLACES + PACKAGE / OUTPUT CONTROLS --------
const _buildEditorWithDynamicPlaces=buildEditor;
buildEditor=function(){
  _buildEditorWithDynamicPlaces();const panel=document.getElementById('editor-panel');if(!panel)return;const sections=[...panel.querySelectorAll('.section')];
  const placesSection=sections.find(sec=>{const title=sec.querySelector('.section-title');return title&&/luoghi/i.test(title.textContent||'');});
  if(placesSection&&!placesSection.querySelector('#add-place-button')){
    const actions=placesSection.querySelector('.place-actions'),add=document.createElement('button');add.id='add-place-button';add.className='fix-button';add.type='button';add.textContent='+ AGGIUNGI LUOGO';add.style.width='100%';add.style.margin='9px 0 8px';
    add.addEventListener('click',()=>{const i=state.places.length,p={name:`LUOGO ${i+1}`,icon:'📍',x:BASE_W/2-100+(i%3)*28,y:BASE_H/2-50+(i%4)*28,w:200};state.places.push(p);insertDynamicPlaceEditor(placesSection,p,i);try{localStorage.setItem(PLACE_STORAGE_KEY,JSON.stringify(state.places))}catch(e){}generateRatStarts();refreshRatEditors();if(placeStatusEl)placeStatusEl.html('✓ LUOGO AGGIUNTO — spostalo e poi FIX LUOGHI');});
    if(actions)placesSection.insertBefore(add,actions);else placesSection.appendChild(add);
  }
  const seqSection=sections.find(sec=>{const title=sec.querySelector('.section-title');return title&&/sequenza/i.test(title.textContent||'');});
  if(seqSection&&!seqSection.querySelector('#package-controls')){
    const folder=document.createElement('div');folder.className='field';folder.id='export-folder-control';folder.style.marginTop='10px';
    const lab=document.createElement('label');lab.textContent='CARTELLA OUTPUT';
    const folderRow=document.createElement('div');folderRow.style.display='grid';folderRow.style.gridTemplateColumns='1fr 92px';folderRow.style.gap='6px';
    const folderName=document.createElement('input');folderName.id='export-folder-name';folderName.type='text';folderName.readOnly=true;folderName.value=state.exportFolderName;folderName.title='Per sicurezza il browser non accetta un percorso digitato: scegli la cartella con il pulsante.';
    const choose=document.createElement('button');choose.type='button';choose.className='mini-button';choose.textContent='SCEGLI…';choose.addEventListener('click',chooseExportFolder);folderRow.append(folderName,choose);folder.append(lab,folderRow);seqSection.appendChild(folder);

    const hint=document.createElement('div');hint.className='coords';hint.textContent='REC + PNG + PACCHETTI vanno qui. Se non scegli nulla: Download.';seqSection.appendChild(hint);
    const box=document.createElement('div');box.id='package-controls';box.style.display='grid';box.style.gridTemplateColumns='1fr 1fr';box.style.gap='6px';box.style.marginTop='10px';
    const save=document.createElement('button');save.className='fix-button';save.type='button';save.textContent='💾 SALVA PACCHETTO';save.addEventListener('click',savePackage);
    const load=document.createElement('button');load.className='fix-button secondary';load.type='button';load.textContent='📂 CARICA PACCHETTO';const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.style.display='none';load.addEventListener('click',()=>input.click());input.addEventListener('change',()=>loadPackageFile(input.files&&input.files[0]));box.append(save,load,input);seqSection.appendChild(box);
  }
};
function insertDynamicPlaceEditor(section,p,i){
  const box=document.createElement('div');box.className='place-editor';box.dataset.placeIndex=String(i);const grid=document.createElement('div');grid.className='place-grid';
  const nf=document.createElement('div');nf.className='field';const nl=document.createElement('label');nl.textContent=`Luogo ${i+1}`;const ni=document.createElement('input');ni.type='text';ni.value=p.name;ni.addEventListener('input',()=>{p.name=ni.value;refreshRatEditors();});nf.append(nl,ni);
  const inf=document.createElement('div');inf.className='field';const il=document.createElement('label');il.textContent='Icona';const ii=document.createElement('input');ii.type='text';ii.value=p.icon;ii.maxLength=8;ii.addEventListener('input',()=>{p.icon=ii.value||'📍';refreshRatEditors();});inf.append(il,ii);grid.append(nf,inf);
  const coords=document.createElement('div');coords.id=`place-coords-${i}`;coords.className='coords';coords.textContent=`x ${Math.round(p.x)} · y ${Math.round(p.y)}`;box.append(grid,coords);const addButton=section.querySelector('#add-place-button');if(addButton)section.insertBefore(box,addButton);else section.appendChild(box);
}
