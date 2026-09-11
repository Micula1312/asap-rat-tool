const W = 1080;
const H = 1350;
const PANEL_W = 300;

const BUILD_MS = 5000;
const BG = '#111111';
const GREEN = '#7BE495';
const GREEN_2 = '#55CC7A';
const CREAM = '#FFF1CE';
const PINK = '#FF78C8';
const BLUE = '#72B7FF';
const BLACK = '#111111';
const WHITE = '#FFFFFF';

let startedAt = 0;
let running = true;
let finalMode = false;
let speedMul = 1;
let rats = [];
let activePopup = -1;
let popupUntil = 0;
let revealed = new Set();

const blocks = [
  [80,120,230,110],[340,90,160,170],[540,110,210,110],[790,95,190,160],
  [110,290,160,180],[300,310,220,110],[560,300,150,190],[750,300,230,110],
  [100,520,210,120],[350,500,170,210],[560,520,210,120],[810,500,150,200],
  [85,760,170,180],[300,740,210,120],[555,750,150,190],[760,740,220,130],
  [120,1010,210,120],[380,980,170,190],[590,1010,220,110],[840,980,120,190]
];

const events = [
  { id:0, x:265, y:390, icon:'🧀', date:'12.03', title:'EVENTO 01', body:'FOOD FOR THOUGHT' },
  { id:1, x:735, y:570, icon:'🏠', date:'18.05', title:'EVENTO 02', body:'CASA DEL CUSTODE' },
  { id:2, x:460, y:875, icon:'🕳️', date:'27.09', title:'EVENTO 03', body:'IN THE HOLE' }
];

const logoDots = [
  {x:835,y:1210,label:'ASAP',fill:PINK},
  {x:925,y:1210,label:'CUST',fill:CREAM},
  {x:1015,y:1210,label:'BO',fill:GREEN}
];

function setup(){
  createCanvas(W + PANEL_W, H);
  pixelDensity(1);
  noSmooth();
  textFont('monospace');
  resetEngine();
}

function resetEngine(){
  startedAt = millis();
  running = true;
  finalMode = false;
  activePopup = -1;
  popupUntil = 0;
  revealed.clear();
  rats = [];
  for(let i=0;i<6;i++) rats.push(makeRat(i));
}

function makeRat(i){
  const a = random(TWO_PI);
  const s = random(8,14);
  return {
    x: random(70,W-70),
    y: random(120,H-170),
    vx: cos(a)*s,
    vy: sin(a)*s,
    size: random(44,68),
    char: i%3===0 ? '🐀' : '🐁',
    trail: []
  };
}

function draw(){
  background(235);
  push();
  clipArt();
  drawStage();
  pop();
  drawPanel();
}

function clipArt(){
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(0,0,W,H);
  drawingContext.clip();
}

function unclipArt(){ drawingContext.restore(); }

function drawStage(){
  noStroke();
  fill(BG); rect(0,0,W,H);

  const elapsed = millis()-startedAt;
  const p = constrain(elapsed/BUILD_MS,0,1);

  drawHeader(p);
  drawTetrisMap(p);
  drawEventLayer(p);
  drawLogoDots(p);

  if(running && !finalMode){
    updateRats();
    if(elapsed >= BUILD_MS){
      finalMode = true;
      running = false;
      revealEverything();
    }
  }

  drawRats(p);
  drawPopup();
  drawProgress(p);
  unclipArt();
}

function drawHeader(p){
  fill(PINK); noStroke();
  textAlign(LEFT,TOP);
  textStyle(BOLD); textSize(48);
  text('ASAP',42,34);
  textStyle(NORMAL); textSize(18); fill(WHITE);
  text('MONTAGNOLA / BUILD 2025',44,92);

  fill(255,170); textSize(14);
  text('RAT COLLISION ENGINE',W-255,42);
  text(nf(floor(p*5),2)+':'+nf(floor((p*5%1)*100),2),W-255,67);
}

function drawTetrisMap(p){
  const n = floor(map(p,0,0.76,0,blocks.length+1,true));
  for(let i=0;i<n;i++){
    const b = blocks[i];
    const alt = i%4;
    fill(alt===0?GREEN:alt===1?GREEN_2:alt===2?CREAM:GREEN);
    rect(b[0],b[1],b[2],b[3]);
  }

  // orthogonal pathways assemble after blocks
  if(p>0.18){
    stroke(CREAM); strokeWeight(30); noFill();
    line(180,170,180,1110);
    line(180,650,900,650);
  }
  if(p>0.32){
    line(520,170,520,1110);
    line(520,360,920,360);
  }
  if(p>0.46){
    line(760,170,760,1080);
    line(180,930,900,930);
  }

  // one deliberately simple central landmark
  if(p>0.55){
    noStroke(); fill(BLUE); rect(470,570,100,100);
    fill(WHITE); textAlign(CENTER,CENTER); textSize(32); text('●',520,620);
  }
}

function drawEventLayer(p){
  for(let i=0;i<events.length;i++){
    const e = events[i];
    const appearAt = 0.22 + i*0.18;
    if(p<appearAt && !revealed.has('event'+i)) continue;

    const touched = revealed.has('event'+i);
    const pulse = touched ? 1.15 + sin(frameCount*0.35)*0.12 : 1;
    push();
    translate(e.x,e.y);
    scale(pulse);
    textAlign(CENTER,CENTER);
    textSize(touched?72:54);
    text(e.icon,0,0);
    pop();

    if(touched || finalMode){
      drawEventTag(e, i);
    }
  }
}

function drawEventTag(e,i){
  const ox = i===1 ? -200 : 42;
  const oy = i===2 ? -95 : 32;
  const x = e.x+ox, y=e.y+oy;
  fill(BLACK); stroke(PINK); strokeWeight(2);
  rect(x,y,190,70);
  noStroke(); fill(PINK); textAlign(LEFT,TOP); textSize(14); text(e.date,x+12,y+10);
  fill(WHITE); textSize(13); text(e.body,x+12,y+32,166,30);
}

function updateRats(){
  for(const r of rats){
    r.x += r.vx*speedMul;
    r.y += r.vy*speedMul;

    if(r.x<25 || r.x>W-25){ r.vx*=-1; r.x=constrain(r.x,25,W-25); }
    if(r.y<115 || r.y>H-115){ r.vy*=-1; r.y=constrain(r.y,115,H-115); }

    // tiny random arcade deflection
    if(random()<0.025){
      const a=random(-0.35,0.35);
      const nvx=r.vx*cos(a)-r.vy*sin(a);
      const nvy=r.vx*sin(a)+r.vy*cos(a);
      r.vx=nvx; r.vy=nvy;
    }

    r.trail.push({x:r.x,y:r.y});
    if(r.trail.length>10) r.trail.shift();

    for(const e of events){
      if(dist(r.x,r.y,e.x,e.y) < 70){ triggerEvent(e.id); }
    }

    for(let i=0;i<logoDots.length;i++){
      const l=logoDots[i];
      if(dist(r.x,r.y,l.x,l.y)<60) revealed.add('logo'+i);
    }
  }
}

function drawRats(p){
  const showCount = max(1,floor(map(p,0,0.45,1,rats.length+1,true)));
  for(let i=0;i<showCount;i++){
    const r = rats[i];
    stroke(PINK); strokeWeight(3); noFill();
    beginShape();
    for(const q of r.trail) vertex(q.x,q.y);
    endShape();
    noStroke(); textAlign(CENTER,CENTER); textSize(r.size); text(r.char,r.x,r.y);
  }
}

function triggerEvent(id){
  const key='event'+id;
  if(revealed.has(key)) return;
  revealed.add(key);
  activePopup=id;
  popupUntil=millis()+520;
}

function drawPopup(){
  if(activePopup<0) return;
  if(millis()>popupUntil){ activePopup=-1; return; }
  const e=events[activePopup];
  const age=1-(popupUntil-millis())/520;
  const s=0.7 + sin(constrain(age,0,1)*PI)*0.4;

  push();
  translate(W/2,H/2);
  scale(s);
  translate(-W/2,-H/2);
  const pw=570,ph=250,px=(W-pw)/2,py=(H-ph)/2;
  fill(WHITE); stroke(BLACK); strokeWeight(5); rect(px,py,pw,ph);
  noStroke(); fill(BLACK); textAlign(LEFT,TOP);
  textSize(18); text(e.title+' / '+e.date,px+28,py+26);
  textSize(46); text(e.body,px+28,py+78,pw-56,110);
  textSize(54); textAlign(RIGHT,BOTTOM); text(e.icon,px+pw-28,py+ph-22);
  pop();
}

function drawLogoDots(p){
  for(let i=0;i<logoDots.length;i++){
    const l=logoDots[i];
    if(p < 0.72+i*0.06 && !revealed.has('logo'+i) && !finalMode) continue;
    fill(l.fill); noStroke(); circle(l.x,l.y,72);
    fill(BLACK); textAlign(CENTER,CENTER); textStyle(BOLD); textSize(13); text(l.label,l.x,l.y);
    textStyle(NORMAL);
  }
}

function drawProgress(p){
  noStroke(); fill(255,40); rect(40,H-55,W-80,12);
  fill(PINK); rect(40,H-55,(W-80)*p,12);
  fill(WHITE); textAlign(LEFT,BOTTOM); textSize(13);
  text(finalMode?'COMPOSITION COMPLETE':'BUILDING COMPOSITION...',40,H-68);

  if(finalMode){
    fill(PINK); textAlign(CENTER,CENTER); textStyle(BOLD); textSize(74);
    text('♥',W/2,H-145);
    fill(WHITE); textSize(22); text('ASAP',W/2,H-143);
    textStyle(NORMAL);
  }
}

function revealEverything(){
  for(let i=0;i<events.length;i++) revealed.add('event'+i);
  for(let i=0;i<logoDots.length;i++) revealed.add('logo'+i);
}

function drawPanel(){
  noStroke(); fill(248); rect(W,0,PANEL_W,H);
  stroke(0,30); line(W,0,W,H);
  noStroke(); fill(BLACK); textAlign(LEFT,TOP); textStyle(BOLD); textSize(18);
  text('RAT ENGINE',W+24,26);
  textStyle(NORMAL); textSize(12); fill(0,150);
  text('5 SEC COLLISION COMPOSITOR',W+24,54);

  drawButton(W+24,95,252,48,running?'PAUSE':'PLAY');
  drawButton(W+24,155,252,48,'RESET');

  fill(BLACK); textSize(13); text('SPEED',W+24,236);
  fill(PINK); rect(W+24,268,252,10);
  fill(BLACK); circle(map(speedMul,0.35,2.6,W+24,W+276),273,20);
  fill(0,160); textSize(12); text(speedMul.toFixed(2)+'x',W+24,292);

  fill(BLACK); textSize(13); text('COLLISIONS',W+24,342);
  let y=372;
  for(let i=0;i<events.length;i++){
    const e=events[i], on=revealed.has('event'+i);
    textSize(22); text(e.icon,W+24,y-5);
    textSize(12); fill(on?BLACK:color(0,80)); text(e.date+'  '+e.body,W+58,y);
    y+=44; fill(BLACK);
  }

  textSize(11); fill(0,130);
  text('CLICK ARTWORK = RESTART\nSPACE = PLAY / PAUSE',W+24,H-84);
}

function drawButton(x,y,w,h,label){
  fill(BLACK); noStroke(); rect(x,y,w,h);
  fill(WHITE); textAlign(CENTER,CENTER); textSize(14); text(label,x+w/2,y+h/2);
}

function mousePressed(){
  if(mouseX<W){ resetEngine(); return; }
  if(mouseX>W+24 && mouseX<W+276 && mouseY>95 && mouseY<143){ running=!running; return; }
  if(mouseX>W+24 && mouseX<W+276 && mouseY>155 && mouseY<203){ resetEngine(); return; }
  if(mouseX>W+24 && mouseX<W+276 && mouseY>250 && mouseY<300){
    speedMul = map(constrain(mouseX,W+24,W+276),W+24,W+276,0.35,2.6);
  }
}

function mouseDragged(){
  if(mouseX>W+24 && mouseX<W+276 && mouseY>245 && mouseY<305){
    speedMul = map(constrain(mouseX,W+24,W+276),W+24,W+276,0.35,2.6);
  }
}

function keyPressed(){
  if(key===' '){ running=!running; return false; }
  if(key==='r' || key==='R') resetEngine();
}
