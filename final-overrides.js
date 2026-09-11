// STEP 25 — final composition hold + dynamic places + arcade movement

const FINAL_HOLD_MS=2500;
const BUILD_END_MS=SEQUENCE_MS*.86;
const FINAL_SCENE_MS=SEQUENCE_MS-BUILD_END_MS;
const TOTAL_SEQUENCE_MS=BUILD_END_MS+FINAL_HOLD_MS+FINAL_SCENE_MS;

// Keep the finished post visible for a few seconds before the closing strobe.
draw=function(){
  background(state.bgColor);

  const active=sequence.mode==='play'||sequence.mode==='rec';
  let shouldFinish=false;
  if(active){
    sequence.elapsed=millis()-sequence.startedAt;
    if(sequence.elapsed>=TOTAL_SEQUENCE_MS){
      sequence.elapsed=TOTAL_SEQUENCE_MS;
      shouldFinish=true;
    }
  }

  view.artViewportW=max(320,width-PANEL_W);
  const m=18;
  view.s=min((view.artViewportW-m*2)/BASE_W,(height-m*2)/BASE_H);
  view.ox=max(m,(view.artViewportW-BASE_W*view.s)/2);
  view.oy=(height-BASE_H*view.s)/2;

  push();
  translate(view.ox,view.oy);
  scale(view.s);

  if(active&&sequence.elapsed>=BUILD_END_MS+FINAL_HOLD_MS){
    const actualElapsed=sequence.elapsed;
    const local=constrain((actualElapsed-(BUILD_END_MS+FINAL_HOLD_MS))/FINAL_SCENE_MS,0,1);
    sequence.elapsed=BUILD_END_MS+local*FINAL_SCENE_MS;
    drawStrobeFinal();
    sequence.elapsed=actualElapsed;
  }else if(active&&sequence.elapsed>=BUILD_END_MS){
    drawBackground();
    drawBlockedDots();
    drawIdentity();
    drawPlaceLabels();
    drawFinalComposition();
  }else{
    drawBackground();
    drawBlockedDots();
    drawIdentity();
    drawPlaceLabels();
    if(sequence.mode==='compose'||sequence.mode==='final')drawFinalComposition();
    else drawAnimatedSequence();
  }

  pop();
  if(shouldFinish)finishSequence();
};

// ---------- ARCADE / PAC-MAN FEEL ----------
// Rats are fully opaque, with no shadows. Movement is deliberately stepped
// and linear along the grid instead of eased / floaty.
drawRat=function(x,y,i){
  const S=state.scales.rat;
  push();
  drawingContext.globalAlpha=1;
  translate(x,y);
  if(i%2)scale(-1,1);
  textAlign(CENTER,CENTER);
  textSize(48*S);
  noStroke();
  fill(0);
  text('🐁',0,0);
  drawingContext.globalAlpha=1;
  pop();
};

function arcadeProgress(local){
  // Quantised progress gives the little grid-step rhythm of an arcade sprite.
  const steps=34;
  return constrain(floor(local*steps)/steps,0,1);
}

drawAnimatedSequence=function(){
  const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1);
  const ratEnd=.42,popupStart=.47,popupEnd=.73,logos=.77;

  for(let i=0;i<state.ratCount;i++){
    const delay=i*.045;
    const local=constrain((t-delay)/(ratEnd-delay),0,1);
    const route=buildRatRoute(i);
    const pos=pointOnPolyline(route,arcadeProgress(local));
    drawRat(pos.x,pos.y,i);
  }

  const n=max(1,state.popups.length);
  for(let i=0;i<n;i++){
    const s=popupStart+(popupEnd-popupStart)*(i/max(1,n-1));
    if(t>=s)drawPopupCard(i,popupEase(t,s));
  }
  drawLogoHeartSequence(t,logos);
};

// Place icons bounce like simple arcade sprites. The label/button itself stays
// anchored, except for the existing house press animation.
drawPlaceLabels=function(){
  const press=housePressAmount(),wave=houseWaveAmount();
  const active=sequence.mode==='play'||sequence.mode==='rec';
  const clock=active?sequence.elapsed:millis();

  for(let i=0;i<state.places.length;i++){
    const p=state.places[i],S=state.scales.label,labelH=34,isHouse=i===0;
    const phase=i*.72;
    const bounce=active ? -abs(sin(clock*.009+phase))*8 : -abs(sin(clock*.004+phase))*3;

    push();
    translate(p.x,p.y+(isHouse?12*press*S:0));
    scale(S);
    if(isHouse){
      translate(p.w/2,79);
      scale(1+.05*press,1-.20*press);
      translate(-p.w/2,-79);
    }

    push();
    translate(0,bounce);
    drawingContext.globalAlpha=1;
    noStroke();
    textAlign(CENTER,CENTER);
    textSize(42);
    text(p.icon||'',p.w/2,34);
    drawingContext.globalAlpha=1;
    pop();

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

// -------- DYNAMIC PLACES IN THE EDITOR --------
const _buildEditorWithDynamicPlaces=buildEditor;
buildEditor=function(){
  _buildEditorWithDynamicPlaces();

  const panel=document.getElementById('editor-panel');
  if(!panel)return;
  const sections=[...panel.querySelectorAll('.section')];
  const placesSection=sections.find(sec=>{
    const title=sec.querySelector('.section-title');
    return title&&/luoghi/i.test(title.textContent||'');
  });
  if(!placesSection||placesSection.querySelector('#add-place-button'))return;

  const actions=placesSection.querySelector('.place-actions');
  const add=document.createElement('button');
  add.id='add-place-button';
  add.className='fix-button';
  add.type='button';
  add.textContent='+ AGGIUNGI LUOGO';
  add.style.width='100%';
  add.style.margin='9px 0 8px';

  add.addEventListener('click',()=>{
    const i=state.places.length;
    const p={
      name:`LUOGO ${i+1}`,
      icon:'📍',
      x:BASE_W/2-100+(i%3)*28,
      y:BASE_H/2-50+(i%4)*28,
      w:200
    };
    state.places.push(p);
    insertDynamicPlaceEditor(placesSection,p,i);
    try{localStorage.setItem(PLACE_STORAGE_KEY,JSON.stringify(state.places))}catch(e){console.warn(e)}
    generateRatStarts();
    refreshRatEditors();
    if(placeStatusEl)placeStatusEl.html('✓ LUOGO AGGIUNTO — spostalo e poi FIX LUOGHI');
  });

  if(actions)placesSection.insertBefore(add,actions);
  else placesSection.appendChild(add);
};

function insertDynamicPlaceEditor(section,p,i){
  const box=document.createElement('div');
  box.className='place-editor';
  box.dataset.placeIndex=String(i);

  const grid=document.createElement('div');
  grid.className='place-grid';

  const nameField=document.createElement('div');
  nameField.className='field';
  const nameLabel=document.createElement('label');
  nameLabel.textContent=`Luogo ${i+1}`;
  const nameInput=document.createElement('input');
  nameInput.type='text';
  nameInput.value=p.name;
  nameInput.addEventListener('input',()=>{
    p.name=nameInput.value;
    refreshRatEditors();
  });
  nameField.append(nameLabel,nameInput);

  const iconField=document.createElement('div');
  iconField.className='field';
  const iconLabel=document.createElement('label');
  iconLabel.textContent='Icona';
  const iconInput=document.createElement('input');
  iconInput.type='text';
  iconInput.value=p.icon;
  iconInput.maxLength=8;
  iconInput.addEventListener('input',()=>{
    p.icon=iconInput.value||'📍';
    refreshRatEditors();
  });
  iconField.append(iconLabel,iconInput);

  grid.append(nameField,iconField);
  const coords=document.createElement('div');
  coords.id=`place-coords-${i}`;
  coords.className='coords';
  coords.textContent=`x ${Math.round(p.x)} · y ${Math.round(p.y)}`;

  box.append(grid,coords);
  const addButton=section.querySelector('#add-place-button');
  if(addButton)section.insertBefore(box,addButton);
  else section.appendChild(box);
}
