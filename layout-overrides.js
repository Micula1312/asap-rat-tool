// Layout refinements: bottom logos + ARCI star slot
state.logoIcons = state.logoIcons || ['♥','♥','♥'];
state.arciLogo = state.arciLogo || null;

const _baseBuildEditor = buildEditor;
buildEditor = function(){
  _baseBuildEditor();
  const sections = selectAll('#editor-panel .section');
  const logos = sections[sections.length-1];
  if(!logos) return;

  const iconTitle=createDiv('ICONE DA SCOPPIARE');
  iconTitle.class('coords');
  iconTitle.parent(logos);
  for(let i=0;i<3;i++){
    makeTextField(logos,`Icona logo ${i+1}`,state.logoIcons[i]||'♥',v=>state.logoIcons[i]=v||'♥');
  }

  const arciWrap=createDiv();
  arciWrap.class('field logo-input');
  arciWrap.parent(logos);
  createElement('label','STELLA ARCI — PNG / SVG RASTERIZZATO').parent(arciWrap);
  const arciInput=createFileInput(file=>{
    if(!file||file.type!=='image')return;
    loadImage(file.data,img=>state.arciLogo=img);
  });
  arciInput.parent(arciWrap);
  arciInput.attribute('accept','image/png,image/*');
  const hint=createDiv('Compare in alto a destra. Se non carichi il file resta una ★ come placeholder.');
  hint.class('coords');
  hint.parent(logos);
};

const _baseDrawIdentity = drawIdentity;
drawIdentity = function(){
  _baseDrawIdentity();
  drawArciStar();
};

function drawArciStar(){
  const x=985,y=72,d=82;
  push();translate(x,y);
  if(state.arciLogo){
    const img=state.arciLogo,m=d,s=min(m/img.width,m/img.height);
    imageMode(CENTER);image(img,0,0,img.width*s,img.height*s);imageMode(CORNER);
  }else{
    noStroke();fill(COLORS.black);textAlign(CENTER,CENTER);textSize(72);text('★',0,2);
  }
  pop();
}

// Bottom row: aligned with the footer / blue guide shown in the reference.
drawLogoSlot = function(i,logoAmount,iconScale){
  const xs=[800,890,980],y=1295,d=66,x=xs[i],icon=state.logoIcons?.[i]||'♥';
  push();translate(x,y);
  if(logoAmount<.98){
    push();scale(iconScale);noStroke();fill(COLORS.pink);textAlign(CENTER,CENTER);textSize(54);text(icon,0,0);pop();
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

drawHeartBurst = function(i,q){
  const xs=[800,890,980],y=1295,x=xs[i],icon=state.logoIcons?.[i]||'♥';
  push();translate(x,y);noStroke();fill(COLORS.pink);
  for(let k=0;k<8;k++){
    const a=TWO_PI*k/8,r=18+q*58;
    push();translate(cos(a)*r,sin(a)*r);textAlign(CENTER,CENTER);textSize(18*(1-q)+5);text(icon,0,0);pop();
  }
  pop();
};

// Oversized finale: only a fragment of the mouse is visible while it crosses.
drawStrobeFinal = function(){
  const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1),q=constrain((t-.86)/.14,0,1),flash=floor(sequence.elapsed/95);
  const c=BG_PALETTE[(flash+sequence.strobeOffset)%BG_PALETTE.length];
  noStroke();fill(c);rect(0,0,BASE_W,BASE_H);drawIdentity();
  const size=2100,pad=size*.72,x=sequence.finalDir===1?lerp(-pad,BASE_W+pad,q):lerp(BASE_W+pad,-pad,q);
  push();translate(x,sequence.finalY);if(sequence.finalDir<0)scale(-1,1);textAlign(CENTER,CENTER);textSize(size);noStroke();text('🐁',0,0);pop();
};
