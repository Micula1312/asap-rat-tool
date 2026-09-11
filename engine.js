// STEP 15 — RANDOM OFFSCREEN RAT STARTS + OLD POPUPS + FIXED DRAG
const BASE_W=1080, BASE_H=1350, PANEL_W=360, SEQUENCE_MS=8200, GRID_STEP=24;
const COLORS={black:'#050505',pink:'#ff61b6',white:'#fff',acid:'#dfff00',blue:'#53b7ff',red:'#ff3b30',cream:'#fff1ce'};
const BG_PALETTE=['#8D8D8A','#F1E9FF','#91C792','#FFF1CE','#CFE8FF','#FFD7EA','#0B0B0F'];
const PLACE_STORAGE_KEY='ex-casa-map-places-v1';
const RAT_STORAGE_KEY='ex-casa-map-rats-v2';

const DEFAULT_PLACES=[
  {name:'EX CASA DEL CUSTODE',icon:'🏠',x:92,y:545,w:245},
  {name:'PINCIO',icon:'🗿',x:470,y:110,w:150},
  {name:'FONTANA',icon:'⛲',x:465,y:650,w:165},
  {name:'VIA IRNERIO',icon:'🚪',x:135,y:1190,w:190},
  {name:'FILLA',icon:'🍸',x:765,y:1000,w:130}
];
const DEFAULT_RATS=[{to:0},{to:0},{to:0},{to:0},{to:0}];

const state={
  bgColor:BG_PALETTE[1],showGrid:true,gridAlpha:16,
  title:'EX CASA DEL CUSTODE',year:'2026 / 2027',info:'GIARDINO DELLA MONTAGNOLA',footer:'@excasadelcustode',
  scales:{popup:2,label:2,rat:1},
  popups:[
    {date:'12.03.2026',title:'EVENTO 01',body:'Titolo / descrizione evento'},
    {date:'18.05.2026',title:'EVENTO 02',body:'Titolo / descrizione evento'},
    {date:'27.09.2026',title:'EVENTO 03',body:'Titolo / descrizione evento'}
  ],
  popupPositions:[{x:520,y:160},{x:620,y:500},{x:500,y:850}],
  places:DEFAULT_PLACES.map(p=>({...p})),
  ratCount:2,rats:DEFAULT_RATS.map(r=>({...r})),
  ratStarts:[],
  logos:[null,null,null],logoLabels:['ASAP','CUSTODIA','BOLOGNA']
};

const sequence={mode:'compose',startedAt:0,elapsed:0,recorder:null,chunks:[],finalDir:1,finalY:675,strobeOffset:0};
let statusEl,placeStatusEl,ratEditorEl,popupEditorEl,popupScaleValueEl,dragType=null,dragIndex=-1,dragOffX=0,dragOffY=0;
let view={s:1,ox:0,oy:0,artViewportW:0};
const GRID={cols:Math.floor(BASE_W/GRID_STEP),rows:Math.floor(BASE_H/GRID_STEP),edges:new Map(),blocked:new Set()};

const BLOCKED_CELLS=[
  [4,8],[5,8],[6,8],[7,8],[8,8],[15,8],[16,8],[17,8],[18,8],[31,8],[32,8],[33,8],[34,8],[35,8],
  [8,14],[8,15],[8,16],[8,17],[20,14],[21,14],[22,14],[23,14],[24,14],[36,14],[36,15],[36,16],[36,17],
  [4,24],[5,24],[6,24],[7,24],[14,24],[15,24],[16,24],[28,24],[29,24],[30,24],[38,24],[39,24],[40,24],
  [11,32],[12,32],[13,32],[14,32],[15,32],[22,32],[23,32],[24,32],[32,32],[33,32],[34,32],[35,32],
  [5,41],[6,41],[7,41],[8,41],[17,41],[18,41],[19,41],[20,41],[28,41],[29,41],[30,41],[37,41],[38,41],[39,41],
  [10,49],[11,49],[12,49],[22,49],[23,49],[24,49],[33,49],[34,49],[35,49]
];

function setup(){createCanvas(windowWidth,windowHeight);pixelDensity(1);noSmooth();loadFixedPlaces();loadRats();buildGrid();generateRatStarts();buildEditor()}

function draw(){
  background(state.bgColor);
  if(sequence.mode==='play'||sequence.mode==='rec'){sequence.elapsed=millis()-sequence.startedAt;if(sequence.elapsed>=SEQUENCE_MS)finishSequence()}
  view.artViewportW=max(320,width-PANEL_W);const m=18;
  view.s=min((view.artViewportW-m*2)/BASE_W,(height-m*2)/BASE_H);view.ox=max(m,(view.artViewportW-BASE_W*view.s)/2);view.oy=(height-BASE_H*view.s)/2;
  push();translate(view.ox,view.oy);scale(view.s);
  if((sequence.mode==='play'||sequence.mode==='rec')&&sequence.elapsed/SEQUENCE_MS>=.86)drawStrobeFinal();
  else{drawBackground();drawBlockedDots();drawIdentity();drawPlaceLabels();if(sequence.mode==='compose'||sequence.mode==='final')drawFinalComposition();else drawAnimatedSequence()}
  pop();
}

function buildEditor(){
  const panel=createDiv();panel.id('editor-panel');createElement('h1','EX CASA MAP TOOL').parent(panel);const sub=createDiv('PAC-MAN / RATS / POPUPS / HEARTS');sub.class('sub');sub.parent(panel);
  const controls=makeSection(panel,'Sequenza');const row=createDiv();row.class('control-row');row.parent(controls);makeControlButton(row,'COMPOSE',setCompose);makeControlButton(row,'▶ PLAY',()=>startSequence(false));makeControlButton(row,'● REC',()=>startSequence(true));statusEl=createDiv('COMPOSE MODE');statusEl.class('rec-status');statusEl.parent(controls);
  const bg=makeSection(panel,'Background');const pal=createDiv();pal.class('palette');pal.parent(bg);BG_PALETTE.forEach(c=>{const sw=createButton('');sw.class('swatch');sw.parent(pal);sw.style('background',c);sw.mousePressed(()=>state.bgColor=c)});const gw=createDiv();gw.class('field');gw.parent(bg);createElement('label','griglia').parent(gw);const gc=createCheckbox('',state.showGrid);gc.parent(gw);gc.changed(()=>state.showGrid=gc.checked());
  const identity=makeSection(panel,'Identità');makeTextField(identity,'Titolo',state.title,v=>state.title=v);makeTextField(identity,'Anno',state.year,v=>state.year=v);makeTextField(identity,'Info',state.info,v=>state.info=v);makeTextField(identity,'Footer',state.footer,v=>state.footer=v);
  const scales=makeSection(panel,'Scale');const popupScale=createDiv();popupScale.class('popup-scale-control');popupScale.parent(scales);const minus=createButton('−');minus.class('mini-button');minus.parent(popupScale);minus.mousePressed(()=>changePopupScale(-.1));popupScaleValueEl=createDiv(`POPUP ${state.scales.popup.toFixed(1)}×`);popupScaleValueEl.class('scale-value');popupScaleValueEl.parent(popupScale);const plus=createButton('+');plus.class('mini-button');plus.parent(popupScale);plus.mousePressed(()=>changePopupScale(.1));makeScale(scales,'Luoghi','label',.6,3,.05);makeScale(scales,'Topi','rat',.6,2.2,.05);
  const places=makeSection(panel,'Luoghi / coordinate');state.places.forEach((p,i)=>makePlaceEditor(places,p,i));const pa=createDiv();pa.class('place-actions');pa.parent(places);const fb=createButton('📌 FIX LUOGHI');fb.class('fix-button');fb.parent(pa);fb.mousePressed(()=>{saveFixedPlaces();generateRatStarts();refreshRatEditors()});const rb=createButton('RESET');rb.class('fix-button secondary');rb.parent(pa);rb.mousePressed(()=>{resetPlaces();generateRatStarts();refreshRatEditors()});placeStatusEl=createDiv('sposta icona + label → FIX LUOGHI');placeStatusEl.class('coords');placeStatusEl.parent(places);
  const rats=makeSection(panel,'Topi / arrivo');const countWrap=createDiv();countWrap.class('field');countWrap.parent(rats);createElement('label','Numero topi').parent(countWrap);const countSel=createSelect();countSel.parent(countWrap);for(let i=1;i<=5;i++)countSel.option(String(i),String(i));countSel.selected(String(state.ratCount));countSel.changed(()=>{state.ratCount=Number(countSel.value());saveRats();generateRatStarts();refreshRatEditors()});ratEditorEl=createDiv();ratEditorEl.class('rat-editors');ratEditorEl.parent(rats);refreshRatEditors();const ratHint=createDiv('Scegli solo il luogo di ARRIVO. A ogni PLAY/REC il topo entra da un bordo random lontano dalla destinazione e segue la griglia H/V.');ratHint.class('coords');ratHint.parent(rats);
  const popSec=makeSection(panel,'Popup eventi');popupEditorEl=createDiv();popupEditorEl.parent(popSec);refreshPopupEditors();const add=createButton('+ AGGIUNGI POPUP');add.class('fix-button');add.parent(popSec);add.mousePressed(addPopup);
  const logos=makeSection(panel,'Loghi PNG / cuori');for(let i=0;i<3;i++){const w=createDiv();w.class('field logo-input');w.parent(logos);createElement('label',`Cuore ${i+1} → Logo ${i+1}`).parent(w);const inp=createFileInput(f=>handleLogo(f,i));inp.parent(w);inp.attribute('accept','image/png,image/*')}
}

function changePopupScale(delta){state.scales.popup=constrain(round((state.scales.popup+delta)*10)/10,.5,3);if(popupScaleValueEl)popupScaleValueEl.html(`POPUP ${state.scales.popup.toFixed(1)}×`)}
function addPopup(){const i=state.popups.length;state.popups.push({date:'00.00.2026',title:`EVENTO ${String(i+1).padStart(2,'0')}`,body:'Nuovo evento'});const col=i%2,row=floor(i/2);state.popupPositions.push({x:80+col*470,y:180+row*300});refreshPopupEditors()}
function refreshPopupEditors(){if(!popupEditorEl)return;popupEditorEl.html('');state.popups.forEach((p,i)=>{const sec=createDiv();sec.class('popup-editor-card');sec.parent(popupEditorEl);const title=createDiv(`POPUP ${i+1}`);title.class('rat-title');title.parent(sec);const grid=createDiv();grid.class('popup-grid');grid.parent(sec);makeTextField(grid,'Data',p.date,v=>p.date=v);makeTextField(grid,'Titolo',p.title,v=>p.title=v);makeTextareaField(sec,'Testo',p.body,v=>p.body=v);const meta=createDiv(`x ${round(state.popupPositions[i].x)} · y ${round(state.popupPositions[i].y)}`);meta.class('coords');meta.id(`coords-${i}`);meta.parent(sec);if(state.popups.length>1){const del=createButton('× ELIMINA');del.class('mini-button delete');del.parent(sec);del.mousePressed(()=>removePopup(i))}})}
function removePopup(i){state.popups.splice(i,1);state.popupPositions.splice(i,1);refreshPopupEditors()}
function makePlaceEditor(parent,p,i){const w=createDiv();w.class('place-editor');w.parent(parent);const g=createDiv();g.class('place-grid');g.parent(w);makeTextField(g,`Luogo ${i+1}`,p.name,v=>p.name=v);makeTextField(g,'Icona',p.icon,v=>p.icon=v);const m=createDiv(`x ${round(p.x)} · y ${round(p.y)}`);m.id(`place-coords-${i}`);m.class('coords');m.parent(w)}
function refreshRatEditors(){
  if(!ratEditorEl)return;ratEditorEl.html('');while(state.rats.length<5)state.rats.push({to:0});
  for(let i=0;i<state.ratCount;i++){
    const r=state.rats[i],box=createDiv();box.class('rat-editor');box.parent(ratEditorEl);const title=createDiv(`TOPO ${i+1}`);title.class('rat-title');title.parent(box);
    makePlaceSelect(box,'ARRIVA A',r.to,v=>{r.to=v;saveRats();generateRatStarts()});
    const start=state.ratStarts[i];if(start){const meta=createDiv(`partenza automatica: ${start.side.toUpperCase()} / x ${round(start.x)} y ${round(start.y)}`);meta.class('coords');meta.parent(box)}
  }
}
function makePlaceSelect(parent,label,value,onChange){const w=createDiv();w.class('field');w.parent(parent);createElement('label',label).parent(w);const s=createSelect();s.parent(w);state.places.forEach((p,i)=>s.option(`${p.icon} ${p.name}`,String(i)));s.selected(String(value));s.changed(()=>onChange(Number(s.value())));return s}
function makeControlButton(p,l,fn){const b=createButton(l);b.class('control-button');b.parent(p);b.mousePressed(fn)}
function makeSection(p,t){const s=createDiv();s.class('section');s.parent(p);const h=createDiv(t);h.class('section-title');h.parent(s);return s}
function makeTextField(p,l,v,fn){const w=createDiv();w.class('field');w.parent(p);createElement('label',l).parent(w);const i=createInput(v);i.parent(w);i.input(()=>fn(i.value()));return i}
function makeTextareaField(p,l,v,fn){const w=createDiv();w.class('field');w.parent(p);createElement('label',l).parent(w);const t=createElement('textarea',v);t.parent(w);t.input(()=>fn(t.value()));return t}
function makeScale(p,l,k,minV,maxV,step){const r=createDiv();r.class('scale-row');r.parent(p);createElement('label',l).parent(r);const s=createSlider(minV,maxV,state.scales[k],step);s.parent(r);const v=createDiv(state.scales[k].toFixed(2)+'×');v.class('scale-value');v.parent(r);s.input(()=>{state.scales[k]=Number(s.value());v.html(Number(s.value()).toFixed(2)+'×')})}
function handleLogo(file,i){if(!file||file.type!=='image')return;loadImage(file.data,img=>state.logos[i]=img)}

function saveFixedPlaces(){localStorage.setItem(PLACE_STORAGE_KEY,JSON.stringify(state.places));if(placeStatusEl)placeStatusEl.html('✓ LUOGHI FISSATI — ingressi ricalcolati')}
function loadFixedPlaces(){try{const raw=localStorage.getItem(PLACE_STORAGE_KEY);if(!raw)return;const saved=JSON.parse(raw);if(Array.isArray(saved))state.places=saved.map((p,i)=>({...DEFAULT_PLACES[i],...p}))}catch(e){console.warn(e)}}
function resetPlaces(){state.places=DEFAULT_PLACES.map(p=>({...p}));localStorage.removeItem(PLACE_STORAGE_KEY);if(placeStatusEl)placeStatusEl.html('reset luoghi')}
function saveRats(){localStorage.setItem(RAT_STORAGE_KEY,JSON.stringify({ratCount:state.ratCount,rats:state.rats.map(r=>({to:r.to}))}))}
function loadRats(){try{const raw=localStorage.getItem(RAT_STORAGE_KEY);if(!raw)return;const saved=JSON.parse(raw);if(saved.ratCount)state.ratCount=saved.ratCount;if(Array.isArray(saved.rats))state.rats=saved.rats.map(r=>({to:Number.isFinite(r.to)?r.to:0}))}catch(e){console.warn(e)}}

function setCompose(){stopRecording(false);sequence.mode='compose';sequence.elapsed=0;setStatus('COMPOSE MODE')}
function startSequence(rec){if(sequence.mode==='play'||sequence.mode==='rec')return;generateRatStarts();refreshRatEditors();sequence.finalDir=random()<.5?1:-1;sequence.finalY=random(330,1020);sequence.strobeOffset=floor(random(BG_PALETTE.length));sequence.mode=rec?'rec':'play';sequence.startedAt=millis();sequence.elapsed=0;setStatus(rec?'● RECORDING':'PLAYING');if(rec)startRecording()}
function finishSequence(){const wasRec=sequence.mode==='rec';sequence.mode='final';sequence.elapsed=SEQUENCE_MS;setStatus('FINAL FRAME');if(wasRec)stopRecording(true)}
function setStatus(t){if(statusEl)statusEl.html(t)}
function startRecording(){try{const stream=canvas.captureStream(60),mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';sequence.chunks=[];sequence.recorder=new MediaRecorder(stream,{mimeType:mime});sequence.recorder.ondataavailable=e=>{if(e.data&&e.data.size)sequence.chunks.push(e.data)};sequence.recorder.onstop=saveRecording;sequence.recorder.start()}catch(e){setStatus('REC ERROR')}}
function stopRecording(save=true){if(sequence.recorder&&sequence.recorder.state!=='inactive'){if(!save)sequence.recorder.onstop=null;sequence.recorder.stop()}}
function saveRecording(){if(!sequence.chunks.length)return;const b=new Blob(sequence.chunks,{type:'video/webm'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=`ex-casa-${Date.now()}.webm`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}

function drawBackground(){noStroke();fill(state.bgColor);rect(0,0,BASE_W,BASE_H);if(state.showGrid){stroke(0,state.gridAlpha);strokeWeight(.7);for(let x=0;x<=BASE_W;x+=GRID_STEP)line(x,0,x,BASE_H);for(let y=0;y<=BASE_H;y+=GRID_STEP)line(0,y,BASE_W,y)}}
function cellKey(c,r){return `${c},${r}`}function cellIndex(c,r){return r*GRID.cols+c}function indexCell(i){return{c:i%GRID.cols,r:floor(i/GRID.cols)}}function cellCenter(c,r){return{x:c*GRID_STEP+GRID_STEP/2,y:r*GRID_STEP+GRID_STEP/2}}
function addEdge(a,b){if(!GRID.edges.has(a))GRID.edges.set(a,new Set());if(!GRID.edges.has(b))GRID.edges.set(b,new Set());GRID.edges.get(a).add(b);GRID.edges.get(b).add(a)}
function buildGrid(){GRID.blocked=new Set(BLOCKED_CELLS.map(([c,r])=>cellKey(c,r)));GRID.edges=new Map();for(let r=0;r<GRID.rows;r++)for(let c=0;c<GRID.cols;c++){if(GRID.blocked.has(cellKey(c,r)))continue;const a=cellIndex(c,r);if(c+1<GRID.cols&&!GRID.blocked.has(cellKey(c+1,r)))addEdge(a,cellIndex(c+1,r));if(r+1<GRID.rows&&!GRID.blocked.has(cellKey(c,r+1)))addEdge(a,cellIndex(c,r+1))}}
function drawBlockedDots(){push();noStroke();fill(COLORS.black);BLOCKED_CELLS.forEach(([c,r])=>{const p=cellCenter(c,r);circle(p.x,p.y,6)});pop()}
function nearestNode(pt){let best=0,bd=Infinity;for(const i of GRID.edges.keys()){const {c,r}=indexCell(i),p=cellCenter(c,r),d=dist(pt.x,pt.y,p.x,p.y);if(d<bd){bd=d;best=i}}return best}
function bfsPath(start,end){if(start===end)return[start];const q=[start],prev=new Map([[start,null]]);while(q.length){const cur=q.shift();for(const n of(GRID.edges.get(cur)||[])){if(prev.has(n))continue;prev.set(n,cur);if(n===end){const path=[end];let k=end;while(prev.get(k)!==null){k=prev.get(k);path.push(k)}return path.reverse()}q.push(n)}}return[start]}

function getPlaceCenter(index){const p=state.places[constrain(index,0,state.places.length-1)],S=state.scales.label;return{x:p.x+(p.w*S)/2,y:p.y+79*S}}
function borderCandidates(){const out=[];for(let c=0;c<GRID.cols;c++){for(const r of [0,GRID.rows-1]){if(!GRID.blocked.has(cellKey(c,r)))out.push({c,r})}}for(let r=1;r<GRID.rows-1;r++){for(const c of [0,GRID.cols-1]){if(!GRID.blocked.has(cellKey(c,r)))out.push({c,r})}}return out}
function pickStartForDestination(dest,index){
  const candidates=borderCandidates().map(cell=>{const p=cellCenter(cell.c,cell.r);return{...cell,p,d:dist(p.x,p.y,dest.x,dest.y)}}).filter(o=>o.d>min(BASE_W,BASE_H)*.42);
  const pool=(candidates.length?candidates:borderCandidates().map(cell=>{const p=cellCenter(cell.c,cell.r);return{...cell,p,d:dist(p.x,p.y,dest.x,dest.y)}})).sort((a,b)=>b.d-a.d);
  const top=pool.slice(0,max(4,floor(pool.length*.28)));const chosen=random(top);const p=chosen.p;let x=p.x,y=p.y,side='left';
  if(chosen.c===0){x=-GRID_STEP*2;side='left'}else if(chosen.c===GRID.cols-1){x=BASE_W+GRID_STEP*2;side='right'}else if(chosen.r===0){y=-GRID_STEP*2;side='top'}else{y=BASE_H+GRID_STEP*2;side='bottom'}
  return{x,y,side,node:cellIndex(chosen.c,chosen.r)};
}
function generateRatStarts(){state.ratStarts=[];for(let i=0;i<state.ratCount;i++){const r=state.rats[i]||{to:0};state.ratStarts.push(pickStartForDestination(getPlaceCenter(r.to),i))}}
function buildRatRoute(i){const r=state.rats[i]||{to:0},b=getPlaceCenter(r.to),startInfo=state.ratStarts[i]||pickStartForDestination(b,i),end=nearestNode(b),ids=bfsPath(startInfo.node,end),pts=[{x:startInfo.x,y:startInfo.y}];ids.forEach(id=>{const {c,r}=indexCell(id);pts.push(cellCenter(c,r))});pts.push(b);return orthogonalizeRoute(pts)}
function orthogonalizeRoute(points){const out=[points[0]];for(let i=1;i<points.length;i++){const prev=out[out.length-1],next=points[i];if(abs(prev.x-next.x)>1&&abs(prev.y-next.y)>1)out.push({x:next.x,y:prev.y});out.push(next)}return out}

function drawIdentity(){const ink=isDark(state.bgColor)?COLORS.white:COLORS.black;textAlign(LEFT,TOP);textFont('Helvetica');textStyle(BOLD);noStroke();fill(COLORS.pink);textSize(42);text(state.title||'',61,35);stroke(COLORS.black);strokeWeight(5);fill(COLORS.white);text(state.title||'',55,29);noStroke();fill(ink);textSize(28);text(state.year||'',57,80);textSize(12);text(state.info||'',58,118);textAlign(LEFT,BOTTOM);text(state.footer||'',55,BASE_H-26)}
function isDark(hex){const c=color(hex);return(red(c)+green(c)+blue(c))/3<100}
function drawPlaceLabels(){for(let i=0;i<state.places.length;i++){const p=state.places[i],S=state.scales.label,labelH=34;push();translate(p.x,p.y);scale(S);noStroke();textAlign(CENTER,CENTER);textSize(42);text(p.icon||'',p.w/2,34);fill(i%2===0?COLORS.acid:COLORS.white);stroke(COLORS.black);strokeWeight(2);rect(0,62,p.w,labelH,5);noStroke();fill(COLORS.black);textFont('Helvetica');textStyle(BOLD);textSize(11);textAlign(CENTER,CENTER);text(p.name,p.w/2,79);pop()}}
function drawFinalComposition(){for(let i=0;i<state.popups.length;i++)drawPopupCard(i,1);for(let i=0;i<state.ratCount;i++){const route=buildRatRoute(i),end=route[route.length-1];drawRat(end.x,end.y,i)}drawLogoHeartsFinal()}
function drawAnimatedSequence(){const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1),ratEnd=.42,popupStart=.47,popupEnd=.73,logos=.77;for(let i=0;i<state.ratCount;i++){const delay=i*.045,local=constrain((t-delay)/(ratEnd-delay),0,1),route=buildRatRoute(i),pos=pointOnPolyline(route,easeInOutCubic(local));drawRat(pos.x,pos.y,i)}const n=max(1,state.popups.length);for(let i=0;i<n;i++){const s=popupStart+(popupEnd-popupStart)*(i/max(1,n-1));if(t>=s)drawPopupCard(i,popupEase(t,s))}drawLogoHeartSequence(t,logos)}
function popupEase(t,s){return easeOutBack(constrain((t-s)/.065,0,1))}function pointOnPolyline(points,tt){let total=0,l=[];for(let i=0;i<points.length-1;i++){const d=dist(points[i].x,points[i].y,points[i+1].x,points[i+1].y);l.push(d);total+=d}let target=tt*total;for(let i=0;i<l.length;i++){if(target<=l[i]){const q=target/l[i];return{x:lerp(points[i].x,points[i+1].x,q),y:lerp(points[i].y,points[i+1].y,q)}}target-=l[i]}return points[points.length-1]}function easeInOutCubic(x){return x<.5?4*x*x*x:1-pow(-2*x+2,3)/2}function easeOutBack(x){const c1=1.70158,c3=c1+1;return 1+c3*pow(x-1,3)+c1*pow(x-1,2)}function drawRat(x,y,i){push();translate(x,y);if(i%2)scale(-1,1);textAlign(CENTER,CENTER);textSize(48*state.scales.rat);noStroke();text('🐁',0,0);pop()}

function popupSize(i){const len=(state.popups[i]?.body||'').length;return{w:300,h:len>90?210:180}}
function popupBounds(i){const p=state.popupPositions[i],sz=popupSize(i),S=state.scales.popup;return{left:p.x+sz.w/2-(sz.w*S)/2,top:p.y+sz.h/2-(sz.h*S)/2,w:sz.w*S,h:sz.h*S,baseW:sz.w,baseH:sz.h,S}}
function drawPopupCard(i,a){
  const d=state.popups[i];if(!d)return;const p=state.popupPositions[i],sz=popupSize(i),w=sz.w,h=sz.h,S=state.scales.popup*a;
  push();translate(p.x+w/2,p.y+h/2);scale(S);translate(-w/2,-h/2);
  noStroke();fill('#F5F5F7');rect(0,0,w,h,15);stroke(0,45);strokeWeight(1);noFill();rect(0,0,w,h,15);
  noStroke();fill('#ECECEF');rect(0,0,w,32,15,15,0,0);fill(0,100);circle(17,16,9);circle(31,16,9);circle(45,16,9);
  fill(COLORS.black);textAlign(LEFT,TOP);textFont('Times New Roman');textStyle(NORMAL);textSize(17);text(d.date||'',15,46);textSize(28);text(d.title||'',15,70,w-30,45);textFont('Helvetica');textSize(14);text(d.body||'',15,120,w-30,h-130);pop();
}
function drawLogoHeartsFinal(){for(let i=0;i<3;i++)drawLogoSlot(i,1,1)}function drawLogoHeartSequence(t,start){const step=.045;for(let i=0;i<3;i++){const local=(t-(start+i*step))/step;if(local<0){drawLogoSlot(i,0,1);continue}if(local<.34){const q=local/.34;drawLogoSlot(i,0,1+sin(q*PI)*.75);drawHeartBurst(i,q)}else if(local<1){const q=(local-.34)/.66;drawLogoSlot(i,easeOutBack(q),max(.15,1-q*.35))}else drawLogoSlot(i,1,1)}}
function drawLogoSlot(i,logoAmount,heartScale){const xs=[820,910,1000],y=1240,d=66,x=xs[i];push();translate(x,y);if(logoAmount<.98){push();scale(heartScale);noStroke();fill(COLORS.pink);textAlign(CENTER,CENTER);textSize(54);text('♥',0,0);pop()}if(logoAmount>0){push();scale(logoAmount);fill(COLORS.white);stroke(COLORS.black);strokeWeight(2);circle(0,0,d);const img=state.logos[i];if(img){const m=d*.7,s=min(m/img.width,m/img.height);imageMode(CENTER);image(img,0,0,img.width*s,img.height*s);imageMode(CORNER)}else{noStroke();fill(COLORS.black);textAlign(CENTER,CENTER);textFont('Helvetica');textStyle(BOLD);textSize(9);text(state.logoLabels[i],0,0)}pop()}pop()}
function drawHeartBurst(i,q){const xs=[820,910,1000],y=1240,x=xs[i];push();translate(x,y);noStroke();fill(COLORS.pink);for(let k=0;k<8;k++){const a=TWO_PI*k/8,r=18+q*58;push();translate(cos(a)*r,sin(a)*r);textAlign(CENTER,CENTER);textSize(18*(1-q)+5);text('♥',0,0);pop()}pop()}
function drawStrobeFinal(){const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1),q=constrain((t-.86)/.14,0,1),flash=floor(sequence.elapsed/95);const c=BG_PALETTE[(flash+sequence.strobeOffset)%BG_PALETTE.length];noStroke();fill(c);rect(0,0,BASE_W,BASE_H);drawIdentity();const pad=520,x=sequence.finalDir===1?lerp(-pad,BASE_W+pad,q):lerp(BASE_W+pad,-pad,q);push();translate(x,sequence.finalY);if(sequence.finalDir<0)scale(-1,1);textAlign(CENTER,CENTER);textSize(620);noStroke();text('🐁',0,0);pop()}

function screenToWorld(mx,my){return{x:(mx-view.ox)/view.s,y:(my-view.oy)/view.s}}
function mousePressed(){
  if(sequence.mode!=='compose'||mouseX>=view.artViewportW)return;const m=screenToWorld(mouseX,mouseY);
  for(let i=state.popupPositions.length-1;i>=0;i--){const b=popupBounds(i);if(m.x>=b.left&&m.x<=b.left+b.w&&m.y>=b.top&&m.y<=b.top+b.h){dragType='popup';dragIndex=i;dragOffX=m.x-b.left;dragOffY=m.y-b.top;return}}
  for(let i=state.places.length-1;i>=0;i--){const p=state.places[i],w=p.w*state.scales.label,h=96*state.scales.label;if(m.x>=p.x&&m.x<=p.x+w&&m.y>=p.y&&m.y<=p.y+h){dragType='place';dragIndex=i;dragOffX=m.x-p.x;dragOffY=m.y-p.y;return}}
}
function mouseDragged(){
  if(sequence.mode!=='compose'||dragIndex<0)return;const m=screenToWorld(mouseX,mouseY);
  if(dragType==='popup'){
    const p=state.popupPositions[dragIndex],b=popupBounds(dragIndex);const desiredLeft=constrain(m.x-dragOffX,0,BASE_W-b.w),desiredTop=constrain(m.y-dragOffY,0,BASE_H-b.h);
    p.x=desiredLeft-b.baseW/2+(b.baseW*b.S)/2;p.y=desiredTop-b.baseH/2+(b.baseH*b.S)/2;
    const c=select(`#coords-${dragIndex}`);if(c)c.html(`x ${round(p.x)} · y ${round(p.y)}`);
  }else if(dragType==='place'){
    const p=state.places[dragIndex];p.x=constrain(m.x-dragOffX,0,BASE_W-p.w*state.scales.label);p.y=constrain(m.y-dragOffY,0,BASE_H-96*state.scales.label);const c=select(`#place-coords-${dragIndex}`);if(c)c.html(`x ${round(p.x)} · y ${round(p.y)}`);if(placeStatusEl)placeStatusEl.html('modifiche non ancora fissate')
  }
}
function mouseReleased(){dragType=null;dragIndex=-1}
function windowResized(){resizeCanvas(windowWidth,windowHeight)}