// STEP 24 — final composition hold + dynamic places

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
    // Remap only the closing scene to the old .86 → 1 time window,
    // so the existing mouse → heart morph keeps exactly the same timing.
    const actualElapsed=sequence.elapsed;
    const local=constrain((actualElapsed-(BUILD_END_MS+FINAL_HOLD_MS))/FINAL_SCENE_MS,0,1);
    sequence.elapsed=BUILD_END_MS+local*FINAL_SCENE_MS;
    drawStrobeFinal();
    sequence.elapsed=actualElapsed;
  }else if(active&&sequence.elapsed>=BUILD_END_MS){
    // Static, fully composed post: readable pause before the closing scene.
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

  // Finish only after the last closing frame has actually been drawn/recorded.
  if(shouldFinish)finishSequence();
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

    // Persist the existence of the new place immediately. Its later dragged
    // position is still committed in the usual way with FIX LUOGHI.
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
