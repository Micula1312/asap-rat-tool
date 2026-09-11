// STEP 23 PATCH — dual IG exports + concentric pink waves + ARCI + distributed starts + 2x floating rats + mouse-to-heart finale

const LOGO_ICON_STORAGE_KEY='ex-casa-logo-icons-v2';
const FINAL_CAPTION_STORAGE_KEY='ex-casa-final-caption-v1';
state.logoIcons=['🍒','🍋','🍇'];
state.arciLogo=null;
state.finalCaption='2026 edition';
state._recordTargets=[];
state._recordRAF=null;
state.scales.rat=2;

try{
  const saved=JSON.parse(localStorage.getItem(LOGO_ICON_STORAGE_KEY)||'null');
  if(Array.isArray(saved)) state.logoIcons=saved.slice(0,3).map((v,i)=>v||state.logoIcons[i]);
}catch(e){console.warn('logo icons storage',e)}
try{
  const savedCaption=localStorage.getItem(FINAL_CAPTION_STORAGE_KEY);
  if(savedCaption) state.finalCaption=savedCaption;
}catch(e){console.warn('final caption storage',e)}

function saveLogoIcons(){
  try{localStorage.setItem(LOGO_ICON_STORAGE_KEY,JSON.stringify(state.logoIcons))}catch(e){console.warn(e)}
}
function saveFinalCaption(){
  try{localStorage.setItem(FINAL_CAPTION_STORAGE_KEY,state.finalCaption)}catch(e){console.warn(e)}
}

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
    label.textContent=`ICONA ${i+1}`;
    const input=document.createElement('input');
    input.type='text';
    input.value=state.logoIcons[i]||['🍒','🍋','🍇'][i];
    input.maxLength=8;
    input.addEventListener('input',()=>{
      state.logoIcons[i]=input.value||['🍒','🍋','🍇'][i];
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
      reader.onload=ev=>loadImage(ev.target.result,img=>{state.arciLogo=img},err=>console.warn('ARCI image load',err));
      reader.readAsDataURL(file);
    });
    arci.append(label,input);
    logoSection.appendChild(arci);
  }

  if(!logoSection.querySelector('#final-caption-input')){
    const wrap=document.createElement('div');
    wrap.className='field';
    wrap.id='final-caption-input';
    const label=document.createElement('label');
    label.textContent='STRINGA FINALE';
    const input=document.createElement('input');
    input.type='text';
    input.value=state.finalCaption;
    input.placeholder='2026 edition';
    input.addEventListener('input',()=>{
      state.finalCaption=input.value||'2026 edition';
      saveFinalCaption();
    });
    wrap.append(label,input);
    logoSection.appendChild(wrap);
  }

  if(!logoSection.querySelector('.export-hint')){
    const hint=document.createElement('div');
    hint.className='coords export-hint';
    hint.textContent='REC salva automaticamente POST 4:5 + STORY 9:16.';
    logoSection.appendChild(hint);
  }
};

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
    const sep=usedStarts.length?min(...usedStarts.map(s=>dist(o.p.x,o.p.y,s.edgeX,s.edgeY))):BASE_W;
    return {...o,score:o.d+sep*1.45};
  }).sort((a,b)=>b.score-a.score);
  const shortlist=pool.slice(0,max(3,floor(pool.length*.15)));
  const chosen=random(shortlist),p=chosen.p;
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
    state.ratStarts.push(pickDistributedStart(getPlaceCenter(r.to),sides[i%sides.length],state.ratStarts));
  }
};

const _drawIdentity=drawIdentity;
drawIdentity=function(){_drawIdentity();drawArciMark()};
function drawArciMark(){
  const x=982,y=74,maxSize=92;
  push();translate(x,y);
  if(state.arciLogo){
    const img=state.arciLogo,s=min(maxSize/img.width,maxSize/img.height);
    imageMode(CENTER);image(img,0,0,img.width*s,img.height*s);imageMode(CORNER);
  }else{
    noStroke();fill(COLORS.black);textAlign(CENTER,CENTER);textSize(76);text('★',0,0);
  }
  pop();
}

drawRat=function(x,y,i){
  const S=state.scales.rat;
  push();
  noStroke();
  fill(0,42);
  ellipse(x+5*S,y+27*S,52*S,16*S);
  translate(x,y-7*S);
  if(i%2)scale(-1,1);
  textAlign(CENTER,CENTER);
  textSize(48*S);
  text('🐁',0,0);
  pop();
};

drawPopupCard=function(i,a){
  const d=state.popups[i];if(!d)return;
  const p=state.popupPositions[i],sz=popupSize(i),w=sz.w,h=sz.h,S=state.scales.popup*a;
  push();translate(p.x+w/2,p.y+h/2);scale(S);translate(-w/2,-h/2);
  noStroke();fill('#F5F5F7');rect(0,0,w,h,15);
  stroke(0,45);strokeWeight(1);noFill();rect(0,0,w,h,15);
  noStroke();fill('#ECECEF');rect(0,0,w,32,15,15,0,0);
  fill(0,100);circle(17,16,9);circle(31,16,9);circle(45,16,9);
  fill(COLORS.black);textAlign(LEFT,TOP);
  textFont('Helvetica');textStyle(NORMAL);textSize(15);text(d.date||'',15,47);
  textFont('Helvetica');textStyle(BOLD);textSize(27);text(d.title||'',15,70,w-30,43);
  textFont('Times New Roman');textStyle(NORMAL);textSize(15);text(d.body||'',15,120,w-30,h-130);
  pop();
};

function housePressAmount(){
  if(sequence.mode!=='play'&&sequence.mode!=='rec')return 0;
  const hasHouseRat=state.rats.slice(0,state.ratCount).some(r=>(r?.to??0)===0);
  if(!hasHouseRat)return 0;
  const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1);
  const start=.405,end=.463;
  if(t<start||t>end)return 0;
  const q=(t-start)/(end-start);
  if(q<.34)return easeOutBack(q/.34);
  return 1-constrain((q-.34)/.66,0,1);
}
function houseWaveAmount(){
  if(sequence.mode!=='play'&&sequence.mode!=='rec')return 0;
  const hasHouseRat=state.rats.slice(0,state.ratCount).some(r=>(r?.to??0)===0);
  if(!hasHouseRat)return 0;
  const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1);
  const start=.445,end=.535;
  if(t<start||t>end)return 0;
  return constrain((t-start)/(end-start),0,1);
}
function drawPinkWaves(cx,cy,q,maxRadius=150,weight=4){
  if(q<=0||q>=1)return;
  push();
  noFill();
  stroke(COLORS.pink);
  strokeWeight(weight*(1-q*.55));
  for(let k=0;k<4;k++){
    const local=constrain(q-k*.105,0,1);
    if(local<=0)continue;
    const r=18+local*maxRadius;
    const alpha=255*(1-local);
    stroke(255,97,182,alpha);
    circle(cx,cy,r*2);
  }
  pop();
}

drawPlaceLabels=function(){
  const press=housePressAmount(),wave=houseWaveAmount();
  for(let i=0;i<state.places.length;i++){
    const p=state.places[i],S=state.scales.label,labelH=34,isHouse=i===0;
    push();
    translate(p.x,p.y+(isHouse?12*press*S:0));
    scale(S);
    if(isHouse){
      translate(p.w/2,79);
      scale(1+.05*press,1-.20*press);
      translate(-p.w/2,-79);
    }
    noStroke();textAlign(CENTER,CENTER);textSize(42);text(p.icon||'',p.w/2,34);
    if(isHouse&&press>.02)fill(lerpColor(color(COLORS.acid),color('#8B5CF6'),constrain(press,0,1)));
    else fill(i%2===0?COLORS.acid:COLORS.white);
    stroke(COLORS.black);strokeWeight(2+press*2);rect(0,62,p.w,labelH,5);
    noStroke();fill(COLORS.black);textFont('Helvetica');textStyle(BOLD);textSize(11);textAlign(CENTER,CENTER);text(p.name,p.w/2,79);
    pop();

    if(isHouse&&wave>0){
      const cx=p.x+(p.w*S)/2,cy=p.y+34*S;
      drawPinkWaves(cx,cy,wave,145*S,4);
    }
  }
};

const LOGO_XS=[795,885,975],LOGO_Y=1297;
drawLogoSlot=function(i,logoAmount,iconScale){
  const d=66,x=LOGO_XS[i],icon=state.logoIcons[i]||['🍒','🍋','🍇'][i];
  push();translate(x,LOGO_Y);
  if(logoAmount<.98){
    push();scale(iconScale);noStroke();textAlign(CENTER,CENTER);textSize(54);text(icon,0,0);pop();
  }
  if(logoAmount>0){
    push();scale(logoAmount);fill(COLORS.white);stroke(COLORS.black);strokeWeight(2);circle(0,0,d);
    const img=state.logos[i];
    if(img){const m=d*.7,s=min(m/img.width,m/img.height);imageMode(CENTER);image(img,0,0,img.width*s,img.height*s);imageMode(CORNER)}
    else{noStroke();fill(COLORS.black);textAlign(CENTER,CENTER);textFont('Helvetica');textStyle(BOLD);textSize(9);text(state.logoLabels[i],0,0)}
    pop();
  }
  pop();
};
drawHeartBurst=function(i,q){
  const x=LOGO_XS[i],y=LOGO_Y;
  drawPinkWaves(x,y,constrain(q,0,1),92,3.5);
};

// Finale: fixed center. Mouse shrinks/fades while a heart grows in its place.
drawStrobeFinal=function(){
  const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1);
  const q=constrain((t-.86)/.14,0,1);
  const morph=smoothstep01(constrain(q/.72,0,1));
  const flash=floor(sequence.elapsed/95);
  const c=BG_PALETTE[(flash+sequence.strobeOffset)%BG_PALETTE.length];
  noStroke();fill(c);rect(0,0,BASE_W,BASE_H);
  drawIdentity();

  const cx=BASE_W/2,cy=BASE_H/2-55;
  push();
  translate(cx,cy);
  textAlign(CENTER,CENTER);
  noStroke();

  if(morph<1){
    push();
    scale(1-morph*.82);
    textSize(760);
    drawingContext.globalAlpha=1-morph;
    text('🐁',0,0);
    drawingContext.globalAlpha=1;
    pop();
  }

  if(morph>0){
    push();
    const heartScale=.22+.78*easeOutBack(morph);
    scale(heartScale);
    drawingContext.globalAlpha=morph;
    fill(COLORS.pink);
    textSize(650);
    text('♥',0,0);
    drawingContext.globalAlpha=1;
    pop();
  }
  pop();

  const captionAlpha=constrain((q-.28)/.42,0,1);
  if(captionAlpha>0){
    push();
    drawingContext.globalAlpha=captionAlpha;
    fill(COLORS.black);
    textAlign(CENTER,CENTER);
    textFont('Times New Roman');
    textStyle(ITALIC);
    textSize(42);
    text(state.finalCaption||'2026 edition',BASE_W/2,BASE_H/2+330);
    drawingContext.globalAlpha=1;
    pop();
  }
};
function smoothstep01(x){return x*x*(3-2*x)}

function makeRecordTarget(width,height,label){
  const c=document.createElement('canvas');
  c.width=width;c.height=height;c.style.display='none';document.body.appendChild(c);
  return {canvas:c,ctx:c.getContext('2d',{alpha:false}),label,chunks:[],recorder:null};
}
function ensureRecordTargets(){
  if(state._recordTargets&&state._recordTargets.length===2)return state._recordTargets;
  state._recordTargets=[makeRecordTarget(1080,1350,'post-4x5'),makeRecordTarget(1080,1920,'story-9x16')];
  return state._recordTargets;
}
function copyArtboardToTargets(){
  const targets=ensureRecordTargets();
  const srcW=BASE_W*view.s,srcH=BASE_H*view.s,post=targets[0],story=targets[1];
  post.ctx.fillStyle=state.bgColor;post.ctx.fillRect(0,0,1080,1350);
  post.ctx.drawImage(canvas,view.ox,view.oy,srcW,srcH,0,0,1080,1350);
  story.ctx.fillStyle=state.bgColor;story.ctx.fillRect(0,0,1080,1920);
  const storyY=(1920-1350)/2;
  story.ctx.drawImage(canvas,view.ox,view.oy,srcW,srcH,0,storyY,1080,1350);
}
function recordCopyLoop(){
  copyArtboardToTargets();
  const active=state._recordTargets.some(t=>t.recorder&&t.recorder.state!=='inactive');
  if(active)state._recordRAF=requestAnimationFrame(recordCopyLoop);
}
function downloadBlob(blob,name){
  const u=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),1800);
}
startRecording=function(){
  try{
    const targets=ensureRecordTargets();
    copyArtboardToTargets();
    const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
    const stamp=Date.now();
    targets.forEach(t=>{
      t.chunks=[];
      const stream=t.canvas.captureStream(60);
      t.recorder=new MediaRecorder(stream,{mimeType:mime});
      t.recorder.ondataavailable=e=>{if(e.data&&e.data.size)t.chunks.push(e.data)};
      t.recorder.onstop=()=>{
        if(t.chunks.length)downloadBlob(new Blob(t.chunks,{type:'video/webm'}),`ex-casa-${t.label}-${stamp}.webm`);
      };
      t.recorder.start();
    });
    sequence.recorder=targets[0].recorder;
    recordCopyLoop();
  }catch(e){console.error(e);setStatus('REC ERROR')}
};
stopRecording=function(save=true){
  if(state._recordRAF){cancelAnimationFrame(state._recordRAF);state._recordRAF=null}
  (state._recordTargets||[]).forEach(t=>{
    if(t.recorder&&t.recorder.state!=='inactive'){
      if(!save)t.recorder.onstop=null;
      t.recorder.stop();
    }
  });
};