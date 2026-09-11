// STEP 7 — FIX LUOGHI + EDITABLE PLACE ICONS
const BASE_W=1080, BASE_H=1350, PANEL_W=360, SEQUENCE_MS=6500;

const COLORS={black:'#090909',pink:'#FF78C8',white:'#FFFFFF',chrome:'#F5F5F7',chromeBar:'#ECECEF',blue:'#75B8FF'};
const BG_PALETTE=['#8D8D8A','#F1E9FF','#91C792','#FFF1CE','#CFE8FF','#FFD7EA','#0B0B0F'];
const PLACE_STORAGE_KEY='ex-casa-map-places-v1';

const DEFAULT_PLACES=[
  {name:'EX CASA DEL CUSTODE',icon:'🏠',x:75,y:620,w:220,iconSize:86},
  {name:'PINCIO',icon:'🗿',x:505,y:75,w:120,iconSize:46},
  {name:'FONTANA',icon:'⛲',x:485,y:655,w:130,iconSize:48},
  {name:'VIA IRNERIO',icon:'🚪',x:175,y:1215,w:160,iconSize:42},
  {name:'FILLA',icon:'🍸',x:720,y:900,w:110,iconSize:46}
];

const state={
  bgColor:BG_PALETTE[1], showGrid:true, gridAlpha:28,
  title:'EX CASA DEL CUSTODE', year:'2026 / 2027', info:'GIARDINO DELLA MONTAGNOLA', footer:'@excasadelcustode',
  scales:{house:1.55,popup:1,label:1,rat:1.05},
  popups:[
    {date:'12.03.2026',title:'EVENTO 01',body:'Titolo / descrizione evento'},
    {date:'18.05.2026',title:'EVENTO 02',body:'Titolo / descrizione evento'},
    {date:'27.09.2026',title:'EVENTO 03',body:'Titolo / descrizione evento'}
  ],
  popupPositions:[{x:610,y:125},{x:720,y:430},{x:675,y:785}],
  places:DEFAULT_PLACES.map(p=>({...p})),
  logos:[null,null,null],logoLabels:['ASAP','CUSTODIA','BOLOGNA']
};

const sequence={mode:'compose',startedAt:0,elapsed:0,recorder:null,chunks:[]};
let statusEl,placeStatusEl,dragType=null,dragIndex=-1,dragOffX=0,dragOffY=0;
let view={s:1,ox:0,oy:0,artViewportW:0};

const ratPath=[{x:250,y:1210},{x:250,y:1040},{x:390,y:1040},{x:390,y:790},{x:250,y:790},{x:250,y:630},{x:205,y:630},{x:205,y:555}];

function setup(){
  createCanvas(windowWidth,windowHeight);
  pixelDensity(1);
  noSmooth();
  loadFixedPlaces();
  buildEditor();
}

function draw(){
  background(state.bgColor);
  if(sequence.mode==='play'||sequence.mode==='rec'){
    sequence.elapsed=millis()-sequence.startedAt;
    if(sequence.elapsed>=SEQUENCE_MS)finishSequence();
  }
  view.artViewportW=max(320,width-PANEL_W);const m=18;
  view.s=min((view.artViewportW-m*2)/BASE_W,(height-m*2)/BASE_H);
  view.ox=max(m,(view.artViewportW-BASE_W*view.s)/2);view.oy=(height-BASE_H*view.s)/2;
  push();translate(view.ox,view.oy);scale(view.s);
  drawBackground();drawMap();drawIdentity();drawPlaceLabels();
  if(sequence.mode==='compose'||sequence.mode==='final')drawFinalComposition();else drawAnimatedSequence();
  pop();
}

function buildEditor(){
  const panel=createDiv();panel.id('editor-panel');
  createElement('h1','Ex Casa Map Tool').parent(panel);
  const sub=createDiv('compose / play / rec / trash scale');sub.class('sub');sub.parent(panel);

  const controls=makeSection(panel,'Sequenza');
  const row=createDiv();row.class('control-row');row.parent(controls);
  makeControlButton(row,'COMPOSE',setCompose);makeControlButton(row,'▶ PLAY',()=>startSequence(false));makeControlButton(row,'● REC',()=>startSequence(true));
  statusEl=createDiv('COMPOSE MODE');statusEl.class('rec-status');statusEl.parent(controls);

  const bg=makeSection(panel,'Background');
  const pal=createDiv();pal.class('palette');pal.parent(bg);
  BG_PALETTE.forEach(c=>{const sw=createButton('');sw.class('swatch');sw.parent(pal);sw.style('background',c);sw.mousePressed(()=>state.bgColor=c)});
  const gridWrap=createDiv();gridWrap.class('field');gridWrap.parent(bg);
  createElement('label','griglia').parent(gridWrap);
  const gridCheck=createCheckbox('',state.showGrid);gridCheck.parent(gridWrap);gridCheck.changed(()=>state.showGrid=gridCheck.checked());

  const identity=makeSection(panel,'Identità');
  makeTextField(identity,'Titolo',state.title,v=>state.title=v);makeTextField(identity,'Anno',state.year,v=>state.year=v);makeTextField(identity,'Info',state.info,v=>state.info=v);makeTextField(identity,'Footer',state.footer,v=>state.footer=v);

  const scaleSec=makeSection(panel,'Scale');
  makeScale(scaleSec,'Popup','popup',0.6,1.8,.05);
  makeScale(scaleSec,'Etichette','label',0.6,1.8,.05);
  makeScale(scaleSec,'Topo','rat',0.6,2.2,.05);

  for(let i=0;i<3;i++){
    const sec=makeSection(panel,`Popup ${i+1}`);const grid=createDiv();grid.class('popup-grid');grid.parent(sec);
    makeTextField(grid,'Data',state.popups[i].date,v=>state.popups[i].date=v);makeTextField(grid,'Titolo',state.popups[i].title,v=>state.popups[i].title=v);
    makeTextareaField(sec,'Testo',state.popups[i].body,v=>state.popups[i].body=v);
    const c=createDiv('drag sulla composizione');c.class('coords');c.id(`coords-${i}`);c.parent(sec);
  }

  const places=makeSection(panel,'Luoghi');
  state.places.forEach((p,i)=>makePlaceEditor(places,p,i));
  const placeButtons=createDiv();placeButtons.class('place-actions');placeButtons.parent(places);
  const fixBtn=createButton('📌 FIX LUOGHI');fixBtn.class('fix-button');fixBtn.parent(placeButtons);fixBtn.mousePressed(saveFixedPlaces);
  const resetBtn=createButton('RESET');resetBtn.class('fix-button secondary');resetBtn.parent(placeButtons);resetBtn.mousePressed(resetPlaces);
  placeStatusEl=createDiv('sposta le etichette + icone, poi FIX LUOGHI');placeStatusEl.class('coords');placeStatusEl.parent(places);

  const logos=makeSection(panel,'Loghi PNG');
  for(let i=0;i<3;i++){const w=createDiv();w.class('field logo-input');w.parent(logos);createElement('label',`Logo ${i+1}`).parent(w);const inp=createFileInput(f=>handleLogo(f,i));inp.parent(w);inp.attribute('accept','image/png,image/*')}
  const hint=createDiv('Le icone dei luoghi sono elementi statici della mappa. Popup e topo sono gli elementi animati.');hint.class('hint');hint.parent(panel);
}

function makePlaceEditor(parent,p,i){
  const wrap=createDiv();wrap.class('place-editor');wrap.parent(parent);
  const grid=createDiv();grid.class('place-grid');grid.parent(wrap);
  makeTextField(grid,`Luogo ${i+1}`,p.name,v=>p.name=v);
  makeTextField(grid,'Icona',p.icon,v=>p.icon=v);
  const meta=createDiv(`x ${round(p.x)} · y ${round(p.y)}`);meta.id(`place-coords-${i}`);meta.class('coords');meta.parent(wrap);
}

function makeControlButton(parent,label,fn){const b=createButton(label);b.class('control-button');b.parent(parent);b.mousePressed(fn)}
function makeSection(parent,title){const s=createDiv();s.class('section');s.parent(parent);const t=createDiv(title);t.class('section-title');t.parent(s);return s}
function makeTextField(parent,labelText,value,onChange){const w=createDiv();w.class('field');w.parent(parent);createElement('label',labelText).parent(w);const i=createInput(value);i.parent(w);i.input(()=>onChange(i.value()));return i}
function makeTextareaField(parent,labelText,value,onChange){const w=createDiv();w.class('field');w.parent(parent);createElement('label',labelText).parent(w);const t=createElement('textarea',value);t.parent(w);t.input(()=>onChange(t.value()));return t}
function makeScale(parent,label,key,minV,maxV,step){const row=createDiv();row.class('scale-row');row.parent(parent);createElement('label',label).parent(row);const r=createSlider(minV,maxV,state.scales[key],step);r.parent(row);const v=createDiv(state.scales[key].toFixed(2)+'×');v.class('scale-value');v.parent(row);r.input(()=>{state.scales[key]=r.value();v.html(Number(r.value()).toFixed(2)+'×')})}
function handleLogo(file,index){if(!file||file.type!=='image')return;loadImage(file.data,img=>state.logos[index]=img)}

function saveFixedPlaces(){
  const payload=state.places.map(p=>({name:p.name,icon:p.icon,x:p.x,y:p.y,w:p.w,iconSize:p.iconSize}));
  localStorage.setItem(PLACE_STORAGE_KEY,JSON.stringify(payload));
  if(placeStatusEl)placeStatusEl.html('✓ LUOGHI FISSATI — restano anche dopo refresh');
}
function loadFixedPlaces(){
  try{
    const raw=localStorage.getItem(PLACE_STORAGE_KEY);if(!raw)return;
    const saved=JSON.parse(raw);if(!Array.isArray(saved))return;
    state.places=saved.map((p,i)=>({...DEFAULT_PLACES[i],...p}));
  }catch(e){console.warn('Impossibile caricare i luoghi salvati',e)}
}
function resetPlaces(){
  state.places=DEFAULT_PLACES.map(p=>({...p}));
  localStorage.removeItem(PLACE_STORAGE_KEY);
  if(placeStatusEl)placeStatusEl.html('reset luoghi — ricarica la pagina per aggiornare i campi del pannello');
}

function setCompose(){stopRecording(false);sequence.mode='compose';sequence.elapsed=0;setStatus('COMPOSE MODE')}
function startSequence(rec){if(sequence.mode==='play'||sequence.mode==='rec')return;sequence.mode=rec?'rec':'play';sequence.startedAt=millis();sequence.elapsed=0;setStatus(rec?'● RECORDING':'PLAYING');if(rec)startRecording()}
function finishSequence(){const wasRec=sequence.mode==='rec';sequence.mode='final';sequence.elapsed=SEQUENCE_MS;setStatus('FINAL FRAME');if(wasRec)stopRecording(true)}
function setStatus(t){if(statusEl)statusEl.html(t)}

function startRecording(){try{const stream=canvas.captureStream(60);const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';sequence.chunks=[];sequence.recorder=new MediaRecorder(stream,{mimeType:mime});sequence.recorder.ondataavailable=e=>{if(e.data&&e.data.size)sequence.chunks.push(e.data)};sequence.recorder.onstop=saveRecording;sequence.recorder.start()}catch(e){console.warn(e);setStatus('REC ERROR')}}
function stopRecording(save=true){if(sequence.recorder&&sequence.recorder.state!=='inactive'){if(!save)sequence.recorder.onstop=null;sequence.recorder.stop()}}
function saveRecording(){if(!sequence.chunks.length)return;const b=new Blob(sequence.chunks,{type:'video/webm'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=`ex-casa-${Date.now()}.webm`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}

function drawBackground(){
  noStroke();fill(state.bgColor);rect(0,0,BASE_W,BASE_H);
  if(state.showGrid){stroke(0,state.gridAlpha);strokeWeight(1);for(let x=0;x<=BASE_W;x+=24)line(x,0,x,BASE_H);for(let y=0;y<=BASE_H;y+=24)line(0,y,BASE_W,y)}
}

function drawMap(){
  stroke(COLORS.black);strokeWeight(46);strokeCap(ROUND);strokeJoin(ROUND);noFill();
  drawPath([[70,310],[365,310],[365,120]]);drawPath([[365,310],[700,310],[700,120]]);drawPath([[700,310],[1010,310]]);
  drawPath([[145,310],[145,690],[335,690],[335,1000]]);drawPath([[335,690],[550,690]]);drawPath([[895,690],[895,360]]);drawPath([[895,690],[895,995],[690,995]]);
  drawPath([[335,1000],[145,1000],[145,1250],[550,1250]]);drawPath([[550,940],[550,1250],[900,1250],[900,995]]);
  ellipse(550,690,300,190);
}
function drawPath(points){beginShape();for(const p of points)vertex(p[0],p[1]);endShape()}

function drawIdentity(){
  const ink=isDark(state.bgColor)?COLORS.white:COLORS.black;
  fill(ink);noStroke();textAlign(LEFT,TOP);textFont('Times New Roman');textStyle(NORMAL);textSize(34);text(state.title||'',55,28);
  textSize(25);text(state.year||'',57,69);textFont('Helvetica');textSize(12);text(state.info||'',58,108);
  textAlign(LEFT,BOTTOM);text(state.footer||'',55,BASE_H-26);
}
function isDark(hex){const c=color(hex);return(red(c)+green(c)+blue(c))/3<100}

function drawPlaceLabels(){
  for(let i=0;i<state.places.length;i++){
    const p=state.places[i],S=state.scales.label;
    push();translate(p.x,p.y);scale(S);
    textAlign(CENTER,CENTER);textFont('Helvetica');textStyle(NORMAL);textSize(p.iconSize||44);noStroke();fill(COLORS.black);text(p.icon||'',p.w/2,-28);
    fill(COLORS.white);stroke(COLORS.black);strokeWeight(1.5);rect(0,0,p.w,34,17);
    noStroke();fill(COLORS.black);textSize(13);text(p.name,p.w/2,17);
    pop();
  }
}

function drawFinalComposition(){for(let i=0;i<3;i++)drawPopupCard(i,1);drawLogos(1)}
function drawAnimatedSequence(){
  const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1),ratEnd=.38,p1=.46,p2=.59,p3=.72,logos=.84;
  const pos=pointOnPolyline(ratPath,easeInOutCubic(constrain(t/ratEnd,0,1)));drawRat(pos.x,pos.y);
  if(t>=p1)drawPopupCard(0,popupEase(t,p1));if(t>=p2)drawPopupCard(1,popupEase(t,p2));if(t>=p3)drawPopupCard(2,popupEase(t,p3));if(t>=logos)drawLogos(constrain((t-logos)/.08,0,1));
}
function popupEase(t,s){return easeOutBack(constrain((t-s)/.08,0,1))}
function pointOnPolyline(points,tt){let total=0,l=[];for(let i=0;i<points.length-1;i++){const d=dist(points[i].x,points[i].y,points[i+1].x,points[i+1].y);l.push(d);total+=d}let target=tt*total;for(let i=0;i<l.length;i++){if(target<=l[i]){const q=target/l[i];return{x:lerp(points[i].x,points[i+1].x,q),y:lerp(points[i].y,points[i+1].y,q)}}target-=l[i]}return points[points.length-1]}
function easeInOutCubic(x){return x<.5?4*x*x*x:1-pow(-2*x+2,3)/2}
function easeOutBack(x){const c1=1.70158,c3=c1+1;return 1+c3*pow(x-1,3)+c1*pow(x-1,2)}
function drawRat(x,y){textAlign(CENTER,CENTER);textSize(58*state.scales.rat);noStroke();text('🐁',x,y)}

function popupSize(i){const len=(state.popups[i].body||'').length;return{w:300,h:len>90?210:180}}
function drawPopupCard(i,a){
  const d=state.popups[i],p=state.popupPositions[i],sz=popupSize(i),w=sz.w,h=sz.h,S=state.scales.popup*a;
  push();translate(p.x+w/2,p.y+h/2);scale(S);translate(-w/2,-h/2);
  noStroke();fill(COLORS.chrome);rect(0,0,w,h,15);stroke(0,45);strokeWeight(1);noFill();rect(0,0,w,h,15);
  noStroke();fill(COLORS.chromeBar);rect(0,0,w,32,15,15,0,0);fill(0,100);circle(17,16,9);circle(31,16,9);circle(45,16,9);
  fill(COLORS.black);textAlign(LEFT,TOP);textFont('Times New Roman');textSize(17);text(d.date||'',15,46);textSize(28);text(d.title||'',15,70,w-30,45);textFont('Helvetica');textSize(14);text(d.body||'',15,120,w-30,h-130);pop();
}

function drawLogos(a){const xs=[820,910,1000],y=1240,d=66;for(let i=0;i<3;i++){push();translate(xs[i],y);scale(a);fill(COLORS.white);stroke(0);circle(0,0,d);const img=state.logos[i];if(img){const m=d*.68,s=min(m/img.width,m/img.height);imageMode(CENTER);image(img,0,0,img.width*s,img.height*s);imageMode(CORNER)}else{noStroke();fill(COLORS.black);textAlign(CENTER,CENTER);textFont('Helvetica');textSize(10);text(state.logoLabels[i],0,0)}pop()}}

function screenToWorld(mx,my){return{x:(mx-view.ox)/view.s,y:(my-view.oy)/view.s}}
function mousePressed(){
  if(sequence.mode!=='compose'||mouseX>=view.artViewportW)return;const m=screenToWorld(mouseX,mouseY);
  for(let i=state.popupPositions.length-1;i>=0;i--){const p=state.popupPositions[i],sz=popupSize(i),w=sz.w*state.scales.popup,h=sz.h*state.scales.popup;if(m.x>=p.x&&m.x<=p.x+w&&m.y>=p.y&&m.y<=p.y+h){dragType='popup';dragIndex=i;dragOffX=m.x-p.x;dragOffY=m.y-p.y;return}}
  for(let i=state.places.length-1;i>=0;i--){const p=state.places[i],w=p.w*state.scales.label,h=(70+(p.iconSize||44))*state.scales.label;if(m.x>=p.x&&m.x<=p.x+w&&m.y>=p.y-70&&m.y<=p.y+34){dragType='place';dragIndex=i;dragOffX=m.x-p.x;dragOffY=m.y-p.y;return}}
}
function mouseDragged(){
  if(sequence.mode!=='compose'||dragIndex<0)return;const m=screenToWorld(mouseX,mouseY);
  if(dragType==='popup'){
    const p=state.popupPositions[dragIndex];p.x=constrain(m.x-dragOffX,0,BASE_W-180);p.y=constrain(m.y-dragOffY,0,BASE_H-120);
    const c=select(`#coords-${dragIndex}`);if(c)c.html(`x ${round(p.x)} · y ${round(p.y)}`);
  }else if(dragType==='place'){
    const p=state.places[dragIndex];p.x=constrain(m.x-dragOffX,0,BASE_W-p.w);p.y=constrain(m.y-dragOffY,80,BASE_H-40);
    const c=select(`#place-coords-${dragIndex}`);if(c)c.html(`x ${round(p.x)} · y ${round(p.y)}`);
    if(placeStatusEl)placeStatusEl.html('modifiche non ancora fissate');
  }
}
function mouseReleased(){dragType=null;dragIndex=-1}
function windowResized(){resizeCanvas(windowWidth,windowHeight)}