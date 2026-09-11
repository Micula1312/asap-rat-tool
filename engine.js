// STEP 1 — STATIC MONTAGNOLA MAP
// Flat Pac-Man inspired background only: grey field, green areas, black tunnels.
// No rats, no popups, no events yet.

const BASE_W = 1080;
const BASE_H = 1350;

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

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noSmooth();
  textFont('monospace');
}

function draw() {
  background(COLORS.grey);

  const margin = 24;
  const scaleFactor = min(
    (width - margin * 2) / BASE_W,
    (height - margin * 2) / BASE_H
  );

  const drawW = BASE_W * scaleFactor;
  const drawH = BASE_H * scaleFactor;
  const ox = (width - drawW) / 2;
  const oy = (height - drawH) / 2;

  push();
  translate(ox, oy);
  scale(scaleFactor);
  drawMap();
  pop();
}

function drawMap() {
  noStroke();

  fill(COLORS.grey);
  rect(0, 0, BASE_W, BASE_H);

  fill(COLORS.green);
  const areas = [
    [70, 95, 260, 190],
    [390, 90, 230, 145],
    [760, 95, 245, 190],
    [90, 365, 190, 230],
    [350, 330, 190, 145],
    [650, 330, 165, 170],
    [855, 365, 150, 235],
    [75, 705, 220, 210],
    [355, 665, 290, 225],
    [715, 690, 155, 190],
    [900, 690, 105, 230],
    [85, 1015, 235, 220],
    [390, 1000, 150, 160],
    [660, 1015, 255, 185],
    [945, 1005, 70, 205]
  ];
  for (const a of areas) rect(...a);

  fill(COLORS.greenDark);
  const smallAreas = [
    [310, 250, 65, 65],
    [600, 250, 70, 65],
    [300, 540, 70, 120],
    [625, 535, 70, 110],
    [830, 570, 70, 95],
    [305, 920, 70, 75],
    [565, 920, 90, 70],
    [915, 930, 85, 60]
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

  fill(COLORS.white);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(28);
  text('EX CASA DEL CUSTODE', 55, 32);
  textStyle(NORMAL);
  textSize(18);
  text('2026 / 2027', 58, 68);
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
