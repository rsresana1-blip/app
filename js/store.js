// Archiviazione: modalità demo (browser) oppure API Google Apps Script.
import { T, seeds } from './schema.js';

export const CFG = window.SCOUT_CONFIG || {};
export const DEMO = !CFG.API_URL;

const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* niente */ } },
};
export { LS };

export const S = { data: {}, user: null, anno: null, token: null, online: true, cal: [], calLoaded: false };
for (const t of Object.keys(T)) S.data[t] = [];

const AUDIT = ['id', 'creato_da', 'creato_il', 'modificato_da', 'modificato_il'];
export const uid = (t) => t.slice(0, 3) + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const today = () => { const n = new Date(); return new Date(n - n.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const nowStamp = () => { const n = new Date(); return new Date(n - n.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };

// ---- conversione riga <-> testo (nei fogli tutto è testo) ----
function ser(table, row) {
  const out = {};
  for (const k of AUDIT) out[k] = row[k] == null ? '' : String(row[k]);
  if (T[table].year) out.anno_id = row.anno_id || '';
  for (const f of T[table].fields) {
    const v = row[f.k];
    if (v == null || v === '' || v === false) out[f.k] = '';
    else if (Array.isArray(v)) out[f.k] = v.join('|');
    else if (v === true) out[f.k] = '1';
    else out[f.k] = String(v);
  }
  return out;
}
function de(table, raw) {
  const def = T[table]; if (!def) return raw;
  const row = {};
  for (const k of AUDIT) row[k] = raw[k] || '';
  if (def.year) row.anno_id = raw.anno_id || '';
  for (const f of def.fields) {
    const v = raw[f.k];
    if (f.t === 'multi' || f.t === 'mref') row[f.k] = Array.isArray(v) ? v : (v ? String(v).split('|').filter(Boolean) : []);
    else if (f.t === 'bool') row[f.k] = v === true || v === '1' || v === 'true';
    else if (f.t === 'num' || f.t === 'money') row[f.k] = v === '' || v == null ? '' : Number(String(v).replace(',', '.'));
    else row[f.k] = v == null ? '' : String(v);
  }
  return row;
}

// ---- API ----
async function api(action, payload = {}) {
  let res;
  try {
    res = await fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: S.token, ...payload }) });
  } catch (e) { S.online = false; throw new Error('Nessuna connessione: riprova quando sei online.'); }
  S.online = true;
  let j;
  try { j = await res.json(); } catch (e) { throw new Error('Risposta non valida dal server. Controlla API_URL e la pubblicazione della web app.'); }
  if (!j.ok) {
    if (j.error === 'AUTH') { LS.del('scout_token'); S.token = null; S.user = null; location.reload(); }
    throw new Error(j.error || 'Errore');
  }
  return j;
}

function persist() {
  if (DEMO) { if (!LS.set('scout_demo', S.data)) console.warn('Spazio del browser esaurito'); }
  else LS.set('scout_cache', S.data);
}
function load(tables) {
  for (const t of Object.keys(T)) S.data[t] = (tables[t] || []).filter((r) => r.id).map((r) => de(t, r));
}

async function seedIfEmpty() {
  if (S.data.anni.length) return;
  const sd = seeds();
  for (const [t, rows] of Object.entries(sd)) {
    const have = new Set(S.data[t].map((r) => r.id));
    const full = rows.filter((r) => !have.has(r.id)).map((r) => stamp(t, { ...r }, true));
    if (!full.length) continue;
    if (DEMO) S.data[t].push(...full.map((r) => de(t, ser(t, r))));
    else { const j = await api('upsert', { table: t, rows: full.map((r) => ser(t, r)) }); S.data[t].push(...j.rows.map((r) => de(t, r))); }
  }
  persist();
}
function stamp(table, row, isNew) {
  const who = S.user?.nome || 'Sistema';
  if (isNew) { row.id = row.id || uid(table); row.creato_da = who; row.creato_il = nowStamp(); }
  row.modificato_da = who; row.modificato_il = nowStamp();
  return row;
}

// ---- Avvio e accesso ----
export async function boot() {
  if (DEMO) {
    const d = LS.get('scout_demo', null);
    if (d) load(d);
    const pid = LS.get('scout_profile', null);
    S.user = S.data.capi.find((c) => c.id === pid) || null;
    if (S.user) await seedIfEmpty();
    pickYear();
    return !!S.user;
  }
  S.token = LS.get('scout_token', null);
  if (!S.token) return false;
  const cache = LS.get('scout_cache', null);
  if (cache) load(cache);
  try { await sync(); } catch (e) {
    if (!S.token) return false;
    S.user = LS.get('scout_user', null);
    if (!S.user || !cache) throw e;
  }
  pickYear();
  return !!S.user;
}
export async function sync() {
  if (DEMO) return;
  const j = await api('getAll');
  load(j.tables); S.user = de('capi', j.user); LS.set('scout_user', S.user);
  await seedIfEmpty(); persist();
}
function pickYear() {
  const saved = LS.get('scout_anno', null);
  const t = today();
  const cur = S.data.anni.find((a) => a.id === saved) || S.data.anni.find((a) => a.inizio && a.fine && a.inizio <= t && t <= a.fine)
    || [...S.data.anni].sort((a, b) => (b.inizio || '').localeCompare(a.inizio || ''))[0];
  S.anno = cur ? cur.id : null;
}
export function setYear(id) { S.anno = id; LS.set('scout_anno', id); }

export async function loginDemo(capoId, nuovoNome) {
  if (!capoId) {
    const c = stamp('capi', { nome: nuovoNome }, true);
    c.creato_da = c.modificato_da = nuovoNome;
    S.data.capi.push(de('capi', ser('capi', c))); capoId = c.id;
  }
  LS.set('scout_profile', capoId); persist();
}
export async function loginGoogle(idToken) { const j = await api('login', { idToken }); S.token = j.token; LS.set('scout_token', j.token); }
export async function listProfiles(codice) { return (await api('profili', { codice })).capi; }
export async function loginCode(codice, capoId, nuovoNome) { const j = await api('login', { codice, capoId, nuovoNome }); S.token = j.token; LS.set('scout_token', j.token); }
export function logout() {
  if (!DEMO && S.token) api('logout').catch(() => {});
  LS.del('scout_token'); LS.del('scout_profile'); LS.del('scout_user'); LS.del('scout_cache'); location.hash = ''; location.reload();
}

// ---- Lettura ----
export const all = (t) => S.data[t] || [];
export const get = (t, id) => (id ? all(t).find((r) => r.id === id) : null);
export const ofYear = (t) => (T[t].year ? all(t).filter((r) => !r.anno_id || r.anno_id === S.anno) : all(t));
export const ctx = { get user() { return S.user; }, get anno() { return S.anno; },
  name(t, id) { const r = get(t, id); return r ? T[t].title(r, ctx) : ''; } };

// ---- Scrittura ----
export async function save(table, row) {
  const isNew = !row.id || !get(table, row.id);
  if (T[table].year && !row.anno_id) row.anno_id = S.anno || '';
  stamp(table, row, isNew);
  let saved;
  if (DEMO) saved = de(table, ser(table, row));
  else { const j = await api('upsert', { table, rows: [ser(table, row)] }); saved = de(table, j.rows[0]); }
  const list = S.data[table]; const i = list.findIndex((r) => r.id === saved.id);
  if (i >= 0) list[i] = saved; else list.push(saved);
  if (table === 'capi' && S.user && saved.id === S.user.id) S.user = saved;
  persist();
  return saved;
}
export async function remove(table, id) {
  if (!DEMO) await api('remove', { table, id });
  S.data[table] = S.data[table].filter((r) => r.id !== id);
  persist();
}

// ---- File (foto scontrini, PDF) ----
function readAsDataURL(blob) { return new Promise((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = ko; fr.readAsDataURL(blob); }); }
async function shrink(file, max = 1400) {
  if (!file.type.startsWith('image/')) return file;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.8));
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch (e) { return file; }
}
export async function upload(file, folder) {
  const f = await shrink(file, DEMO ? 900 : 1400);
  const dataUrl = await readAsDataURL(f);
  if (DEMO) {
    if (dataUrl.length > 1.5e6) throw new Error('In modalità demo i file devono essere piccoli (meno di 1 MB). Con Google Drive collegato questo limite non c\'è.');
    return dataUrl;
  }
  if (dataUrl.length > 25e6) throw new Error('File troppo grande (massimo circa 18 MB).');
  const anno = get('anni', S.anno)?.nome || '';
  const j = await api('upload', { name: f.name, mime: f.type, data: dataUrl.split(',')[1], folder: [folder || 'File', anno].filter(Boolean).join('/') });
  return j.url;
}

// ---- Google Calendar ----
export async function calLoad(force) {
  if (DEMO || (S.calLoaded && !force)) return;
  const a = new Date(); a.setMonth(a.getMonth() - 2); const b = new Date(); b.setMonth(b.getMonth() + 14);
  const j = await api('calList', { from: a.toISOString().slice(0, 10), to: b.toISOString().slice(0, 10) });
  S.cal = j.events; S.calLoaded = true;
}
export async function calPush(ev) {
  if (DEMO) return ev;
  const descr = [ev.note, [ev.livello && 'Livello: ' + ev.livello, ev.destinatari?.length && 'Per: ' + ev.destinatari.join(', ')].filter(Boolean).join(' · ')].filter(Boolean).join('\n\n');
  const j = await api('calUpsert', { gcalId: ev.gcal_id, oldCal: ev.gcal_cal, cal: ev.visibile_ragazzi ? 'ragazzi' : 'capi', title: ev.titolo,
    start: ev.inizio, end: ev.fine || '', allDay: !!ev.tutto_il_giorno, location: ev.luogo || '', description: descr });
  S.calLoaded = false;
  if (j.gcalId !== ev.gcal_id || j.cal !== ev.gcal_cal) return save('eventi', { ...ev, gcal_id: j.gcalId, gcal_cal: j.cal });
  return ev;
}
export async function calDrop(ev) { if (!DEMO && ev.gcal_id) { await api('calDelete', { gcalId: ev.gcal_id, cal: ev.gcal_cal }); S.calLoaded = false; } }

// ---- Backup ----
export const exportAll = () => JSON.parse(JSON.stringify(S.data));
export async function importAll(obj) {
  if (!DEMO) throw new Error('L\'importazione è disponibile solo in modalità demo.');
  load(Object.fromEntries(Object.keys(T).map((t) => [t, (obj[t] || []).map((r) => ser(t, r))])));
  persist();
}
