/**
 * Redeneertest groep 8 — opslag in Google Sheets.
 *
 * Installeren:
 * 1. Maak een nieuwe Google Sheet.
 * 2. Menu Extensies → Apps Script. Vervang alle code door dit bestand.
 * 3. Verander CODE hieronder in je eigen geheime code (voor de overzichtspagina).
 * 4. Implementeren → Nieuwe implementatie → type "Web-app".
 *    Uitvoeren als: Ik.  Wie heeft toegang: Iedereen.
 * 5. Kopieer de web-app-URL (eindigt op /exec).
 */
const CODE = 'geheim';

const HEAD = ['Sessie', 'Naam', 'Gestart', 'Laatst bijgewerkt', 'Klaar', 'Aantal goed (van 96)', 'Beantwoord',
  'Woordverbanden', 'Getalpatronen', 'Logisch denken', 'Figuren en ruimte'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Resultaten') || ss.insertSheet('Resultaten');
  if (sh.getLastRow() === 0) {
    const ids = [];
    for (let i = 1; i <= 24; i++) for (const l of 'abcd') ids.push(i + l);
    sh.appendRow(HEAD.concat(ids));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEAD.length + ids.length).setFontWeight('bold');
  }
  return sh;
}

/* Tekst nooit als formule laten uitvoeren in de Sheet. */
function safe_(s, max) {
  s = String(s == null ? '' : s).slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const d = JSON.parse(e.postData.contents);
    const sh = sheet_();
    const ids = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].slice(HEAD.length);
    const answers = d.answers || {};
    const parts = Array.isArray(d.parts) ? d.parts : [0, 0, 0, 0];
    const row = [
      safe_(d.sid, 60), safe_(d.name, 60),
      d.started ? new Date(d.started) : '', new Date(),
      d.done ? 'ja' : 'nee', Number(d.score) || 0, Number(d.answered) || 0,
    ].concat(parts.slice(0, 4).map(n => Number(n) || 0))
     .concat(ids.map(id => { const v = answers[id]; return v === 0 || v === 1 || v === 2 || v === 3 ? 'ABCD'[v] : ''; }));

    const n = sh.getLastRow();
    let r = -1;
    if (n > 1) {
      const sids = sh.getRange(2, 1, n - 1, 1).getValues();
      for (let i = 0; i < sids.length; i++) if (String(sids[i][0]) === row[0]) { r = i + 2; break; }
    }
    if (r > 0) sh.getRange(r, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  if (e.parameter.api === 'live') return live_(e.parameter);
  if ((e.parameter.code || '') !== CODE) return json_({ error: 'code' });
  const values = sheet_().getDataRange().getValues();
  const head = values.shift();
  const ids = head.slice(HEAD.length);
  const rows = values.map(r => {
    const answers = {};
    ids.forEach((id, k) => {
      const letter = String(r[HEAD.length + k] || '');
      const v = letter.length === 1 ? 'ABCD'.indexOf(letter) : -1;  // leeg vakje = niet beantwoord
      if (v >= 0) answers[id] = v;
    });
    return { sid: r[0], name: String(r[1]), started: r[2], updated: r[3], done: r[4] === 'ja', answers };
  });
  return json_({ rows });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}


/* =====================================================================
 * LIVE QUIZ (Denkrace)
 * - Spelstatus: CacheService (snel) + kopie in ScriptProperties (vangnet,
 *   in stukjes van 8 kB opgeslagen).
 * - Antwoorden: CacheService + kopie in ScriptProperties.
 * - Wegschrijven naar de Sheet gebeurt via een wachtrij, zodat het spel
 *   daar niet op hoeft te wachten. Tabbladen: "Live antwoorden" en
 *   "Live eindstand".
 * ===================================================================== */
const Q_MS = 60000, LIVE_TTL = 21600, MAX_PLAYERS = 80, ONLINE_MS = 15000;
const GAME_MAX_AGE = 12 * 3600e3, CHUNK = 8000, AVATARS_N = 32;
const PART_NAMES_ = ['Woordverbanden', 'Getalpatronen', 'Logisch denken', 'Figuren en ruimte'];

function live_(p) {
  const now = Date.now();
  try {
    switch (p.action) {
      case 'create': return liveCreate_(p, now);
      case 'join':   return liveJoin_(p, now);
      case 'poll':   return livePoll_(p, now);
      case 'answer': return liveAnswer_(p, now);
      case 'host':   return liveHost_(p, now);
    }
    return json_({ error: 'action' });
  } catch (err) {
    return json_({ error: 'server', message: String((err && err.message) || err) });
  }
}

function cache_() { return CacheService.getScriptCache(); }
function props_() { return PropertiesService.getScriptProperties(); }

function getG_(code) {
  code = String(code || '').replace(/\D/g, '');
  if (!code) return null;
  let s = cache_().get('g:' + code);
  if (!s) {
    const pr = props_(), n = pr.getProperty('g:' + code);
    if (n && /^\d+$/.test(n)) {
      s = '';
      for (let i = 0; i < Number(n); i++) s += pr.getProperty('g:' + code + ':' + i) || '';
    } else s = n;                                  // oud formaat
    if (s) cache_().put('g:' + code, s, LIVE_TTL);
  }
  try { return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
function putG_(g) {
  const s = JSON.stringify(g), obj = {}, n = Math.ceil(s.length / CHUNK) || 1;
  cache_().put('g:' + g.code, s, LIVE_TTL);
  for (let i = 0; i < n; i++) obj['g:' + g.code + ':' + i] = s.slice(i * CHUNK, (i + 1) * CHUNK);
  obj['g:' + g.code] = String(n);
  props_().setProperties(obj, false);
}
function rid_(n) {
  const c = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = '';
  for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}
function withLock_(fn) {
  const l = LockService.getScriptLock(); l.waitLock(20000);
  try { return fn(); } finally { l.releaseLock(); }
}
function elapsed_(g, now) { return g.el + (g.run ? now - g.run : 0); }
function ranking_(g) {
  return g.order.slice().sort((a, b) => (g.ro[b].s - g.ro[a].s) || g.ro[a].n.localeCompare(g.ro[b].n));
}
function seenKey_(g, id) { return 's:' + g.code + ':' + id; }
function ansKey_(g, qi, id) { return 'a:' + g.code + ':' + qi + ':' + id; }
function partOf_(qid) { return Math.floor((parseInt(qid, 10) - 1) / 6); }

/* Per deel: "x van y" goed, op basis van de geschiedenis (1 goed, 0 fout, - geen antwoord) */
function perPart_(g, h) {
  const got = [0, 0, 0, 0], asked = [0, 0, 0, 0];
  for (let i = 0; i < h.length; i++) { const d = partOf_(g.qs[i]); asked[d]++; if (h[i] === '1') got[d]++; }
  return { got, asked };
}

/* ---------- wachtrij naar de Sheet ---------- */
function queue_(sheet, head, rows, del) {
  const base = 'q:' + Date.now() + ':' + rid_(4) + ':', obj = {};
  const n = Math.max(1, Math.ceil(rows.length / 25));
  for (let i = 0; i < n; i++) {
    obj[base + ('00' + i).slice(-3)] = JSON.stringify({ s: sheet, h: head, r: rows.slice(i * 25, i * 25 + 25), d: i === 0 ? (del || []) : [] });
  }
  props_().setProperties(obj, false);
  cache_().put('qpending', '1', LIVE_TTL);
}
function flush_(force) {
  if (!force && !cache_().get('qpending')) return;    // niets te doen: geen extra werk voor Google
  const lock = LockService.getDocumentLock() || LockService.getUserLock();
  if (!lock.tryLock(200)) return;                    // iemand anders is al bezig
  try {
    cache_().remove('qpending');
    const pr = props_(), all = pr.getProperties();
    Object.keys(all).filter(k => k.indexOf('q:') === 0).sort().forEach(k => {
      try {
        const it = JSON.parse(all[k]);
        if (it.r && it.r.length) liveSheet_(it.s, it.h, it.r.map(r => [new Date(r[0])].concat(r.slice(1))));
        (it.d || []).forEach(d => pr.deleteProperty(d));
      } catch (e) { /* kapot item: overslaan */ }
      pr.deleteProperty(k);
    });
  } finally { lock.releaseLock(); }
}
function liveSheet_(name, head, rows) {
  if (!rows.length) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0 || sh.getLastColumn() < head.length) {
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  sh.getRange(Math.max(sh.getLastRow(), 1) + 1, 1, rows.length, head.length).setValues(rows);
}

/* ---------- acties ---------- */
function liveCreate_(p, now) {
  if ((p.admin || '') !== CODE) return json_({ error: 'code' });
  const qs = String(p.qs || '').split(',').filter(x => /^\d{1,2}[a-d]$/.test(x)).slice(0, 96);
  const key = String(p.key || '').replace(/[^0-3]/g, '');
  if (!qs.length || key.length !== qs.length) return json_({ error: 'qs' });
  try { flush_(true); } catch (e) {}
  return withLock_(() => {
    const pr = props_(), all = pr.getProperties(), old = {};
    Object.keys(all).forEach(k => {                          // oude spellen opsporen
      const m = k.match(/^gt:(\d+)$/);
      if (m && now - Number(all[k]) > GAME_MAX_AGE) old[m[1]] = 1;
      if (/^g:\d+$/.test(k) && all[k].charAt(0) === '{') {   // oud formaat
        try { if (now - JSON.parse(all[k]).t > GAME_MAX_AGE) old[k.slice(2)] = 1; } catch (e) { old[k.slice(2)] = 1; }
      }
    });
    Object.keys(all).forEach(k => { const parts = k.split(':'); if (parts[0] !== 'q' && old[parts[1]]) pr.deleteProperty(k); });
    let code;
    do { code = String(100000 + Math.floor(Math.random() * 900000)); } while (getG_(code));
    const g = { code, hk: rid_(16), t: now, qs, key, qi: -1, st: 'lobby', el: 0, run: null, ro: {}, order: [], rv: null, bd: false };
    pr.setProperty('gt:' + code, String(now));
    putG_(g);
    return json_({ code, hostKey: g.hk });
  });
}

function liveJoin_(p, now) {
  const name = String(p.name || '').replace(/\s+/g, ' ').trim().slice(0, 20);
  const av = Math.max(0, Math.min(AVATARS_N - 1, Number(p.av) || 0));
  return withLock_(() => {
    const g = getG_(p.code);
    if (!g) return json_({ error: 'nogame' });
    let pid = String(p.pid || '');
    if (!g.ro[pid]) {
      if (!name) return json_({ error: 'name' });
      pid = g.order.find(id => g.ro[id].n.toLowerCase() === name.toLowerCase()) || '';
      if (pid) {                                          // zelfde naam: terugkeren, tenzij die speler nu actief is
        const seen = Number(cache_().get(seenKey_(g, pid)) || 0);
        if (now - seen < ONLINE_MS) return json_({ error: 'taken' });
      } else {
        if (g.st === 'end') return json_({ error: 'ended' });
        if (g.order.length >= MAX_PLAYERS) return json_({ error: 'full' });
        pid = rid_(10);
        g.ro[pid] = { n: name, s: 0, c: 0, st: 0, bs: 0, av, h: '-'.repeat(Math.max(0, g.st === 'lobby' ? 0 : (g.st === 'q' ? g.qi : g.qi + 1))) };
        g.order.push(pid);
        putG_(g);
      }
    }
    cache_().put(seenKey_(g, pid), String(now), LIVE_TTL);
    return json_({ pid, name: g.ro[pid].n, av: g.ro[pid].av || 0 });
  });
}

function liveAnswer_(p, now) {
  const g = getG_(p.code);
  if (!g) return json_({ error: 'nogame' });
  const pid = String(p.pid || ''), k = Number(p.k), qi = Number(p.qi);
  if (!g.ro[pid]) return json_({ error: 'player' });
  if (g.st !== 'q' || g.qi !== qi) return json_({ ok: false, reason: 'closed' });
  if (!g.run) return json_({ ok: false, reason: 'paused' });
  if (!(k >= 0 && k <= 3)) return json_({ error: 'k' });
  const el = elapsed_(g, now);
  if (el > Q_MS + 2000) return json_({ ok: false, reason: 'late' });
  // Reactietijd = tijd sinds de vraag op het scherm van de leerling stond (nooit meer dan de echte tijd).
  let ms = Number(p.rt);
  if (!(ms >= 0)) ms = el;
  ms = Math.min(ms, el, Q_MS);
  const c = cache_(), ak = ansKey_(g, qi, pid);
  if (!c.get(ak)) {
    const v = JSON.stringify({ k, ms: Math.round(ms) });
    c.put(ak, v, LIVE_TTL);
    try { props_().setProperty(ak, v); } catch (e) { /* vangnet mislukt: cache volstaat meestal */ }
  }
  c.put(seenKey_(g, pid), String(now), LIVE_TTL);
  return json_({ ok: true });
}

function pub_(g, id) { const r = g.ro[id]; return r ? { name: r.n, score: r.s, streak: r.st, av: r.av || 0 } : null; }

function livePoll_(p, now) {
  const g = getG_(p.code);
  if (!g) return json_({ st: 'nogame' });
  const pid = String(p.pid || ''), me = g.ro[pid];
  if (!me) return json_({ st: 'noplayer' });
  const c = cache_();
  c.put(seenKey_(g, pid), String(now), LIVE_TTL);
  const rk = ranking_(g), i = rk.indexOf(pid);
  const out = { st: g.st, qi: g.qi, n: g.qs.length, qid: g.qs[g.qi] || null,
    me: { name: me.n, av: me.av || 0, score: me.s, streak: me.st, best: me.bs || 0, correct: me.c, rank: i + 1, of: g.order.length } };
  if (g.st === 'q') {
    out.left = Math.max(0, Q_MS - elapsed_(g, now));
    out.paused = !g.run;
    out.answered = !!c.get(ansKey_(g, g.qi, pid));
  }
  if (g.rv && g.rv.qi === g.qi && (g.st === 'rv' || g.st === 'end')) {
    out.res = g.rv.res[pid] || null;
    out.correctK = Number(g.key[g.qi]);
    if (g.rv.res[pid]) out.me.prev = g.rv.res[pid].pr;
  }
  if (g.st === 'rv' && g.bd) {
    out.board = true;
    out.above = pub_(g, rk[i - 1]); out.above2 = pub_(g, rk[i - 2]); out.below = pub_(g, rk[i + 1]);
  }
  if (g.st === 'end') {
    out.top = rk.slice(0, 3).map(id => pub_(g, id));
    out.hist = me.h || '';
    out.qs = g.qs.slice(0, out.hist.length);
  }
  return json_(out);
}

function liveHost_(p, now) {
  let finishedNow = false;
  const res = withLock_(() => {
    const g = getG_(p.code);
    if (!g) return { error: 'nogame' };
    if (p.key !== g.hk) return { error: 'key' };
    const cmd = p.cmd || 'state';
    let changed = false;
    if (cmd === 'start' && g.st === 'lobby' && g.order.length) { startQ_(g, 0, now); changed = true; }
    else if (cmd === 'pause' && g.st === 'q' && g.run) { g.el = elapsed_(g, now); g.run = null; changed = true; }
    else if (cmd === 'resume' && g.st === 'q' && !g.run) { g.run = now; changed = true; }
    else if (cmd === 'skip' && g.st === 'q') { finishQ_(g, now); finishedNow = true; changed = true; }
    else if (cmd === 'board' && g.st === 'rv' && !g.bd) { g.bd = true; changed = true; }
    else if (cmd === 'next' && g.st === 'rv') {
      if (g.qi + 1 < g.qs.length) startQ_(g, g.qi + 1, now); else endGame_(g, now);
      changed = true;
    }
    else if (cmd === 'end' && g.st !== 'end') { if (g.st === 'q') finishQ_(g, now); endGame_(g, now); changed = true; }
    else if (cmd === 'kick' && g.ro[p.pid] && g.st !== 'end') {
      delete g.ro[p.pid]; g.order = g.order.filter(x => x !== p.pid); changed = true;
    }

    const c = cache_();
    const seen = g.order.length ? c.getAll(g.order.map(id => seenKey_(g, id))) : {};
    const online = id => now - Number(seen[seenKey_(g, id)] || 0) < ONLINE_MS;
    let ans = {};
    const hasAns = id => !!ans[ansKey_(g, g.qi, id)];
    if (g.st === 'q') {
      ans = g.order.length ? c.getAll(g.order.map(id => ansKey_(g, g.qi, id))) : {};
      const active = g.order.filter(online);
      if (elapsed_(g, now) >= Q_MS || (active.length && active.every(hasAns))) { finishQ_(g, now); finishedNow = true; changed = true; }
    }
    if (changed) putG_(g);

    const rv = g.rv && g.rv.qi === g.qi ? g.rv : null;
    const out = { st: g.st, qi: g.qi, n: g.qs.length, qid: g.qs[g.qi] || null, code: g.code, board: g.st === 'rv' && !!g.bd,
      players: ranking_(g).map((id, i) => {
        const r = g.ro[id], x = rv && rv.res[id];
        return { pid: id, name: r.n, av: r.av || 0, score: r.s, correct: r.c, rank: i + 1, online: online(id),
          answered: g.st === 'q' && hasAns(id), gain: x ? x.p : 0, streak: r.st || 0, best: r.bs || 0,
          prev: x ? x.pr : null, ok: !!(x && x.ok), ms: x ? x.ms : null, hist: g.st === 'end' ? (r.h || '') : undefined };
      }) };
    if (g.st === 'q') { out.left = Math.max(0, Q_MS - elapsed_(g, now)); out.paused = !g.run; }
    if (rv) { out.counts = rv.counts; out.correctK = Number(g.key[g.qi]); }
    if (g.st === 'end') out.qs = g.qs;
    return out;
  });
  const body = json_(res);
  // Wachtrij wegschrijven als het spel er niet op hoeft te wachten (of bij het einde, want dan stopt de beheerder met vragen).
  if (!res.error && (!finishedNow || res.st === 'end')) { try { flush_(); } catch (e) {} }
  return body;
}

function startQ_(g, qi, now) { g.qi = qi; g.st = 'q'; g.el = 0; g.run = now; g.rv = null; g.bd = false; }

function finishQ_(g, now) {
  g.el = Math.min(Q_MS, elapsed_(g, now)); g.run = null;
  const c = cache_(), keys = g.order.map(id => ansKey_(g, g.qi, id));
  const got = keys.length ? c.getAll(keys) : {};
  if (keys.some(k => !got[k])) {                         // vangnet: ontbrekende antwoorden uit ScriptProperties
    const all = props_().getProperties();
    keys.forEach(k => { if (!got[k] && all[k]) got[k] = all[k]; });
  }
  const correct = Number(g.key[g.qi]), counts = [0, 0, 0, 0], res = {}, rows = [];
  const before = {};
  if (g.qi > 0) ranking_(g).forEach((id, i) => { before[id] = i + 1; });
  g.order.forEach((id, i) => {
    let a = null; try { a = got[keys[i]] ? JSON.parse(got[keys[i]]) : null; } catch (e) {}
    const pl = g.ro[id];
    let pts = 0, ok = false;
    if (a) { counts[a.k]++; ok = a.k === correct; if (ok) pts = Math.round(1000 * (1 - a.ms / Q_MS / 2)); }
    pl.s += pts;
    if (ok) { pl.c++; pl.st++; } else pl.st = 0;
    pl.bs = Math.max(pl.bs || 0, pl.st);
    pl.h = (pl.h || '').padEnd(g.qi, '-').slice(0, g.qi) + (a ? (ok ? '1' : '0') : '-');
    res[id] = { k: a ? a.k : null, p: pts, ok, ms: a ? a.ms : null, pr: before[id] || null };
    rows.push([now, g.code, safe_(pl.n, 20), g.qi + 1, g.qs[g.qi], a ? 'ABCD'[a.k] : '',
      ok ? 'ja' : 'nee', a ? Math.round(a.ms / 100) / 10 : '', pts, pl.s]);
  });
  g.rv = { qi: g.qi, counts, res };
  g.st = 'rv';
  queue_('Live antwoorden',
    ['Datum', 'Spelcode', 'Naam', 'Vraagnummer', 'Vraag', 'Antwoord (letter uit PDF)', 'Goed', 'Tijd (s)', 'Punten', 'Totaal'], rows, keys);
}

function endGame_(g, now) {
  g.st = 'end'; g.run = null;
  const played = g.rv ? g.rv.qi + 1 : 0;
  const head = ['Datum', 'Spelcode', 'Plek', 'Naam', 'Punten', 'Aantal goed', 'Aantal vragen', 'Langste reeks'].concat(PART_NAMES_);
  queue_('Live eindstand', head, ranking_(g).map((id, i) => {
    const r = g.ro[id], pp = perPart_(g, (r.h || '').slice(0, played));
    return [now, g.code, i + 1, safe_(r.n, 20), r.s, r.c, played, r.bs || 0]
      .concat(pp.asked.map((n, d) => n ? pp.got[d] + ' van ' + n : ''));
  }));
}
