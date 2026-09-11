const W = 1080;
const H = 1350;
const PANEL_W = 320;

let rat = { x: 120, y: 1120, size: 72, pathIndex: 0, t: 0 };
let playing = false;
let speed = 0.008;
let activePopup = null;
let completed = new Set();
let finalReached = false;

const pathPoints = [
  { x: 120, y: 1120 },
  { x: 210, y: 1040 },
  { x: 280, y: 930 },
  { x: 340, y: 825 },
  { x: 460, y: 760 },
  { x: 590, y: 690 },
  { x: 700, y: 600 },
  { x: 760, y: 480 },
  { x: 690, y: 365 },
  { x: 560, y: 300 },
  { x: 430, y: 250 },
  { x: 315, y: 205 }
];

const events = [
  { id: 1, pathIndex: 3, icon: '🧀', x: 350, y: 820, title: 'EVENTO 01', date: '12.03.2026', body: 'Titolo evento / talk / incontro', accent: '#FFD84D' },
  { id: 2, pathIndex: 7, icon: '🏠', x: 770, y: 480, title: 'CASA DEL CUSTODE', date: '18.05.2026', body: 'Mostra / residenza / restituzione', accent: '#FF85D2' },
  { id: 3, pathIndex: 9, icon: '🕳️', x: 565, y: 300, title: 'EVENTO 03', date: '27.09.2026', body: 'Performance / live / altra iniziativa', accent: '#6CE5E8' }
];

let btnPlay, btnReset, speedSlider;

function setup() {
  createCanvas(W + PANEL_W, H);
  pixelDensity(1);
  textFont('Arial');
  setupUI();
}

function setupUI() {
  btnPlay = createButton('PLAY');
  btnPlay.position(W + 30, 90);
  btnPlay.size(120, 44);
  btnPlay.mousePressed(() => {
    if (activePopup) return;
    playing = !playing;
    btnPlay.html(playing ? 'PAUSE' : 'PLAY');
  });

  btnReset = createButton('RESET');
  btnReset.position(W + 165, 90);
  btnReset.size(120, 44);
  btnReset.mousePressed(resetEngine);

  speedSlider = createSlider(0.003, 0.02, speed, 0.001);
  speedSlider.position(W + 30, 180);
  speedSlider.size(255);
  speedSlider.input(() => speed = speedSlider.value());

  for (const el of [btnPlay, btnReset]) {
    el.style('font-family', 'Arial, sans-serif');
    el.style('font-size', '14px');
    el.style('font-weight', '700');
    el.style('border', '2px solid #111');
    el.style('background', '#fff');
    el.style('cursor', 'pointer');
  }
}

function draw() {
  drawMap();
  drawRoute();
  drawLandmarks();
  drawRat();
  drawHUD();
  drawPanel();

  if (playing && !activePopup && !finalReached) updateRat();
  if (activePopup) drawPopup(activePopup);
  if (finalReached) drawFinal();
}

function drawMap() {
  noStroke();
  fill('#A7E38B');
  rect(0, 0, W, H);
  fill('#83CF6A');
  rect(45, 90, 990, 1160, 70);

  stroke('#F5E1B7');
  strokeWeight(72);
  noFill();
  beginShape();
  for (const p of pathPoints) curveVertex(p.x, p.y);
  endShape();

  noStroke();
  fill('#73CDE8');
  ellipse(545, 690, 250, 170);
  fill('#DFF6FF');
  ellipse(545, 690, 110, 80);

  drawTree(140, 210); drawTree(210, 330); drawTree(880, 260);
  drawTree(930, 520); drawTree(170, 620); drawTree(900, 830);
  drawTree(255, 1010); drawTree(820, 1070); drawTree(510, 1040);

  fill('#DDD1BC');
  rect(430, 1180, 220, 70, 8);
  fill('#222');
  textAlign(CENTER, CENTER);
  textSize(24);
  text('PINCIO', 540, 1215);

  fill('#EFE7D8');
  rect(360, 85, 360, 65, 8);
  fill('#222');
  textSize(22);
  text('PIAZZA VIII AGOSTO', 540, 118);
}

function drawTree(x, y) {
  noStroke();
  fill('#6B4B2A');
  rect(x - 8, y + 20, 16, 38);
  fill('#2E8B57');
  circle(x, y, 70);
}

function drawRoute() {
  stroke('#FF78C7');
  strokeWeight(10);
  noFill();
  drawingContext.setLineDash([20, 16]);
  beginShape();
  for (const p of pathPoints) vertex(p.x, p.y);
  endShape();
  drawingContext.setLineDash([]);
}

function drawLandmarks() {
  textAlign(CENTER, CENTER);
  textSize(56);
  text('🏠', 795, 445);
  text('🕳️', 555, 270);
  text('🧀', 345, 790);

  fill('#111');
  textSize(17);
  text('CASA DEL CUSTODE', 795, 505);
  text('BUCA / MAGAZZINO', 555, 330);
  text('EVENTO', 345, 850);

  textSize(72);
  text('❤️', 315, 175);
}

function drawRat() {
  textAlign(CENTER, CENTER);
  textSize(rat.size);
  push();
  translate(rat.x, rat.y);
  if (rat.pathIndex < pathPoints.length - 1) {
    const a = pathPoints[rat.pathIndex];
    const b = pathPoints[rat.pathIndex + 1];
    if (b.x < a.x) scale(-1, 1);
  }
  text('🐁', 0, 0);
  pop();
}

function updateRat() {
  if (rat.pathIndex >= pathPoints.length - 1) {
    finalReached = true;
    playing = false;
    btnPlay.html('PLAY');
    return;
  }

  const a = pathPoints[rat.pathIndex];
  const b = pathPoints[rat.pathIndex + 1];
  rat.t += speed;
  rat.x = lerp(a.x, b.x, rat.t);
  rat.y = lerp(a.y, b.y, rat.t);

  if (rat.t >= 1) {
    rat.pathIndex++;
    rat.t = 0;
    rat.x = b.x;
    rat.y = b.y;

    const hit = events.find(e => e.pathIndex === rat.pathIndex && !completed.has(e.id));
    if (hit) {
      activePopup = hit;
      completed.add(hit.id);
      playing = false;
      btnPlay.html('CONTINUE');
    }

    if (rat.pathIndex >= pathPoints.length - 1) {
      finalReached = true;
      playing = false;
      btnPlay.html('PLAY');
    }
  }
}

function drawPopup(ev) {
  const x = 165, y = 430, w = 750, h = 350;
  noStroke();
  fill(0, 0, 0, 55);
  rect(0, 0, W, H);

  fill('#FFFDF8');
  stroke('#111');
  strokeWeight(4);
  rect(x, y, w, h, 18);

  noStroke();
  fill(ev.accent);
  rect(x, y, 18, h, 18, 0, 0, 18);

  fill('#111');
  textAlign(LEFT, TOP);
  textSize(26);
  textStyle(BOLD);
  text(ev.date, x + 55, y + 48);
  textSize(40);
  text(ev.title, x + 55, y + 95);

  textStyle(NORMAL);
  textSize(24);
  text(ev.body, x + 55, y + 170, w - 110, 100);

  textAlign(RIGHT, BOTTOM);
  textSize(18);
  text('CLICK TO CONTINUE', x + w - 35, y + h - 30);
}

function drawFinal() {
  noStroke();
  fill(0, 0, 0, 65);
  rect(0, 0, W, H);

  fill('#FFF');
  stroke('#111');
  strokeWeight(4);
  circle(W / 2, H / 2, 430);

  noStroke();
  textAlign(CENTER, CENTER);
  textSize(150);
  text('❤️', W / 2, H / 2 - 40);
  fill('#111');
  textStyle(BOLD);
  textSize(64);
  text('ASAP', W / 2, H / 2 + 55);
  textStyle(NORMAL);
  textSize(24);
  text('annual map completed', W / 2, H / 2 + 120);
}

function drawHUD() {
  noStroke();
  fill('#111');
  rect(30, 28, 360, 78, 12);
  fill('#fff');
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(24);
  text('ASAP / MONTAGNOLA', 52, 55);
  textStyle(NORMAL);
  textSize(17);
  text('🐁  MAP 01   ·   2026', 52, 84);
}

function drawPanel() {
  noStroke();
  fill('#F7F7F7');
  rect(W, 0, PANEL_W, H);
  stroke('#111');
  strokeWeight(2);
  line(W, 0, W, H);

  noStroke();
  fill('#111');
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(22);
  text('RAT MAP ENGINE', W + 30, 30);
  textStyle(NORMAL);
  textSize(14);
  text('PLAY / PAUSE / RESET', W + 30, 60);
  text('SPEED', W + 30, 155);

  textSize(16);
  text('NODES', W + 30, 250);
  let yy = 290;
  for (const ev of events) {
    const done = completed.has(ev.id) ? '✓' : '○';
    text(`${done} ${ev.icon}  ${ev.date}`, W + 30, yy);
    yy += 36;
  }

  textSize(14);
  fill('#555');
  text('Mappa fissa\n+ layer annuale\n+ percorso topo\n+ popup sequenziali', W + 30, 440);
}

function mousePressed() {
  if (activePopup && mouseX < W) {
    activePopup = null;
    playing = true;
    btnPlay.html('PAUSE');
  }

  if (finalReached && mouseX < W) resetEngine();
}

function resetEngine() {
  rat = { x: pathPoints[0].x, y: pathPoints[0].y, size: 72, pathIndex: 0, t: 0 };
  completed.clear();
  activePopup = null;
  finalReached = false;
  playing = false;
  btnPlay.html('PLAY');
}
