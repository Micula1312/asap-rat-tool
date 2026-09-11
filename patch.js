// STEP 16 PATCH — distributed rat starts + custom burst icons + extreme finale rat

const LOGO_ICON_STORAGE_KEY='ex-casa-logo-icons-v1';
state.logoIcons=['♥','♥','♥'];
try{
  const saved=JSON.parse(localStorage.getItem(LOGO_ICON_STORAGE_KEY)||'null');
  if(Array.isArray(saved)) state.logoIcons=saved.slice(0,3).map((v,i)=>v||state.logoIcons[i]);
}catch(e){}

function saveLogoIcons(){
  localStorage.setItem(LOGO_ICON_STORAGE_KEY,JSON.stringify(state.logoIcons));
}

// Add an icon field next to each PNG uploader without rebuilding the whole editor.
const _buildEditor=buildEditor;
buildEditor=function(){
  _buildEditor();
  const panel=document.getElementById('editor-panel');
  if(!panel)return;
  const sections=[...panel.querySelectorAll('.section')];
  const logoSection=sections[sections.length-1];
  if(!logoSection)return;
  const uploadRows=[...logoSection.querySelectorAll('.logo-input')];
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
    input.style.textAlign='center';
    input.style.fontSize='24px';
    input.addEventListener('input',()=>{
      state.logoIcons[i]=input.value||'♥';
      saveLogoIcons();
    });
    wrap.appendChild(label);wrap.appendChild(input);
    row.appendChild(wrap);
  });
};

// Spread automatic entrances: different edges first, then maximum separation.
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
    return {...o,score:o.d+sep*1.35};
  }).sort((a,b)=>b.score-a.score);
  const shortlist=pool.slice(0,max(3,floor(pool.length*.18)));
  const chosen=random(shortlist);
  const p=chosen.p;
  let x=p.x,y=p.y;
  if(chosen.side==='left')x=-GRID_STEP*2;
  else if(chosen.side==='right')x=BASE_W+GRID_STEP*2;
  else if(chosen.side==='top')y=-GRID_STEP*2;
  else y=BASE_H+GRID_STEP*2;
  return {x,y,edgeX:p.x,edgeY:p.y,side:chosen.side,node:cellIndex(chosen.c,chosen.r)};
}
generateRatStarts=function(){
  state.ratStarts=[];
  const sides=shuffle(['left','right','top','bottom'],true);
  for(let i=0;i<state.ratCount;i++){
    const r=state.rats[i]||{to:0};
    const dest=getPlaceCenter(r.to);
    const preferredSide=sides[i%sides.length];
    state.ratStarts.push(pickDistributedStart(dest,preferredSide,state.ratStarts));
  }
};

// Use the editable icon instead of a fixed heart before each PNG appears.
drawLogoSlot=function(i,logoAmount,iconScale){
  const xs=[820,910,1000],y=1240,d=66,x=xs[i],burstIcon=state.logoIcons[i]||'♥';
  push();translate(x,y);
  if(logoAmount<.98){
    push();scale(iconScale);noStroke();fill(COLORS.pink);textAlign(CENTER,CENTER);textSize(54);text(burstIcon,0,0);pop();
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
  const xs=[820,910,1000],y=1240,x=xs[i],burstIcon=state.logoIcons[i]||'♥';
  push();translate(x,y);noStroke();fill(COLORS.pink);
  for(let k=0;k<8;k++){
    const a=TWO_PI*k/8,r=18+q*58;
    push();translate(cos(a)*r,sin(a)*r);textAlign(CENTER,CENTER);textSize(18*(1-q)+5);text(burstIcon,0,0);pop();
  }
  pop();
};

// Finale: so oversized that only a fragment of the mouse is visible while it crosses.
drawStrobeFinal=function(){
  const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1),q=constrain((t-.86)/.14,0,1),flash=floor(sequence.elapsed/95);
  const c=BG_PALETTE[(flash+sequence.strobeOffset)%BG_PALETTE.length];
  noStroke();fill(c);rect(0,0,BASE_W,BASE_H);
  drawIdentity();
  const size=1850;
  const pad=size*.72;
  const x=sequence.finalDir===1?lerp(-pad,BASE_W+pad,q):lerp(BASE_W+pad,-pad,q);
  push();translate(x,sequence.finalY);if(sequence.finalDir<0)scale(-1,1);textAlign(CENTER,CENTER);textSize(size);noStroke();text('🐁',0,0);pop();
};