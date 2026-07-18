// ---------------------------------------------------------------------------
// Lumière magique — un glow coloré qui suit le doigt, avec une traînée joyeuse
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
      decay: 0.012 + Math.random() * 0.01,
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

// --- Boucle de rendu ----------------------------------------------------------

function frame() {
  // Estompage progressif du fond -> laisse une traînée qui s'efface en douceur
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(5, 5, 16, 0.16)';
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

// --- Entrées tactiles (pointer events = souris + tactile + stylet) ------------

let hintHidden = false;
function hideHint() {
  if (hintHidden) return;
  hintHidden = true;
  hint.classList.add('hidden');
}

function onDown(e) {
  ensureAudio();
  hideHint();
  spawn(e.clientX, e.clientY, e.pointerId);
  playBlip(e.clientY);
}

function onMove(e) {
  // getCoalescedEvents -> traînée fluide même si le doigt bouge vite
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of events) {
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
