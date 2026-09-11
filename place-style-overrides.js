// STEP 29 — larger place icons + finer pill labels
// Loaded last so this only changes the visual proportions of landmarks.

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

    // Landmark icon is deliberately much more prominent than its caption.
    push();
    translate(0,bounce);
    drawingContext.globalAlpha=1;
    noStroke();
    textAlign(CENTER,CENTER);
    textSize(58);
    text(p.icon||'',p.w/2,35);
    pop();

    // Thin compact pill: less vertical mass and tighter horizontal padding.
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
