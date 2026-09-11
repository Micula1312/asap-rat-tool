// STEP 19 PATCH — dual IG exports + fruit logo bursts + ARCI + distributed starts + manhole finale

const LOGO_ICON_STORAGE_KEY='ex-casa-logo-icons-v2';
state.logoIcons=['🍒','🍋','🍇'];
state.arciLogo=null;
state._recordTargets=[];
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

    const hint=document.createElement('div');
    hint.className='coords';
    hint.textContent='REC salva automaticamente POST 4:5 + STORY 9:16.';
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
    const sep=usedStarts.length?min(...usedStarts.map(s=>dist(o.p.x,o.p.y,s.edgeX,s.edgeY))):BASE_W;
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

// Partner logos aligned to the footer baseline.
const LOGO_XS=[795,885,975],LOGO_Y=1297;
drawLogoSlot=function(i,logoAmount,iconScale){
  const d=66,x=LOGO_XS[i],burstIcon=state.logoIcons[i]||['🍒','🍋','🍇'][i];
  push();translate(x,LOGO_Y);
  if(logoAmount<.98){push();scale(iconScale);noStroke();textAlign(CENTER,CENTER);textSize(54);text(burstIcon,0,0);pop()}
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
  const x=LOGO_XS[i],burstIcon=state.logoIcons[i]||['🍒','🍋','🍇'][i];
  push();translate(x,LOGO_Y);noStroke();
  for(let k=0;k<8;k++){
    const a=TWO_PI*k/8,r=18+q*58;
    push();translate(cos(a)*r,sin(a)*r);textAlign(CENTER,CENTER);textSize(18*(1-q)+5);text(burstIcon,0,0);pop();
  }
  pop();
};

// Finale: giant manhole/hole icon, clipped naturally by the artboard edges.
drawStrobeFinal=function(){
  const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1);
  const q=constrain((t-.86)/.14,0,1);
  const flash=floor(sequence.elapsed/95);
  const c=BG_PALETTE[(flash+sequence.strobeOffset)%BG_PALETTE.length];
  noStroke();fill(c);rect(0,0,BASE_W,BASE_H);
  drawIdentity();
  const size=1900,pad=size*.68;
  const x=sequence.finalDir===1?lerp(-pad,BASE_W+pad,q):lerp(BASE_W+pad,-pad,q);
  push();translate(x,sequence.finalY);textAlign(CENTER,CENTER);textSize(size);noStroke();text('🕳️',0,0);pop();
};

// ---------- DUAL RECORDING ----------
// Post: 1080x1350 (4:5)
// Story: 1080x1920 (9:16). The 4:5 composition is centered vertically;
// extra space inherits the current background so no content is cropped.
function makeRecordTarget(width,height,label){
  const c=document.createElement('canvas');
  c.width=width;c.height=height;c.style.display='none';document.body.appendChild(c);
  return {canvas:c,ctx:c.getContext('2d',{alpha:false}),label,chunks:[],recorder:null};
}
function ensureRecordTargets(){
  if(state._recordTargets&&state._recordTargets.length===2)return state._recordTargets;
  state._recordTargets=[
    makeRecordTarget(1080,1350,'post-4x5'),
    makeRecordTarget(1080,1920,'story-9x16')
  ];
  return state._recordTargets;
}
function copyArtboardToTargets(){
  const targets=ensureRecordTargets();
  const srcW=BASE_W*view.s,srcH=BASE_H*view.s;
  const post=targets[0],story=targets[1];

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
        if(t.chunks.length){
          const blob=new Blob(t.chunks,{type:'video/webm'});
          downloadBlob(blob,`ex-casa-${t.label}-${stamp}.webm`);
        }
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
