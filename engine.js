// STEP 2 — STATIC MAP + LIVE CONTENT EDITOR
// Map stays simple. Right column edits title/info, 3 popup contents and 3 PNG logos.

const BASE_W = 1080;
const BASE_H = 1350;
const PANEL_W = 360;

const COLORS = {
  grey: '#7B7B7B',
  green: '#7BE495',
  greenDark: '#63D982',
  black: '#0B0B0F',
  blue: '#72B7FF',
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

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noSmooth();
  textFont('monospace');
  buildEditor();
}

function draw() {
  background(COLORS.grey);

  const artViewportW = max(320, width - PANEL_W);
  const margin = 18;
  const scaleFactor = min(
    (artViewportW - margin * 2) / BASE_W,
    (height - margin * 2) / BASE_H
  );

  const drawW = BASE_W * scaleFactor;
  const drawH = BASE_H * scaleFactor;
  const ox = max(margin, (artViewportW - drawW) / 2);
  const oy = (height - drawH) / 2;

  push();
  translate(ox, oy);
  scale(scaleFactor);
  drawMap();
  drawContentPreview();
  pop();
}

function buildEditor() {
  const panel = createDiv();
  panel.id('editor-panel');

  const head = createElement('h1', 'EX CASA / MAP EDITOR');
  head.parent(panel);
  const sub = createDiv('contenuti live · mappa fissa');
  sub.class('sub');
  sub.parent(panel);

  const identity = makeSection(panel, 'Identità');
  makeTextField(identity, 'Titolo', state.title, v => state.title = v);
  makeTextField(identity, 'Anno / edizione', state.year, v => state.year = v);
  makeTextField(identity, 'Info', state.info, v => state.info = v);
  makeTextField(identity, 'Footer / IG', state.footer, v => state.footer = v);

  for (let i = 0; i < 3; i++) {
    const section = makeSection(panel, `Popup ${i + 1}`);
    const row = createDiv();
    row.class('popup-grid');
    row.parent(section);

    makeTextField(row, 'Data', state.popups[i].date, v => state.popups[i].date = v);
    makeTextField(row, 'Titolo', state.popups[i].title, v => state.popups[i].title = v);
    makeTextareaField(section, 'Testo', state.popups[i].body, v => state.popups[i].body = v);
  }

  const logosSection = makeSection(panel, 'Loghi PNG');
  for (let i = 0; i < 3; i++) {
    const wrap = createDiv();
    wrap.class('field logo-input');
    wrap.parent(logosSection);

    const label = createElement('label', `Logo ${i + 1} · ${state.logoLabels[i]}`);
    label.parent(wrap);

    const input = createFileInput(file => handleLogo(file, i));
    input.parent(wrap);
    input.attribute('accept', 'image/png,image/*');
  }

  const hint = createDiv('I popup sono solo in preview: nello step successivo aggiungiamo posizionamento automatico + drag + anti-sovrapposizione.');
  hint.class('hint');
  hint.parent(panel);
}

function makeSection(parent, title) {
  const section = createDiv();
  section.class('section');
  section.parent(parent);
  const t = createDiv(title);
  t.class('section-title');
  t.parent(section);
  return section;
}

function makeTextField(parent, labelText, value, onChange) {
  const wrap = createDiv();
  wrap.class('field');
  wrap.parent(parent);

  const label = createElement('label', labelText);
  label.parent(wrap);

  const input = createInput(value);
  input.parent(wrap);
  input.input(() => onChange(input.value()));
  return input;
}

function makeTextareaField(parent, labelText, value, onChange) {
  const wrap = createDiv();
  wrap.class('field');
  wrap.parent(parent);

  const label = createElement('label', labelText);
  label.parent(wrap);

  const textarea = createElement('textarea', value);
  textarea.parent(wrap);
  textarea.input(() => onChange(textarea.value()));
  return textarea;
}

function handleLogo(file, index) {
  if (!file || file.type !== 'image') return;
  loadImage(file.data, img => state.logos[index] = img);
}

function drawMap() {
  noStroke();
  fill(COLORS.grey);
  rect(0, 0, BASE_W, BASE_H);

  fill(COLORS.green);
  const areas = [
    [70, 95, 260, 190], [390, 90, 230, 145], [760, 95, 245, 190],
    [90, 365, 190, 230], [350, 330, 190, 145], [650, 330, 165, 170], [855, 365, 150, 235],
    [75, 705, 220, 210], [355, 665, 290, 225], [715, 690, 155, 190], [900, 690, 105, 230],
    [85, 1015, 235, 220], [390, 1000, 150, 160], [660, 1015, 255, 185], [945, 1005, 70, 205]
  ];
  for (const a of areas) rect(...a);

  fill(COLORS.greenDark);
  const smallAreas = [
    [310, 250, 65, 65], [600, 250, 70, 65], [300, 540, 70, 120], [625, 535, 70, 110],
    [830, 570, 70, 95], [305, 920, 70, 75], [565, 920, 90, 70], [915, 930, 85, 60]
  ];
  for (const a of smallAreas) rect(...a);

  stroke(COLORS.black);
  strokeWeight(70);
  strokeCap(SQUARE);
  strokeJoin(MITER);
  noFill();

  line(40, 320, 1035, 320);
  line(350, 65, 350, 505);
  line(700, 65, 700, 520);
  line(40, 640, 1025, 640);
  line(330, 500, 330, 1040);
  line(700, 500, 700, 1080);
  line(70, 960, 1020, 960);
  line(545, 840, 545, 1260);
  line(145, 320, 145, 705);
  line(145, 705, 330, 705);
  line(145, 960, 145, 1250);
  line(145, 1250, 545, 1250);
  line(900, 320, 900, 705);
  line(700, 705, 900, 705);
  line(900, 960, 900, 1250);
  line(545, 1250, 900, 1250);
  rect(455, 515, 180, 250);

  noStroke();
  drawHouse(205, 555, 1.05);
  drawFilla(720, 860);
  drawFountain(545, 640);
  drawEntrance(545, 135, 'PINCIO');
  drawEntrance(250, 1210, 'VIA IRNERIO');
}

function drawContentPreview() {
  // identity
  fill(COLORS.white);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(28);
  text(state.title || '', 55, 28);
  textStyle(NORMAL);
  textSize(18);
  text(state.year || '', 58, 65);
  textSize(13);
  text(state.info || '', 58, 91);

  // 3 popup preview cards, intentionally static for this step.
  const cardX = 745;
  const cardYs = [170, 405, 805];
  for (let i = 0; i < 3; i++) drawPopupPreview(state.popups[i], cardX, cardYs[i], i);

  drawLogoPreview();

  fill(COLORS.white);
  textAlign(LEFT, BOTTOM);
  textSize(12);
  text(state.footer || '', 55, BASE_H - 26);
}

function drawPopupPreview(data, x, y, index) {
  const w = 275;
  const h = 175;

  fill(COLORS.cream);
  stroke(COLORS.black);
  strokeWeight(4);
  rect(x, y, w, h);

  noStroke();
  fill(COLORS.pink);
  rect(x, y, w, 34);

  fill(COLORS.black);
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(14);
  text(`POPUP ${index + 1}`, x + 12, y + 17);
  textStyle(NORMAL);

  textAlign(LEFT, TOP);
  textSize(12);
  text(data.date || '', x + 14, y + 48);
  textStyle(BOLD);
  textSize(18);
  text(data.title || '', x + 14, y + 70, w - 28, 42);
  textStyle(NORMAL);
  textSize(12);
  text(data.body || '', x + 14, y + 112, w - 28, 50);
}

function drawLogoPreview() {
  const startX = 790;
  const y = 1240;
  const d = 72;
  const gap = 92;

  for (let i = 0; i < 3; i++) {
    const x = startX + i * gap;

    fill(i === 0 ? COLORS.pink : i === 1 ? COLORS.cream : COLORS.green);
    noStroke();
    circle(x, y, d);

    const img = state.logos[i];
    if (img) {
      push();
      drawingContext.save();
      drawingContext.beginPath();
      drawingContext.arc(x, y, d * 0.45, 0, TWO_PI);
      drawingContext.clip();
      const maxD = d * 0.72;
      const s = min(maxD / img.width, maxD / img.height);
      imageMode(CENTER);
      image(img, x, y, img.width * s, img.height * s);
      imageMode(CORNER);
      drawingContext.restore();
      pop();
    } else {
      fill(COLORS.black);
      textAlign(CENTER, CENTER);
      textStyle(BOLD);
      textSize(11);
      text(state.logoLabels[i], x, y);
      textStyle(NORMAL);
    }
  }
}

function drawHouse(x, y, s = 1) {
  push();
  translate(x, y);
  scale(s);
  rectMode(CENTER);
  noStroke();
  fill(COLORS.cream);
  rect(0, 14, 82, 70);
  fill(COLORS.pink);
  triangle(-50, -18, 0, -62, 50, -18);
  fill(COLORS.black);
  rect(-22, 8, 15, 20);
  rect(22, 8, 15, 20);
  rect(0, 32, 18, 34);
  fill(COLORS.pink);
  textAlign(CENTER, CENTER);
  textSize(30);
  text('♥', 0, 6);
  rectMode(CORNER);
  pop();
}

function drawFountain(x, y) {
  push();
  translate(x, y);
  rectMode(CENTER);
  noStroke();
  fill(COLORS.blue);
  rect(0, 0, 110, 110);
  fill(COLORS.white);
  textAlign(CENTER, CENTER);
  textSize(42);
  text('♒', 0, -2);
  rectMode(CORNER);
  pop();
}

function drawFilla(x, y) {
  push();
  translate(x, y);
  noStroke();
  fill(COLORS.cream);
  rectMode(CENTER);
  rect(0, 0, 64, 64);
  fill(COLORS.black);
  textAlign(CENTER, CENTER);
  textSize(16);
  text('FILLA', 0, 0);
  rectMode(CORNER);
  pop();
}

function drawEntrance(x, y, label) {
  push();
  translate(x, y);
  rectMode(CENTER);
  noStroke();
  fill(COLORS.cream);
  rect(0, 0, label === 'PINCIO' ? 140 : 190, 54);
  fill(COLORS.black);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(16);
  text(label, 0, 0);
  textStyle(NORMAL);
  rectMode(CORNER);
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}