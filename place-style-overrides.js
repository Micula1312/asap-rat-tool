// STEP 30 — project emoji library + larger place icons + finer pill labels
// Canonical visual vocabulary for this project.

const PROJECT_EMOJI_LIBRARY=['🐀','🕳️','🌳','⛲️','🏡','🛝','🎪','🎡','🌟','💦','💗','🚨'];

// Three stars are the default symbols for the three partner logos/bursts.
state.logoIcons=['🌟','🌟','🌟'];
try{localStorage.setItem('ex-casa-logo-icons-v2',JSON.stringify(state.logoIcons))}catch(e){}

function installProjectEmojiLibrary(){
  const panel=document.getElementById('editor-panel');
  if(!panel||document.getElementById('project-emoji-library'))return;
  const sections=[...panel.querySelectorAll('.section')];
  const placesSection=sections.find(sec=>/luoghi/i.test(sec.querySelector('.section-title')?.textContent||''));
  if(!placesSection)return;

  const box=document.createElement('div');
  box.id='project-emoji-library';
  box.style.margin='2px 0 10px';
  const label=document.createElement('div');
  label.className='coords';
  label.textContent='LIBRERIA ICONE PROGETTO';
  label.style.marginBottom='5px';
  const row=document.createElement('div');
  row.style.display='flex';row.style.flexWrap='wrap';row.style.gap='4px';
  PROJECT_EMOJI_LIBRARY.forEach(icon=>{
    const chip=document.createElement('span');
    chip.textContent=icon;
    chip.title='Icona disponibile per i luoghi';
    chip.style.cssText='display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;background:#fff;border:1.5px solid #050505;font-size:18px;line-height:1;';
    row.appendChild(chip);
  });
  box.append(label,row);
  const firstEditor=placesSection.querySelector('.place-editor');
  if(firstEditor)placesSection.insertBefore(box,firstEditor);else placesSection.appendChild(box);
}

const _setupProjectEmojiLibrary=setup;
setup=function(){
  _setupProjectEmojiLibrary();
  installProjectEmojiLibrary();
};

drawPlaceLabels=function(){
  const press=housePressAmount(),wave=houseWaveAmount();

  for(let i=0;i<state.places.length;i++){
    const p=state.places[i],S=state.scales.label,isHouse=i===0,bounce=arrivalBounceForPlace(i);
    const labelH=23;
    const labelY=72;

    push();
    translate(p.x,p.y+(isHouse?10*press*S:0));
    scale(S);

    if(isHouse){
      translate(p.w/2,labelY+labelH/2);
      scale(1+.04*press,1-.14*press);
      translate(-p.w/2,-(labelY+labelH/2));
    }

    push();
    translate(0,bounce);
    drawingContext.globalAlpha=1;
    noStroke();
    textAlign(CENTER,CENTER);
    textSize(58);
    text(p.icon||'',p.w/2,35);
    pop();

    textFont('Helvetica');
    textStyle(BOLD);
    textSize(9.5);
    const pillW=constrain(textWidth(p.name||'')+17,58,p.w);
    const pillX=(p.w-pillW)/2;

    if(isHouse&&press>.02)fill(lerpColor(color(COLORS.acid),color('#8B5CF6'),constrain(press,0,1)));
    else fill(i%2===0?COLORS.acid:COLORS.white);
    stroke(COLORS.black);
    strokeWeight(1.5+press*1.5);
    rect(pillX,labelY,pillW,labelH,labelH/2);

    noStroke();
    fill(COLORS.black);
    textAlign(CENTER,CENTER);
    text(p.name,p.w/2,labelY+labelH/2+.5);
    pop();

    if(isHouse&&wave>0){
      drawPinkWaves(p.x+(p.w*S)/2,p.y+35*S,wave,145*S,4);
    }
  }
};
