// STEP 4 — COMPOSE / PLAY / REC
const BASE_W = 1080;
const BASE_H = 1350;
const PANEL_W = 360;
const SEQUENCE_MS = 6500;

const COLORS = {
  grey: '#8D8D8A',
  green: '#91C792',
  green2: '#83BA84',
  black: '#050505',
  blue: '#75B8FF',
  cream: '#FFF1CE',
  pink: '#FF78C8',
  white: '#FFFFFF'
};

const state = {
  title: 'EX CASA DEL CUSTODE',
  year: '2026 / 2027',
  info: 'GIARDINO DELLA MONTAGNOLA',
  footer: '@excasadelcustode',
  popups: [
    { date: '12.03.2026', title: 'EVENTO 01', body: 'Titolo / descrizione evento' },
    { date: '18.05.2026', title: 'EVENTO 02', body: 'Titolo / descrizione evento' },
    { date: '27.09.2026', title: 'EVENTO 03', body: 'Titolo / descrizione evento' }
  ],
  logos: [null, null, null],
  logoLabels: ['ASAP', 'CUSTODIA', 'BOLOGNA']
};

const sequence = {
  mode: 'compose', // compose | play | rec | final
  startedAt: 0,
  elapsed: 0,
  recorder: null,
  chunks: []
};

let statusEl;

const ratPath = [
  {x:250,y:1210}, {x:250,y:1035}, {x:330,y:1035}, {x:330,y:820},
  {x:170,y:820}, {x:170,y:650}, {x:205,y:650}, {x:205,y:555}
];

const popupPositions = [
  {x:705,y:150},
  {x:735,y:405},
  {x:705,y:805}
];

function setup(){
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noSmooth();
  textFont('monospace');
  buildEditor();
}

function draw(){
  background(COLORS.grey);
  if(sequence.mode === 'play' || sequence.mode === 'rec'){
    sequence.elapsed = millis() - sequence.startedAt;
    if(sequence.elapsed >= SEQUENCE_MS) finishSequence();
  }

  const artViewportW = max(320, width - PANEL_W);
  const margin = 18;
  const s = min((artViewportW-margin*2)/BASE_W, (height-margin*2)/BASE_H);
  const ox = max(margin,(artViewportW-BASE_W*s)/2);
  const oy = (height-BASE_H*s)/2;

  push();
  translate(ox,oy);
  scale(s);
  drawMap();
  drawIdentity();
  if(sequence.mode === 'compose' || sequence.mode === 'final') drawFinalComposition();
  else drawAnimatedSequence();
  pop();
}

function buildEditor(){
  const panel=createDiv(); panel.id('editor-panel');
  createElement('h1','EX CASA / MAP EDITOR').parent(panel);
  const sub=createDiv('componi → prova → registra'); sub.class('sub'); sub.parent(panel);

  const controls=makeSection(panel,'Sequenza');
  const row=createDiv(); row.class('control-row'); row.parent(controls);
  makeControlButton(row,'COMPOSE',()=>setCompose());
  makeControlButton(row,'▶ PLAY',()=>startSequence(false));
  makeControlButton(row,'● REC',()=>startSequence(true));
  statusEl=createDiv('COMPOSE MODE'); statusEl.class('rec-status'); statusEl.parent(controls);

  const identity=makeSection(panel,'Identità');
  makeTextField(identity,'Titolo',state.title,v=>state.title=v);
  makeTextField(identity,'Anno / edizione',state.year,v=>state.year=v);
  makeTextField(identity,'Info',state.info,v=>state.info=v);
  makeTextField(identity,'Footer / IG',state.footer,v=>state.footer=v);

  for(let i=0;i<3;i++){
    const section=makeSection(panel,`Popup ${i+1}`);
    const grid=createDiv(); grid.class('popup-grid'); grid.parent(section);
    makeTextField(grid,'Data',state.popups[i].date,v=>state.popups[i].date=v);
    makeTextField(grid,'Titolo',state.popups[i].title,v=>state.popups[i].title=v);
    makeTextareaField(section,'Testo',state.popups[i].body,v=>state.popups[i].body=v);
  }

  const logos=makeSection(panel,'Loghi PNG');
  for(let i=0;i<3;i++){
    const wrap=createDiv(); wrap.class('field logo-input'); wrap.parent(logos);
    createElement('label',`Logo ${i+1} · ${state.logoLabels[i]}`).parent(wrap);
    const input=createFileInput(f=>handleLogo(f,i)); input.parent(wrap); input.attribute('accept','image/png,image/*');
  }
  const hint=createDiv('COMPOSE mostra il frame finale. PLAY prova la sequenza. REC ripete la stessa sequenza e salva il video.');
  hint.class('hint'); hint.parent(panel);
}

function makeControlButton(parent,label,fn){ const b=createButton(label); b.class('control-button'); b.parent(parent); b.mousePressed(fn); }
function makeSection(parent,title){ const s=createDiv(); s.class('section'); s.parent(parent); const t=createDiv(title); t.class('section-title'); t.parent(s); return s; }
function makeTextField(parent,labelText,value,onChange){ const w=createDiv(); w.class('field'); w.parent(parent); createElement('label',labelText).parent(w); const i=createInput(value); i.parent(w); i.input(()=>onChange(i.value())); return i; }
function makeTextareaField(parent,labelText,value,onChange){ const w=createDiv(); w.class('field'); w.parent(parent); createElement('label',labelText).parent(w); const t=createElement('textarea',value); t.parent(w); t.input(()=>onChange(t.value())); return t; }
function handleLogo(file,index){ if(!file||file.type!=='image')return; loadImage(file.data,img=>state.logos[index]=img); }

function setCompose(){
  stopRecording(false);
  sequence.mode='compose'; sequence.elapsed=0;
  setStatus('COMPOSE MODE');
}

function startSequence(recording){
  if(sequence.mode==='play'||sequence.mode==='rec') return;
  sequence.mode=recording?'rec':'play';
  sequence.startedAt=millis(); sequence.elapsed=0;
  setStatus(recording?'● RECORDING':'PLAYING');
  if(recording) startRecording();
}

function finishSequence(){
  const wasRec=sequence.mode==='rec';
  sequence.mode='final'; sequence.elapsed=SEQUENCE_MS;
  setStatus('FINAL FRAME');
  if(wasRec) stopRecording(true);
}

function setStatus(txt){ if(statusEl)statusEl.html(txt); }

function startRecording(){
  try{
    const stream=canvas.captureStream(60);
    const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
    sequence.chunks=[];
    sequence.recorder=new MediaRecorder(stream,{mimeType:mime});
    sequence.recorder.ondataavailable=e=>{if(e.data&&e.data.size)sequence.chunks.push(e.data)};
    sequence.recorder.onstop=saveRecording;
    sequence.recorder.start();
  }catch(err){ console.warn(err); setStatus('REC NON DISPONIBILE'); }
}
function stopRecording(save=true){
  if(sequence.recorder&&sequence.recorder.state!=='inactive'){
    if(!save) sequence.recorder.onstop=null;
    sequence.recorder.stop();
  }
}
function saveRecording(){
  if(!sequence.chunks.length)return;
  const blob=new Blob(sequence.chunks,{type:'video/webm'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`ex-casa-${Date.now()}.webm`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

function drawMap(){
  noStroke(); fill(COLORS.grey); rect(0,0,BASE_W,BASE_H);

  // pochi prati grandi, morbidi e grezzi
  fill(COLORS.green);
  rect(65,110,285,210,28);
  rect(390,105,250,160,28);
  rect(760,115,255,205,28);
  rect(80,390,220,240,32);
  rect(360,360,240,160,30);
  rect(720,365,280,230,32);
  rect(70,745,250,220,34);
  rect(375,700,300,230,34);
  rect(760,730,245,220,34);
  rect(80,1030,290,215,36);
  rect(430,1020,170,170,30);
  rect(690,1015,315,210,36);

  // cunicoli: pochi segni neri spessi e arrotondati
  stroke(COLORS.black); strokeWeight(78); strokeCap(ROUND); strokeJoin(ROUND); noFill();
  drawPath([[45,345],[380,345],[380,120]]);
  drawPath([[380,345],[705,345],[705,120]]);
  drawPath([[705,345],[1035,345]]);
  drawPath([[150,345],[150,690],[330,690],[330,990]]);
  drawPath([[330,690],[550,690],[550,930]]);
  drawPath([[550,690],[875,690],[875,360]]);
  drawPath([[875,690],[875,990],[690,990]]);
  drawPath([[330,990],[150,990],[150,1260],[550,1260]]);
  drawPath([[550,930],[550,1260],[900,1260],[900,990]]);

  noStroke();
  drawHouse(205,555,1.05);
  drawFountain(550,690);
  drawFilla(755,845);
  drawEntrance(550,130,'PINCIO');
  drawEntrance(250,1215,'VIA IRNERIO');
}

function drawPath(points){ beginShape(); for(const p of points)vertex(p[0],p[1]); endShape(); }

function drawIdentity(){
  fill(COLORS.white); noStroke(); textAlign(LEFT,TOP); textStyle(BOLD); textSize(28); text(state.title||'',55,28);
  textStyle(NORMAL); textSize(18); text(state.year||'',58,65); textSize(13); text(state.info||'',58,91);
  textAlign(LEFT,BOTTOM); textSize(12); text(state.footer||'',55,BASE_H-26);
}

function drawFinalComposition(){
  for(let i=0;i<3;i++) drawPopupCard(i,1);
  drawLogos(1);
}

function drawAnimatedSequence(){
  const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1);
  const ratEnd=.38, p1=.46, p2=.59, p3=.72, logos=.84;
  const pos=pointOnPolyline(ratPath,easeInOutCubic(constrain(t/ratEnd,0,1)));
  drawRat(pos.x,pos.y);
  if(t>=ratEnd&&t<p1){ const s=1.05+sin(frameCount*.45)*.14; drawHouse(205,555,s); }
  if(t>=p1)drawPopupCard(0,popupEase(t,p1));
  if(t>=p2)drawPopupCard(1,popupEase(t,p2));
  if(t>=p3)drawPopupCard(2,popupEase(t,p3));
  if(t>=logos)drawLogos(constrain((t-logos)/.08,0,1));
}

function popupEase(t,start){ return easeOutBack(constrain((t-start)/.08,0,1)); }
function pointOnPolyline(points,tt){ let total=0,lens=[]; for(let i=0;i<points.length-1;i++){const l=dist(points[i].x,points[i].y,points[i+1].x,points[i+1].y);lens.push(l);total+=l;} let target=tt*total; for(let i=0;i<lens.length;i++){if(target<=lens[i]){const q=target/lens[i];return{x:lerp(points[i].x,points[i+1].x,q),y:lerp(points[i].y,points[i+1].y,q)}}target-=lens[i];}return points[points.length-1]; }
function easeInOutCubic(x){return x<.5?4*x*x*x:1-pow(-2*x+2,3)/2}
function easeOutBack(x){const c1=1.70158,c3=c1+1;return 1+c3*pow(x-1,3)+c1*pow(x-1,2)}

function drawRat(x,y){ textAlign(CENTER,CENTER); textSize(58); noStroke(); text('🐁',x,y); }

function drawPopupCard(i,scaleAmt){
  const d=state.popups[i],p=popupPositions[i],w=300,h=178;
  push(); translate(p.x+w/2,p.y+h/2); scale(scaleAmt); translate(-w/2,-h/2);
  fill(COLORS.cream); stroke(COLORS.black); strokeWeight(4); rect(0,0,w,h,10);
  noStroke(); fill(COLORS.pink); rect(0,0,w,34,10,10,0,0);
  fill(COLORS.black); textAlign(LEFT,CENTER); textStyle(BOLD); textSize(13); text(`EVENTO ${i+1}`,12,17);
  textStyle(NORMAL); textAlign(LEFT,TOP); textSize(12); text(d.date||'',14,48);
  textStyle(BOLD); textSize(18); text(d.title||'',14,70,w-28,40);
  textStyle(NORMAL); textSize(12); text(d.body||'',14,112,w-28,54);
  pop();
}

function drawLogos(a){
  const xs=[820,910,1000],y=1240,d=68;
  for(let i=0;i<3;i++){
    push(); translate(xs[i],y); scale(a); fill(i===0?COLORS.pink:i===1?COLORS.cream:COLORS.green); noStroke(); circle(0,0,d);
    const img=state.logos[i];
    if(img){ const m=d*.68,s=min(m/img.width,m/img.height); imageMode(CENTER); image(img,0,0,img.width*s,img.height*s); imageMode(CORNER); }
    else{ fill(COLORS.black); textAlign(CENTER,CENTER); textStyle(BOLD); textSize(10); text(state.logoLabels[i],0,0); textStyle(NORMAL); }
    pop();
  }
}

function drawHouse(x,y,s=1){
  push(); translate(x,y); scale(s); rectMode(CENTER); noStroke(); fill(COLORS.cream); rect(0,14,82,70,8); fill(COLORS.pink); triangle(-50,-18,0,-62,50,-18); fill(COLORS.black); rect(-22,8,15,20); rect(22,8,15,20); rect(0,32,18,34); fill(COLORS.pink); textAlign(CENTER,CENTER); textSize(30); text('♥',0,6); rectMode(CORNER); pop();
}
function drawFountain(x,y){ push(); translate(x,y); rectMode(CENTER); noStroke(); fill(COLORS.blue); rect(0,0,112,112,18); fill(COLORS.white); textAlign(CENTER,CENTER); textSize(40); text('♒',0,-2); rectMode(CORNER); pop(); }
function drawFilla(x,y){ push(); translate(x,y); rectMode(CENTER); noStroke(); fill(COLORS.cream); rect(0,0,70,54,10); fill(COLORS.black); textAlign(CENTER,CENTER); textSize(14); text('FILLA',0,0); rectMode(CORNER); pop(); }
function drawEntrance(x,y,label){ push(); translate(x,y); rectMode(CENTER); noStroke(); fill(COLORS.cream); rect(0,0,label==='PINCIO'?140:190,54,9); fill(COLORS.black); textAlign(CENTER,CENTER); textStyle(BOLD); textSize(16); text(label,0,0); textStyle(NORMAL); rectMode(CORNER); pop(); }

function windowResized(){ resizeCanvas(windowWidth,windowHeight); }
