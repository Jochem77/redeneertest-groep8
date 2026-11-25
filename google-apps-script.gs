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
const CODE = 'verander-mij';

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
  if ((e.parameter.code || '') !== CODE) return json_({ error: 'code' });
  const values = sheet_().getDataRange().getValues();
  const head = values.shift();
  const ids = head.slice(HEAD.length);
  const rows = values.map(r => {
    const answers = {};
    ids.forEach((id, k) => { const v = 'ABCD'.indexOf(r[HEAD.length + k]); if (v >= 0) answers[id] = v; });
    return { sid: r[0], name: String(r[1]), started: r[2], updated: r[3], done: r[4] === 'ja', answers };
  });
  return json_({ rows });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
