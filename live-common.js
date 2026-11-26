/* Denkrace live — gedeelde hulpfuncties (heeft config.js en data.js nodig) */
const Q_MS = 60000;
const SYMS = ['▲', '●', '■', '★'];

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const $ = (id) => document.getElementById(id);

function findQ(qid) {
  const i = parseInt(qid, 10) - 1, j = 'abcd'.indexOf(String(qid).slice(-1));
  return { i, j, o: OPG[i], q: OPG[i] && OPG[i].qs[j] };
}

/* Vraag-tekst + figuur als HTML (inhoud komt uit data.js, niet van gebruikers) */
function questionHtml(q) {
  return `<div class="qtext">${q.q}${q.sub ? `<div class="q-sub">${q.sub}</div>` : ''}</div>${q.f ? `<div class="fig">${q.f}</div>` : ''}`;
}

/* Vaste, per speler willekeurige volgorde */
function shuffleFor(seed, n) {
  let s = 2166136261;
  for (const c of String(seed)) { s ^= c.charCodeAt(0); s = Math.imul(s, 16777619); }
  const rnd = () => { s = Math.imul(s ^ (s >>> 15), 2246822507); s = Math.imul(s ^ (s >>> 13), 3266489909); s ^= s >>> 16; return (s >>> 0) / 4294967296; };
  const a = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* Aanroep naar de Apps Script web-app (GET, met time-out) */
async function api(params, timeout = 10000) {
  const u = new URL(SHEET_URL);
  u.searchParams.set('api', 'live');
  Object.entries(params).forEach(([k, v]) => { if (v != null) u.searchParams.set(k, v); });
  u.searchParams.set('_', Date.now());
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(u, { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error('http ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

function store(key, val) {
  try {
    if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
    if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val));
  } catch (e) { return null; }
}

/* Aftellen dat tussen twee polls lokaal doorloopt */
function makeCountdown(onTick) {
  let deadline = 0, paused = false, frozen = Q_MS, timer = null;
  const tick = () => { const left = paused ? frozen : Math.max(0, deadline - performance.now()); onTick(left); };
  return {
    sync(left, isPaused) { paused = !!isPaused; frozen = left; deadline = performance.now() + left; tick(); if (!timer) timer = setInterval(tick, 200); },
    stop() { clearInterval(timer); timer = null; },
  };
}
function renderTimer(bar, secs, left) {
  bar.firstElementChild.style.width = (left / Q_MS * 100) + '%';
  bar.classList.toggle('low', left < 10000);
  secs.textContent = Math.ceil(left / 1000);
}

function confetti() {
  const box = document.createElement('div'); box.className = 'confetti';
  const cols = ['#e5484d', '#3e63dd', '#f5a524', '#12a594', '#f5c542', '#ffffff'];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = cols[i % cols.length];
    p.style.animationDuration = (2.5 + Math.random() * 2.5) + 's';
    p.style.animationDelay = Math.random() * 1.2 + 's';
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 7000);
}

function podiumHtml(top) {
  const slot = (p, n) => p ? `<div class="pod p${n}"><div class="nm">${esc(p.name)}</div><div class="pt">${p.score} punten</div><div class="block">${n}</div></div>` : `<div class="pod p${n}"></div>`;
  return `<div class="podium">${slot(top[1], 2)}${slot(top[0], 1)}${slot(top[2], 3)}</div>`;
}

function themeToggle() {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('redeneertest-g8-v1-theme', root.dataset.theme); } catch (e) {}
}
