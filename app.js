const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

const sourceText = document.getElementById("sourceText");
const modeButtons = document.querySelectorAll(".mode");
const toolButtons = document.querySelectorAll(".tool");
const spawnStringBtn = document.getElementById("spawnString");
const resetSceneBtn = document.getElementById("resetScene");
const actionPullBtn = document.getElementById("actionPull");
const actionTieBtn = document.getElementById("actionTie");
const actionCutBtn = document.getElementById("actionCut");
const toolHint = document.getElementById("toolHint");
const selectionInfo = document.getElementById("selectionInfo");
const objectiveEl = document.getElementById("objective");
const statsEl = document.getElementById("stats");

const STATE = {
  mode: "char",
  tool: "pull",
  strings: [],
  drag: null,
  pointer: { x: 0, y: 0, active: false },
  selection: { point: null, stick: null },
  objective: { ties: 2, cuts: 1 },
  progress: { ties: 0, cuts: 0 },
};

const PHYSICS = {
  gravity: 0.18,
  damping: 0.992,
  iterations: 12,
  gap: 26,
};

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function makePoint(x, y, token, pinned = false) {
  return { x, y, prevX: x, prevY: y, pinned, token };
}

function tokenize(text, mode) {
  if (mode === "word") {
    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.length ? words : ["WORD"];
  }

  const chars = text.length ? text.split("") : ["A", "B", "C"];
  return chars.map((c) => (c === " " ? "_" : c));
}

function tokenVisualWidth(token) {
  return Math.max(18, token.length * 9 + 14);
}

function buildSticks(points) {
  const sticks = [];
  for (let i = 1; i < points.length; i += 1) {
    const len = PHYSICS.gap + tokenVisualWidth(points[i].token) * 0.28;
    sticks.push({ a: i - 1, b: i, length: len });
  }
  return sticks;
}

function createStringChain(text, mode, startX, startY) {
  const tokens = tokenize(text, mode);
  const points = [];

  let x = startX;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    points.push(makePoint(x, startY, token, i === 0));
    x += PHYSICS.gap + tokenVisualWidth(token) * 0.45;
  }

  if (points.length > 1) {
    STATE.strings.push({ points, sticks: buildSticks(points) });
  }
}

function clearInteractionState() {
  STATE.drag = null;
  STATE.selection = { point: null, stick: null };
}

function rebuildDefaultScene() {
  STATE.strings = [];
  STATE.progress.ties = 0;
  STATE.progress.cuts = 0;
  clearInteractionState();
  createStringChain(sourceText.value || "HELLO STRING WORLD", STATE.mode, 74, 130);
  createStringChain("pull tie cut", "word", 110, 240);
  updateHud();
  updateSelectionUI();
}

function updateHud() {
  const tiedDone = STATE.progress.ties >= STATE.objective.ties;
  const cutDone = STATE.progress.cuts >= STATE.objective.cuts;
  const status = tiedDone && cutDone ? "Challenge complete." : "Keep experimenting.";

  objectiveEl.textContent = `Objective: make ${STATE.objective.ties} ties and ${STATE.objective.cuts} cut.`;
  statsEl.textContent = `Ties: ${STATE.progress.ties} | Cuts: ${STATE.progress.cuts} | String chains: ${STATE.strings.length} | ${status}`;
}

function setMode(mode) {
  STATE.mode = mode;
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
}

function setTool(tool) {
  STATE.tool = tool;
  toolButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });

  if (tool === "pull") {
    toolHint.textContent = "Pull mode: drag tokens, or select one and press Grab Selected.";
  }
  if (tool === "tie") {
    toolHint.textContent = "Tie mode: move cursor to a token, then press Tie/Untie Selected.";
  }
  if (tool === "cut") {
    toolHint.textContent = "Cut mode: move cursor to a link, then press Cut Selected Link.";
  }
}

function isTypingTarget(target) {
  if (!target) {
    return false;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

function toCanvasPos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function distanceSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby;

  if (abLenSq === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

function findNearestPoint(x, y, threshold = 24) {
  let best = null;
  let bestDist = threshold * threshold;

  STATE.strings.forEach((chain, chainIndex) => {
    chain.points.forEach((p, pointIndex) => {
      const d = distanceSq(x, y, p.x, p.y);
      if (d < bestDist) {
        bestDist = d;
        best = { chainIndex, pointIndex };
      }
    });
  });

  return best;
}

function findNearestStick(x, y, threshold = 14) {
  let best = null;
  let bestDist = threshold;

  STATE.strings.forEach((chain, chainIndex) => {
    chain.sticks.forEach((s, stickIndex) => {
      const a = chain.points[s.a];
      const b = chain.points[s.b];
      const d = distToSegment(x, y, a.x, a.y, b.x, b.y);
      if (d < bestDist) {
        bestDist = d;
        best = { chainIndex, stickIndex };
      }
    });
  });

  return best;
}

function updateSelectionFromPosition(x, y) {
  STATE.selection.point = findNearestPoint(x, y, 28);
  STATE.selection.stick = findNearestStick(x, y, 16);
  updateSelectionUI();
}

function getSelectedPoint() {
  const ref = STATE.selection.point;
  if (!ref) {
    return null;
  }
  const chain = STATE.strings[ref.chainIndex];
  return chain?.points[ref.pointIndex] || null;
}

function updateSelectionUI() {
  const point = getSelectedPoint();
  const stick = STATE.selection.stick;

  if (point) {
    selectionInfo.textContent = `Selected token: "${point.token}" at chain ${STATE.selection.point.chainIndex + 1}`;
  } else if (stick) {
    selectionInfo.textContent = `Selected link: chain ${stick.chainIndex + 1}, segment ${stick.stickIndex + 1}`;
  } else {
    selectionInfo.textContent = "Selected: none";
  }

  actionTieBtn.disabled = !point;
  actionPullBtn.disabled = !point && !STATE.drag;
  actionCutBtn.disabled = !stick;

  if (STATE.drag && STATE.drag.viaButton) {
    actionPullBtn.textContent = "Release Grab";
  } else {
    actionPullBtn.textContent = "Grab Selected";
  }
}

function startDrag(target, pointerPos, viaButton = false) {
  const chain = STATE.strings[target.chainIndex];
  const point = chain?.points[target.pointIndex];
  if (!point) {
    return;
  }

  STATE.drag = {
    chainIndex: target.chainIndex,
    pointIndex: target.pointIndex,
    offsetX: point.x - pointerPos.x,
    offsetY: point.y - pointerPos.y,
    wasPinned: point.pinned,
    viaButton,
  };

  point.pinned = true;
  point.prevX = point.x;
  point.prevY = point.y;
  updateSelectionUI();
}

function stopDrag() {
  if (!STATE.drag) {
    return;
  }

  const chain = STATE.strings[STATE.drag.chainIndex];
  const point = chain?.points[STATE.drag.pointIndex];
  if (point) {
    point.pinned = STATE.drag.wasPinned;
    point.prevX = point.x;
    point.prevY = point.y;
  }

  STATE.drag = null;
  updateSelectionUI();
}

function splitChainAtStick(chainIndex, stickIndex) {
  const chain = STATE.strings[chainIndex];
  const splitPoint = chain?.sticks[stickIndex]?.b;

  if (!chain || splitPoint <= 0 || splitPoint >= chain.points.length) {
    return;
  }

  const leftPoints = chain.points.slice(0, splitPoint).map((p) => ({ ...p }));
  const rightPoints = chain.points.slice(splitPoint).map((p, i) => ({ ...p, pinned: i === 0 ? false : p.pinned }));

  STATE.strings.splice(chainIndex, 1);
  if (leftPoints.length > 1) {
    leftPoints[0].pinned = true;
    STATE.strings.push({ points: leftPoints, sticks: buildSticks(leftPoints) });
  }
  if (rightPoints.length > 1) {
    STATE.strings.push({ points: rightPoints, sticks: buildSticks(rightPoints) });
  }

  STATE.progress.cuts += 1;
  updateHud();
  STATE.selection = { point: null, stick: null };
  updateSelectionUI();
}

function handleTieAction() {
  const ref = STATE.selection.point;
  const point = getSelectedPoint();
  if (!ref || !point) {
    return;
  }
  if (ref.pointIndex === 0 && point.pinned) {
    return;
  }

  point.pinned = !point.pinned;
  point.prevX = point.x;
  point.prevY = point.y;
  STATE.progress.ties += point.pinned ? 1 : -1;
  STATE.progress.ties = Math.max(0, STATE.progress.ties);
  updateHud();
  updateSelectionUI();
}

function handleCutAction() {
  const ref = STATE.selection.stick;
  if (!ref) {
    return;
  }
  splitChainAtStick(ref.chainIndex, ref.stickIndex);
}

function handlePullAction() {
  if (STATE.drag && STATE.drag.viaButton) {
    stopDrag();
    return;
  }

  const ref = STATE.selection.point;
  if (!ref) {
    return;
  }

  if (!STATE.pointer.active) {
    const p = getSelectedPoint();
    if (p) {
      STATE.pointer = { x: p.x, y: p.y, active: true };
    }
  }

  startDrag(ref, STATE.pointer, true);
}

function onPointerDown(event) {
  event.preventDefault();
  const pos = toCanvasPos(event);
  STATE.pointer = { ...pos, active: true };
  updateSelectionFromPosition(pos.x, pos.y);

  if (STATE.tool === "pull" && STATE.selection.point) {
    startDrag(STATE.selection.point, pos, false);
    canvas.setPointerCapture(event.pointerId);
  }
}

function onPointerMove(event) {
  const pos = toCanvasPos(event);
  STATE.pointer = { ...pos, active: true };
  updateSelectionFromPosition(pos.x, pos.y);

  if (!STATE.drag) {
    return;
  }

  event.preventDefault();
  const chain = STATE.strings[STATE.drag.chainIndex];
  const point = chain?.points[STATE.drag.pointIndex];
  if (!point) {
    return;
  }

  point.x = pos.x + STATE.drag.offsetX;
  point.y = pos.y + STATE.drag.offsetY;
  point.prevX = point.x;
  point.prevY = point.y;
}

function onPointerUp() {
  if (STATE.drag && !STATE.drag.viaButton) {
    stopDrag();
  }
  STATE.pointer.active = false;
}

function onPointerLeave() {
  STATE.pointer.active = false;
}

function onKeyDown(event) {
  if (isTypingTarget(event.target)) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "1") {
    setTool("pull");
    event.preventDefault();
    return;
  }
  if (key === "2") {
    setTool("tie");
    event.preventDefault();
    return;
  }
  if (key === "3") {
    setTool("cut");
    event.preventDefault();
    return;
  }
  if (key === "g" || key === " ") {
    handlePullAction();
    event.preventDefault();
    return;
  }
  if (key === "t") {
    handleTieAction();
    event.preventDefault();
    return;
  }
  if (key === "x") {
    handleCutAction();
    event.preventDefault();
    return;
  }
  if (key === "n") {
    spawnStringBtn.click();
    event.preventDefault();
    return;
  }
  if (key === "r") {
    rebuildDefaultScene();
    event.preventDefault();
  }
}

function integrate(chain) {
  const floor = canvas.clientHeight - 12;
  const rightWall = canvas.clientWidth - 12;

  chain.points.forEach((p) => {
    if (p.pinned) {
      return;
    }

    const vx = (p.x - p.prevX) * PHYSICS.damping;
    const vy = (p.y - p.prevY) * PHYSICS.damping + PHYSICS.gravity;

    p.prevX = p.x;
    p.prevY = p.y;
    p.x += vx;
    p.y += vy;

    if (p.x < 12) {
      p.x = 12;
      p.prevX = p.x;
    }
    if (p.x > rightWall) {
      p.x = rightWall;
      p.prevX = p.x;
    }
    if (p.y < 12) {
      p.y = 12;
      p.prevY = p.y;
    }
    if (p.y > floor) {
      p.y = floor;
      p.prevY = p.y;
    }
  });
}

function satisfyConstraints(chain) {
  for (let iter = 0; iter < PHYSICS.iterations; iter += 1) {
    chain.sticks.forEach((s) => {
      const a = chain.points[s.a];
      const b = chain.points[s.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const diff = (s.length - dist) / dist;
      const offsetX = dx * 0.5 * diff;
      const offsetY = dy * 0.5 * diff;

      if (!a.pinned) {
        a.x -= offsetX;
        a.y -= offsetY;
      }
      if (!b.pinned) {
        b.x += offsetX;
        b.y += offsetY;
      }
    });
  }
}

function drawChain(chain, chainIndex) {
  const selectedStick = STATE.selection.stick;

  chain.sticks.forEach((s, stickIndex) => {
    const a = chain.points[s.a];
    const b = chain.points[s.b];
    const isSelected = selectedStick && selectedStick.chainIndex === chainIndex && selectedStick.stickIndex === stickIndex;

    ctx.lineCap = "round";
    ctx.strokeStyle = isSelected ? "#ff7b62" : "#7f5a39";
    ctx.lineWidth = isSelected ? 4.8 : 3.2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });

  chain.points.forEach((p, pointIndex) => {
    const w = tokenVisualWidth(p.token);
    const h = 24;
    const x = p.x - w / 2;
    const y = p.y - h / 2;

    ctx.fillStyle = p.pinned ? "#3ac4ba" : "#f8e6ba";
    ctx.strokeStyle = pointIndex === 0 ? "#ffcf72" : "#7b5c32";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1f1c18";
    ctx.font = "700 13px Space Mono";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(p.token, p.x, p.y + 0.5);

    const selectedPoint = STATE.selection.point;
    const isSelected = selectedPoint && selectedPoint.chainIndex === chainIndex && selectedPoint.pointIndex === pointIndex;
    if (isSelected) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(16, w * 0.35), 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function drawPointerMarker() {
  if (!STATE.pointer.active) {
    return;
  }

  let color = "rgba(255,255,255,0.75)";
  if (STATE.tool === "tie") {
    color = "rgba(58, 196, 186, 0.95)";
  }
  if (STATE.tool === "cut") {
    color = "rgba(252, 93, 72, 0.95)";
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(STATE.pointer.x, STATE.pointer.y, 10, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBackgroundGuide() {
  const step = 26;
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;

  for (let y = step; y < canvas.clientHeight; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.clientWidth, y);
    ctx.stroke();
  }
}

function tick() {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  drawBackgroundGuide();

  STATE.strings.forEach((chain) => {
    integrate(chain);
    satisfyConstraints(chain);
  });

  STATE.strings.forEach((chain, chainIndex) => {
    drawChain(chain, chainIndex);
  });

  drawPointerMarker();
  requestAnimationFrame(tick);
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

toolButtons.forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

spawnStringBtn.addEventListener("click", () => {
  const y = 90 + Math.random() * Math.max(80, canvas.clientHeight - 140);
  createStringChain(sourceText.value, STATE.mode, 40, y);
  updateHud();
  updateSelectionUI();
});

resetSceneBtn.addEventListener("click", rebuildDefaultScene);
actionTieBtn.addEventListener("click", handleTieAction);
actionCutBtn.addEventListener("click", handleCutAction);
actionPullBtn.addEventListener("click", handlePullAction);

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerleave", onPointerLeave);
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", onKeyDown);

resizeCanvas();
setMode("char");
setTool("pull");
rebuildDefaultScene();
tick();
