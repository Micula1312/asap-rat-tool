// STEP 18 PATCH — stable editor + distributed rats + custom logo bursts + ARCI + exact 1080x1350 recording

const LOGO_ICON_STORAGE_KEY='ex-casa-logo-icons-v1';
state.logoIcons=['♥','♥','♥'];
state.arciLogo=null;
state._recordCanvas=null;
state._recordCtx=null;
state._recordRAF=null;

try{
  const saved=JSON.parse(localStorage.getItem(LOGO_ICON_STORAGE_KEY)||'null');
  if(Array.isArray(saved)) state.logoIcons=saved.slice(0,3).map((v,i)=>v||state.logoIcons[i]);
}catch(e){console.warn('logo icons storage',e)}

function saveLogoIcons(){
  try{localStorage.setItem(LOGO_ICON_STORAGE_KEY,JSON.stringify(state.logoIcons))}catch(e){console.warn(e)}
}

// Extend the existing logo section safely.
const _buildEditor=buildEditor;
buildEditor=function(){
  _buildEditor();
  const panel=document.getElementById('editor-panel');
  if(!panel)return;

  const sections=[...panel.querySelectorAll('.section')];
  const logoSection=sections.find(sec=>{
    const t=sec.querySelector('.section-title');
    return t && /loghi/i.test(t.textContent||'');
  });
  if(!logoSection)return;

  const uploadRows=[...logoSection.querySelectorAll('.logo-input')].slice(0,3);
  uploadRows.forEach((row,i)=>{
    if(row.querySelector('.burst-icon-input'))return;
    const wrap=document.createElement('div');
    wrap.className='field burst-icon-input';
    const label=document.createElement('label');
    label.textContent=`ICONA ${i+1} DA SCOPPIARE`;
    const input=document.createElement('input');
    input.type='text';
    input.value=state.logoIcons[i]||'♥';
    input.maxLength=8;
    input.addEventListener('input',()=>{
      state.logoIcons[i]=input.value||'♥';
      saveLogoIcons();
    });
    wrap.append(label,input);
    row.appendChild(wrap);
  });

  if(!logoSection.querySelector('#arci-logo-upload')){
    const arci=document.createElement('div');
    arci.className='field logo-input';
    arci.id='arci-logo-upload';
    const label=document.createElement('label');
    label.textContent='STELLA / LOGO ARCI — ALTO DESTRA';
    const input=document.createElement('input');
    input.type='file';
    input.accept='image/png,image/jpeg,image/webp';
    input.addEventListener('change',e=>{
      const file=e.target.files&&e.target.files[0];
      if(!file)return;
      const reader=new FileReader();
      reader.onload=ev=>{
        loadImage(ev.target.result,img=>{state.arciLogo=img},err=>console.warn('ARCI image load',err));
      };
      reader.readAsDataURL(file);
    });
    arci.append(label,input);
    logoSection.appendChild(arci);

    const hint=document.createElement('div');
    hint.className='coords';
    hint.textContent='Se vuoto compare ★. Il PNG viene renderizzato in alto a destra.';
    logoSection.appendChild(hint);
  }
};

// Spread entrances: use a different edge for each rat first, then maximize separation.
function sideForCellPatched(cell){
  if(cell.c===0)return'left';
  if(cell.c===GRID.cols-1)return'right';
  if(cell.r===0)return'top';
  return'bottom';
}
function pickDistributedStart(dest,preferredSide,usedStarts=[]){
  const all=borderCandidates().map(cell=>{
    const p=cellCenter(cell.c,cell.r);
    return {...cell,p,side:sideForCellPatched(cell),d:dist(p.x,p.y,dest.x,dest.y)};
  });
  let pool=all.filter(o=>o.side===preferredSide&&o.d>min(BASE_W,BASE_H)*.34);
  if(!pool.length)pool=all.filter(o=>o.side===preferredSide);
  if(!pool.length)pool=all;

  pool=pool.map(o=>{
    const sep=usedStarts.length
      ?min(...usedStarts.map(s=>dist(o.p.x,o.p.y,s.edgeX,s.edgeY)))
      :BASE_W;
    return {...o,score:o.d+sep*1.45};
  }).sort((a,b)=>b.score-a.score);

  const shortlist=pool.slice(0,max(3,floor(pool.length*.15)));
  const chosen=random(shortlist);
  const p=chosen.p;
  let x=p.x,y=p.y;
  if(chosen.side==='left')x=-GRID_STEP*2;
  else if(chosen.side==='right')x=BASE_W+GRID_STEP*2;
  else if(chosen.side==='top')y=-GRID_STEP*2;
  else y=BASE_H+GRID_STEP*2;
  return{x,y,edgeX:p.x,edgeY:p.y,side:chosen.side,node:cellIndex(chosen.c,chosen.r)};
}
generateRatStarts=function(){
  state.ratStarts=[];
  const sides=shuffle(['left','right','top','bottom'],true);
  for(let i=0;i<state.ratCount;i++){
    const r=state.rats[i]||{to:0};
    const dest=getPlaceCenter(r.to);
    state.ratStarts.push(pickDistributedStart(dest,sides[i%sides.length],state.ratStarts));
  }
};

// ARCI mark independent from partner logos.
const _drawIdentity=drawIdentity;
drawIdentity=function(){
  _drawIdentity();
  drawArciMark();
};
function drawArciMark(){
  const x=982,y=74,maxSize=92;
  push();translate(x,y);
  if(state.arciLogo){
    const img=state.arciLogo;
    const s=min(maxSize/img.width,maxSize/img.height);
    imageMode(CENTER);
    image(img,0,0,img.width*s,img.height*s);
    imageMode(CORNER);
  }else{
    noStroke();fill(COLORS.black);textAlign(CENTER,CENTER);textSize(76);text('★',0,0);
  }
  pop();
}

// Partner logos aligned to the footer baseline.
const LOGO_XS=[795,885,975];
const LOGO_Y=1297;
drawLogoSlot=function(i,logoAmount,iconScale){
  const d=66,x=LOGO_XS[i],burstIcon=state.logoIcons[i]||'♥';
  push();translate(x,LOGO_Y);
  if(logoAmount<.98){
    push();scale(iconScale);noStroke();fill(COLORS.pink);textAlign(CENTER,CENTER);textSize(54);text(burstIcon,0,0);pop();
  }
  if(logoAmount>0){
    push();scale(logoAmount);fill(COLORS.white);stroke(COLORS.black);strokeWeight(2);circle(0,0,d);
    const img=state.logos[i];
    if(img){
      const m=d*.7,s=min(m/img.width,m/img.height);
      imageMode(CENTER);image(img,0,0,img.width*s,img.height*s);imageMode(CORNER);
    }else{
      noStroke();fill(COLORS.black);textAlign(CENTER,CENTER);textFont('Helvetica');textStyle(BOLD);textSize(9);text(state.logoLabels[i],0,0);
    }
    pop();
  }
  pop();
};
drawHeartBurst=function(i,q){
  const x=LOGO_XS[i],burstIcon=state.logoIcons[i]||'♥';
  push();translate(x,LOGO_Y);noStroke();fill(COLORS.pink);
  for(let k=0;k<8;k++){
    const a=TWO_PI*k/8,r=18+q*58;
    push();translate(cos(a)*r,sin(a)*r);textAlign(CENTER,CENTER);textSize(18*(1-q)+5);text(burstIcon,0,0);pop();
  }
  pop();
};

// Finale: only a fragment of the huge mouse is visible.
drawStrobeFinal=function(){
  const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1);
  const q=constrain((t-.86)/.14,0,1);
  const flash=floor(sequence.elapsed/95);
  const c=BG_PALETTE[(flash+sequence.strobeOffset)%BG_PALETTE.length];
  noStroke();fill(c);rect(0,0,BASE_W,BASE_H);
  drawIdentity();
  const size=2200,pad=size*.72;
  const x=sequence.finalDir===1?lerp(-pad,BASE_W+pad,q):lerp(BASE_W+pad,-pad,q);
  push();translate(x,sequence.finalY);if(sequence.finalDir<0)scale(-1,1);textAlign(CENTER,CENTER);textSize(size);noStroke();text('🐁',0,0);pop();
};

// Record the ARTBOARD only, always exactly 1080x1350.
function ensureRecordCanvas(){
  if(state._recordCanvas)return state._recordCanvas;
  const rc=document.createElement('canvas');
  rc.width=BASE_W;
  rc.height=BASE_H;
  rc.style.display='none';
  document.body.appendChild(rc);
  state._recordCanvas=rc;
  state._recordCtx=rc.getContext('2d',{alpha:false});
  return rc;
}
function copyArtboardToRecordCanvas(){
  if(!state._recordCanvas||!state._recordCtx)return;
  const ctx=state._recordCtx;
  ctx.clearRect(0,0,BASE_W,BASE_H);
  const srcW=BASE_W*view.s;
  const srcH=BASE_H*view.s;
  ctx.drawImage(canvas,view.ox,view.oy,srcW,srcH,0,0,BASE_W,BASE_H);
}
function recordCopyLoop(){
  copyArtboardToRecordCanvas();
  if(sequence.recorder&&sequence.recorder.state!=='inactive'){
    state._recordRAF=requestAnimationFrame(recordCopyLoop);
  }
}
startRecording=function(){
  try{
    const rc=ensureRecordCanvas();
    copyArtboardToRecordCanvas();
    const stream=rc.captureStream(60);
    const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
    sequence.chunks=[];
    sequence.recorder=new MediaRecorder(stream,{mimeType:mime});
    sequence.recorder.ondataavailable=e=>{if(e.data&&e.data.size)sequence.chunks.push(e.data)};
    sequence.recorder.onstop=()=>{
      if(state._recordRAF){cancelAnimationFrame(state._recordRAF);state._recordRAF=null}
      saveRecording();
    };
    sequence.recorder.start();
    recordCopyLoop();
  }catch(e){
    console.error(e);
    setStatus('REC ERROR');
  }
};
const _stopRecording=stopRecording;
stopRecording=function(save=true){
  if(state._recordRAF){cancelAnimationFrame(state._recordRAF);state._recordRAF=null}
  if(sequence.recorder&&sequence.recorder.state!=='inactive'){
    if(!save)sequence.recorder.onstop=null;
    sequence.recorder.stop();
  }
};
