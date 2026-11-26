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
 * LIVE QUIZ (Denkrace) — spelstatus staat in CacheService (snel) met een
 * kopie in ScriptProperties (als vangnet). Resultaten gaan naar de
 * tabbladen "Live antwoorden" en "Live eindstand".
 * ===================================================================== */
const Q_MS = 60000, LIVE_TTL = 21600, MAX_PLAYERS = 80, ONLINE_MS = 12000;

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
function getG_(code) {
  code = String(code || '').replace(/\D/g, '');
  if (!code) return null;
  let s = cache_().get('g:' + code);
  if (!s) {
    s = PropertiesService.getScriptProperties().getProperty('g:' + code);
    if (s) cache_().put('g:' + code, s, LIVE_TTL);
  }
  return s ? JSON.parse(s) : null;
}
function putG_(g) {
  const s = JSON.stringify(g);
  cache_().put('g:' + g.code, s, LIVE_TTL);
  PropertiesService.getScriptProperties().setProperty('g:' + g.code, s);
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

function liveCreate_(p, now) {
  if ((p.admin || '') !== CODE) return json_({ error: 'code' });
  const qs = String(p.qs || '').split(',').filter(x => /^\d{1,2}[a-d]$/.test(x)).slice(0, 96);
  const key = String(p.key || '').replace(/[^0-3]/g, '');
  if (!qs.length || key.length !== qs.length) return json_({ error: 'qs' });
  return withLock_(() => {
    const props = PropertiesService.getScriptProperties(), all = props.getProperties();
    Object.keys(all).forEach(k => {                       // oude spellen opruimen
      if (k.indexOf('g:') !== 0) return;
      try { if (now - JSON.parse(all[k]).t > 12 * 3600e3) props.deleteProperty(k); } catch (e) { props.deleteProperty(k); }
    });
    let code;
    do { code = String(100000 + Math.floor(Math.random() * 900000)); } while (getG_(code));
    const g = { code, hk: rid_(16), t: now, qs, key, qi: -1, st: 'lobby', el: 0, run: null, ro: {}, order: [], rv: null };
    putG_(g);
    return json_({ code, hostKey: g.hk });
  });
}

function liveJoin_(p, now) {
  const name = String(p.name || '').replace(/\s+/g, ' ').trim().slice(0, 20);
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
        g.ro[pid] = { n: name, s: 0, c: 0, st: 0 };
        g.order.push(pid);
        putG_(g);
      }
    }
    cache_().put(seenKey_(g, pid), String(now), LIVE_TTL);
    return json_({ pid, name: g.ro[pid].n });
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
  const ms = elapsed_(g, now);
  if (ms > Q_MS + 1500) return json_({ ok: false, reason: 'late' });
  const c = cache_(), ak = ansKey_(g, qi, pid);
  if (!c.get(ak)) c.put(ak, JSON.stringify({ k, ms: Math.min(ms, Q_MS) }), LIVE_TTL);
  c.put(seenKey_(g, pid), String(now), LIVE_TTL);
  return json_({ ok: true });
}

function livePoll_(p, now) {
  const g = getG_(p.code);
  if (!g) return json_({ st: 'nogame' });
  const pid = String(p.pid || ''), me = g.ro[pid];
  if (!me) return json_({ st: 'noplayer' });
  const c = cache_();
  c.put(seenKey_(g, pid), String(now), LIVE_TTL);
  const out = { st: g.st, qi: g.qi, n: g.qs.length, qid: g.qs[g.qi] || null,
    me: { name: me.n, score: me.s, streak: me.st, correct: me.c, rank: ranking_(g).indexOf(pid) + 1, of: g.order.length } };
  if (g.st === 'q') {
    out.left = Math.max(0, Q_MS - elapsed_(g, now));
    out.paused = !g.run;
    out.answered = !!c.get(ansKey_(g, g.qi, pid));
  }
  if (g.rv && g.rv.qi === g.qi && (g.st === 'rv' || g.st === 'end')) {
    out.res = g.rv.res[pid] || null;
    out.correctK = Number(g.key[g.qi]);
  }
  if (g.st === 'end') out.top = ranking_(g).slice(0, 3).map(id => ({ name: g.ro[id].n, score: g.ro[id].s }));
  return json_(out);
}

function liveHost_(p, now) {
  return withLock_(() => {
    const g = getG_(p.code);
    if (!g) return json_({ error: 'nogame' });
    if (p.key !== g.hk) return json_({ error: 'key' });
    const cmd = p.cmd || 'state';
    let changed = false;
    if (cmd === 'start' && g.st === 'lobby' && g.order.length) { startQ_(g, 0, now); changed = true; }
    else if (cmd === 'pause' && g.st === 'q' && g.run) { g.el = elapsed_(g, now); g.run = null; changed = true; }
    else if (cmd === 'resume' && g.st === 'q' && !g.run) { g.run = now; changed = true; }
    else if (cmd === 'skip' && g.st === 'q') { finishQ_(g, now); changed = true; }
    else if (cmd === 'next' && g.st === 'rv') {
      if (g.qi + 1 < g.qs.length) startQ_(g, g.qi + 1, now); else endGame_(g, now);
      changed = true;
    }
    else if (cmd === 'end' && g.st !== 'end') { if (g.st === 'q') finishQ_(g, now); endGame_(g, now); changed = true; }
    else if (cmd === 'kick' && g.st === 'lobby' && g.ro[p.pid]) {
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
      if (elapsed_(g, now) >= Q_MS || (active.length && active.every(hasAns))) { finishQ_(g, now); changed = true; }
    }
    if (changed) putG_(g);

    const rv = g.rv && g.rv.qi === g.qi ? g.rv : null;
    const out = { st: g.st, qi: g.qi, n: g.qs.length, qid: g.qs[g.qi] || null, code: g.code,
      players: ranking_(g).map((id, i) => ({ pid: id, name: g.ro[id].n, score: g.ro[id].s, correct: g.ro[id].c,
        rank: i + 1, online: online(id), answered: g.st === 'q' && hasAns(id), gain: rv && rv.res[id] ? rv.res[id].p : 0 })) };
    if (g.st === 'q') { out.left = Math.max(0, Q_MS - elapsed_(g, now)); out.paused = !g.run; }
    if (rv) { out.counts = rv.counts; out.correctK = Number(g.key[g.qi]); }
    return json_(out);
  });
}

function startQ_(g, qi, now) { g.qi = qi; g.st = 'q'; g.el = 0; g.run = now; g.rv = null; }

function finishQ_(g, now) {
  g.el = Math.min(Q_MS, elapsed_(g, now)); g.run = null;
  const c = cache_(), keys = g.order.map(id => ansKey_(g, g.qi, id));
  const got = keys.length ? c.getAll(keys) : {};
  const correct = Number(g.key[g.qi]), counts = [0, 0, 0, 0], res = {}, rows = [];
  g.order.forEach((id, i) => {
    const raw = got[keys[i]], a = raw ? JSON.parse(raw) : null, pl = g.ro[id];
    let pts = 0, ok = false;
    if (a) { counts[a.k]++; ok = a.k === correct; if (ok) pts = Math.round(1000 * (1 - a.ms / Q_MS / 2)); }
    pl.s += pts;
    if (ok) { pl.c++; pl.st++; } else pl.st = 0;
    res[id] = { k: a ? a.k : null, p: pts, ok, ms: a ? a.ms : null };
    rows.push([new Date(now), g.code, safe_(pl.n, 20), g.qi + 1, g.qs[g.qi], a ? 'ABCD'[a.k] : '',
      ok ? 'ja' : 'nee', a ? Math.round(a.ms / 100) / 10 : '', pts, pl.s]);
  });
  g.rv = { qi: g.qi, counts, res };
  g.st = 'rv';
  liveSheet_('Live antwoorden',
    ['Datum', 'Spelcode', 'Naam', 'Vraagnummer', 'Vraag', 'Antwoord (letter uit PDF)', 'Goed', 'Tijd (s)', 'Punten', 'Totaal'], rows);
}

function endGame_(g, now) {
  g.st = 'end'; g.run = null;
  const played = g.rv ? g.rv.qi + 1 : 0;
  liveSheet_('Live eindstand', ['Datum', 'Spelcode', 'Plek', 'Naam', 'Punten', 'Aantal goed', 'Aantal vragen'],
    ranking_(g).map((id, i) => [new Date(now), g.code, i + 1, safe_(g.ro[id].n, 20), g.ro[id].s, g.ro[id].c, played]));
}

function liveSheet_(name, head, rows) {
  if (!rows.length) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(head); sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
  }
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, head.length).setValues(rows);
}
