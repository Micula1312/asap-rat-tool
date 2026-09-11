// STEP 9 — PAC-MAN MAZE + FIXED PLACE BADGES + MULTI RAT ROUTES
const BASE_W=1080, BASE_H=1350, PANEL_W=360, SEQUENCE_MS=7200;
const COLORS={black:'#050505',pink:'#ff61b6',white:'#fff',acid:'#dfff00',blue:'#53b7ff',red:'#ff3b30',chrome:'#f5f5f7'};
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

const DEFAULT_RATS=[
  {from:3,to:0},
  {from:4,to:0},
  {from:1,to:0}
];

const state={
  bgColor:BG_PALETTE[1],showGrid:true,gridAlpha:20,
  title:'EX CASA DEL CUSTODE',year:'2026 / 2027',info:'GIARDINO DELLA MONTAGNOLA',footer:'@excasadelcustode',
  scales:{popup:1,label:1,rat:1},
  popups:[
    {date:'12.03.2026',title:'EVENTO 01',body:'Titolo / descrizione evento'},
    {date:'18.05.2026',title:'EVENTO 02',body:'Titolo / descrizione evento'},
    {date:'27.09.2026',title:'EVENTO 03',body:'Titolo / descrizione evento'}
  ],
  popupPositions:[{x:620,y:150},{x:710,y:430},{x:675,y:785}],
  places:DEFAULT_PLACES.map(p=>({...p})),
  ratCount:2,
  rats:DEFAULT_RATS.map(r=>({...r})),
  logos:[null,null,null],logoLabels:['ASAP','CUSTODIA','BOLOGNA']
};

const sequence={mode:'compose',startedAt:0,elapsed:0,recorder:null,chunks:[]};
let statusEl,placeStatusEl,ratEditorEl,dragType=null,dragIndex=-1,dragOffX=0,dragOffY=0;
let view={s:1,ox:0,oy:0,artViewportW:0};

function setup(){createCanvas(windowWidth,windowHeight);pixelDensity(1);noSmooth();loadFixedPlaces();loadRats();buildEditor()}

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
  drawBackground();drawMaze();drawIdentity();drawPlaceLabels();
  if(sequence.mode==='compose'||sequence.mode==='final')drawFinalComposition();else drawAnimatedSequence();
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

  const bg=makeSection(panel,'Background');
  const pal=createDiv();pal.class('palette');pal.parent(bg);
  BG_PALETTE.forEach(c=>{const sw=createButton('');sw.class('swatch');sw.parent(pal);sw.style('background',c);sw.mousePressed(()=>state.bgColor=c)});
  const gw=createDiv();gw.class('field');gw.parent(bg);createElement('label','griglia').parent(gw);
  const gc=createCheckbox('',state.showGrid);gc.parent(gw);gc.changed(()=>state.showGrid=gc.checked());

  const identity=makeSection(panel,'Identità');
  makeTextField(identity,'Titolo',state.title,v=>state.title=v);makeTextField(identity,'Anno',state.year,v=>state.year=v);makeTextField(identity,'Info',state.info,v=>state.info=v);makeTextField(identity,'Footer',state.footer,v=>state.footer=v);

  const scales=makeSection(panel,'Scale');
  makeScale(scales,'Popup','popup',.6,1.8,.05);makeScale(scales,'Luoghi','label',.6,1.8,.05);makeScale(scales,'Topi','rat',.6,2.2,.05);

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
  const ratHint=createDiv('I menu usano le coordinate dei LUOGHI. Dopo averli spostati premi FIX LUOGHI: partenza e arrivo seguiranno le nuove coordinate.');ratHint.class('coords');ratHint.parent(rats);

  for(let i=0;i<3;i++){
    const sec=makeSection(panel,`Popup ${i+1}`),grid=createDiv();grid.class('popup-grid');grid.parent(sec);
    makeTextField(grid,'Data',state.popups[i].date,v=>state.popups[i].date=v);makeTextField(grid,'Titolo',state.popups[i].title,v=>state.popups[i].title=v);makeTextareaField(sec,'Testo',state.popups[i].body,v=>state.popups[i].body=v);
    const c=createDiv('drag sulla composizione');c.class('coords');c.id(`coords-${i}`);c.parent(sec);
  }

  const logos=makeSection(panel,'Loghi PNG / cuori');
  for(let i=0;i<3;i++){const w=createDiv();w.class('field logo-input');w.parent(logos);createElement('label',`Cuore ${i+1} → Logo ${i+1}`).parent(w);const inp=createFileInput(f=>handleLogo(f,i));inp.parent(w);inp.attribute('accept','image/png,image/*')}
}

function makePlaceEditor(parent,p,i){
  const w=createDiv();w.class('place-editor');w.parent(parent);const g=createDiv();g.class('place-grid');g.parent(w);
  makeTextField(g,`Luogo ${i+1}`,p.name,v=>p.name=v);makeTextField(g,'Icona',p.icon,v=>p.icon=v);
  const m=createDiv(`x ${round(p.x)} · y ${round(p.y)}`);m.id(`place-coords-${i}`);m.class('coords');m.parent(w);
}

function refreshRatEditors(){
  if(!ratEditorEl)return;
  ratEditorEl.html('');
  while(state.rats.length<5)state.rats.push({from:3,to:0});
  for(let i=0;i<state.ratCount;i++){
    const r=state.rats[i],box=createDiv();box.class('rat-editor');box.parent(ratEditorEl);
    const title=createDiv(`TOPO ${i+1}`);title.class('rat-title');title.parent(box);
    const grid=createDiv();grid.class('rat-grid');grid.parent(box);
    makePlaceSelect(grid,'PARTE DA',r.from,v=>{r.from=v;saveRats()});
    makePlaceSelect(grid,'ARRIVA A',r.to,v=>{r.to=v;saveRats()});
  }
}
function makePlaceSelect(parent,label,value,onChange){
  const w=createDiv();w.class('field');w.parent(parent);createElement('label',label).parent(w);const s=createSelect();s.parent(w);
  state.places.forEach((p,i)=>s.option(`${p.icon} ${p.name}`,String(i)));s.selected(String(value));s.changed(()=>onChange(Number(s.value())));return s;
}

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
function startSequence(rec){if(sequence.mode==='play'||sequence.mode==='rec')return;sequence.mode=rec?'rec':'play';sequence.startedAt=millis();sequence.elapsed=0;setStatus(rec?'● RECORDING':'PLAYING');if(rec)startRecording()}
function finishSequence(){const wasRec=sequence.mode==='rec';sequence.mode='final';sequence.elapsed=SEQUENCE_MS;setStatus('FINAL FRAME');if(wasRec)stopRecording(true)}
function setStatus(t){if(statusEl)statusEl.html(t)}
function startRecording(){try{const stream=canvas.captureStream(60),mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';sequence.chunks=[];sequence.recorder=new MediaRecorder(stream,{mimeType:mime});sequence.recorder.ondataavailable=e=>{if(e.data&&e.data.size)sequence.chunks.push(e.data)};sequence.recorder.onstop=saveRecording;sequence.recorder.start()}catch(e){setStatus('REC ERROR')}}
function stopRecording(save=true){if(sequence.recorder&&sequence.recorder.state!=='inactive'){if(!save)sequence.recorder.onstop=null;sequence.recorder.stop()}}
function saveRecording(){if(!sequence.chunks.length)return;const b=new Blob(sequence.chunks,{type:'video/webm'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=`ex-casa-${Date.now()}.webm`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}

function drawBackground(){
  noStroke();fill(state.bgColor);rect(0,0,BASE_W,BASE_H);
  if(state.showGrid){stroke(0,state.gridAlpha);strokeWeight(.8);for(let x=0;x<=BASE_W;x+=24)line(x,0,x,BASE_H);for(let y=0;y<=BASE_H;y+=24)line(0,y,BASE_W,y)}
}

// PAC-MAN language: roads are empty corridors with a very thin outline, not black bars.
function drawMaze(){
  const paths=[
    [[70,235],[260,235],[260,150],[430,150]],
    [[650,150],[820,150],[820,235],[1010,235]],
    [[80,360],[220,360],[220,485],[380,485],[380,610]],
    [[1000,360],[860,360],[860,485],[700,485],[700,610]],
    [[65,730],[205,730],[205,625],[355,625]],
    [[1015,730],[875,730],[875,625],[725,625]],
    [[100,870],[270,870],[270,780],[420,780],[420,930]],
    [[980,870],[810,870],[810,780],[660,780],[660,930]],
    [[80,1080],[220,1080],[220,970],[370,970],[370,1135],[535,1135]],
    [[1000,1080],[860,1080],[860,970],[710,970],[710,1135],[545,1135]],
    [[520,160],[520,330],[400,330],[400,410]],
    [[560,160],[560,330],[680,330],[680,410]],
    [[540,870],[540,1010]],
    [[75,1215],[310,1215],[310,1270],[475,1270]],
    [[1005,1215],[770,1215],[770,1270],[605,1270]]
  ];
  paths.forEach(drawCorridor);
  drawCorridorOval(540,680,330,205);
  // central ghost-house-ish block
  drawOutlinedBox(448,520,184,92,10);
}
function drawCorridor(points){strokeCap(ROUND);strokeJoin(ROUND);noFill();stroke(COLORS.black);strokeWeight(20);beginShape();points.forEach(p=>vertex(p[0],p[1]));endShape();stroke(state.bgColor);strokeWeight(14);beginShape();points.forEach(p=>vertex(p[0],p[1]));endShape()}
function drawCorridorOval(x,y,w,h){noFill();stroke(COLORS.black);strokeWeight(20);ellipse(x,y,w,h);stroke(state.bgColor);strokeWeight(14);ellipse(x,y,w,h)}
function drawOutlinedBox(x,y,w,h,r){fill(state.bgColor);stroke(COLORS.black);strokeWeight(3);rect(x,y,w,h,r)}

function drawIdentity(){
  const ink=isDark(state.bgColor)?COLORS.white:COLORS.black;
  textAlign(LEFT,TOP);textFont('Helvetica');textStyle(BOLD);
  // hard flyer shadow
  noStroke();fill(COLORS.pink);textSize(42);text(state.title||'',61,35);
  stroke(COLORS.black);strokeWeight(5);fill(COLORS.white);text(state.title||'',55,29);
  noStroke();fill(ink);textSize(28);text(state.year||'',57,80);
  textSize(12);textStyle(BOLD);text(state.info||'',58,118);
  textAlign(LEFT,BOTTOM);textSize(12);text(state.footer||'',55,BASE_H-26);
}
function isDark(hex){const c=color(hex);return(red(c)+green(c)+blue(c))/3<100}

function drawPlaceLabels(){
  for(let i=0;i<state.places.length;i++){
    const p=state.places[i],S=state.scales.label,h=48;
    push();translate(p.x,p.y);scale(S);
    // ONE shared background for icon + label
    fill(i%2===0?COLORS.acid:COLORS.white);stroke(COLORS.black);strokeWeight(3);rect(0,0,p.w,h,5);
    noStroke();textAlign(LEFT,CENTER);textSize(26);text(p.icon||'',10,h/2+1);
    fill(COLORS.black);textFont('Helvetica');textStyle(BOLD);textSize(12);text(p.name,47,h/2+1);
    pop();
  }
}

function getPlaceCenter(index){const p=state.places[constrain(index,0,state.places.length-1)];return{x:p.x+p.w*state.scales.label/2,y:p.y+24*state.scales.label}}
function buildRatRoute(ratIndex){
  const r=state.rats[ratIndex]||state.rats[0],a=getPlaceCenter(r.from),b=getPlaceCenter(r.to);
  const flip=ratIndex%2===0;
  const midX=constrain(flip?(a.x+b.x)*.5+95:(a.x+b.x)*.5-95,90,990);
  const midY=constrain((a.y+b.y)*.5+(ratIndex-1)*70,170,1180);
  return [{x:a.x,y:a.y},{x:a.x,y:midY},{x:midX,y:midY},{x:midX,y:b.y},{x:b.x,y:b.y}];
}

function drawFinalComposition(){for(let i=0;i<3;i++)drawPopupCard(i,1);for(let i=0;i<state.ratCount;i++){const route=buildRatRoute(i),end=route[route.length-1];drawRat(end.x,end.y,i)}drawLogoHeartsFinal()}
function drawAnimatedSequence(){
  const t=constrain(sequence.elapsed/SEQUENCE_MS,0,1),ratEnd=.42,p1=.49,p2=.61,p3=.73,logos=.83;
  for(let i=0;i<state.ratCount;i++){
    const delay=i*.055,local=constrain((t-delay)/(ratEnd-delay),0,1),route=buildRatRoute(i),pos=pointOnPolyline(route,easeInOutCubic(local));drawRat(pos.x,pos.y,i);
  }
  if(t>=p1)drawPopupCard(0,popupEase(t,p1));if(t>=p2)drawPopupCard(1,popupEase(t,p2));if(t>=p3)drawPopupCard(2,popupEase(t,p3));drawLogoHeartSequence(t,logos);
}
function popupEase(t,s){return easeOutBack(constrain((t-s)/.08,0,1))}
function pointOnPolyline(points,tt){let total=0,l=[];for(let i=0;i<points.length-1;i++){const d=dist(points[i].x,points[i].y,points[i+1].x,points[i+1].y);l.push(d);total+=d}let target=tt*total;for(let i=0;i<l.length;i++){if(target<=l[i]){const q=target/l[i];return{x:lerp(points[i].x,points[i+1].x,q),y:lerp(points[i].y,points[i+1].y,q)}}target-=l[i]}return points[points.length-1]}
function easeInOutCubic(x){return x<.5?4*x*x*x:1-pow(-2*x+2,3)/2}
function easeOutBack(x){const c1=1.70158,c3=c1+1;return 1+c3*pow(x-1,3)+c1*pow(x-1,2)}
function drawRat(x,y,i){push();translate(x,y);if(i%2)scale(-1,1);textAlign(CENTER,CENTER);textSize(48*state.scales.rat);noStroke();text('🐁',0,0);pop()}

function popupSize(i){const len=(state.popups[i].body||'').length;return{w:300,h:len>90?210:180}}
function drawPopupCard(i,a){
  const d=state.popups[i],p=state.popupPositions[i],sz=popupSize(i),w=sz.w,h=sz.h,S=state.scales.popup*a;
  push();translate(p.x+w/2,p.y+h/2);scale(S);translate(-w/2,-h/2);
  fill(COLORS.white);stroke(COLORS.black);strokeWeight(3);rect(0,0,w,h,5);
  noStroke();fill(i===0?COLORS.pink:i===1?COLORS.acid:COLORS.blue);rect(0,0,w,34,5,5,0,0);
  fill(COLORS.black);circle(17,17,8);circle(31,17,8);circle(45,17,8);
  textAlign(LEFT,TOP);textFont('Helvetica');textStyle(BOLD);textSize(15);text(d.date||'',15,47);textSize(27);text(d.title||'',15,70,w-30,43);textStyle(NORMAL);textSize(14);text(d.body||'',15,120,w-30,h-130);pop();
}

function drawLogoHeartsFinal(){for(let i=0;i<3;i++)drawLogoSlot(i,1,1)}
function drawLogoHeartSequence(t,start){const step=.055;for(let i=0;i<3;i++){const local=(t-(start+i*step))/step;if(local<0){drawLogoSlot(i,0,1);continue}if(local<.34){const q=local/.34;drawLogoSlot(i,0,1+sin(q*PI)*.75);drawHeartBurst(i,q)}else if(local<1){const q=(local-.34)/.66;drawLogoSlot(i,easeOutBack(q),max(.15,1-q*.35))}else drawLogoSlot(i,1,1)}}
function drawLogoSlot(i,logoAmount,heartScale){const xs=[820,910,1000],y=1240,d=66,x=xs[i];push();translate(x,y);if(logoAmount<.98){push();scale(heartScale);noStroke();fill(COLORS.pink);textAlign(CENTER,CENTER);textSize(54);text('♥',0,0);pop()}if(logoAmount>0){push();scale(logoAmount);fill(COLORS.white);stroke(COLORS.black);strokeWeight(2);circle(0,0,d);const img=state.logos[i];if(img){const m=d*.7,s=min(m/img.width,m/img.height);imageMode(CENTER);image(img,0,0,img.width*s,img.height*s);imageMode(CORNER)}else{noStroke();fill(COLORS.black);textAlign(CENTER,CENTER);textFont('Helvetica');textStyle(BOLD);textSize(9);text(state.logoLabels[i],0,0)}pop()}pop()}
function drawHeartBurst(i,q){const xs=[820,910,1000],y=1240,x=xs[i];push();translate(x,y);noStroke();fill(COLORS.pink);for(let k=0;k<8;k++){const a=TWO_PI*k/8,r=18+q*58;push();translate(cos(a)*r,sin(a)*r);textAlign(CENTER,CENTER);textSize(18*(1-q)+5);text('♥',0,0);pop()}pop()}

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