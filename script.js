// ─── Config ───────────────────────────────────────────────────
const CONFIG = {
  focus:            25 * 60,
  shortRest:         5 * 60,
  longRest:         15 * 60,
  cyclesBeforeLong: 4,
};

const CIRCUMFERENCE = 603.2;

// ─── State ────────────────────────────────────────────────────
let phaseIndex     = 0; // pares = foco, ímpares = pausa
let timeLeft       = CONFIG.focus;
let totalTime      = CONFIG.focus;
let running        = false;
let interval       = null;
let totalPomodoros = 0;

// ─── Elements ─────────────────────────────────────────────────
const ringEl    = document.getElementById('ring');
const timeEl    = document.getElementById('time-display');
const badgeEl   = document.getElementById('phase-badge');
const btnStart  = document.getElementById('btn-start');
const dotsEl    = document.getElementById('cycles');
const totalEl   = document.getElementById('total-sessions');
const infoCycle = document.getElementById('info-cycle');
const infoTotal = document.getElementById('info-total');
const infoNext  = document.getElementById('info-next');
const ringWrap  = document.getElementById('ring-wrap');

// ─── Helpers ──────────────────────────────────────────────────
function pad(n) {
  return String(n).padStart(2, '0');
}

function fmt(s) {
  return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
}

function focusDone() {
  return Math.floor(phaseIndex / 2);
}

function isRestPhase() {
  return phaseIndex % 2 === 1;
}

function isLongRest() {
  const fd = focusDone();
return isRestPhase() && fd > 0 && fd % CONFIG.cyclesBeforeLong === 0;
}

function currentDuration() {
  if (!isRestPhase()) return CONFIG.focus;
  return isLongRest() ? CONFIG.longRest : CONFIG.shortRest;
}

function nextRestLabel() {
  const nextFocus = focusDone() + (isRestPhase() ? 0 : 1);
  return nextFocus > 0 && nextFocus % CONFIG.cyclesBeforeLong === 0
    ? '15 min'
    : '5 min';
}

// ─── UI Update ────────────────────────────────────────────────
function updateUI() {
  timeEl.textContent = fmt(timeLeft);

  const frac = totalTime > 0 ? timeLeft / totalTime : 1;
  ringEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - frac);

  // Body class + phase badge
  const body = document.body;
  body.classList.remove('rest', 'long-rest');
  badgeEl.classList.remove('focus', 'rest', 'long');

  if (!isRestPhase()) {
    badgeEl.textContent = 'Foco';
    badgeEl.classList.add('focus');
  } else if (isLongRest()) {
    badgeEl.textContent = 'Pausa longa';
    badgeEl.classList.add('long');
    body.classList.add('long-rest');
  } else {
    badgeEl.textContent = 'Pausa curta';
    badgeEl.classList.add('rest');
    body.classList.add('rest');
  }

  // Cycle dots
  const fd = focusDone();
  dotsEl.querySelectorAll('.cycle-dot').forEach(d => {
    const i = parseInt(d.dataset.i);
    d.classList.remove('done', 'active');
    if (i <= fd) {
      d.classList.add('done');
    } else if (i === fd + 1 && !isRestPhase()) {
      d.classList.add('active');
    }
  });

  // Info bar
  infoCycle.textContent = Math.min(fd + (isRestPhase() ? 0 : 1), 4) + '/4';
  infoTotal.textContent = totalPomodoros;
  totalEl.textContent   =
    totalPomodoros +
    ' sessão' + (totalPomodoros !== 1 ? 'ões' : '') +
    ' completa' + (totalPomodoros !== 1 ? 's' : '');
  infoNext.textContent  = isRestPhase() ? '—' : nextRestLabel();
}

// ─── Sound ────────────────────────────────────────────────────
function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch (e) {}
}

// ─── Phase end ────────────────────────────────────────────────
function onPhaseEnd() {
  playBeep();

  if (!isRestPhase()) totalPomodoros++;

  // Pulse animation
  ringWrap.classList.add('pulse');
  setTimeout(() => ringWrap.classList.remove('pulse'), 700);

  // Advance phase or reset after long rest
  if (isRestPhase() && isLongRest()) {
    phaseIndex++;
    if (focusDone() >= CONFIG.cyclesBeforeLong) phaseIndex = 0;
  } else {
    phaseIndex++;
  }

  totalTime = currentDuration();
  timeLeft  = totalTime;
  updateUI();
}

// ─── Timer ────────────────────────────────────────────────────
function tick() {
  timeLeft--;
  if (timeLeft <= 0) {
    timeLeft = 0;
    updateUI();
    clearInterval(interval);
    running = false;
    btnStart.textContent = 'Iniciar';
    onPhaseEnd();
    return;
  }
  updateUI();
}

function toggleTimer() {
  if (running) {
    clearInterval(interval);
    running = false;
    btnStart.textContent = 'Continuar';
  } else {
    running = true;
    btnStart.textContent = 'Pausar';
    interval = setInterval(tick, 1000);
  }
}

function resetTimer() {
  clearInterval(interval);
  running    = false;
  phaseIndex = 0;
  totalTime  = CONFIG.focus;
  timeLeft   = CONFIG.focus;
  btnStart.textContent = 'Iniciar';
  updateUI();
}

// ─── Init ─────────────────────────────────────────────────────
updateUI();
