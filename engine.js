// STEP 5 — MONO BG + OLD-STYLE DRAGGABLE POPUPS + COMPOSE/PLAY/REC
const BASE_W = 1080;
const BASE_H = 1350;
const PANEL_W = 360;
const SEQUENCE_MS = 6500;

const COLORS = {
  black:'#090909',
  cream:'#FFF1CE',
  pink:'#FF78C8',
  blue:'#75B8FF',
  white:'#FFFFFF',
  chrome:'#F5F5F7',
  chromeBar:'#ECECEF'
};

const BG_PALETTE = [
  '#8D8D8A', // grey
  '#F1E9FF', // lilac
  '#91C792', // day green
  '#FFF1CE', // cream
  '#CFE8FF', // sky
  '#FFD7EA', // pink
  '#0B0B0F'  // black
];

const state = {
  bgColor: BG_PALETTE[0],
  title:'EX CASA DEL CUSTODE',
  year:'2026 / 2027',
  info:'GIARDINO DELLA MONTAGNOLA',
  footer:'@excasadelcustode',
  popups:[
    {date:'12.03.2026', title:'EVENTO 01', body:'Titolo / descrizione evento'},
    {date:'18.05.2026', title:'EVENTO 02', body:'Titolo / descrizione evento'},
    {date:'27.09.2026', title:'EVENTO 03', body:'Titolo / descrizione evento'}
  ],
  popupPositions:[
    {x:690,y:150},
    {x:710,y:440},
    {x:700,y:790}
  ],
  logos:[null,null,null],
  logoLabels:['ASAP','CUSTODIA','BOLOGNA']
};

const sequence = {
  mode:'compose', // compose | play | rec | final
  startedAt:0,
  elapsed:0,
  recorder:null,
  chunks:[]
};

let statusEl;
let draggingPopup = -1;
let dragOffX = 0;
let dragOffY = 0;
let view = {s:1, ox:0, oy:0, artViewportW:0};

const ratPath = [
  {x:250,y:1210}, {x:250,y:1030}, {x:360,y:1030}, {x:360,y:820},
  {x:175,y:820}, {x:175,y:650}, {x:205,y:650}, {x:205,y:555}
];

function setup(){
  createCanvas(windowWidth,windowHeight);
  pixelDensity(1);
  noSmooth();
  textFont('Helvetica, Arial, sans-serif');
  buildEditor();
}

function draw(){
  background(state.bgColor);
  if(sequence.mode==='play' || sequence.mode==='rec'){
    sequence.elapsed=millis()-sequence.startedAt;
    if(sequence.elapsed>=SEQUENCE_MS) finishSequence();
  }

  view.artViewportW=max(320,width-PANEL_W);
  const margin=18;
  view.s=min((view.artViewportW-margin*2)/BASE_W,(height-margin*2)/BASE_H);
  view.ox=max(margin,(view.artViewportW-BASE_W*view.s)/2);
  view.oy=(height-BASE_H*view.s)/2;

  push();
  translate(view.ox,view.oy);
  scale(view.s);
  drawMap();
  drawIdentity();
  if(sequence.mode==='compose' || sequence.mode==='final') drawFinalComposition();
  else drawAnimatedSequence();
  pop();
}

function buildEditor(){
  const panel=createDiv(); panel.id('editor-panel');
  createElement('h1','EX CASA / MAP EDITOR').parent(panel);
  const sub=createDiv('compose → play → rec'); sub.class('sub'); sub.parent(panel);

  const controls=makeSection(panel,'Sequenza');
  const row=createDiv(); row.class('control-row'); row.parent(controls);
  makeControlButton(row,'COMPOSE',setCompose);
  makeControlButton(row,'▶ PLAY',()=>startSequence(false));
  makeControlButton(row,'● REC',()=>startSequence(true));
  statusEl=createDiv('COMPOSE MODE'); statusEl.class('rec-status'); statusEl.parent(controls);

  const bg=makeSection(panel,'Background');
  const palette=createDiv(); palette.class('palette'); palette.parent(bg);
  BG_PALETTE.forEach(c=>{
    const sw=createButton(''); sw.class('swatch'); sw.parent(palette);
    sw.style('background',c); sw.attribute('title',c);
    sw.mousePressed(()=>state.bgColor=c);
  });

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
    const coords=createDiv(`x ${round(state.popupPositions[i].x)} · y ${round(state.popupPositions[i].y)}`);
    coords.id(`coords-${i}`); coords.class('coords'); coords.parent(section);
  }

  const logos=makeSection(panel,'Loghi PNG');
  for(let i=0;i<3;i++){
    const wrap=createDiv(); wrap.class('field logo-input'); wrap.parent(logos);
    createElement('label',`Logo ${i+1} · ${state.logoLabels[i]}`).parent(wrap);
    const input=createFileInput(f=>handleLogo(f,i)); input.parent(wrap); input.attribute('accept','image/png,image/*');
  }

  const hint=createDiv('COMPOSE: trascina i popup sulla grafica. Le coordinate vengono mantenute e PLAY/REC li farà apparire negli stessi punti.');
  hint.class('hint'); hint.parent(panel);
}

function makeControlButton(parent,label,fn){const b=createButton(label);b.class('control-button');b.parent(parent);b.mousePressed(fn);}
function makeSection(parent,title){const s=createDiv();s.class('section');s.parent(parent);const t=createDiv(title);t.class('section-title');t.parent(s);return s;}
function makeTextField(parent,labelText,value,onChange){const w=createDiv();w.class('field');w.parent(parent);createElement('label',labelText).parent(w);const i=createInput(value);i.parent(w);i.input(()=>onChange(i.value()));return i;}
function makeTextareaField(parent,labelText,value,onChange){const w=createDiv();w.class('field');w.parent(parent);createElement('label',labelText).parent(w);const t=createElement('textarea',value);t.parent(w);t.input(()=>onChange(t.value()));return t;}
function handleLogo(file,index){if(!file||file.type!=='image')return;loadImage(file.data,img=>state.logos[index]=img);}

function setCompose(){
  stopRecording(false);
  sequence.mode='compose'; sequence.elapsed=0; setStatus('COMPOSE MODE');
}
function startSequence(recording){
  if(sequence.mode==='play'||sequence.mode==='rec')return;
  sequence.mode=recording?'rec':'play'; sequence.startedAt=millis(); sequence.elapsed=0;
  setStatus(recording?'● RECORDING':'PLAYING'); if(recording)startRecording();
}
function finishSequence(){
  const wasRec=sequence.mode==='rec'; sequence.mode='final'; sequence.elapsed=SEQUENCE_MS; setStatus('FINAL FRAME'); if(wasRec)stopRecording(true);
}
function setStatus(t){if(statusEl)statusEl.html(t);}

function startRecording(){
  try{
    const stream=canvas.captureStream(60);
    const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
    sequence.chunks=[]; sequence.recorder=new MediaRecorder(stream,{mimeType:mime});
    sequence.recorder.ondataavailable=e=>{if(e.data&&e.data.size)sequence.chunks.push(e.data)};
    sequence.recorder.onstop=saveRecording; sequence.recorder.start();
  }catch(err){console.warn(err);setStatus('REC NON DISPONIBILE');}
}
function stopRecording(save=true){if(sequence.recorder&&sequence.recorder.state!=='inactive'){if(!save)sequence.recorder.onstop=null;sequence.recorder.stop();}}
function saveRecording(){if(!sequence.chunks.length)return;const blob=new Blob(sequence.chunks,{type:'video/webm'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`ex-casa-${Date.now()}.webm`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}

function drawMap(){
  // one flat colour only
  noStroke(); fill(state.bgColor); rect(0,0,BASE_W,BASE_H);

  // soft, rough Pac-Man-like tunnels
  stroke(COLORS.black); strokeWeight(76); strokeCap(ROUND); strokeJoin(ROUND); noFill();
  drawPath([[70,310],[365,310],[365,120]]);
  drawPath([[365,310],[700,310],[700,120]]);
  drawPath([[700,310],[1010,310]]);
  drawPath([[145,310],[145,690],[335,690],[335,1000]]);
  drawPath([[335,690],[550,690],[550,940]]);
  drawPath([[550,690],[895,690],[895,360]]);
  drawPath([[895,690],[895,995],[690,995]]);
  drawPath([[335,1000],[145,1000],[145,1250],[550,1250]]);
  drawPath([[550,940],[550,1250],[900,1250],[900,995]]);

  noStroke();
  drawHouse(205,555,1.05);
  drawFountain(550,690);
  drawFilla(755,845);
  drawEntrance(550,130,'PINCIO');
  drawEntrance(250,1215,'VIA IRNERIO');
}
function drawPath(points){beginShape();for(const p of points)vertex(p[0],p[1]);endShape();}

function drawIdentity(){
  const ink=isDark(state.bgColor)?COLORS.white:COLORS.black;
  fill(ink);noStroke();textAlign(LEFT,TOP);textStyle(BOLD);textSize(30);text(state.title||'',55,28);
  textStyle(NORMAL);textSize(18);text(state.year||'',58,68);textSize(13);text(state.info||'',58,95);
  textAlign(LEFT,BOTTOM);textSize(12);text(state.footer||'',55,BASE_H-26);
}
function isDark(hex){const c=color(hex);return (red(c)+green(c)+blue(c))/3<100;}

function drawFinalComposition(){for(let i=0;i<3;i++)drawPopupCard(i,1);drawLogos(1);}
function drawAnimatedSequence(){
  const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1);
  const ratEnd=.38,p1=.46,p2=.59,p3=.72,logos=.84;
  const pos=pointOnPolyline(ratPath,easeInOutCubic(constrain(t/ratEnd,0,1))); drawRat(pos.x,pos.y);
  if(t>=ratEnd&&t<p1){const s=1.05+sin(frameCount*.45)*.14;drawHouse(205,555,s);}
  if(t>=p1)drawPopupCard(0,popupEase(t,p1));
  if(t>=p2)drawPopupCard(1,popupEase(t,p2));
  if(t>=p3)drawPopupCard(2,popupEase(t,p3));
  if(t>=logos)drawLogos(constrain((t-logos)/.08,0,1));
}
function popupEase(t,start){return easeOutBack(constrain((t-start)/.08,0,1));}
function pointOnPolyline(points,tt){let total=0,lens=[];for(let i=0;i<points.length-1;i++){const l=dist(points[i].x,points[i].y,points[i+1].x,points[i+1].y);lens.push(l);total+=l;}let target=tt*total;for(let i=0;i<lens.length;i++){if(target<=lens[i]){const q=target/lens[i];return{x:lerp(points[i].x,points[i+1].x,q),y:lerp(points[i].y,points[i+1].y,q)}}target-=lens[i];}return points[points.length-1];}
function easeInOutCubic(x){return x<.5?4*x*x*x:1-pow(-2*x+2,3)/2;}
function easeOutBack(x){const c1=1.70158,c3=c1+1;return 1+c3*pow(x-1,3)+c1*pow(x-1,2);}
function drawRat(x,y){textAlign(CENTER,CENTER);textSize(58);noStroke();text('🐁',x,y);}

function popupSize(i){
  const d=state.popups[i];
  const bodyLen=(d.body||'').length;
  return {w:300,h:bodyLen>90?210:180};
}

function drawPopupCard(i,scaleAmt){
  const d=state.popups[i],p=state.popupPositions[i],sz=popupSize(i),w=sz.w,h=sz.h;
  push();translate(p.x+w/2,p.y+h/2);scale(scaleAmt);translate(-w/2,-h/2);

  // OLD TOOL STYLE
  noStroke();fill(COLORS.chrome);rect(0,0,w,h,16);
  stroke(0,35);strokeWeight(1);noFill();rect(0,0,w,h,16);
  noStroke();fill(COLORS.chromeBar);rect(0,0,w,34,16,16,0,0);
  fill(0,105);circle(18,17,10);circle(34,17,10);circle(50,17,10);

  const pad=16;
  fill(COLORS.black);textAlign(LEFT,TOP);textStyle(NORMAL);textSize(12);text(d.date||'',pad,48);
  textStyle(BOLD);textSize(22);text(d.title||'',pad,70,w-pad*2,42);
  textStyle(NORMAL);textSize(16);text(d.body||'',pad,116,w-pad*2,h-128);
  pop();
}

function drawLogos(a){
  const xs=[820,910,1000],y=1240,d=68;
  for(let i=0;i<3;i++){
    push();translate(xs[i],y);scale(a);fill(COLORS.white);stroke(0,40);strokeWeight(1);circle(0,0,d);
    const img=state.logos[i];
    if(img){const m=d*.68,s=min(m/img.width,m/img.height);imageMode(CENTER);image(img,0,0,img.width*s,img.height*s);imageMode(CORNER);}
    else{noStroke();fill(COLORS.black);textAlign(CENTER,CENTER);textStyle(BOLD);textSize(10);text(state.logoLabels[i],0,0);textStyle(NORMAL);}
    pop();
  }
}

function drawHouse(x,y,s=1){push();translate(x,y);scale(s);rectMode(CENTER);noStroke();fill(COLORS.white);rect(0,14,82,70,8);fill(COLORS.pink);triangle(-50,-18,0,-62,50,-18);fill(COLORS.black);rect(-22,8,15,20);rect(22,8,15,20);rect(0,32,18,34);fill(COLORS.pink);textAlign(CENTER,CENTER);textSize(30);text('♥',0,6);rectMode(CORNER);pop();}
function drawFountain(x,y){push();translate(x,y);rectMode(CENTER);noStroke();fill(COLORS.blue);rect(0,0,112,112,18);fill(COLORS.white);textAlign(CENTER,CENTER);textSize(40);text('♒',0,-2);rectMode(CORNER);pop();}
function drawFilla(x,y){push();translate(x,y);rectMode(CENTER);noStroke();fill(COLORS.white);rect(0,0,70,54,10);fill(COLORS.black);textAlign(CENTER,CENTER);textSize(14);text('FILLA',0,0);rectMode(CORNER);pop();}
function drawEntrance(x,y,label){push();translate(x,y);rectMode(CENTER);noStroke();fill(COLORS.white);rect(0,0,label==='PINCIO'?140:190,54,9);fill(COLORS.black);textAlign(CENTER,CENTER);textStyle(BOLD);textSize(16);text(label,0,0);textStyle(NORMAL);rectMode(CORNER);pop();}

function screenToBase(mx,my){return{x:(mx-view.ox)/view.s,y:(my-view.oy)/view.s};}
function hitPopup(bx,by){
  for(let i=2;i>=0;i--){const p=state.popupPositions[i],sz=popupSize(i);if(bx>=p.x&&bx<=p.x+sz.w&&by>=p.y&&by<=p.y+sz.h)return i;}
  return -1;
}
function mousePressed(){
  if(sequence.mode!=='compose'&&sequence.mode!=='final')return;
  if(mouseX>=view.artViewportW)return;
  const b=screenToBase(mouseX,mouseY); const hit=hitPopup(b.x,b.y);
  if(hit!==-1){draggingPopup=hit;dragOffX=b.x-state.popupPositions[hit].x;dragOffY=b.y-state.popupPositions[hit].y;}
}
function mouseDragged(){
  if(draggingPopup===-1)return;
  const b=screenToBase(mouseX,mouseY),sz=popupSize(draggingPopup);
  const p=state.popupPositions[draggingPopup];
  p.x=constrain(b.x-dragOffX,10,BASE_W-sz.w-10);
  p.y=constrain(b.y-dragOffY,10,BASE_H-sz.h-10);
  const c=document.getElementById(`coords-${draggingPopup}`);if(c)c.textContent=`x ${round(p.x)} · y ${round(p.y)}`;
}
function mouseReleased(){draggingPopup=-1;}
function windowResized(){resizeCanvas(windowWidth,windowHeight);}
