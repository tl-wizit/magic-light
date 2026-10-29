// ---------------------------------------------------------------------------
// Magic Light — un glow coloré qui suit le doigt, avec une traînée joyeuse
// et un petit son doux. Pensé pour un tout-petit : plein écran, multi-doigts.
// ---------------------------------------------------------------------------

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const hint = document.getElementById('hint');

let width = 0;
let height = 0;
let dpr = 1;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2); // cap pour ménager le CPU
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

// --- Particules de la traînée -------------------------------------------------

const particles = [];
const MAX_PARTICLES = 900; // garde-fou de performance

// Chaque doigt garde sa propre teinte, qui dérive doucement -> arc-en-ciel
const fingers = new Map(); // pointerId -> { hue }

function hueForPointer(id) {
  if (!fingers.has(id)) {
    fingers.set(id, { hue: Math.floor(id * 47) % 360 });
  }
  return fingers.get(id);
}

function emit(x, y, hue) {
  // Quelques particules par point pour une traînée bien dense
  const count = 3;
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 0.6;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.15, // léger flottement vers le haut
      life: 1,
      decay: 0.024 + Math.random() * 0.02,
      radius: 26 + Math.random() * 34,
      hue: hue + (Math.random() * 30 - 15),
    });
  }
}

function spawn(x, y, id) {
  const finger = hueForPointer(id);
  finger.hue = (finger.hue + 4) % 360; // la couleur glisse le long de la traînée

  // Interpole depuis le dernier point -> traînée continue même si le doigt
  // bouge vite entre deux événements.
  if (finger.lastX != null) {
    const dx = x - finger.lastX;
    const dy = y - finger.lastY;
    const dist = Math.hypot(dx, dy);
    const step = 8; // un paquet de particules tous les 8 px
    const steps = Math.floor(dist / step);
    for (let i = 1; i <= steps; i++) {
      emit(finger.lastX + (dx * i) / (steps + 1), finger.lastY + (dy * i) / (steps + 1), finger.hue);
    }
  }
  emit(x, y, finger.hue);
  finger.lastX = x;
  finger.lastY = y;
}

// --- Bulles à faire éclater ---------------------------------------------------

const bubbles = [];
const MAX_BUBBLES = 6;
let lastBubbleAt = 0;

function spawnBubble() {
  if (bubbles.length >= MAX_BUBBLES) return;
  bubbles.push({
    x: 50 + Math.random() * (width - 100),
    y: height + 50,
    vy: -(0.3 + Math.random() * 0.45), // monte doucement
    radius: 34 + Math.random() * 26,
    hue: Math.floor(Math.random() * 360),
    phase: Math.random() * Math.PI * 2, // pour le balancement latéral
  });
}

// Explosion de particules quand une bulle éclate
function burst(x, y, hue) {
  for (let i = 0; i < 26; i++) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 2.6;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.018 + Math.random() * 0.02,
      radius: 14 + Math.random() * 18,
      hue: hue + (Math.random() * 40 - 20),
    });
  }
}

// Cherche une bulle sous le doigt ; si trouvée, l'éclate (son + vibration)
function popBubbleAt(x, y) {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    const cx = b.drawX != null ? b.drawX : b.x;
    if (Math.hypot(x - cx, y - b.y) <= b.radius * 1.15) {
      bubbles.splice(i, 1);
      burst(cx, b.y, b.hue);
      playPop(b.hue);
      buzz(30);
      return true;
    }
  }
  return false;
}

// --- Boucle de rendu ----------------------------------------------------------

function frame() {
  // Estompage progressif du fond -> laisse une traînée qui s'efface en douceur
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(5, 5, 16, 0.32)';
  ctx.fillRect(0, 0, width, height);

  // Les glows s'additionnent -> couleurs lumineuses et éclatantes
  ctx.globalCompositeOperation = 'lighter';

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    const r = p.radius * (0.6 + p.life * 0.7);
    const alpha = p.life * 0.55;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    grad.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${alpha})`);
    grad.addColorStop(0.4, `hsla(${p.hue}, 100%, 60%, ${alpha * 0.5})`);
    grad.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bulles qui montent ; un doigt dessus les fait éclater
  const nowMs = performance.now();
  if (nowMs - lastBubbleAt > 1600) {
    lastBubbleAt = nowMs;
    spawnBubble();
  }
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.phase += 0.02;
    b.y += b.vy;
    const bx = b.x + Math.sin(b.phase) * 12; // léger balancement
    b.drawX = bx;
    if (b.y < -60) {
      bubbles.splice(i, 1);
      continue;
    }
    const grad = ctx.createRadialGradient(bx, b.y, 0, bx, b.y, b.radius);
    grad.addColorStop(0, `hsla(${b.hue}, 100%, 75%, 0.5)`);
    grad.addColorStop(0.7, `hsla(${b.hue}, 100%, 60%, 0.22)`);
    grad.addColorStop(1, `hsla(${b.hue}, 100%, 55%, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// --- Son doux (Web Audio, aucun fichier externe) ------------------------------

let audioCtx = null;
let lastSound = 0;

function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

// Petite note cristalline, hauteur liée à la position verticale du doigt
function playBlip(y) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  if (now - lastSound < 0.05) return; // évite la saturation en glissant
  lastSound = now;

  // Gamme pentatonique -> tout sonne juste et agréable
  const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  const t = 1 - Math.min(Math.max(y / height, 0), 1); // haut = aigu
  const note = scale[Math.floor(t * (scale.length - 1) + 0.5)];

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = note;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.45);
}

// Accord : plusieurs notes empilées quand plusieurs doigts touchent l'écran.
// Chaque doigt ajoute une note différente, même s'ils sont à la même hauteur
// (ex. trois doigts en ligne) -> on entend bien un accord.
function playChord(ys) {
  if (!audioCtx || !ys.length) return;
  const now = audioCtx.currentTime;
  const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  const avgY = ys.reduce((a, b) => a + b, 0) / ys.length;
  const t = 1 - Math.min(Math.max(avgY / height, 0), 1); // haut = plus aigu
  const base = Math.round(t * (scale.length - 1));
  const n = ys.length;
  const level = 0.12 / Math.max(1, Math.sqrt(n)); // évite la saturation
  for (let i = 0; i < n; i++) {
    const idx = base + i * 2; // empile des tierces -> accord ouvert et joyeux
    const note = scale[idx % scale.length] * Math.pow(2, Math.floor(idx / scale.length));
    const start = now + i * 0.015; // petit décalage -> l'accord éclôt en douceur
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = note;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + 0.65);
  }
}

// Petit "pop" joyeux quand une bulle éclate
function playPop(hue) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const base = 440 + (hue / 360) * 440; // la couleur choisit la hauteur
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(base, now);
  osc.frequency.exponentialRampToValueAtTime(base * 2, now + 0.12); // saut vers l'aigu
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

// --- Entrées tactiles (pointer events = souris + tactile + stylet) ------------

let hintHidden = false;
function hideHint() {
  if (hintHidden) return;
  hintHidden = true;
  hint.classList.add('hidden');
}

// Petite vibration au toucher (Android ; l'iPhone n'a pas cette API)
function buzz(ms) {
  if (navigator.vibrate) {
    try { navigator.vibrate(ms); } catch (_) {}
  }
}

// Garde l'écran allumé pendant le jeu
let wakeLock = null;
async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (_) {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') keepAwake();
});

// Passe en plein écran au premier contact (cache les barres sur Android)
let triedFullscreen = false;
function goFullscreen() {
  if (triedFullscreen) return;
  triedFullscreen = true;
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  }
}

// Accord groupé : rassemble tous les doigts posés presque en même temps
let chordTimer = null;
function scheduleChord() {
  if (chordTimer) return;
  chordTimer = setTimeout(() => {
    chordTimer = null;
    const ys = [];
    for (const f of fingers.values()) {
      if (f.lastY != null) ys.push(f.lastY);
    }
    if (ys.length) playChord(ys);
  }, 70); // fenêtre pour regrouper les doigts posés presque ensemble
}

function onDown(e) {
  ensureAudio();
  keepAwake();
  goFullscreen();
  hideHint();
  buzz(12);
  const popped = popBubbleAt(e.clientX, e.clientY);
  spawn(e.clientX, e.clientY, e.pointerId);
  if (!popped) scheduleChord(); // sinon le "pop" de la bulle suffit
}

function onMove(e) {
  // getCoalescedEvents -> traînée fluide même si le doigt bouge vite
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of events) {
    popBubbleAt(ev.clientX, ev.clientY); // un doigt qui glisse éclate les bulles
    spawn(ev.clientX, ev.clientY, e.pointerId);
  }
  playBlip(e.clientY);
}

function onUp(e) {
  fingers.delete(e.pointerId);
}

canvas.addEventListener('pointerdown', onDown);
canvas.addEventListener('pointermove', onMove);
canvas.addEventListener('pointerup', onUp);
canvas.addEventListener('pointercancel', onUp);

// Bloque les gestes gênants pour un enfant (menu contextuel, double-tap zoom…)
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// --- Service worker (mode hors-ligne / PWA) -----------------------------------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
