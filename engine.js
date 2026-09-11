// STEP 10 — PROCEDURAL MAZE + REAL PATHFINDING + DYNAMIC POPUPS + STROBE FINALE
const BASE_W=1080, BASE_H=1350, PANEL_W=360, SEQUENCE_MS=8200;
const COLORS={black:'#050505',pink:'#ff61b6',white:'#fff',acid:'#dfff00',blue:'#53b7ff',red:'#ff3b30',cream:'#fff1ce'};
const BG_PALETTE=['#8D8D8A','#F1E9FF','#91C792','#FFF1CE','#CFE8FF','#FFD7EA','#0B0B0F'];
const PLACE_STORAGE_KEY='ex-casa-map-places-v1';
const RAT_STORAGE_KEY='ex-casa-map-rats-v1';

const DEFAULT_PLACES=[
  {name:'EX CASA DEL CUSTODE',icon:'🏠',x:92,y:545,w:245},
  {name:'PINCIO',icon:'🗿',x:470,y:110,w:150},
  {name:'FONTANA',icon:'⛲',x:465,y:650,w:165},
  {name:'VIA IRNERIO',icon:'🚪',x:135,y:1190,w:190},
  {name:'FILLA',icon:'🍸',x:765,y:1000,w:130}
];
const DEFAULT_RATS=[{from:3,to:0},{from:4,to:0},{from:1,to:0},{from:2,to:0},{from:3,to:4}];

const state={
  bgColor:BG_PALETTE[1],showGrid:true,gridAlpha:16,
  title:'EX CASA DEL CUSTODE',year:'2026 / 2027',info:'GIARDINO DELLA MONTAGNOLA',footer:'@excasadelcustode',
  scales:{popup:1,label:1,rat:1},
  popups:[
    {date:'12.03.2026',title:'EVENTO 01',body:'Titolo / descrizione evento'},
    {date:'18.05.2026',title:'EVENTO 02',body:'Titolo / descrizione evento'},
    {date:'27.09.2026',title:'EVENTO 03',body:'Titolo / descrizione evento'}
  ],
  popupPositions:[{x:620,y:150},{x:710,y:430},{x:675,y:785}],
  places:DEFAULT_PLACES.map(p=>({...p})),
  ratCount:2,rats:DEFAULT_RATS.map(r=>({...r})),
  logos:[null,null,null],logoLabels:['ASAP','CUSTODIA','BOLOGNA']
};

const sequence={mode:'compose',startedAt:0,elapsed:0,recorder:null,chunks:[],finalDir:1,finalY:675,strobeOffset:0};
let statusEl,placeStatusEl,ratEditorEl,popupEditorEl,popupScaleValueEl,dragType=null,dragIndex=-1,dragOffX=0,dragOffY=0;
let view={s:1,ox:0,oy:0,artViewportW:0};

// procedural maze graph
const MAZE={cols:12,rows:15,left:70,right:1010,top:165,bottom:1245,nodes:[],edges:new Map(),seed:0};

function setup(){
  createCanvas(windowWidth,windowHeight);pixelDensity(1);noSmooth();
  loadFixedPlaces();loadRats();generateMaze();buildEditor();
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
  if((sequence.mode==='play'||sequence.mode==='rec') && sequence.elapsed/SEQUENCE_MS>=.86){drawStrobeFinal();}
  else{
    drawBackground();drawMaze();drawIdentity();drawPlaceLabels();
    if(sequence.mode==='compose'||sequence.mode==='final')drawFinalComposition();else drawAnimatedSequence();
  }
  pop();
}

function buildEditor(){
  const panel=createDiv();panel.id('editor-panel');
  createElement('h1','EX CASA MAP TOOL').parent(panel);
  const sub=createDiv('PAC-MAN / RATS / POPUPS / HEARTS');sub.class('sub');sub.parent(panel);

  const controls=makeSection(panel,'Sequenza');
  const row=createDiv();row.class('control-row');row.parent(controls);
  makeControlButton(row,'COMPOSE',setCompose);makeControlButton(row,'▶ PLAY',()=>startSequence(false));makeControlButton(row,'● REC',()=>startSequence(true));
  statusEl=createDiv('COMPOSE MODE');statusEl.class('rec-status');statusEl.parent(controls);
  const reroll=createButton('↻ NUOVA MAPPA RANDOM');reroll.class('fix-button');reroll.parent(controls);reroll.mousePressed(()=>{generateMaze();setStatus('NUOVA MAPPA')});

  const bg=makeSection(panel,'Background');
  const pal=createDiv();pal.class('palette');pal.parent(bg);
  BG_PALETTE.forEach(c=>{const sw=createButton('');sw.class('swatch');sw.parent(pal);sw.style('background',c);sw.mousePressed(()=>state.bgColor=c)});
  const gw=createDiv();gw.class('field');gw.parent(bg);createElement('label','griglia').parent(gw);
  const gc=createCheckbox('',state.showGrid);gc.parent(gw);gc.changed(()=>state.showGrid=gc.checked());

  const identity=makeSection(panel,'Identità');
  makeTextField(identity,'Titolo',state.title,v=>state.title=v);makeTextField(identity,'Anno',state.year,v=>state.year=v);makeTextField(identity,'Info',state.info,v=>state.info=v);makeTextField(identity,'Footer',state.footer,v=>state.footer=v);

  const scales=makeSection(panel,'Scale');
  const popupScale=createDiv();popupScale.class('popup-scale-control');popupScale.parent(scales);
  const minus=createButton('−');minus.class('mini-button');minus.parent(popupScale);minus.mousePressed(()=>changePopupScale(-.1));
  popupScaleValueEl=createDiv(`POPUP ${state.scales.popup.toFixed(1)}×`);popupScaleValueEl.class('scale-value');popupScaleValueEl.parent(popupScale);
  const plus=createButton('+');plus.class('mini-button');plus.parent(popupScale);plus.mousePressed(()=>changePopupScale(.1));
  makeScale(scales,'Luoghi','label',.6,1.8,.05);makeScale(scales,'Topi','rat',.6,2.2,.05);

  const places=makeSection(panel,'Luoghi / coordinate');
  state.places.forEach((p,i)=>makePlaceEditor(places,p,i));
  const pa=createDiv();pa.class('place-actions');pa.parent(places);
  const fb=createButton('📌 FIX LUOGHI');fb.class('fix-button');fb.parent(pa);fb.mousePressed(()=>{saveFixedPlaces();refreshRatEditors()});
  const rb=createButton('RESET');rb.class('fix-button secondary');rb.parent(pa);rb.mousePressed(()=>{resetPlaces();refreshRatEditors()});
  placeStatusEl=createDiv('sposta i badge sulla mappa → FIX LUOGHI');placeStatusEl.class('coords');placeStatusEl.parent(places);

  const rats=makeSection(panel,'Topi / percorsi');
  const countWrap=createDiv();countWrap.class('field');countWrap.parent(rats);createElement('label','Numero topi').parent(countWrap);
  const countSel=createSelect();countSel.parent(countWrap);for(let i=1;i<=5;i++)countSel.option(String(i),String(i));countSel.selected(String(state.ratCount));
  countSel.changed(()=>{state.ratCount=Number(countSel.value());saveRats();refreshRatEditors()});
  ratEditorEl=createDiv();ratEditorEl.class('rat-editors');ratEditorEl.parent(rats);refreshRatEditors();
  const ratHint=createDiv('Ogni topo usa il labirinto generato: il percorso viene calcolato realmente tra il luogo di partenza e quello di arrivo.');ratHint.class('coords');ratHint.parent(rats);

  const popSec=makeSection(panel,'Popup eventi');
  popupEditorEl=createDiv();popupEditorEl.parent(popSec);refreshPopupEditors();
  const add=createButton('+ AGGIUNGI POPUP');add.class('fix-button');add.parent(popSec);add.mousePressed(addPopup);

  const logos=makeSection(panel,'Loghi PNG / cuori');
  for(let i=0;i<3;i++){const w=createDiv();w.class('field logo-input');w.parent(logos);createElement('label',`Cuore ${i+1} → Logo ${i+1}`).parent(w);const inp=createFileInput(f=>handleLogo(f,i));inp.parent(w);inp.attribute('accept','image/png,image/*')}
}

function changePopupScale(delta){state.scales.popup=constrain(round((state.scales.popup+delta)*10)/10,.5,2.2);if(popupScaleValueEl)popupScaleValueEl.html(`POPUP ${state.scales.popup.toFixed(1)}×`)}
function addPopup(){
  const i=state.popups.length;state.popups.push({date:'00.00.2026',title:`EVENTO ${String(i+1).padStart(2,'0')}`,body:'Nuovo evento'});
  const col=i%3,row=floor(i/3);state.popupPositions.push({x:90+col*310,y:190+row*230});refreshPopupEditors();
}
function refreshPopupEditors(){
  if(!popupEditorEl)return;popupEditorEl.html('');
  state.popups.forEach((p,i)=>{
    const sec=createDiv();sec.class('popup-editor-card');sec.parent(popupEditorEl);
    const title=createDiv(`POPUP ${i+1}`);title.class('rat-title');title.parent(sec);
    const grid=createDiv();grid.class('popup-grid');grid.parent(sec);
    makeTextField(grid,'Data',p.date,v=>p.date=v);makeTextField(grid,'Titolo',p.title,v=>p.title=v);makeTextareaField(sec,'Testo',p.body,v=>p.body=v);
    const meta=createDiv(`x ${round(state.popupPositions[i].x)} · y ${round(state.popupPositions[i].y)}`);meta.class('coords');meta.id(`coords-${i}`);meta.parent(sec);
    if(state.popups.length>1){const del=createButton('× ELIMINA');del.class('mini-button delete');del.parent(sec);del.mousePressed(()=>removePopup(i));}
  });
}
function removePopup(i){state.popups.splice(i,1);state.popupPositions.splice(i,1);refreshPopupEditors()}

function makePlaceEditor(parent,p,i){const w=createDiv();w.class('place-editor');w.parent(parent);const g=createDiv();g.class('place-grid');g.parent(w);makeTextField(g,`Luogo ${i+1}`,p.name,v=>p.name=v);makeTextField(g,'Icona',p.icon,v=>p.icon=v);const m=createDiv(`x ${round(p.x)} · y ${round(p.y)}`);m.id(`place-coords-${i}`);m.class('coords');m.parent(w)}
function refreshRatEditors(){if(!ratEditorEl)return;ratEditorEl.html('');while(state.rats.length<5)state.rats.push({from:3,to:0});for(let i=0;i<state.ratCount;i++){const r=state.rats[i],box=createDiv();box.class('rat-editor');box.parent(ratEditorEl);const title=createDiv(`TOPO ${i+1}`);title.class('rat-title');title.parent(box);const grid=createDiv();grid.class('rat-grid');grid.parent(box);makePlaceSelect(grid,'PARTE DA',r.from,v=>{r.from=v;saveRats()});makePlaceSelect(grid,'ARRIVA A',r.to,v=>{r.to=v;saveRats()})}}
function makePlaceSelect(parent,label,value,onChange){const w=createDiv();w.class('field');w.parent(parent);createElement('label',label).parent(w);const s=createSelect();s.parent(w);state.places.forEach((p,i)=>s.option(`${p.icon} ${p.name}`,String(i)));s.selected(String(value));s.changed(()=>onChange(Number(s.value())));return s}
function makeControlButton(p,l,fn){const b=createButton(l);b.class('control-button');b.parent(p);b.mousePressed(fn)}
function makeSection(p,t){const s=createDiv();s.class('section');s.parent(p);const h=createDiv(t);h.class('section-title');h.parent(s);return s}
function makeTextField(p,l,v,fn){const w=createDiv();w.class('field');w.parent(p);createElement('label',l).parent(w);const i=createInput(v);i.parent(w);i.input(()=>fn(i.value()));return i}
function makeTextareaField(p,l,v,fn){const w=createDiv();w.class('field');w.parent(p);createElement('label',l).parent(w);const t=createElement('textarea',v);t.parent(w);t.input(()=>fn(t.value()));return t}
function makeScale(p,l,k,minV,maxV,step){const r=createDiv();r.class('scale-row');r.parent(p);createElement('label',l).parent(r);const s=createSlider(minV,maxV,state.scales[k],step);s.parent(r);const v=createDiv(state.scales[k].toFixed(2)+'×');v.class('scale-value');v.parent(r);s.input(()=>{state.scales[k]=s.value();v.html(Number(s.value()).toFixed(2)+'×')})}
function handleLogo(file,i){if(!file||file.type!=='image')return;loadImage(file.data,img=>state.logos[i]=img)}

function saveFixedPlaces(){localStorage.setItem(PLACE_STORAGE_KEY,JSON.stringify(state.places));if(placeStatusEl)placeStatusEl.html('✓ LUOGHI FISSATI — coordinate salvate')}
function loadFixedPlaces(){try{const raw=localStorage.getItem(PLACE_STORAGE_KEY);if(!raw)return;const saved=JSON.parse(raw);if(Array.isArray(saved))state.places=saved.map((p,i)=>({...DEFAULT_PLACES[i],...p}))}catch(e){console.warn(e)}}
function resetPlaces(){state.places=DEFAULT_PLACES.map(p=>({...p}));localStorage.removeItem(PLACE_STORAGE_KEY);if(placeStatusEl)placeStatusEl.html('reset luoghi')}
function saveRats(){localStorage.setItem(RAT_STORAGE_KEY,JSON.stringify({ratCount:state.ratCount,rats:state.rats}))}
function loadRats(){try{const raw=localStorage.getItem(RAT_STORAGE_KEY);if(!raw)return;const saved=JSON.parse(raw);if(saved.ratCount)state.ratCount=saved.ratCount;if(Array.isArray(saved.rats))state.rats=saved.rats.map(r=>({...r}))}catch(e){console.warn(e)}}

function setCompose(){stopRecording(false);sequence.mode='compose';sequence.elapsed=0;setStatus('COMPOSE MODE')}
function startSequence(rec){
  if(sequence.mode==='play'||sequence.mode==='rec')return;
  generateMaze();sequence.finalDir=random()<.5?1:-1;sequence.finalY=random(280,1080);sequence.strobeOffset=floor(random(BG_PALETTE.length));
  sequence.mode=rec?'rec':'play';sequence.startedAt=millis();sequence.elapsed=0;setStatus(rec?'● RECORDING':'PLAYING — NEW MAZE');if(rec)startRecording();
}
function finishSequence(){const wasRec=sequence.mode==='rec';sequence.mode='final';sequence.elapsed=SEQUENCE_MS;setStatus('FINAL FRAME');if(wasRec)stopRecording(true)}
function setStatus(t){if(statusEl)statusEl.html(t)}
function startRecording(){try{const stream=canvas.captureStream(60),mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';sequence.chunks=[];sequence.recorder=new MediaRecorder(stream,{mimeType:mime});sequence.recorder.ondataavailable=e=>{if(e.data&&e.data.size)sequence.chunks.push(e.data)};sequence.recorder.onstop=saveRecording;sequence.recorder.start()}catch(e){setStatus('REC ERROR')}}
function stopRecording(save=true){if(sequence.recorder&&sequence.recorder.state!=='inactive'){if(!save)sequence.recorder.onstop=null;sequence.recorder.stop()}}
function saveRecording(){if(!sequence.chunks.length)return;const b=new Blob(sequence.chunks,{type:'video/webm'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=`ex-casa-${Date.now()}.webm`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}

function drawBackground(){noStroke();fill(state.bgColor);rect(0,0,BASE_W,BASE_H);if(state.showGrid){stroke(0,state.gridAlpha);strokeWeight(.7);for(let x=0;x<=BASE_W;x+=24)line(x,0,x,BASE_H);for(let y=0;y<=BASE_H;y+=24)line(0,y,BASE_W,y)}}

// --- PROCEDURAL PAC-MAN MAZE ---
function nodeIndex(c,r){return r*MAZE.cols+c}
function nodeCR(i){return{c:i%MAZE.cols,r:floor(i/MAZE.cols)}}
function nodePoint(i){const {c,r}=nodeCR(i),sx=(MAZE.right-MAZE.left)/(MAZE.cols-1),sy=(MAZE.bottom-MAZE.top)/(MAZE.rows-1);return{x:MAZE.left+c*sx,y:MAZE.top+r*sy}}
function addMazeEdge(a,b){if(!MAZE.edges.has(a))MAZE.edges.set(a,new Set());if(!MAZE.edges.has(b))MAZE.edges.set(b,new Set());MAZE.edges.get(a).add(b);MAZE.edges.get(b).add(a)}
function generateMaze(){
  MAZE.edges=new Map();MAZE.seed=floor(random(1e9));
  const total=MAZE.cols*MAZE.rows,visited=new Set(),stack=[];
  const start=floor(random(total));visited.add(start);stack.push(start);
  while(stack.length){
    const cur=stack[stack.length-1],{c,r}=nodeCR(cur),opts=[];
    if(c>0)opts.push(nodeIndex(c-1,r));if(c<MAZE.cols-1)opts.push(nodeIndex(c+1,r));if(r>0)opts.push(nodeIndex(c,r-1));if(r<MAZE.rows-1)opts.push(nodeIndex(c,r+1));
    const fresh=opts.filter(n=>!visited.has(n));
    if(fresh.length){const n=random(fresh);addMazeEdge(cur,n);visited.add(n);stack.push(n)}else stack.pop();
  }
  // extra loops: less tree-like, more Pac-Man-ish
  for(let i=0;i<total;i++){
    const {c,r}=nodeCR(i);if(c<MAZE.cols-1&&random()<.22)addMazeEdge(i,nodeIndex(c+1,r));if(r<MAZE.rows-1&&random()<.18)addMazeEdge(i,nodeIndex(c,r+1));
  }
}
function drawMaze(){
  const seen=new Set();strokeCap(ROUND);strokeJoin(ROUND);noFill();
  for(const [a,neighbors] of MAZE.edges.entries())for(const b of neighbors){const key=a<b?`${a}-${b}`:`${b}-${a}`;if(seen.has(key))continue;seen.add(key);const A=nodePoint(a),B=nodePoint(b);drawLightCorridor(A,B)}
  // light oval around fountain, purely landmark language
  const f=getPlaceCenter(2);noFill();stroke(COLORS.black);strokeWeight(8);ellipse(f.x,f.y,250,150);stroke(state.bgColor);strokeWeight(5);ellipse(f.x,f.y,250,150);
}
function drawLightCorridor(A,B){stroke(COLORS.black);strokeWeight(8);line(A.x,A.y,B.x,B.y);stroke(state.bgColor);strokeWeight(5);line(A.x,A.y,B.x,B.y)}
function nearestMazeNode(pt){let best=0,bd=Infinity;for(let i=0;i<MAZE.cols*MAZE.rows;i++){const p=nodePoint(i),d=dist(pt.x,pt.y,p.x,p.y);if(d<bd){bd=d;best=i}}return best}
function bfsPath(start,end){
  if(start===end)return[start];const q=[start],prev=new Map([[start,null]]);
  while(q.length){const cur=q.shift();for(const n of(MAZE.edges.get(cur)||[])){if(prev.has(n))continue;prev.set(n,cur);if(n===end){const path=[end];let k=end;while(prev.get(k)!==null){k=prev.get(k);path.push(k)}return path.reverse()}q.push(n)}}return[start,end]
}

function drawIdentity(){
  const ink=isDark(state.bgColor)?COLORS.white:COLORS.black;textAlign(LEFT,TOP);textFont('Helvetica');textStyle(BOLD);
  noStroke();fill(COLORS.pink);textSize(42);text(state.title||'',61,35);
  stroke(COLORS.black);strokeWeight(5);fill(COLORS.white);text(state.title||'',55,29);
  noStroke();fill(ink);textSize(28);text(state.year||'',57,80);textSize(12);text(state.info||'',58,118);textAlign(LEFT,BOTTOM);text(state.footer||'',55,BASE_H-26);
}
function isDark(hex){const c=color(hex);return(red(c)+green(c)+blue(c))/3<100}
function drawPlaceLabels(){for(let i=0;i<state.places.length;i++){const p=state.places[i],S=state.scales.label,h=48;push();translate(p.x,p.y);scale(S);fill(i%2===0?COLORS.acid:COLORS.white);stroke(COLORS.black);strokeWeight(3);rect(0,0,p.w,h,5);noStroke();textAlign(LEFT,CENTER);textSize(26);text(p.icon||'',10,h/2+1);fill(COLORS.black);textFont('Helvetica');textStyle(BOLD);textSize(12);text(p.name,47,h/2+1);pop()}}
function getPlaceCenter(index){const p=state.places[constrain(index,0,state.places.length-1)];return{x:p.x+p.w*state.scales.label/2,y:p.y+24*state.scales.label}}
function buildRatRoute(ratIndex){
  const r=state.rats[ratIndex]||state.rats[0],a=getPlaceCenter(r.from),b=getPlaceCenter(r.to),start=nearestMazeNode(a),end=nearestMazeNode(b),ids=bfsPath(start,end);
  const pts=[a,nodePoint(start),...ids.slice(1,-1).map(nodePoint),nodePoint(end),b];
  return pts;
}

function drawFinalComposition(){for(let i=0;i<state.popups.length;i++)drawPopupCard(i,1);for(let i=0;i<state.ratCount;i++){const route=buildRatRoute(i),end=route[route.length-1];drawRat(end.x,end.y,i)}drawLogoHeartsFinal()}
function drawAnimatedSequence(){
  const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1),ratEnd=.42,popupStart=.47,popupEnd=.73,logos=.77;
  for(let i=0;i<state.ratCount;i++){
    const delay=i*.045,local=constrain((t-delay)/(ratEnd-delay),0,1),route=buildRatRoute(i),pos=pointOnPolyline(route,easeInOutCubic(local));drawRat(pos.x,pos.y,i);
  }
  const n=max(1,state.popups.length);for(let i=0;i<n;i++){const s=popupStart+(popupEnd-popupStart)*(i/max(1,n-1));if(t>=s)drawPopupCard(i,popupEase(t,s))}
  drawLogoHeartSequence(t,logos);
}
function popupEase(t,s){return easeOutBack(constrain((t-s)/.065,0,1))}
function pointOnPolyline(points,tt){let total=0,l=[];for(let i=0;i<points.length-1;i++){const d=dist(points[i].x,points[i].y,points[i+1].x,points[i+1].y);l.push(d);total+=d}let target=tt*total;for(let i=0;i<l.length;i++){if(target<=l[i]){const q=target/l[i];return{x:lerp(points[i].x,points[i+1].x,q),y:lerp(points[i].y,points[i+1].y,q)}}target-=l[i]}return points[points.length-1]}
function easeInOutCubic(x){return x<.5?4*x*x*x:1-pow(-2*x+2,3)/2}
function easeOutBack(x){const c1=1.70158,c3=c1+1;return 1+c3*pow(x-1,3)+c1*pow(x-1,2)}
function drawRat(x,y,i){push();translate(x,y);if(i%2)scale(-1,1);textAlign(CENTER,CENTER);textSize(48*state.scales.rat);noStroke();text('🐁',0,0);pop()}

function popupSize(i){const len=(state.popups[i]?.body||'').length;return{w:300,h:len>90?210:180}}
function drawPopupCard(i,a){
  const d=state.popups[i];if(!d)return;const p=state.popupPositions[i],sz=popupSize(i),w=sz.w,h=sz.h,S=state.scales.popup*a;
  push();translate(p.x+w/2,p.y+h/2);scale(S);translate(-w/2,-h/2);fill(COLORS.white);stroke(COLORS.black);strokeWeight(3);rect(0,0,w,h,5);
  const popupColors=[COLORS.pink,COLORS.acid,COLORS.blue,COLORS.cream,COLORS.red];noStroke();fill(popupColors[i%popupColors.length]);rect(0,0,w,34,5,5,0,0);
  fill(COLORS.black);circle(17,17,8);circle(31,17,8);circle(45,17,8);textAlign(LEFT,TOP);textFont('Helvetica');textStyle(BOLD);textSize(15);text(d.date||'',15,47);textSize(27);text(d.title||'',15,70,w-30,43);textStyle(NORMAL);textSize(14);text(d.body||'',15,120,w-30,h-130);pop();
}

function drawLogoHeartsFinal(){for(let i=0;i<3;i++)drawLogoSlot(i,1,1)}
function drawLogoHeartSequence(t,start){const step=.045;for(let i=0;i<3;i++){const local=(t-(start+i*step))/step;if(local<0){drawLogoSlot(i,0,1);continue}if(local<.34){const q=local/.34;drawLogoSlot(i,0,1+sin(q*PI)*.75);drawHeartBurst(i,q)}else if(local<1){const q=(local-.34)/.66;drawLogoSlot(i,easeOutBack(q),max(.15,1-q*.35))}else drawLogoSlot(i,1,1)}}
function drawLogoSlot(i,logoAmount,heartScale){const xs=[820,910,1000],y=1240,d=66,x=xs[i];push();translate(x,y);if(logoAmount<.98){push();scale(heartScale);noStroke();fill(COLORS.pink);textAlign(CENTER,CENTER);textSize(54);text('♥',0,0);pop()}if(logoAmount>0){push();scale(logoAmount);fill(COLORS.white);stroke(COLORS.black);strokeWeight(2);circle(0,0,d);const img=state.logos[i];if(img){const m=d*.7,s=min(m/img.width,m/img.height);imageMode(CENTER);image(img,0,0,img.width*s,img.height*s);imageMode(CORNER)}else{noStroke();fill(COLORS.black);textAlign(CENTER,CENTER);textFont('Helvetica');textStyle(BOLD);textSize(9);text(state.logoLabels[i],0,0)}pop()}pop()}
function drawHeartBurst(i,q){const xs=[820,910,1000],y=1240,x=xs[i];push();translate(x,y);noStroke();fill(COLORS.pink);for(let k=0;k<8;k++){const a=TWO_PI*k/8,r=18+q*58;push();translate(cos(a)*r,sin(a)*r);textAlign(CENTER,CENTER);textSize(18*(1-q)+5);text('♥',0,0);pop()}pop()}

// final 14%: monochrome strobe + huge white mouse crossing screen
function drawStrobeFinal(){
  const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1),q=constrain((t-.86)/.14,0,1),flash=floor(sequence.elapsed/95);
  const c=BG_PALETTE[(flash+sequence.strobeOffset)%BG_PALETTE.length];noStroke();fill(c);rect(0,0,BASE_W,BASE_H);
  const pad=190,x=sequence.finalDir===1?lerp(-pad,BASE_W+pad,q):lerp(BASE_W+pad,-pad,q);drawWhiteMouse(x,sequence.finalY,2.35,sequence.finalDir);
}
function drawWhiteMouse(x,y,s,dir){
  push();translate(x,y);scale(dir*s,s);noStroke();fill(255);
  ellipse(0,0,120,72);ellipse(52,-18,62,54);ellipse(58,-48,28,28);ellipse(33,-48,24,24);
  stroke(255);strokeWeight(9);noFill();bezier(-58,5,-115,-10,-135,55,-185,35);
  noStroke();fill(0);circle(68,-22,8);triangle(86,-14,104,-8,87,-2);pop();
}

function screenToWorld(mx,my){return{x:(mx-view.ox)/view.s,y:(my-view.oy)/view.s}}
function mousePressed(){
  if(sequence.mode!=='compose'||mouseX>=view.artViewportW)return;const m=screenToWorld(mouseX,mouseY);
  for(let i=state.popupPositions.length-1;i>=0;i--){const p=state.popupPositions[i],sz=popupSize(i),w=sz.w*state.scales.popup,h=sz.h*state.scales.popup;if(m.x>=p.x&&m.x<=p.x+w&&m.y>=p.y&&m.y<=p.y+h){dragType='popup';dragIndex=i;dragOffX=m.x-p.x;dragOffY=m.y-p.y;return}}
  for(let i=state.places.length-1;i>=0;i--){const p=state.places[i],w=p.w*state.scales.label,h=48*state.scales.label;if(m.x>=p.x&&m.x<=p.x+w&&m.y>=p.y&&m.y<=p.y+h){dragType='place';dragIndex=i;dragOffX=m.x-p.x;dragOffY=m.y-p.y;return}}
}
function mouseDragged(){
  if(sequence.mode!=='compose'||dragIndex<0)return;const m=screenToWorld(mouseX,mouseY);
  if(dragType==='popup'){
    const p=state.popupPositions[dragIndex];p.x=constrain(m.x-dragOffX,0,BASE_W-180);p.y=constrain(m.y-dragOffY,0,BASE_H-120);const c=select(`#coords-${dragIndex}`);if(c)c.html(`x ${round(p.x)} · y ${round(p.y)}`);
  }else if(dragType==='place'){
    const p=state.places[dragIndex];p.x=constrain(m.x-dragOffX,0,BASE_W-p.w);p.y=constrain(m.y-dragOffY,0,BASE_H-48);const c=select(`#place-coords-${dragIndex}`);if(c)c.html(`x ${round(p.x)} · y ${round(p.y)}`);if(placeStatusEl)placeStatusEl.html('modifiche non ancora fissate');
  }
}
function mouseReleased(){dragType=null;dragIndex=-1}
function windowResized(){resizeCanvas(windowWidth,windowHeight)}