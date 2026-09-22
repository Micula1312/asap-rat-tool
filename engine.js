// POST 01 · MAPPA — consolidated definitive implementation
// Runtime overrides removed; POST 02 and ID VISIVA remain independent.

const BASE_W = 1080,
  BASE_H = 1350,
  PANEL_W = 360,
  SEQUENCE_MS = 8200,
  GRID_STEP = 24;

const COLORS = {
  black: "#050505",
  pink: "#ff61b6",
  white: "#fff",
  acid: "#dfff00",
  blue: "#53b7ff",
  red: "#ff3b30",
  cream: "#fff1ce",
};

const BG_PALETTE = [
  "#08090B",
  "#151619",
  "#242529",
  "#3A3B3F",
  "#5A5B5E",
  "#858588",
  "#C5C3C4",
];

const PLACE_STORAGE_KEY = "ex-casa-map-places-v1";

const RAT_STORAGE_KEY = "ex-casa-map-rats-v2";

const DEFAULT_PLACES = [
  { name: "EX CASA DEL CUSTODE", icon: "🏠", x: 92, y: 545, w: 245 },
  { name: "PINCIO", icon: "🗿", x: 470, y: 110, w: 150 },
  { name: "FONTANA", icon: "⛲", x: 465, y: 650, w: 165 },
  { name: "VIA IRNERIO", icon: "🚪", x: 135, y: 1190, w: 190 },
  { name: "FILLA", icon: "🍸", x: 765, y: 1000, w: 130 },
];

const DEFAULT_RATS = [{ to: 0 }, { to: 0 }, { to: 0 }, { to: 0 }, { to: 0 }];

const state = {
  bgColor: BG_PALETTE[1],
  showGrid: true,
  gridAlpha: 16,
  title: "EX CASA DEL CUSTODE",
  year: "2026 / 2027",
  info: "GIARDINO DELLA MONTAGNOLA",
  footer: "@excasadelcustode",
  scales: { popup: 2, label: 2, rat: 1 },
  popups: [
    {
      date: "12.03.2026",
      title: "EVENTO 01",
      body: "Titolo / descrizione evento",
    },
    {
      date: "18.05.2026",
      title: "EVENTO 02",
      body: "Titolo / descrizione evento",
    },
    {
      date: "27.09.2026",
      title: "EVENTO 03",
      body: "Titolo / descrizione evento",
    },
  ],
  popupPositions: [
    { x: 520, y: 160 },
    { x: 620, y: 500 },
    { x: 500, y: 850 },
  ],
  places: DEFAULT_PLACES.map((p) => ({ ...p })),
  ratCount: 2,
  rats: DEFAULT_RATS.map((r) => ({ ...r })),
  ratStarts: [],
  logos: [null, null, null],
  logoLabels: ["ASAP", "CUSTODIA", "BOLOGNA"],
};

const sequence = {
  mode: "compose",
  startedAt: 0,
  elapsed: 0,
  recorder: null,
  chunks: [],
  finalDir: 1,
  finalY: 675,
  strobeOffset: 0,
};

let statusEl,
  placeStatusEl,
  ratEditorEl,
  popupEditorEl,
  popupScaleValueEl,
  dragType = null,
  dragIndex = -1,
  dragOffX = 0,
  dragOffY = 0;

let view = { s: 1, ox: 0, oy: 0, artViewportW: 0 };

const GRID = {
  cols: Math.floor(BASE_W / GRID_STEP),
  rows: Math.floor(BASE_H / GRID_STEP),
  edges: new Map(),
  blocked: new Set(),
};

const BLOCKED_CELLS = [
  [4, 8],
  [5, 8],
  [6, 8],
  [7, 8],
  [8, 8],
  [15, 8],
  [16, 8],
  [17, 8],
  [18, 8],
  [31, 8],
  [32, 8],
  [33, 8],
  [34, 8],
  [35, 8],
  [8, 14],
  [8, 15],
  [8, 16],
  [8, 17],
  [20, 14],
  [21, 14],
  [22, 14],
  [23, 14],
  [24, 14],
  [36, 14],
  [36, 15],
  [36, 16],
  [36, 17],
  [4, 24],
  [5, 24],
  [6, 24],
  [7, 24],
  [14, 24],
  [15, 24],
  [16, 24],
  [28, 24],
  [29, 24],
  [30, 24],
  [38, 24],
  [39, 24],
  [40, 24],
  [11, 32],
  [12, 32],
  [13, 32],
  [14, 32],
  [15, 32],
  [22, 32],
  [23, 32],
  [24, 32],
  [32, 32],
  [33, 32],
  [34, 32],
  [35, 32],
  [5, 41],
  [6, 41],
  [7, 41],
  [8, 41],
  [17, 41],
  [18, 41],
  [19, 41],
  [20, 41],
  [28, 41],
  [29, 41],
  [30, 41],
  [37, 41],
  [38, 41],
  [39, 41],
  [10, 49],
  [11, 49],
  [12, 49],
  [22, 49],
  [23, 49],
  [24, 49],
  [33, 49],
  [34, 49],
  [35, 49],
];

function changePopupScale(delta) {
  state.scales.popup = constrain(
    round((state.scales.popup + delta) * 10) / 10,
    0.5,
    3,
  );
  if (popupScaleValueEl)
    popupScaleValueEl.html(`POPUP ${state.scales.popup.toFixed(1)}×`);
}

function addPopup() {
  const i = state.popups.length;
  state.popups.push({
    date: "00.00.2026",
    title: `EVENTO ${String(i + 1).padStart(2, "0")}`,
    body: "Nuovo evento",
  });
  const col = i % 2,
    row = floor(i / 2);
  state.popupPositions.push({ x: 80 + col * 470, y: 180 + row * 300 });
  refreshPopupEditors();
}

function refreshPopupEditors() {
  if (!popupEditorEl) return;
  popupEditorEl.html("");
  state.popups.forEach((p, i) => {
    const sec = createDiv();
    sec.class("popup-editor-card");
    sec.parent(popupEditorEl);
    const title = createDiv(`POPUP ${i + 1}`);
    title.class("rat-title");
    title.parent(sec);
    const grid = createDiv();
    grid.class("popup-grid");
    grid.parent(sec);
    makeTextField(grid, "Data", p.date, (v) => (p.date = v));
    makeTextField(grid, "Titolo", p.title, (v) => (p.title = v));
    makeTextareaField(sec, "Testo", p.body, (v) => (p.body = v));
    const meta = createDiv(
      `x ${round(state.popupPositions[i].x)} · y ${round(state.popupPositions[i].y)}`,
    );
    meta.class("coords");
    meta.id(`coords-${i}`);
    meta.parent(sec);
    if (state.popups.length > 1) {
      const del = createButton("× ELIMINA");
      del.class("mini-button delete");
      del.parent(sec);
      del.mousePressed(() => removePopup(i));
    }
  });
}

function removePopup(i) {
  state.popups.splice(i, 1);
  state.popupPositions.splice(i, 1);
  refreshPopupEditors();
}

function makePlaceEditor(parent, p, i) {
  const w = createDiv();
  w.class("place-editor");
  w.parent(parent);
  const g = createDiv();
  g.class("place-grid");
  g.parent(w);
  makeTextField(g, `Luogo ${i + 1}`, p.name, (v) => (p.name = v));
  makeTextField(g, "Icona", p.icon, (v) => (p.icon = v));
  const m = createDiv(`x ${round(p.x)} · y ${round(p.y)}`);
  m.id(`place-coords-${i}`);
  m.class("coords");
  m.parent(w);
}

function refreshRatEditors() {
  if (!ratEditorEl) return;
  ratEditorEl.html("");
  while (state.rats.length < 5) state.rats.push({ to: 0 });
  for (let i = 0; i < state.ratCount; i++) {
    const r = state.rats[i],
      box = createDiv();
    box.class("rat-editor");
    box.parent(ratEditorEl);
    const title = createDiv(`TOPO ${i + 1}`);
    title.class("rat-title");
    title.parent(box);
    makePlaceSelect(box, "ARRIVA A", r.to, (v) => {
      r.to = v;
      saveRats();
      generateRatStarts();
    });
    const start = state.ratStarts[i];
    if (start) {
      const meta = createDiv(
        `partenza automatica: ${start.side.toUpperCase()} / x ${round(start.x)} y ${round(start.y)}`,
      );
      meta.class("coords");
      meta.parent(box);
    }
  }
}

function makePlaceSelect(parent, label, value, onChange) {
  const w = createDiv();
  w.class("field");
  w.parent(parent);
  createElement("label", label).parent(w);
  const s = createSelect();
  s.parent(w);
  state.places.forEach((p, i) => s.option(`${p.icon} ${p.name}`, String(i)));
  s.selected(String(value));
  s.changed(() => onChange(Number(s.value())));
  return s;
}

function makeControlButton(p, l, fn) {
  const b = createButton(l);
  b.class("control-button");
  b.parent(p);
  b.mousePressed(fn);
}

function makeSection(p, t) {
  const s = createDiv();
  s.class("section");
  s.parent(p);
  const h = createDiv(t);
  h.class("section-title");
  h.parent(s);
  return s;
}

function makeTextField(p, l, v, fn) {
  const w = createDiv();
  w.class("field");
  w.parent(p);
  createElement("label", l).parent(w);
  const i = createInput(v);
  i.parent(w);
  i.input(() => fn(i.value()));
  return i;
}

function makeTextareaField(p, l, v, fn) {
  const w = createDiv();
  w.class("field");
  w.parent(p);
  createElement("label", l).parent(w);
  const t = createElement("textarea", v);
  t.parent(w);
  t.input(() => fn(t.value()));
  return t;
}

function makeScale(p, l, k, minV, maxV, step) {
  const r = createDiv();
  r.class("scale-row");
  r.parent(p);
  createElement("label", l).parent(r);
  const s = createSlider(minV, maxV, state.scales[k], step);
  s.parent(r);
  const v = createDiv(state.scales[k].toFixed(2) + "×");
  v.class("scale-value");
  v.parent(r);
  s.input(() => {
    state.scales[k] = Number(s.value());
    v.html(Number(s.value()).toFixed(2) + "×");
  });
}

function handleLogo(file, i) {
  if (!file || file.type !== "image") return;
  loadImage(file.data, (img) => (state.logos[i] = img));
}

function saveFixedPlaces() {
  localStorage.setItem(PLACE_STORAGE_KEY, JSON.stringify(state.places));
  if (placeStatusEl)
    placeStatusEl.html("✓ LUOGHI FISSATI — ingressi ricalcolati");
}

function loadFixedPlaces() {
  try {
    const raw = localStorage.getItem(PLACE_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved))
      state.places = saved.map((p, i) => ({ ...DEFAULT_PLACES[i], ...p }));
  } catch (e) {
    console.warn(e);
  }
}

function resetPlaces() {
  state.places = DEFAULT_PLACES.map((p) => ({ ...p }));
  localStorage.removeItem(PLACE_STORAGE_KEY);
  if (placeStatusEl) placeStatusEl.html("reset luoghi");
}

function saveRats() {
  localStorage.setItem(
    RAT_STORAGE_KEY,
    JSON.stringify({
      ratCount: state.ratCount,
      rats: state.rats.map((r) => ({ to: r.to })),
    }),
  );
}

function loadRats() {
  try {
    const raw = localStorage.getItem(RAT_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.ratCount) state.ratCount = saved.ratCount;
    if (Array.isArray(saved.rats))
      state.rats = saved.rats.map((r) => ({
        to: Number.isFinite(r.to) ? r.to : 0,
      }));
  } catch (e) {
    console.warn(e);
  }
}

function setCompose() {
  stopRecording(false);
  sequence.mode = "compose";
  sequence.elapsed = 0;
  setStatus("COMPOSE MODE");
}

function startSequence(rec) {
  if (sequence.mode === "play" || sequence.mode === "rec") return;
  generateRatStarts();
  refreshRatEditors();
  sequence.finalDir = random() < 0.5 ? 1 : -1;
  sequence.finalY = random(330, 1020);
  sequence.strobeOffset = floor(random(BG_PALETTE.length));
  sequence.mode = rec ? "rec" : "play";
  sequence.startedAt = millis();
  sequence.elapsed = 0;
  setStatus(rec ? "● RECORDING" : "PLAYING");
  if (rec) startRecording();
}

function finishSequence() {
  const wasRec = sequence.mode === "rec";
  sequence.mode = "final";
  sequence.elapsed = SEQUENCE_MS;
  setStatus("FINAL FRAME");
  if (wasRec) stopRecording(true);
}

function setStatus(t) {
  if (statusEl) statusEl.html(t);
}

function drawBackground() {
  noStroke();
  fill(state.bgColor);
  rect(0, 0, BASE_W, BASE_H);
  if (state.showGrid) {
    stroke(0, state.gridAlpha);
    strokeWeight(0.7);
    for (let x = 0; x <= BASE_W; x += GRID_STEP) line(x, 0, x, BASE_H);
    for (let y = 0; y <= BASE_H; y += GRID_STEP) line(0, y, BASE_W, y);
  }
}

function cellKey(c, r) {
  return `${c},${r}`;
}

function cellIndex(c, r) {
  return r * GRID.cols + c;
}

function indexCell(i) {
  return { c: i % GRID.cols, r: floor(i / GRID.cols) };
}

function cellCenter(c, r) {
  return { x: c * GRID_STEP + GRID_STEP / 2, y: r * GRID_STEP + GRID_STEP / 2 };
}

function addEdge(a, b) {
  if (!GRID.edges.has(a)) GRID.edges.set(a, new Set());
  if (!GRID.edges.has(b)) GRID.edges.set(b, new Set());
  GRID.edges.get(a).add(b);
  GRID.edges.get(b).add(a);
}

function buildGrid() {
  GRID.blocked = new Set(BLOCKED_CELLS.map(([c, r]) => cellKey(c, r)));
  GRID.edges = new Map();
  for (let r = 0; r < GRID.rows; r++)
    for (let c = 0; c < GRID.cols; c++) {
      if (GRID.blocked.has(cellKey(c, r))) continue;
      const a = cellIndex(c, r);
      if (c + 1 < GRID.cols && !GRID.blocked.has(cellKey(c + 1, r)))
        addEdge(a, cellIndex(c + 1, r));
      if (r + 1 < GRID.rows && !GRID.blocked.has(cellKey(c, r + 1)))
        addEdge(a, cellIndex(c, r + 1));
    }
}

function nearestNode(pt) {
  let best = 0,
    bd = Infinity;
  for (const i of GRID.edges.keys()) {
    const { c, r } = indexCell(i),
      p = cellCenter(c, r),
      d = dist(pt.x, pt.y, p.x, p.y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

function bfsPath(start, end) {
  if (start === end) return [start];
  const q = [start],
    prev = new Map([[start, null]]);
  while (q.length) {
    const cur = q.shift();
    for (const n of GRID.edges.get(cur) || []) {
      if (prev.has(n)) continue;
      prev.set(n, cur);
      if (n === end) {
        const path = [end];
        let k = end;
        while (prev.get(k) !== null) {
          k = prev.get(k);
          path.push(k);
        }
        return path.reverse();
      }
      q.push(n);
    }
  }
  return [start];
}

function getPlaceCenter(index) {
  const p = state.places[constrain(index, 0, state.places.length - 1)],
    S = state.scales.label;
  return { x: p.x + (p.w * S) / 2, y: p.y + 79 * S };
}

function borderCandidates() {
  const out = [];
  for (let c = 0; c < GRID.cols; c++) {
    for (const r of [0, GRID.rows - 1]) {
      if (!GRID.blocked.has(cellKey(c, r))) out.push({ c, r });
    }
  }
  for (let r = 1; r < GRID.rows - 1; r++) {
    for (const c of [0, GRID.cols - 1]) {
      if (!GRID.blocked.has(cellKey(c, r))) out.push({ c, r });
    }
  }
  return out;
}

function pickStartForDestination(dest, index) {
  const candidates = borderCandidates()
    .map((cell) => {
      const p = cellCenter(cell.c, cell.r);
      return { ...cell, p, d: dist(p.x, p.y, dest.x, dest.y) };
    })
    .filter((o) => o.d > min(BASE_W, BASE_H) * 0.42);
  const pool = (
    candidates.length
      ? candidates
      : borderCandidates().map((cell) => {
          const p = cellCenter(cell.c, cell.r);
          return { ...cell, p, d: dist(p.x, p.y, dest.x, dest.y) };
        })
  ).sort((a, b) => b.d - a.d);
  const top = pool.slice(0, max(4, floor(pool.length * 0.28)));
  const chosen = random(top);
  const p = chosen.p;
  let x = p.x,
    y = p.y,
    side = "left";
  if (chosen.c === 0) {
    x = -GRID_STEP * 2;
    side = "left";
  } else if (chosen.c === GRID.cols - 1) {
    x = BASE_W + GRID_STEP * 2;
    side = "right";
  } else if (chosen.r === 0) {
    y = -GRID_STEP * 2;
    side = "top";
  } else {
    y = BASE_H + GRID_STEP * 2;
    side = "bottom";
  }
  return { x, y, side, node: cellIndex(chosen.c, chosen.r) };
}

function buildRatRoute(i) {
  const r = state.rats[i] || { to: 0 },
    b = getPlaceCenter(r.to),
    startInfo = state.ratStarts[i] || pickStartForDestination(b, i),
    end = nearestNode(b),
    ids = bfsPath(startInfo.node, end),
    pts = [{ x: startInfo.x, y: startInfo.y }];
  ids.forEach((id) => {
    const { c, r } = indexCell(id);
    pts.push(cellCenter(c, r));
  });
  pts.push(b);
  return orthogonalizeRoute(pts);
}

function orthogonalizeRoute(points) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = out[out.length - 1],
      next = points[i];
    if (abs(prev.x - next.x) > 1 && abs(prev.y - next.y) > 1)
      out.push({ x: next.x, y: prev.y });
    out.push(next);
  }
  return out;
}

function isDark(hex) {
  const c = color(hex);
  return (red(c) + green(c) + blue(c)) / 3 < 100;
}

function drawFinalComposition() {
  for (let i = 0; i < state.popups.length; i++) drawPopupCard(i, 1);
  for (let i = 0; i < state.ratCount; i++) {
    const route = buildRatRoute(i),
      end = route[route.length - 1];
    drawRat(end.x, end.y, i);
  }
  drawLogoHeartsFinal();
}

function popupEase(t, s) {
  return easeOutBack(constrain((t - s) / 0.065, 0, 1));
}

function pointOnPolyline(points, tt) {
  let total = 0,
    l = [];
  for (let i = 0; i < points.length - 1; i++) {
    const d = dist(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    l.push(d);
    total += d;
  }
  let target = tt * total;
  for (let i = 0; i < l.length; i++) {
    if (target <= l[i]) {
      const q = target / l[i];
      return {
        x: lerp(points[i].x, points[i + 1].x, q),
        y: lerp(points[i].y, points[i + 1].y, q),
      };
    }
    target -= l[i];
  }
  return points[points.length - 1];
}

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2;
}

function easeOutBack(x) {
  const c1 = 1.70158,
    c3 = c1 + 1;
  return 1 + c3 * pow(x - 1, 3) + c1 * pow(x - 1, 2);
}

function popupSize(i) {
  const len = (state.popups[i]?.body || "").length;
  return { w: 300, h: len > 90 ? 210 : 180 };
}

function popupBounds(i) {
  const p = state.popupPositions[i],
    sz = popupSize(i),
    S = state.scales.popup;
  return {
    left: p.x + sz.w / 2 - (sz.w * S) / 2,
    top: p.y + sz.h / 2 - (sz.h * S) / 2,
    w: sz.w * S,
    h: sz.h * S,
    baseW: sz.w,
    baseH: sz.h,
    S,
  };
}

function drawLogoHeartsFinal() {
  for (let i = 0; i < 3; i++) drawLogoSlot(i, 1, 1);
}

function drawLogoHeartSequence(t, start) {
  const step = 0.045;
  for (let i = 0; i < 3; i++) {
    const local = (t - (start + i * step)) / step;
    if (local < 0) {
      drawLogoSlot(i, 0, 1);
      continue;
    }
    if (local < 0.34) {
      const q = local / 0.34;
      drawLogoSlot(i, 0, 1 + sin(q * PI) * 0.75);
      drawHeartBurst(i, q);
    } else if (local < 1) {
      const q = (local - 0.34) / 0.66;
      drawLogoSlot(i, easeOutBack(q), max(0.15, 1 - q * 0.35));
    } else drawLogoSlot(i, 1, 1);
  }
}

function screenToWorld(mx, my) {
  return { x: (mx - view.ox) / view.s, y: (my - view.oy) / view.s };
}

function mousePressed() {
  if (sequence.mode !== "compose" || mouseX >= view.artViewportW) return;
  const m = screenToWorld(mouseX, mouseY);
  for (let i = state.popupPositions.length - 1; i >= 0; i--) {
    const b = popupBounds(i);
    if (
      m.x >= b.left &&
      m.x <= b.left + b.w &&
      m.y >= b.top &&
      m.y <= b.top + b.h
    ) {
      dragType = "popup";
      dragIndex = i;
      dragOffX = m.x - b.left;
      dragOffY = m.y - b.top;
      return;
    }
  }
  for (let i = state.places.length - 1; i >= 0; i--) {
    const p = state.places[i],
      w = p.w * state.scales.label,
      h = 96 * state.scales.label;
    if (m.x >= p.x && m.x <= p.x + w && m.y >= p.y && m.y <= p.y + h) {
      dragType = "place";
      dragIndex = i;
      dragOffX = m.x - p.x;
      dragOffY = m.y - p.y;
      return;
    }
  }
}

function mouseDragged() {
  if (sequence.mode !== "compose" || dragIndex < 0) return;
  const m = screenToWorld(mouseX, mouseY);
  if (dragType === "popup") {
    const p = state.popupPositions[dragIndex],
      b = popupBounds(dragIndex);
    const desiredLeft = constrain(m.x - dragOffX, 0, BASE_W - b.w),
      desiredTop = constrain(m.y - dragOffY, 0, BASE_H - b.h);
    p.x = desiredLeft - b.baseW / 2 + (b.baseW * b.S) / 2;
    p.y = desiredTop - b.baseH / 2 + (b.baseH * b.S) / 2;
    const c = select(`#coords-${dragIndex}`);
    if (c) c.html(`x ${round(p.x)} · y ${round(p.y)}`);
  } else if (dragType === "place") {
    const p = state.places[dragIndex];
    p.x = constrain(m.x - dragOffX, 0, BASE_W - p.w * state.scales.label);
    p.y = constrain(m.y - dragOffY, 0, BASE_H - 96 * state.scales.label);
    const c = select(`#place-coords-${dragIndex}`);
    if (c) c.html(`x ${round(p.x)} · y ${round(p.y)}`);
    if (placeStatusEl) placeStatusEl.html("modifiche non ancora fissate");
  }
}

function mouseReleased() {
  dragType = null;
  dragIndex = -1;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

const LOGO_ICON_STORAGE_KEY = "ex-casa-logo-icons-v2";

const FINAL_CAPTION_STORAGE_KEY = "ex-casa-final-caption-v1";

state.logoIcons = ["🍒", "🍋", "🍇"];

state.arciLogo = null;

state.finalCaption = "2026 edition";

state._recordTargets = [];

state._recordRAF = null;

state.scales.rat = 2;

try {
  const saved = JSON.parse(
    localStorage.getItem(LOGO_ICON_STORAGE_KEY) || "null",
  );
  if (Array.isArray(saved))
    state.logoIcons = saved.slice(0, 3).map((v, i) => v || state.logoIcons[i]);
} catch (e) {
  console.warn("logo icons storage", e);
}

try {
  const savedCaption = localStorage.getItem(FINAL_CAPTION_STORAGE_KEY);
  if (savedCaption) state.finalCaption = savedCaption;
} catch (e) {
  console.warn("final caption storage", e);
}

function saveLogoIcons() {
  try {
    localStorage.setItem(
      LOGO_ICON_STORAGE_KEY,
      JSON.stringify(state.logoIcons),
    );
  } catch (e) {
    console.warn(e);
  }
}

function saveFinalCaption() {
  try {
    localStorage.setItem(FINAL_CAPTION_STORAGE_KEY, state.finalCaption);
  } catch (e) {
    console.warn(e);
  }
}

function sideForCellPatched(cell) {
  if (cell.c === 0) return "left";
  if (cell.c === GRID.cols - 1) return "right";
  if (cell.r === 0) return "top";
  return "bottom";
}

function pickDistributedStart(dest, preferredSide, usedStarts = []) {
  const all = borderCandidates().map((cell) => {
    const p = cellCenter(cell.c, cell.r);
    return {
      ...cell,
      p,
      side: sideForCellPatched(cell),
      d: dist(p.x, p.y, dest.x, dest.y),
    };
  });
  let pool = all.filter(
    (o) => o.side === preferredSide && o.d > min(BASE_W, BASE_H) * 0.34,
  );
  if (!pool.length) pool = all.filter((o) => o.side === preferredSide);
  if (!pool.length) pool = all;
  pool = pool
    .map((o) => {
      const sep = usedStarts.length
        ? min(...usedStarts.map((s) => dist(o.p.x, o.p.y, s.edgeX, s.edgeY)))
        : BASE_W;
      return { ...o, score: o.d + sep * 1.45 };
    })
    .sort((a, b) => b.score - a.score);
  const shortlist = pool.slice(0, max(3, floor(pool.length * 0.15)));
  const chosen = random(shortlist),
    p = chosen.p;
  let x = p.x,
    y = p.y;
  if (chosen.side === "left") x = -GRID_STEP * 2;
  else if (chosen.side === "right") x = BASE_W + GRID_STEP * 2;
  else if (chosen.side === "top") y = -GRID_STEP * 2;
  else y = BASE_H + GRID_STEP * 2;
  return {
    x,
    y,
    edgeX: p.x,
    edgeY: p.y,
    side: chosen.side,
    node: cellIndex(chosen.c, chosen.r),
  };
}

function generateRatStarts() {
  state.ratStarts = [];
  const sides = shuffle(["left", "right", "top", "bottom"], true);
  for (let i = 0; i < state.ratCount; i++) {
    const r = state.rats[i] || { to: 0 };
    state.ratStarts.push(
      pickDistributedStart(
        getPlaceCenter(r.to),
        sides[i % sides.length],
        state.ratStarts,
      ),
    );
  }
}

function drawArciMark() {
  const x = 982,
    y = 74,
    maxSize = 92;
  push();
  translate(x, y);
  if (state.arciLogo) {
    const img = state.arciLogo,
      s = min(maxSize / img.width, maxSize / img.height);
    drawingContext.save();
    drawingContext.imageSmoothingEnabled = true;
    drawingContext.imageSmoothingQuality = "high";
    imageMode(CENTER);
    image(img, 0, 0, img.width * s, img.height * s);
    imageMode(CORNER);
    drawingContext.restore();
  } else {
    noStroke();
    fill(COLORS.black);
    textAlign(CENTER, CENTER);
    textSize(76);
    text("★", 0, 0);
  }
  pop();
}

function drawPopupCard(i, a) {
  const d = state.popups[i];
  if (!d) return;
  const p = state.popupPositions[i],
    sz = popupSize(i),
    w = sz.w,
    h = sz.h,
    S = state.scales.popup * a;
  push();
  translate(p.x + w / 2, p.y + h / 2);
  scale(S);
  translate(-w / 2, -h / 2);
  noStroke();
  fill("#F5F5F7");
  rect(0, 0, w, h, 15);
  stroke(0, 45);
  strokeWeight(1);
  noFill();
  rect(0, 0, w, h, 15);
  noStroke();
  fill("#ECECEF");
  rect(0, 0, w, 32, 15, 15, 0, 0);
  fill(0, 100);
  circle(17, 16, 9);
  circle(31, 16, 9);
  circle(45, 16, 9);
  fill(COLORS.black);
  textAlign(LEFT, TOP);
  textFont("Helvetica");
  textStyle(NORMAL);
  textSize(15);
  text(d.date || "", 15, 47);
  textFont("Helvetica");
  textStyle(BOLD);
  textSize(27);
  text(d.title || "", 15, 70, w - 30, 43);
  textFont("Times New Roman");
  textStyle(NORMAL);
  textSize(15);
  text(d.body || "", 15, 120, w - 30, h - 130);
  pop();
}

function drawPinkWaves(cx, cy, q, maxRadius = 150, weight = 4) {
  if (q <= 0 || q >= 1) return;
  push();
  noFill();
  stroke(COLORS.pink);
  strokeWeight(weight * (1 - q * 0.55));
  for (let k = 0; k < 4; k++) {
    const local = constrain(q - k * 0.105, 0, 1);
    if (local <= 0) continue;
    const r = 18 + local * maxRadius;
    const alpha = 255 * (1 - local);
    stroke(255, 97, 182, alpha);
    circle(cx, cy, r * 2);
  }
  pop();
}

const LOGO_XS = [660, 820, 980],
  LOGO_Y = 1275;

function drawHeartBurst(i, q) {
  const x = LOGO_XS[i],
    y = LOGO_Y;
  drawPinkWaves(x, y, constrain(q, 0, 1), 92, 3.5);
}

function drawStrobeFinal() {
  const t = constrain(sequence.elapsed / SEQUENCE_MS, 0, 1);
  const q = constrain((t - 0.86) / 0.14, 0, 1);
  const morph = smoothstep01(constrain(q / 0.72, 0, 1));
  const flash = floor(sequence.elapsed / 95);
  const c = BG_PALETTE[(flash + sequence.strobeOffset) % BG_PALETTE.length];
  noStroke();
  fill(c);
  rect(0, 0, BASE_W, BASE_H);
  drawIdentity();

  const cx = BASE_W / 2,
    cy = BASE_H / 2 - 55;
  push();
  translate(cx, cy);
  textAlign(CENTER, CENTER);
  noStroke();

  if (morph < 1) {
    push();
    scale(1 - morph * 0.82);
    textSize(760);
    drawingContext.globalAlpha = 1 - morph;
    text("🐀", 0, 0);
    drawingContext.globalAlpha = 1;
    pop();
  }

  if (morph > 0) {
    push();
    const heartScale = 0.22 + 0.78 * easeOutBack(morph);
    scale(heartScale);
    drawingContext.globalAlpha = morph;
    fill(COLORS.pink);
    textSize(650);
    text("♥", 0, 0);
    drawingContext.globalAlpha = 1;
    pop();
  }
  pop();

  const captionAlpha = constrain((q - 0.28) / 0.42, 0, 1);
  if (captionAlpha > 0) {
    push();
    drawingContext.globalAlpha = captionAlpha;
    fill(COLORS.black);
    textAlign(CENTER, CENTER);
    textFont("Times New Roman");
    textStyle(ITALIC);
    textSize(42);
    text(state.finalCaption || "2026 edition", BASE_W / 2, BASE_H / 2 + 330);
    drawingContext.globalAlpha = 1;
    pop();
  }
}

function smoothstep01(x) {
  return x * x * (3 - 2 * x);
}

function makeRecordTarget(width, height, label) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  c.style.display = "none";
  document.body.appendChild(c);
  return {
    canvas: c,
    ctx: c.getContext("2d", { alpha: false }),
    label,
    chunks: [],
    recorder: null,
  };
}

function ensureRecordTargets() {
  if (state._recordTargets && state._recordTargets.length === 2)
    return state._recordTargets;
  state._recordTargets = [
    makeRecordTarget(1080, 1350, "post-4x5"),
    makeRecordTarget(1080, 1920, "story-9x16"),
  ];
  return state._recordTargets;
}

function copyArtboardToTargets() {
  const targets = ensureRecordTargets();
  const srcW = BASE_W * view.s,
    srcH = BASE_H * view.s,
    post = targets[0],
    story = targets[1];
  post.ctx.fillStyle = state.bgColor;
  post.ctx.fillRect(0, 0, 1080, 1350);
  post.ctx.drawImage(canvas, view.ox, view.oy, srcW, srcH, 0, 0, 1080, 1350);
  story.ctx.fillStyle = state.bgColor;
  story.ctx.fillRect(0, 0, 1080, 1920);
  const storyY = (1920 - 1350) / 2;
  story.ctx.drawImage(
    canvas,
    view.ox,
    view.oy,
    srcW,
    srcH,
    0,
    storyY,
    1080,
    1350,
  );
}

function recordCopyLoop() {
  copyArtboardToTargets();
  const active = Boolean(state._mp4Export);
  if (active) state._recordRAF = requestAnimationFrame(recordCopyLoop);
}

const FINAL_HOLD_MS = 2500;

const BUILD_END_MS = SEQUENCE_MS * 0.86;

const FINAL_SCENE_MS = SEQUENCE_MS - BUILD_END_MS;

const TOTAL_SEQUENCE_MS = BUILD_END_MS + FINAL_HOLD_MS + FINAL_SCENE_MS;

const PACKAGE_RESTORE_KEY = "ex-casa-package-restore-v1";

state.exportDirectoryHandle = null;

state.exportFolderName = "DOWNLOADS";

state._recCheck = null;

async function chooseExportFolder() {
  if (!window.showDirectoryPicker) {
    alert(
      "Il browser non permette di scegliere direttamente una cartella. I file continueranno ad andare in Download. Usa Chrome o Edge aggiornato per il selettore cartella.",
    );
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    state.exportDirectoryHandle = handle;
    state.exportFolderName = handle.name || "CARTELLA SELEZIONATA";
    updateExportFolderUI();
    if (statusEl) setStatus(`✓ OUTPUT → ${state.exportFolderName}`);
  } catch (e) {
    if (e?.name !== "AbortError") {
      console.error("folder picker", e);
      if (statusEl) setStatus("ERRORE CARTELLA OUTPUT");
    }
  }
}

function updateExportFolderUI() {
  const el = document.getElementById("export-folder-name");
  if (el) el.value = state.exportFolderName || "DOWNLOADS";
}

async function writeBlobToExport(blob, filename) {
  const dir = state.exportDirectoryHandle;
  if (dir) {
    try {
      const permission = await dir.queryPermission({ mode: "readwrite" });
      if (
        permission === "granted" ||
        (await dir.requestPermission({ mode: "readwrite" })) === "granted"
      ) {
        const fh = await dir.getFileHandle(filename, { create: true });
        const writable = await fh.createWritable();
        await writable.write(blob);
        await writable.close();
        return { ok: true, where: dir.name || "cartella selezionata" };
      }
    } catch (e) {
      console.warn("write selected folder", e);
    }
  }
  const u = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = u;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1800);
  return { ok: true, where: "Download" };
}

async function writeDataURLToExport(dataURL, filename) {
  const blob = await (await fetch(dataURL)).blob();
  return writeBlobToExport(blob, filename);
}

let _pendingPackageAssets = null;

try {
  const raw = localStorage.getItem(PACKAGE_RESTORE_KEY);
  if (raw) {
    const pkg = JSON.parse(raw),
      d = pkg?.data || {};
    if (d.bgColor) state.bgColor = d.bgColor;
    if (typeof d.showGrid === "boolean") state.showGrid = d.showGrid;
    if (Number.isFinite(d.gridAlpha)) state.gridAlpha = d.gridAlpha;
    if (typeof d.title === "string") state.title = d.title;
    if (typeof d.year === "string") state.year = d.year;
    if (typeof d.info === "string") state.info = d.info;
    if (typeof d.footer === "string") state.footer = d.footer;
    if (d.scales) state.scales = { ...state.scales, ...d.scales };
    if (Array.isArray(d.popups)) state.popups = d.popups.map((p) => ({ ...p }));
    if (Array.isArray(d.popupPositions))
      state.popupPositions = d.popupPositions.map((p) => ({ ...p }));
    if (Array.isArray(d.places)) state.places = d.places.map((p) => ({ ...p }));
    if (Number.isFinite(d.ratCount)) state.ratCount = d.ratCount;
    if (Array.isArray(d.rats)) state.rats = d.rats.map((r) => ({ ...r }));
    if (Array.isArray(d.logoLabels)) state.logoLabels = [...d.logoLabels];
    if (Array.isArray(d.logoIcons)) state.logoIcons = [...d.logoIcons];
    if (typeof d.finalCaption === "string") state.finalCaption = d.finalCaption;
    _pendingPackageAssets = pkg.assets || null;
    localStorage.removeItem(PACKAGE_RESTORE_KEY);
    try {
      localStorage.setItem(PLACE_STORAGE_KEY, JSON.stringify(state.places));
    } catch (e) {}
    try {
      localStorage.setItem(
        RAT_STORAGE_KEY,
        JSON.stringify({ ratCount: state.ratCount, rats: state.rats }),
      );
    } catch (e) {}
  }
} catch (e) {
  console.warn("package restore", e);
}

function draw() {
  background(state.bgColor);
  const active = sequence.mode === "play" || sequence.mode === "rec";
  let shouldFinish = false;
  if (active) {
    sequence.elapsed = millis() - sequence.startedAt;
    if (sequence.elapsed >= TOTAL_SEQUENCE_MS) {
      sequence.elapsed = TOTAL_SEQUENCE_MS;
      shouldFinish = true;
    }
  }
  view.artViewportW = max(320, width - PANEL_W);
  const m = 18;
  view.s = min((view.artViewportW - m * 2) / BASE_W, (height - m * 2) / BASE_H);
  view.ox = max(m, (view.artViewportW - BASE_W * view.s) / 2);
  view.oy = (height - BASE_H * view.s) / 2;
  push();
  translate(view.ox, view.oy);
  scale(view.s);
  if (active && sequence.elapsed >= BUILD_END_MS + FINAL_HOLD_MS) {
    const actualElapsed = sequence.elapsed;
    const local = constrain(
      (actualElapsed - (BUILD_END_MS + FINAL_HOLD_MS)) / FINAL_SCENE_MS,
      0,
      1,
    );
    sequence.elapsed = BUILD_END_MS + local * FINAL_SCENE_MS;
    drawStrobeFinal();
    sequence.elapsed = actualElapsed;
  } else if (active && sequence.elapsed >= BUILD_END_MS) {
    drawBackground();
    drawBlockedDots();
    drawIdentity();
    drawPlaceLabels();
    drawFinalComposition();
  } else {
    drawBackground();
    drawBlockedDots();
    drawIdentity();
    drawPlaceLabels();
    if (sequence.mode === "compose" || sequence.mode === "final")
      drawFinalComposition();
    else drawAnimatedSequence();
  }
  pop();
  if (shouldFinish) finishSequence();
}

function drawRat(x, y, i) {
  const S = state.scales.rat;
  push();
  drawingContext.globalAlpha = 1;
  translate(x, y);
  if (i % 2) scale(-1, 1);
  textAlign(CENTER, CENTER);
  textSize(48 * S);
  noStroke();
  text("🐀", 0, 0);
  drawingContext.globalAlpha = 1;
  pop();
}

function ratFluidEase(x) {
  x = constrain(x, 0, 1);
  return x * x * (3 - 2 * x);
}

function simplifyRoute(points) {
  if (!points || points.length < 3) return points || [];
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1],
      b = points[i],
      c = points[i + 1];
    const sameX = abs(a.x - b.x) < 0.01 && abs(b.x - c.x) < 0.01,
      sameY = abs(a.y - b.y) < 0.01 && abs(b.y - c.y) < 0.01;
    if (!sameX && !sameY) out.push(b);
  }
  out.push(points[points.length - 1]);
  return out;
}

function roundedRoute(points, radius = 18) {
  const pts = simplifyRoute(points);
  if (!pts || pts.length < 3) return pts || [];
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1],
      b = pts[i],
      c = pts[i + 1],
      lenA = dist(a.x, a.y, b.x, b.y),
      lenB = dist(b.x, b.y, c.x, c.y),
      cut = min(radius, lenA * 0.28, lenB * 0.28);
    if (cut < 1) {
      out.push(b);
      continue;
    }
    const inP = {
        x: lerp(b.x, a.x, cut / lenA),
        y: lerp(b.y, a.y, cut / lenA),
      },
      outP = { x: lerp(b.x, c.x, cut / lenB), y: lerp(b.y, c.y, cut / lenB) };
    out.push(inP);
    for (let s = 1; s <= 4; s++) {
      const q = s / 4,
        iq = 1 - q;
      out.push({
        x: iq * iq * inP.x + 2 * iq * q * b.x + q * q * outP.x,
        y: iq * iq * inP.y + 2 * iq * q * b.y + q * q * outP.y,
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const RAT_FIRST_FINISH = 0.335,
  RAT_FINISH_STAGGER = 0.018;

function drawAnimatedSequence() {
  const t = constrain(sequence.elapsed / SEQUENCE_MS, 0, 1),
    popupStart = 0.43,
    popupEnd = 0.69,
    logos = 0.73;
  for (let i = 0; i < state.ratCount; i++) {
    const delay = i * 0.025,
      finish = RAT_FIRST_FINISH + i * RAT_FINISH_STAGGER,
      local = constrain((t - delay) / (finish - delay), 0, 1);
    const pos = pointOnPolyline(
      roundedRoute(buildRatRoute(i), 20),
      ratFluidEase(local),
    );
    drawRat(pos.x, pos.y, i);
  }
  const n = max(1, state.popups.length);
  for (let i = 0; i < n; i++) {
    const s = popupStart + (popupEnd - popupStart) * (i / max(1, n - 1));
    if (t >= s) drawPopupCard(i, popupEase(t, s));
  }
  drawLogoHeartSequence(t, logos);
}

function housePressAmount() {
  if (sequence.mode !== "play" && sequence.mode !== "rec") return 0;
  const rs = state.rats
    .slice(0, state.ratCount)
    .map((r, i) => ({ r, i }))
    .filter((o) => (o.r?.to ?? 0) === 0);
  if (!rs.length) return 0;
  const first = min(
      ...rs.map((o) => RAT_FIRST_FINISH + o.i * RAT_FINISH_STAGGER),
    ),
    t = constrain(sequence.elapsed / SEQUENCE_MS, 0, 1),
    start = first - 0.008,
    end = first + 0.065;
  if (t < start || t > end) return 0;
  const q = (t - start) / (end - start);
  if (q < 0.38) return easeOutBack(q / 0.38);
  return 1 - constrain((q - 0.38) / 0.62, 0, 1);
}

function houseWaveAmount() {
  if (sequence.mode !== "play" && sequence.mode !== "rec") return 0;
  const rs = state.rats
    .slice(0, state.ratCount)
    .map((r, i) => ({ r, i }))
    .filter((o) => (o.r?.to ?? 0) === 0);
  if (!rs.length) return 0;
  const first = min(
      ...rs.map((o) => RAT_FIRST_FINISH + o.i * RAT_FINISH_STAGGER),
    ),
    t = constrain(sequence.elapsed / SEQUENCE_MS, 0, 1),
    start = first + 0.035,
    end = first + 0.13;
  if (t < start || t > end) return 0;
  return constrain((t - start) / (end - start), 0, 1);
}

function arrivalBounceForPlace(placeIndex) {
  if (sequence.mode !== "play" && sequence.mode !== "rec") return 0;
  const t = constrain(sequence.elapsed / SEQUENCE_MS, 0, 1);
  let best = 0;
  for (let i = 0; i < state.ratCount; i++) {
    if ((state.rats[i]?.to ?? 0) !== placeIndex) continue;
    const arrival = RAT_FIRST_FINISH + i * RAT_FINISH_STAGGER,
      q = (t - arrival) / 0.09;
    if (q >= 0 && q <= 1) best = max(best, sin(q * PI) * 11 * (1 - q));
  }
  return -best;
}

function p5ImageToDataURL(img) {
  try {
    if (!img) return null;
    if (img.canvas && typeof img.canvas.toDataURL === "function")
      return img.canvas.toDataURL("image/png");
    if (img.elt && img.elt instanceof HTMLCanvasElement)
      return img.elt.toDataURL("image/png");
  } catch (e) {
    console.warn("image serialise", e);
  }
  return null;
}

function renderCompositionPNGDataURL() {
  const out = document.createElement("canvas");
  out.width = BASE_W;
  out.height = BASE_H;
  const ctx = out.getContext("2d");
  ctx.fillStyle = state.bgColor;
  ctx.fillRect(0, 0, BASE_W, BASE_H);
  ctx.drawImage(
    canvas,
    view.ox,
    view.oy,
    BASE_W * view.s,
    BASE_H * view.s,
    0,
    0,
    BASE_W,
    BASE_H,
  );
  return out.toDataURL("image/png");
}

function canvasPNGBlob(source) {
  return new Promise((resolve, reject) =>
    source.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG non generato"))),
      "image/png",
    ),
  );
}

async function renderNativePostCanvas() {
  if (sequence.mode === "play" || sequence.mode === "rec")
    throw new Error("Ferma PLAY/REC prima di esportare il PNG");
  const previous = {
      width,
      height,
      mode: sequence.mode,
      elapsed: sequence.elapsed,
      looping: isLooping(),
    },
    exportWidth = BASE_W + PANEL_W + 36,
    exportHeight = BASE_H + 36;
  noLoop();
  sequence.mode = "final";
  try {
    resizeCanvas(exportWidth, exportHeight);
    draw();
    const out = document.createElement("canvas");
    out.width = BASE_W;
    out.height = BASE_H;
    const ctx = out.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    ctx.drawImage(
      canvas,
      view.ox,
      view.oy,
      BASE_W * view.s,
      BASE_H * view.s,
      0,
      0,
      BASE_W,
      BASE_H,
    );
    return out;
  } finally {
    resizeCanvas(previous.width, previous.height);
    sequence.mode = previous.mode;
    sequence.elapsed = previous.elapsed;
    if (previous.looping) loop();
    else redraw();
  }
}

async function saveNativePNG(format) {
  try {
    setStatus(`PREPARO PNG ${format === "story" ? "STORY" : "POST"}…`);
    const post = await renderNativePostCanvas();
    let output = post,
      suffix = "post-4x5";
    if (format === "story") {
      output = document.createElement("canvas");
      output.width = 1080;
      output.height = 1920;
      const ctx = output.getContext("2d", { alpha: false });
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = state.bgColor;
      ctx.fillRect(0, 0, output.width, output.height);
      ctx.drawImage(post, 0, (output.height - post.height) / 2);
      suffix = "story-9x16";
    }
    const blob = await canvasPNGBlob(output),
      filename = `${packageSlug()}-${suffix}-${Date.now()}.png`;
    await writeBlobToExport(blob, filename);
    setStatus(
      `✓ PNG ${format === "story" ? "STORY 1080×1920" : "POST 1080×1350"} · ${(blob.size / 1024 / 1024).toFixed(1)} MB · ${state.exportFolderName}`,
    );
    post.width = post.height = 1;
    if (output !== post) output.width = output.height = 1;
  } catch (error) {
    console.error(error);
    setStatus(`PNG ERROR · ${error.message || error}`);
  }
}

function packageSlug() {
  return (
    (state.title || "ex-casa")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "ex-casa"
  );
}

function makePackage() {
  const preview = renderCompositionPNGDataURL();
  return {
    type: "ex-casa-rat-tool-package",
    version: 1,
    savedAt: new Date().toISOString(),
    data: {
      bgColor: state.bgColor,
      showGrid: state.showGrid,
      gridAlpha: state.gridAlpha,
      title: state.title,
      year: state.year,
      info: state.info,
      footer: state.footer,
      scales: { ...state.scales },
      popups: state.popups.map((p) => ({ ...p })),
      popupPositions: state.popupPositions.map((p) => ({ ...p })),
      places: state.places.map((p) => ({ ...p })),
      ratCount: state.ratCount,
      rats: state.rats.map((r) => ({ ...r })),
      logoLabels: [...state.logoLabels],
      logoIcons: [...(state.logoIcons || [])],
      finalCaption: state.finalCaption || "2026 edition",
    },
    assets: {
      logos: (state.logos || []).map(p5ImageToDataURL),
      arciLogo: p5ImageToDataURL(state.arciLogo),
      previewPNG: preview,
    },
  };
}

async function savePackage() {
  const oldMode = sequence.mode;
  sequence.mode = "final";
  redraw();
  setTimeout(async () => {
    const pkg = makePackage(),
      slug = packageSlug(),
      jsonBlob = new Blob([JSON.stringify(pkg, null, 2)], {
        type: "application/json",
      });
    await writeBlobToExport(jsonBlob, `${slug}-package.json`);
    await writeDataURLToExport(pkg.assets.previewPNG, `${slug}-post.png`);
    sequence.mode =
      oldMode === "play" || oldMode === "rec" ? "compose" : oldMode;
    if (statusEl) setStatus(`✓ PACCHETTO + PNG → ${state.exportFolderName}`);
  }, 50);
}

function loadPackageFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const pkg = JSON.parse(reader.result);
      if (pkg?.type !== "ex-casa-rat-tool-package" || !pkg.data)
        throw new Error("Pacchetto non riconosciuto");
      localStorage.setItem(PACKAGE_RESTORE_KEY, JSON.stringify(pkg));
      location.reload();
    } catch (e) {
      console.error(e);
      if (statusEl) setStatus("ERRORE PACCHETTO");
      alert("Questo file non sembra un pacchetto valido del tool.");
    }
  };
  reader.readAsText(file);
}

function startRecording() {
  try {
    const post = ensureRecordTargets()[0];
    copyArtboardToTargets();
    state._recCheck = { started: true, mime: "video/mp4", files: 0, bytes: 0, errors: [] };
    state._mp4Export = IGExport.startMP4({
      canvas: post.canvas,
      duration: TOTAL_SEQUENCE_MS,
      onProgress: (progress) => setStatus(`● MP4 H.264 · ${Math.round(progress * 100)}%`),
    });
    recordCopyLoop();
    state._mp4Export.promise.then(async (blob) => {
      await writeBlobToExport(blob, `ex-casa-post01-animation-${Date.now()}.mp4`);
      state._recCheck.files = 1; state._recCheck.bytes = blob.size;
      setStatus(`✓ MP4 POST 1080×1350 · ${(blob.size / 1024 / 1024).toFixed(1)} MB · ${state.exportFolderName}`);
    }).catch((error) => {
      if (error.name !== "AbortError") { console.error(error); state._recCheck.errors.push(String(error.message || error)); setStatus(`MP4 ERROR · ${error.message || error}`); }
    }).finally(() => { state._mp4Export = null; });
  } catch (e) {
    console.error(e); state._recCheck = { started: false, errors: [String(e.message || e)] }; setStatus(`MP4 ERROR · ${e.message || e}`);
  }
}

function stopRecording(save = true) {
  if (state._recordRAF) {
    cancelAnimationFrame(state._recordRAF);
    state._recordRAF = null;
  }
  if (!save && state._mp4Export) { state._mp4Export.cancel(); state._mp4Export = null; }
}

function insertDynamicPlaceEditor(section, p, i) {
  const box = document.createElement("div");
  box.className = "place-editor";
  box.dataset.placeIndex = String(i);
  const grid = document.createElement("div");
  grid.className = "place-grid";
  const nf = document.createElement("div");
  nf.className = "field";
  const nl = document.createElement("label");
  nl.textContent = `Luogo ${i + 1}`;
  const ni = document.createElement("input");
  ni.type = "text";
  ni.value = p.name;
  ni.addEventListener("input", () => {
    p.name = ni.value;
    refreshRatEditors();
  });
  nf.append(nl, ni);
  const inf = document.createElement("div");
  inf.className = "field";
  const il = document.createElement("label");
  il.textContent = "Icona";
  const ii = document.createElement("input");
  ii.type = "text";
  ii.value = p.icon;
  ii.maxLength = 8;
  ii.addEventListener("input", () => {
    p.icon = ii.value || "📍";
    refreshRatEditors();
  });
  inf.append(il, ii);
  grid.append(nf, inf);
  const coords = document.createElement("div");
  coords.id = `place-coords-${i}`;
  coords.className = "coords";
  coords.textContent = `x ${Math.round(p.x)} · y ${Math.round(p.y)}`;
  box.append(grid, coords);
  const addButton = section.querySelector("#add-place-button");
  if (addButton) section.insertBefore(box, addButton);
  else section.appendChild(box);
}

const PROJECT_EMOJI_LIBRARY = [
  "🐀",
  "🕳️",
  "🌳",
  "⛲️",
  "🏡",
  "🛝",
  "🎪",
  "🎡",
  "🌟",
  "💦",
  "💗",
  "🚨",
  "🧜‍♀️",
  "🪩",
  "🎧",
  "🎛️",
  "🎚️",
  "🔊",
  "🎶",
  "⚡",
  "✨",
  "💥",
  "📡",
  "💡",
];

state.logoIcons = ["🌟", "🌟", "🌟"];

try {
  localStorage.setItem(
    "ex-casa-logo-icons-v2",
    JSON.stringify(state.logoIcons),
  );
} catch (e) {}

function installProjectEmojiLibrary() {
  const panel = document.getElementById("editor-panel");
  if (!panel || document.getElementById("project-emoji-library")) return;
  const sections = [...panel.querySelectorAll(".section")];
  const placesSection = sections.find((sec) =>
    /luoghi/i.test(sec.querySelector(".section-title")?.textContent || ""),
  );
  if (!placesSection) return;

  const box = document.createElement("div");
  box.id = "project-emoji-library";
  box.style.margin = "2px 0 10px";
  const label = document.createElement("div");
  label.className = "coords";
  label.textContent = "LIBRERIA ICONE PROGETTO";
  label.style.marginBottom = "5px";
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.flexWrap = "wrap";
  row.style.gap = "4px";
  PROJECT_EMOJI_LIBRARY.forEach((icon) => {
    const chip = document.createElement("span");
    chip.textContent = icon;
    chip.title = "Icona disponibile per i luoghi";
    chip.style.cssText =
      "display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;background:#fff;border:1.5px solid #050505;font-size:18px;line-height:1;";
    row.appendChild(chip);
  });
  box.append(label, row);
  const firstEditor = placesSection.querySelector(".place-editor");
  if (firstEditor) placesSection.insertBefore(box, firstEditor);
  else placesSection.appendChild(box);
}

function drawPlaceLabels() {
  const press = housePressAmount(),
    wave = houseWaveAmount();

  for (let i = 0; i < state.places.length; i++) {
    const p = state.places[i],
      S = state.scales.label,
      isHouse = i === 0,
      bounce = arrivalBounceForPlace(i);
    const labelH = 23;
    const labelY = 72;

    push();
    translate(p.x, p.y + (isHouse ? 10 * press * S : 0));
    scale(S);

    if (isHouse) {
      translate(p.w / 2, labelY + labelH / 2);
      scale(1 + 0.04 * press, 1 - 0.14 * press);
      translate(-p.w / 2, -(labelY + labelH / 2));
    }

    push();
    translate(0, bounce);
    drawingContext.globalAlpha = 1;
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(58);
    text(p.icon || "", p.w / 2, 35);
    pop();

    textFont("Helvetica");
    textStyle(BOLD);
    textSize(9.5);
    const pillW = constrain(textWidth(p.name || "") + 17, 58, p.w);
    const pillX = (p.w - pillW) / 2;

    if (isHouse && press > 0.02)
      fill(
        lerpColor(color(COLORS.acid), color("#8B5CF6"), constrain(press, 0, 1)),
      );
    else fill(i % 2 === 0 ? COLORS.acid : COLORS.white);
    stroke(COLORS.black);
    strokeWeight(1.5 + press * 1.5);
    rect(pillX, labelY, pillW, labelH, labelH / 2);

    noStroke();
    fill(COLORS.black);
    textAlign(CENTER, CENTER);
    text(p.name, p.w / 2, labelY + labelH / 2 + 0.5);
    pop();

    if (isHouse && wave > 0) {
      drawPinkWaves(p.x + (p.w * S) / 2, p.y + 35 * S, wave, 145 * S, 4);
    }
  }
}

function drawBlockedDots() {
  push();
  const cx = 540,
    cy = 665,
    step = 24;
  noStroke();
  fill(5, 5, 5, 72);
  [168, 264, 360].forEach((r) => {
    for (let x = cx - r; x <= cx + r; x += step) {
      circle(x, cy - r, 5);
      circle(x, cy + r, 5);
    }
    for (let y = cy - r + step; y < cy + r; y += step) {
      circle(cx - r, y, 5);
      circle(cx + r, y, 5);
    }
  });
  for (let d = -360; d <= 360; d += step) {
    circle(cx + d, cy, 4.5);
    circle(cx, cy + d, 4.5);
  }
  for (let d = -264; d <= 264; d += step) {
    circle(cx + d, cy + d, 4);
    circle(cx + d, cy - d, 4);
  }
  for (let r = 48; r <= 96; r += 24) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const px = Math.round((cx + Math.cos(a) * r) / step) * step;
      const py = Math.round((cy + Math.sin(a) * r) / step) * step;
      circle(px, py, 5.5);
    }
  }
  pop();
}

state.logoBackground = "none";

state.showBrandBlock = true;

function installLogoStyleControls() {
  const sections = [...document.querySelectorAll("#editor-panel .section")];
  const sec = sections.find((s) =>
    /loghi/i.test(s.querySelector(".section-title")?.textContent || ""),
  );
  if (!sec || sec.querySelector("#logo-bg-mode")) return;
  const vis = document.createElement("div");
  vis.className = "field";
  vis.id = "logo-visibility";
  vis.innerHTML =
    '<label style="display:flex;align-items:center;gap:7px"><input id="logo-band-on" type="checkbox" checked> VISUALIZZA BLOCCO IDENTITÀ</label>';
  vis.querySelector("input").onchange = (e) => {
    state.showBrandBlock = e.target.checked;
  };
  const field = document.createElement("div");
  field.className = "field";
  field.id = "logo-bg-mode";
  const label = document.createElement("label");
  label.textContent = "SFONDO LOGHI";
  const select = document.createElement("select");
  select.innerHTML =
    '<option value="none">NESSUNO</option><option value="white">BIANCO</option>';
  select.value = state.logoBackground;
  select.onchange = () => (state.logoBackground = select.value);
  field.append(label, select);
  sec.insertBefore(field, sec.firstChild.nextSibling);
  sec.insertBefore(vis, field);
}

function drawLogoSlot(i, logoAmount, iconScale) {
  if (!state.showBrandBlock) return;
  const d = 128,
    x = LOGO_XS[i],
    y = LOGO_Y,
    icon = state.logoIcons[i] || ["🍒", "🍋", "🍇"][i];
  push();
  translate(x, y);
  if (logoAmount < 0.98) {
    push();
    scale(iconScale);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(90);
    text(icon, 0, 0);
    pop();
  }
  if (logoAmount > 0) {
    push();
    scale(logoAmount);
    if (state.logoBackground === "white") {
      noStroke();
      fill(COLORS.white);
      circle(0, 0, d);
    }
    const img = state.logos[i];
    if (img) {
      const m = state.logoBackground === "white" ? d * 0.72 : d * 0.92,
        s = min(m / img.width, m / img.height);
      drawingContext.save();
      drawingContext.imageSmoothingEnabled = true;
      drawingContext.imageSmoothingQuality = "high";
      imageMode(CENTER);
      image(img, 0, 0, img.width * s, img.height * s);
      imageMode(CORNER);
      drawingContext.restore();
    } else {
      noStroke();
      fill(COLORS.black);
      textAlign(CENTER, CENTER);
      textFont("Helvetica");
      textStyle(BOLD);
      textSize(12);
      text(state.logoLabels[i], 0, 0);
    }
    pop();
  }
  pop();
}

function installLogoUploadControls() {
  const panel = document.getElementById("editor-panel");
  if (!panel) return;
  const sections = [...panel.querySelectorAll(".section")];
  const logoSection = sections.find((sec) => {
    const t = sec.querySelector(".section-title");
    return t && /loghi/i.test(t.textContent || "");
  });
  if (!logoSection) return;
  const uploadRows = [...logoSection.querySelectorAll(".logo-input")].slice(
    0,
    3,
  );
  uploadRows.forEach((row, i) => {
    if (row.querySelector(".burst-icon-input")) return;
    const wrap = document.createElement("div");
    wrap.className = "field burst-icon-input";
    const label = document.createElement("label");
    label.textContent = `ICONA ${i + 1}`;
    const input = document.createElement("input");
    input.type = "text";
    input.value = state.logoIcons[i] || ["🍒", "🍋", "🍇"][i];
    input.maxLength = 8;
    input.addEventListener("input", () => {
      state.logoIcons[i] = input.value || ["🍒", "🍋", "🍇"][i];
      saveLogoIcons();
    });
    wrap.append(label, input);
    row.appendChild(wrap);
  });
  if (!logoSection.querySelector("#arci-logo-upload")) {
    const arci = document.createElement("div");
    arci.className = "field logo-input";
    arci.id = "arci-logo-upload";
    const label = document.createElement("label");
    label.textContent = "STELLA / LOGO ARCI — ALTO DESTRA";
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) =>
        loadImage(
          ev.target.result,
          (img) => {
            state.arciLogo = img;
          },
          (err) => console.warn("ARCI image load", err),
        );
      reader.readAsDataURL(file);
    });
    arci.append(label, input);
    logoSection.appendChild(arci);
  }
  if (!logoSection.querySelector("#final-caption-input")) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    wrap.id = "final-caption-input";
    const label = document.createElement("label");
    label.textContent = "STRINGA FINALE";
    const input = document.createElement("input");
    input.type = "text";
    input.value = state.finalCaption;
    input.placeholder = "2026 edition";
    input.addEventListener("input", () => {
      state.finalCaption = input.value || "2026 edition";
      saveFinalCaption();
    });
    wrap.append(label, input);
    logoSection.appendChild(wrap);
  }
  if (!logoSection.querySelector(".export-hint")) {
    const hint = document.createElement("div");
    hint.className = "coords export-hint";
    hint.textContent = "Export Instagram: PNG POST, PNG STORY e MP4 H.264 animato 1080×1350.";
    logoSection.appendChild(hint);
  }
}

function installPackageAndPlaceControls() {
  const panel = document.getElementById("editor-panel");
  if (!panel) return;
  const sections = [...panel.querySelectorAll(".section")];
  const placesSection = sections.find((sec) => {
    const title = sec.querySelector(".section-title");
    return title && /luoghi/i.test(title.textContent || "");
  });
  if (placesSection && !placesSection.querySelector("#add-place-button")) {
    const actions = placesSection.querySelector(".place-actions"),
      add = document.createElement("button");
    add.id = "add-place-button";
    add.className = "fix-button";
    add.type = "button";
    add.textContent = "+ AGGIUNGI LUOGO";
    add.style.width = "100%";
    add.style.margin = "9px 0 8px";
    add.addEventListener("click", () => {
      const i = state.places.length,
        p = {
          name: `LUOGO ${i + 1}`,
          icon: "📍",
          x: BASE_W / 2 - 100 + (i % 3) * 28,
          y: BASE_H / 2 - 50 + (i % 4) * 28,
          w: 200,
        };
      state.places.push(p);
      insertDynamicPlaceEditor(placesSection, p, i);
      try {
        localStorage.setItem(PLACE_STORAGE_KEY, JSON.stringify(state.places));
      } catch (e) {}
      generateRatStarts();
      refreshRatEditors();
      if (placeStatusEl)
        placeStatusEl.html("✓ LUOGO AGGIUNTO — spostalo e poi FIX LUOGHI");
    });
    if (actions) placesSection.insertBefore(add, actions);
    else placesSection.appendChild(add);
  }
  const seqSection = sections.find((sec) => {
    const title = sec.querySelector(".section-title");
    return title && /sequenza/i.test(title.textContent || "");
  });
  if (seqSection && !seqSection.querySelector("#package-controls")) {
    const folder = document.createElement("div");
    folder.className = "field";
    folder.id = "export-folder-control";
    folder.style.marginTop = "10px";
    const lab = document.createElement("label");
    lab.textContent = "CARTELLA OUTPUT";
    const folderRow = document.createElement("div");
    folderRow.style.display = "grid";
    folderRow.style.gridTemplateColumns = "1fr 92px";
    folderRow.style.gap = "6px";
    const folderName = document.createElement("input");
    folderName.id = "export-folder-name";
    folderName.type = "text";
    folderName.readOnly = true;
    folderName.value = state.exportFolderName;
    folderName.title =
      "Per sicurezza il browser non accetta un percorso digitato: scegli la cartella con il pulsante.";
    const choose = document.createElement("button");
    choose.type = "button";
    choose.className = "mini-button";
    choose.textContent = "SCEGLI…";
    choose.addEventListener("click", chooseExportFolder);
    folderRow.append(folderName, choose);
    folder.append(lab, folderRow);
    seqSection.appendChild(folder);

    const hint = document.createElement("div");
    hint.className = "coords";
    hint.textContent =
      "REC + PNG + PACCHETTI vanno qui. Se non scegli nulla: Download.";
    seqSection.appendChild(hint);
    const box = document.createElement("div");
    box.id = "package-controls";
    box.style.display = "grid";
    box.style.gridTemplateColumns = "1fr 1fr";
    box.style.gap = "6px";
    box.style.marginTop = "10px";
    const save = document.createElement("button");
    save.className = "fix-button";
    save.type = "button";
    save.textContent = "💾 SALVA PACCHETTO";
    save.addEventListener("click", savePackage);
    const load = document.createElement("button");
    load.className = "fix-button secondary";
    load.type = "button";
    load.textContent = "📂 CARICA PACCHETTO";
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    load.addEventListener("click", () => input.click());
    input.addEventListener("change", () =>
      loadPackageFile(input.files && input.files[0]),
    );
    box.append(save, load, input);
    seqSection.appendChild(box);

    const pngBox = document.createElement("div");
    pngBox.id = "png-export-controls";
    pngBox.style.display = "grid";
    pngBox.style.gridTemplateColumns = "1fr 1fr";
    pngBox.style.gap = "6px";
    pngBox.style.marginTop = "8px";
    const postPNG = document.createElement("button");
    postPNG.className = "fix-button secondary";
    postPNG.type = "button";
    postPNG.textContent = "PNG POST · 4:5";
    postPNG.addEventListener("click", () => saveNativePNG("post"));
    const storyPNG = document.createElement("button");
    storyPNG.className = "fix-button secondary";
    storyPNG.type = "button";
    storyPNG.textContent = "PNG STORY · 9:16";
    storyPNG.addEventListener("click", () => saveNativePNG("story"));
    pngBox.append(postPNG, storyPNG);
    seqSection.appendChild(pngBox);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noSmooth();
  loadFixedPlaces();
  loadRats();
  buildGrid();
  generateRatStarts();
  buildEditor();
  if (_pendingPackageAssets) {
    (_pendingPackageAssets.logos || []).forEach((src, i) => {
      if (src)
        loadImage(
          src,
          (img) => {
            state.logos[i] = img;
          },
          (err) => console.warn("logo restore", err),
        );
    });
    if (_pendingPackageAssets.arciLogo)
      loadImage(
        _pendingPackageAssets.arciLogo,
        (img) => {
          state.arciLogo = img;
        },
        (err) => console.warn("ARCI restore", err),
      );
  }
}

function buildEditor() {
  const panel = createDiv();
  panel.id("editor-panel");
  createElement("h1", "EX CASA MAP TOOL").parent(panel);
  const sub = createDiv("PAC-MAN / RATS / POPUPS / HEARTS");
  sub.class("sub");
  sub.parent(panel);
  const controls = makeSection(panel, "Sequenza");
  const row = createDiv();
  row.class("control-row");
  row.parent(controls);
  makeControlButton(row, "COMPOSE", setCompose);
  makeControlButton(row, "▶ PLAY", () => startSequence(false));
  makeControlButton(row, "MP4 POST", () => startSequence(true));
  statusEl = createDiv("COMPOSE MODE");
  statusEl.class("rec-status");
  statusEl.parent(controls);
  const bg = makeSection(panel, "Background");
  const pal = createDiv();
  pal.class("palette");
  pal.parent(bg);
  BG_PALETTE.forEach((c) => {
    const sw = createButton("");
    sw.class("swatch");
    sw.parent(pal);
    sw.style("background", c);
    sw.mousePressed(() => (state.bgColor = c));
  });
  const gw = createDiv();
  gw.class("field");
  gw.parent(bg);
  createElement("label", "griglia").parent(gw);
  const gc = createCheckbox("", state.showGrid);
  gc.parent(gw);
  gc.changed(() => (state.showGrid = gc.checked()));
  const identity = makeSection(panel, "Identità");
  makeTextField(identity, "Titolo", state.title, (v) => (state.title = v));
  makeTextField(identity, "Anno", state.year, (v) => (state.year = v));
  makeTextField(identity, "Info", state.info, (v) => (state.info = v));
  makeTextField(identity, "Footer", state.footer, (v) => (state.footer = v));
  const scales = makeSection(panel, "Scale");
  const popupScale = createDiv();
  popupScale.class("popup-scale-control");
  popupScale.parent(scales);
  const minus = createButton("−");
  minus.class("mini-button");
  minus.parent(popupScale);
  minus.mousePressed(() => changePopupScale(-0.1));
  popupScaleValueEl = createDiv(`POPUP ${state.scales.popup.toFixed(1)}×`);
  popupScaleValueEl.class("scale-value");
  popupScaleValueEl.parent(popupScale);
  const plus = createButton("+");
  plus.class("mini-button");
  plus.parent(popupScale);
  plus.mousePressed(() => changePopupScale(0.1));
  makeScale(scales, "Luoghi", "label", 0.6, 3, 0.05);
  makeScale(scales, "Topi", "rat", 0.6, 2.2, 0.05);
  const places = makeSection(panel, "Luoghi / coordinate");
  state.places.forEach((p, i) => makePlaceEditor(places, p, i));
  const pa = createDiv();
  pa.class("place-actions");
  pa.parent(places);
  const fb = createButton("📌 FIX LUOGHI");
  fb.class("fix-button");
  fb.parent(pa);
  fb.mousePressed(() => {
    saveFixedPlaces();
    generateRatStarts();
    refreshRatEditors();
  });
  const rb = createButton("RESET");
  rb.class("fix-button secondary");
  rb.parent(pa);
  rb.mousePressed(() => {
    resetPlaces();
    generateRatStarts();
    refreshRatEditors();
  });
  placeStatusEl = createDiv("sposta icona + label → FIX LUOGHI");
  placeStatusEl.class("coords");
  placeStatusEl.parent(places);
  const rats = makeSection(panel, "Topi / arrivo");
  const countWrap = createDiv();
  countWrap.class("field");
  countWrap.parent(rats);
  createElement("label", "Numero topi").parent(countWrap);
  const countSel = createSelect();
  countSel.parent(countWrap);
  for (let i = 1; i <= 5; i++) countSel.option(String(i), String(i));
  countSel.selected(String(state.ratCount));
  countSel.changed(() => {
    state.ratCount = Number(countSel.value());
    saveRats();
    generateRatStarts();
    refreshRatEditors();
  });
  ratEditorEl = createDiv();
  ratEditorEl.class("rat-editors");
  ratEditorEl.parent(rats);
  refreshRatEditors();
  const ratHint = createDiv(
    "Scegli solo il luogo di ARRIVO. A ogni PLAY/REC il topo entra da un bordo random lontano dalla destinazione e segue la griglia H/V.",
  );
  ratHint.class("coords");
  ratHint.parent(rats);
  const popSec = makeSection(panel, "Popup eventi");
  popupEditorEl = createDiv();
  popupEditorEl.parent(popSec);
  refreshPopupEditors();
  const add = createButton("+ AGGIUNGI POPUP");
  add.class("fix-button");
  add.parent(popSec);
  add.mousePressed(addPopup);
  const logos = makeSection(panel, "Loghi PNG / cuori");
  for (let i = 0; i < 3; i++) {
    const w = createDiv();
    w.class("field logo-input");
    w.parent(logos);
    createElement("label", `Cuore ${i + 1} → Logo ${i + 1}`).parent(w);
    const inp = createFileInput((f) => handleLogo(f, i));
    inp.parent(w);
    inp.attribute("accept", "image/png,image/*");
  }
  installLogoUploadControls();
  installPackageAndPlaceControls();
  installProjectEmojiLibrary();
  installLogoStyleControls();
}

function drawIdentity() {
  if (!state.showBrandBlock) return;
  const ink = isDark(state.bgColor) ? COLORS.white : COLORS.black;
  textAlign(LEFT, TOP);
  textFont("Helvetica");
  textStyle(BOLD);
  noStroke();
  fill(COLORS.pink);
  textSize(42);
  text(state.title || "", 61, 35);
  stroke(COLORS.black);
  strokeWeight(5);
  fill(COLORS.white);
  text(state.title || "", 55, 29);
  noStroke();
  fill(ink);
  textSize(28);
  text(state.year || "", 57, 80);
  textSize(12);
  text(state.info || "", 58, 118);
  textAlign(LEFT, BOTTOM);
  text(state.footer || "", 55, BASE_H - 26);
  drawArciMark();
}
