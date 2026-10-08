/* scratch.js — a vector handwriting scratchpad for iPad (Apple Pencil) and mouse.
 *
 * Model: strokes in world coordinates on a page of fixed width (PAGE_W) and
 * unbounded height; a view transform {scale, tx, ty} maps world → CSS px.
 * Pen (pointerType "pen" or "mouse") draws/erases/lassos; fingers only pan
 * (one) or pinch-zoom (two); two-finger tap = undo, three-finger tap = redo.
 * Stroke eraser removes whole strokes hit by the eraser's path (segment test).
 * Export renders the inked bounding box to PNG slices sized for a vision model.
 *
 * Usage: const pad = Scratch.mount(containerEl, toolbarEl); pad.hasInk(); pad.exportImages(); pad.clear();
 */
(function () {
  const PAGE_W = 1000; // world units
  const GRID = 25; // world units
  const COLORS = ["#111111", "#1f4fd1", "#c62828", "#2e7d32"];
  const SIZES = [2.2, 3.6, 6];
  const ERASER_R = 14; // world units
  const MIN_SCALE = 0.4, MAX_SCALE = 5;

  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  // distance from point P to segment AB
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay; const l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    return dist(px, py, ax + t * dx, ay + t * dy);
  }
  // min distance between two segments (coarse: endpoint-to-segment both ways + midpoints)
  function segSegDist(a, b, c, d) {
    const cand = [segDist(a[0], a[1], c[0], c[1], d[0], d[1]), segDist(b[0], b[1], c[0], c[1], d[0], d[1]), segDist(c[0], c[1], a[0], a[1], b[0], b[1]), segDist(d[0], d[1], a[0], a[1], b[0], b[1])];
    return Math.min(...cand);
  }
  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function bboxOf(points, pad) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of points) { if (p[0] < x0) x0 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[0] > x1) x1 = p[0]; if (p[1] > y1) y1 = p[1]; }
    return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
  }
  function boxesHit(a, b) { return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]; }

  function mount(host, toolbar, opts) {
    opts = opts || {};
    host.classList.add("scratch-host");
    host.innerHTML = '<canvas class="sc-static"></canvas><canvas class="sc-live"></canvas>';
    const stat = host.querySelector(".sc-static"), live = host.querySelector(".sc-live");
    const sctx = stat.getContext("2d"), lctx = live.getContext("2d", { desynchronized: true });
    const S = {
      strokes: [], undo: [], redo: [], view: { scale: 1, tx: 0, ty: 0 },
      tool: "pen", color: COLORS[0], size: SIZES[1], grid: true,
      cur: null, erasing: new Set(), eraserLast: null, lasso: null, selection: null, dragging: null,
      touches: new Map(), gesture: null, tapTimer: null, penSeen: false, dpr: Math.max(1, window.devicePixelRatio || 1), cssW: 0, cssH: 0,
    };
    let dirty = true;

    // ---------- geometry ----------
    const toWorld = (x, y) => [(x - S.view.tx) / S.view.scale, (y - S.view.ty) / S.view.scale];
    const contentH = () => { let m = 0; for (const s of S.strokes) if (s.bbox[3] > m) m = s.bbox[3]; return m; };
    function fitWidth() { S.view.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, S.cssW / PAGE_W)); S.view.tx = 0; S.view.ty = Math.min(0, S.view.ty); clampView(); }
    function clampView() {
      const v = S.view; const pageW = PAGE_W * v.scale;
      if (pageW <= S.cssW) v.tx = (S.cssW - pageW) / 2; else v.tx = Math.min(0, Math.max(S.cssW - pageW, v.tx));
      const maxH = Math.max(S.cssH / v.scale, contentH() + 600) * v.scale;
      v.ty = Math.min(0, Math.max(S.cssH - maxH, v.ty));
    }
    function resize() {
      const r = host.getBoundingClientRect(); S.cssW = Math.max(1, Math.round(r.width)); S.cssH = Math.max(1, Math.round(r.height));
      for (const c of [stat, live]) { c.width = Math.round(S.cssW * S.dpr); c.height = Math.round(S.cssH * S.dpr); c.style.width = S.cssW + "px"; c.style.height = S.cssH + "px"; }
      if (S.view.scale === 1 && S.view.tx === 0 && S.view.ty === 0) fitWidth(); else clampView();
      dirty = true;
    }
    new ResizeObserver(resize).observe(host); resize();

    // ---------- rendering ----------
    function applyView(ctx) { ctx.setTransform(S.dpr * S.view.scale, 0, 0, S.dpr * S.view.scale, S.dpr * S.view.tx, S.dpr * S.view.ty); }
    function drawStroke(ctx, s, alpha) {
      const pts = s.points; if (!pts.length) return;
      ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], s.size * 0.5 * (0.6 + pts[0][2]), 0, Math.PI * 2); ctx.fill(); ctx.restore(); return; }
      // variable width: draw short segments with pressure-weighted width, midpoint smoothing
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i]; const w = s.size * (0.55 + 0.9 * ((a[2] + b[2]) / 2));
        ctx.lineWidth = w; ctx.beginPath();
        if (i > 1) { const p = pts[i - 2]; ctx.moveTo((p[0] + a[0]) / 2, (p[1] + a[1]) / 2); ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
        else { ctx.moveTo(a[0], a[1]); ctx.lineTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
        ctx.stroke();
      }
      const l = pts[pts.length - 1], m = pts[pts.length - 2]; ctx.lineWidth = s.size * (0.55 + 0.9 * l[2]); ctx.beginPath(); ctx.moveTo((m[0] + l[0]) / 2, (m[1] + l[1]) / 2); ctx.lineTo(l[0], l[1]); ctx.stroke();
      ctx.restore();
    }
    function drawStatic() {
      sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, stat.width, stat.height);
      const dark = matchMedia("(prefers-color-scheme: dark)").matches;
      sctx.fillStyle = dark ? "#1a1a1e" : "#fbfaf7"; sctx.fillRect(0, 0, stat.width, stat.height);
      applyView(sctx);
      // page edges
      const [wx0, wy0] = toWorld(0, 0), [wx1, wy1] = toWorld(S.cssW, S.cssH);
      sctx.fillStyle = dark ? "#202026" : "#ffffff"; sctx.fillRect(0, Math.min(wy0, 0), PAGE_W, Math.max(wy1, 0) - Math.min(wy0, 0));
      if (S.grid) {
        sctx.strokeStyle = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"; sctx.lineWidth = 1 / S.view.scale; sctx.beginPath();
        for (let x = 0; x <= PAGE_W; x += GRID) { sctx.moveTo(x, Math.max(0, wy0)); sctx.lineTo(x, wy1); }
        for (let y = Math.max(0, Math.floor(wy0 / GRID) * GRID); y <= wy1; y += GRID) { sctx.moveTo(0, y); sctx.lineTo(PAGE_W, y); }
        sctx.stroke();
      }
      const vb = [wx0, wy0, wx1, wy1];
      for (const s of S.strokes) if (boxesHit(s.bbox, vb)) drawStroke(sctx, s, S.erasing.has(s) ? 0.25 : 1);
      if (S.selection) { const b = S.selection.bbox; sctx.save(); sctx.strokeStyle = "#2f6fde"; sctx.setLineDash([6 / S.view.scale, 4 / S.view.scale]); sctx.lineWidth = 1.5 / S.view.scale; sctx.strokeRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); sctx.restore(); }
    }
    function drawLive() {
      lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, live.width, live.height); applyView(lctx);
      if (S.cur) drawStroke(lctx, S.cur);
      if (S.lasso && S.lasso.length > 1) { lctx.save(); lctx.strokeStyle = "#2f6fde"; lctx.setLineDash([5 / S.view.scale, 4 / S.view.scale]); lctx.lineWidth = 1.5 / S.view.scale; lctx.beginPath(); lctx.moveTo(S.lasso[0][0], S.lasso[0][1]); for (const p of S.lasso) lctx.lineTo(p[0], p[1]); lctx.stroke(); lctx.restore(); }
    }
    function frame() { if (dirty) { drawStatic(); dirty = false; } drawLive(); requestAnimationFrame(frame); }
    requestAnimationFrame(frame);

    // ---------- undo ----------
    function push(op) { S.undo.push(op); if (S.undo.length > 200) S.undo.shift(); S.redo.length = 0; }
    function apply(op, inverse) {
      const add = (op.type === "add") !== inverse, remove = (op.type === "remove") !== inverse;
      if (op.type === "add" || op.type === "remove") { if ((op.type === "add" && !inverse) || (op.type === "remove" && inverse)) S.strokes.push(...op.strokes); else S.strokes = S.strokes.filter((s) => !op.strokes.includes(s)); }
      if (op.type === "move") { const k = inverse ? -1 : 1; for (const s of op.strokes) { for (const p of s.points) { p[0] += op.dx * k; p[1] += op.dy * k; } s.bbox = bboxOf(s.points, s.size); } }
      void add; void remove; S.selection = null; dirty = true;
    }
    function undo() { const op = S.undo.pop(); if (!op) return; apply(op, true); S.redo.push(op); }
    function redo() { const op = S.redo.pop(); if (!op) return; apply(op, false); S.undo.push(op); }

    // ---------- pen input ----------
    function penDown(e) {
      const [x, y] = toWorld(e.offsetX, e.offsetY);
      if (S.tool === "pen") S.cur = { points: [[x, y, e.pressure || 0.5]], color: S.color, size: S.size, bbox: null };
      else if (S.tool === "eraser") { S.eraserLast = [x, y]; eraseAt([x, y], [x, y]); }
      else if (S.tool === "lasso") {
        if (S.selection && x >= S.selection.bbox[0] && x <= S.selection.bbox[2] && y >= S.selection.bbox[1] && y <= S.selection.bbox[3]) S.dragging = { lx: x, ly: y, dx: 0, dy: 0 };
        else { S.selection = null; S.lasso = [[x, y]]; dirty = true; }
      }
    }
    function penMove(e) {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; const list = evs.length ? evs : [e];
      for (const ev of list) {
        const ox = ev.offsetX != null && ev.target === live ? ev.offsetX : e.offsetX, oy = ev.offsetY != null && ev.target === live ? ev.offsetY : e.offsetY;
        const [x, y] = toWorld(ox, oy);
        if (S.cur) { const l = S.cur.points[S.cur.points.length - 1]; if (dist(l[0], l[1], x, y) >= 0.7) S.cur.points.push([x, y, ev.pressure || e.pressure || 0.5]); }
        else if (S.tool === "eraser" && S.eraserLast) { eraseAt(S.eraserLast, [x, y]); S.eraserLast = [x, y]; }
        else if (S.lasso) S.lasso.push([x, y]);
        else if (S.dragging) { S.dragging.dx = x - S.dragging.lx; S.dragging.dy = y - S.dragging.ly; moveSelection(S.dragging.dx, S.dragging.dy); S.dragging.lx = x; S.dragging.ly = y; }
      }
    }
    function penUp() {
      if (S.cur) { if (S.cur.points.length) { S.cur.bbox = bboxOf(S.cur.points, S.cur.size); S.strokes.push(S.cur); push({ type: "add", strokes: [S.cur] }); } S.cur = null; dirty = true; }
      if (S.eraserLast) { S.eraserLast = null; if (S.erasing.size) { const gone = [...S.erasing]; S.strokes = S.strokes.filter((s) => !S.erasing.has(s)); push({ type: "remove", strokes: gone }); S.erasing.clear(); dirty = true; } }
      if (S.lasso) { const poly = S.lasso; S.lasso = null; if (poly.length > 3) { const sel = S.strokes.filter((s) => { const pts = s.points; let inside = 0, n = 0; for (let i = 0; i < pts.length; i += Math.max(1, Math.floor(pts.length / 12))) { n++; if (pointInPoly(pts[i][0], pts[i][1], poly)) inside++; } return n && inside / n >= 0.5; }); if (sel.length) { let b = [Infinity, Infinity, -Infinity, -Infinity]; for (const s of sel) b = [Math.min(b[0], s.bbox[0]), Math.min(b[1], s.bbox[1]), Math.max(b[2], s.bbox[2]), Math.max(b[3], s.bbox[3])]; S.selection = { strokes: sel, bbox: b, moved: [0, 0] }; } } dirty = true; }
      if (S.dragging) { const m = S.selection && S.selection.moved; if (m && (m[0] || m[1])) { push({ type: "move", strokes: S.selection.strokes, dx: m[0], dy: m[1] }); S.selection.moved = [0, 0]; } S.dragging = null; }
    }
    function moveSelection(dx, dy) { if (!S.selection) return; for (const s of S.selection.strokes) { for (const p of s.points) { p[0] += dx; p[1] += dy; } s.bbox = bboxOf(s.points, s.size); } const b = S.selection.bbox; S.selection.bbox = [b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy]; S.selection.moved[0] += dx; S.selection.moved[1] += dy; dirty = true; }
    function eraseAt(a, b) {
      const box = [Math.min(a[0], b[0]) - ERASER_R, Math.min(a[1], b[1]) - ERASER_R, Math.max(a[0], b[0]) + ERASER_R, Math.max(a[1], b[1]) + ERASER_R];
      for (const s of S.strokes) {
        if (S.erasing.has(s) || !boxesHit(s.bbox, box)) continue;
        const pts = s.points; const r = ERASER_R + s.size / 2; let hit = false;
        if (pts.length === 1) hit = segDist(pts[0][0], pts[0][1], a[0], a[1], b[0], b[1]) <= r;
        for (let i = 1; i < pts.length && !hit; i++) if (segSegDist(a, b, pts[i - 1], pts[i]) <= r) hit = true;
        if (hit) { S.erasing.add(s); dirty = true; }
      }
    }

    // ---------- finger gestures: pan, pinch, tap-undo ----------
    function fingerDown(e) {
      S.touches.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
      const n = S.touches.size;
      if (n === 1) S.gesture = { kind: "pan", lx: e.clientX, ly: e.clientY, moved: 0, start: performance.now() };
      else if (n >= 2) { const [p, q] = [...S.touches.values()]; S.gesture = { kind: "pinch", d0: dist(p.x, p.y, q.x, q.y), s0: S.view.scale, mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2, tx0: S.view.tx, ty0: S.view.ty, moved: S.gesture ? S.gesture.moved : 0, start: S.gesture ? S.gesture.start : performance.now(), fingers: Math.max(n, S.gesture ? S.gesture.fingers || 0 : 0), swipes: S.gesture ? S.gesture.swipes : undefined }; }
    }
    function fingerMove(e) {
      const t = S.touches.get(e.pointerId); if (!t) return; t.x = e.clientX; t.y = e.clientY;
      const g = S.gesture; if (!g) return;
      const r = host.getBoundingClientRect();
      if (g.kind === "pan" && S.touches.size === 1 && (g.fingers || 1) === 1) { const dx = e.clientX - g.lx, dy = e.clientY - g.ly; g.moved += Math.abs(dx) + Math.abs(dy); g.lx = e.clientX; g.ly = e.clientY; S.view.tx += dx; S.view.ty += dy; clampView(); dirty = true; }
      else if (g.kind === "pinch" && S.touches.size >= 3) { /* multi-finger swipe in progress: no pan/zoom */ }
      else if (g.kind === "pinch" && S.touches.size >= 2) {
        const [p, q] = [...S.touches.values()]; const d = dist(p.x, p.y, q.x, q.y); const mx = (p.x + q.x) / 2 - r.left, my = (p.y + q.y) / 2 - r.top;
        const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, g.s0 * (d / g.d0))); const k = scale / S.view.scale;
        // zoom about the midpoint, then follow the midpoint drift
        S.view.tx = mx - (mx - S.view.tx) * k; S.view.ty = my - (my - S.view.ty) * k; S.view.scale = scale;
        const gmx = g.mx - r.left, gmy = g.my - r.top; S.view.tx += mx - gmx; S.view.ty += my - gmy; g.mx = mx + r.left; g.my = my + r.top;
        g.moved += Math.abs(d - g.d0) * 0.5; clampView(); dirty = true;
      }
    }
    function fingerUp(e) {
      const t = S.touches.get(e.pointerId); S.touches.delete(e.pointerId);
      const g = S.gesture;
      if (g && t) { g.swipes = g.swipes || []; g.swipes.push({ dx: t.x - t.sx, dy: t.y - t.sy }); }
      if (S.touches.size === 0 && g) {
        const dur = performance.now() - g.start; const fingers = g.fingers || 1;
        if (dur < 300 && g.moved < 12 && t && dist(t.sx, t.sy, t.x, t.y) < 12) { if (fingers === 2) undo(); else if (fingers >= 3) redo(); }
        else if (fingers >= 3 && dur < 900 && (g.swipes || []).length >= 3 && g.swipes.every((w) => w.dy < -70 && Math.abs(w.dx) < Math.abs(w.dy) * 0.7)) {
          // three/four-finger swipe up = send (iPadOS often keeps four-finger swipes for itself)
          if (typeof opts.onSend === "function") opts.onSend();
        }
        S.gesture = null;
      } else if (S.touches.size === 1 && g && g.kind === "pinch") { const [p] = [...S.touches.values()]; S.gesture = { kind: "pan", lx: p.x, ly: p.y, moved: g.moved, start: g.start, fingers: g.fingers, swipes: g.swipes }; }
    }

    // ---------- event wiring ----------
    const isPen = (e) => e.pointerType === "pen" || e.pointerType === "mouse";
    live.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "pen") S.penSeen = true;
      if (isPen(e)) { if (e.pointerType === "mouse" && e.button !== 0) return; live.setPointerCapture(e.pointerId); penDown(e); }
      else fingerDown(e);
      e.preventDefault();
    });
    live.addEventListener("pointermove", (e) => { if (isPen(e)) { if (e.buttons === 0) return; penMove(e); } else fingerMove(e); e.preventDefault(); });
    const up = (e) => { if (isPen(e)) penUp(); else fingerUp(e); };
    live.addEventListener("pointerup", up); live.addEventListener("pointercancel", up);
    // Scribble + Safari gesture suppression (non-passive touchmove preventDefault is the documented fix).
    for (const ev of ["touchstart", "touchmove", "touchend"]) live.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
    live.addEventListener("gesturestart", (e) => e.preventDefault()); live.addEventListener("gesturechange", (e) => e.preventDefault());
    live.addEventListener("contextmenu", (e) => e.preventDefault());
    // mouse wheel: scroll / ctrl+wheel zoom (laptop)
    live.addEventListener("wheel", (e) => { e.preventDefault(); if (e.ctrlKey || e.metaKey) { const r = host.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top; const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, S.view.scale * (e.deltaY < 0 ? 1.1 : 0.9))); const k = scale / S.view.scale; S.view.tx = mx - (mx - S.view.tx) * k; S.view.ty = my - (my - S.view.ty) * k; S.view.scale = scale; } else { S.view.tx -= e.deltaX; S.view.ty -= e.deltaY; } clampView(); dirty = true; }, { passive: false });

    // ---------- toolbar ----------
    function button(label, title, onclick) { const b = document.createElement("button"); b.type = "button"; b.textContent = label; b.title = title; b.onclick = onclick; return b; }
    const tb = toolbar; tb.innerHTML = "";
    const toolBtns = {};
    const setTool = (t) => { S.tool = t; for (const k in toolBtns) toolBtns[k].classList.toggle("on", k === t); if (t !== "lasso") { S.selection = null; dirty = true; } };
    const group = (cls) => { const g = document.createElement("div"); g.className = "sc-group " + cls; tb.append(g); return g; };
    const g1 = group("sc-tools");
    toolBtns.pen = button("✎", "Pen", () => setTool("pen")); toolBtns.eraser = button("⌫", "Stroke eraser: touch any part of a stroke to remove it", () => setTool("eraser")); toolBtns.lasso = button("◌", "Lasso: circle strokes, then drag them", () => setTool("lasso"));
    g1.append(toolBtns.pen, toolBtns.eraser, toolBtns.lasso);
    const g2 = group("sc-sizes");
    const sizeBtns = SIZES.map((sz, i) => { const b = button("", "Pen size", () => { S.size = sz; sizeBtns.forEach((x, j) => x.classList.toggle("on", j === i)); setTool("pen"); }); const dot = document.createElement("i"); dot.className = "sc-dot"; dot.style.width = dot.style.height = (6 + i * 5) + "px"; b.appendChild(dot); b.className = "sc-size"; if (sz === S.size) b.classList.add("on"); return b; });
    g2.append(...sizeBtns);
    const g3 = group("sc-colors");
    const colBtns = COLORS.map((c, i) => { const b = button("", "Ink color", () => { S.color = c; colBtns.forEach((x, j) => x.classList.toggle("on", j === i)); setTool("pen"); }); b.style.background = c; b.className = "sc-color"; if (c === S.color) b.classList.add("on"); return b; });
    g3.append(...colBtns);
    const g4 = group("sc-edit");
    g4.append(button("↶", "Undo (or two-finger tap)", undo), button("↷", "Redo (or three-finger tap)", redo));
    const delBtn = button("🗑", "Delete the lassoed strokes", () => { if (S.selection) { const gone = S.selection.strokes; S.strokes = S.strokes.filter((s) => !gone.includes(s)); push({ type: "remove", strokes: gone }); S.selection = null; dirty = true; } }); g4.append(delBtn);
    const g5 = group("sc-view");
    g5.append(button("⊞", "Toggle grid", () => { S.grid = !S.grid; dirty = true; }), button("⤢", "Fit page width", () => { fitWidth(); dirty = true; }), button("✕", "Clear the sheet", () => { if (!S.strokes.length) return; push({ type: "remove", strokes: S.strokes.slice() }); S.strokes = []; S.selection = null; dirty = true; }));
    setTool("pen");

    // ---------- export ----------
    function exportImages() {
      if (!S.strokes.length) return [];
      let b = [Infinity, Infinity, -Infinity, -Infinity];
      for (const s of S.strokes) b = [Math.min(b[0], s.bbox[0]), Math.min(b[1], s.bbox[1]), Math.max(b[2], s.bbox[2]), Math.max(b[3], s.bbox[3])];
      const M = 40; b = [Math.max(0, b[0] - M), b[1] - M, Math.min(PAGE_W, b[2] + M), b[3] + M];
      const w = b[2] - b[0], h = b[3] - b[1];
      const LONG = 1568;
      const scale = Math.min(LONG / w, 4) ; // width-driven; tall content is sliced
      const sliceH = Math.floor(LONG / scale);
      const out = [];
      for (let y = b[1]; y < b[3]; y += sliceH) {
        const hh = Math.min(sliceH, b[3] - y);
        const c = document.createElement("canvas"); c.width = Math.round(w * scale); c.height = Math.round(hh * scale);
        const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.setTransform(scale, 0, 0, scale, -b[0] * scale, -y * scale);
        const vb = [b[0], y, b[2], y + hh];
        for (const s of S.strokes) if (boxesHit(s.bbox, vb)) { const ss = { ...s, size: Math.max(s.size, 3.2 / scale), color: "#000" }; drawStroke(ctx, ss); }
        const url = c.toDataURL("image/png"); out.push({ data: url.split(",")[1], mimeType: "image/png" });
      }
      return out;
    }
    function clear() { S.strokes = []; S.undo.length = 0; S.redo.length = 0; S.selection = null; S.erasing.clear(); S.view.ty = 0; clampView(); dirty = true; }
    return { hasInk: () => S.strokes.length > 0, exportImages, clear, undo, redo, state: S };
  }
  window.Scratch = { mount };
})();
