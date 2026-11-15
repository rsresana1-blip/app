// Componenti generici: elenco, scheda, modulo, stampa ed esportazione.
import { T, UNITA } from './schema.js';
import { S, all, get, ofYear, save, remove, upload, ctx, today } from './store.js';

export function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'value' || k === 'checked' || k === 'selected' || k === 'disabled') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) { if (c == null || c === false || c === '') continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return e;
}
export const fmtDate = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '');
export const fmtDT = (s) => (s ? fmtDate(s) + (s.length > 10 ? ' ' + s.slice(11, 16) : '') : '');
export const eur = (n) => (n === '' || n == null || isNaN(n) ? '' : '€ ' + Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
export const HOOKS = {};
let rerender = () => {};
export const setRerender = (fn) => { rerender = fn; };
export const refresh = () => rerender();

export function toast(msg, bad) {
  const t = h('div', { class: 'toast' + (bad ? ' bad' : ''), role: 'status' }, msg);
  document.body.append(t); setTimeout(() => t.remove(), bad ? 6000 : 2500);
}
export function modal(title, body, opts = {}) {
  const close = () => { ov.remove(); document.body.classList.remove('lock'); opts.onClose?.(); };
  const box = h('div', { class: 'modal' + (opts.small ? ' small' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('header', { class: 'modal-head' }, h('h2', {}, title), h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Chiudi', onclick: () => close() }, '✕')),
    h('div', { class: 'modal-body' }, body));
  const ov = h('div', { class: 'overlay', onclick: (e) => { if (e.target === ov && opts.small) close(); } }, box);
  document.body.append(ov); document.body.classList.add('lock');
  return { close, box };
}
export function confirmBox(text, yes = 'Elimina') {
  return new Promise((ok) => {
    const m = modal('Conferma', h('div', {}, h('p', {}, text), h('div', { class: 'row end' },
      h('button', { class: 'btn', type: 'button', onclick: () => { m.close(); ok(false); } }, 'Annulla'),
      h('button', { class: 'btn danger', type: 'button', onclick: () => { m.close(); ok(true); } }, yes))), { small: 1 });
  });
}

// ---- Valori ----
export function inUnita(val, filter) {
  if (!filter) return true;
  const a = Array.isArray(val) ? val : val ? [val] : [];
  if (!a.length) return true;
  return filter === 'Clan + Noviziato' ? a.includes('Clan') || a.includes('Noviziato') : a.includes(filter);
}
export function disp(table, f, row) {
  const v = row[f.k];
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '';
  switch (f.t) {
    case 'date': return fmtDate(v);
    case 'datetime': return fmtDT(v);
    case 'money': return eur(v);
    case 'bool': return v ? 'Sì' : '';
    case 'ref': return ctx.name(f.ref, v);
    case 'mref': return v.map((i) => ctx.name(f.ref, i)).filter(Boolean).join(', ');
    case 'multi': return v.join(', ');
    case 'sel': return f.ol ? f.ol[v] || v : v;
    case 'file': return String(v).startsWith('data:') ? '(file allegato)' : v;
    default: return String(v);
  }
}
function valueNode(table, f, row) {
  const v = row[f.k];
  if (f.t === 'url') return h('a', { href: v, target: '_blank', rel: 'noopener' }, v);
  if (f.t === 'file') {
    const img = String(v).startsWith('data:image');
    return h('a', { href: v, target: '_blank', rel: 'noopener', class: 'file-link', download: String(v).startsWith('data:') ? 'allegato' : null }, img ? h('img', { src: v, alt: 'Allegato', class: 'thumb' }) : '📎 Apri il file');
  }
  if (f.t === 'tel') return h('a', { href: 'tel:' + v }, v);
  if (f.t === 'email') return h('a', { href: 'mailto:' + v }, v);
  if (f.t === 'ref' && !T[f.ref].hidden && get(f.ref, v)) return h('a', { href: '#/t/' + f.ref + '/' + v }, disp(table, f, row));
  if (f.t === 'mref') return h('div', {}, v.map((i) => get(f.ref, i)).filter(Boolean).map((r) => h('a', { class: 'chip', href: '#/t/' + f.ref + '/' + r.id }, T[f.ref].title(r, ctx))));
  if (f.t === 'area') return h('div', { class: 'pre' }, v);
  return disp(table, f, row);
}
function optionsFor(table, f, values = {}) {
  if (f.t === 'sel' || f.t === 'multi') {
    const o = f.o.map((x) => [x, f.ol ? f.ol[x] : x]);
    return o;
  }
  if (f.t === 'ref' || f.t === 'mref') {
    let rows = T[f.ref].year && !f.allYears ? ofYear(f.ref) : all(f.ref);
    if (f.ref === 'capi') rows = rows.filter((r) => !r.disattivato);
    if (f.filter) rows = rows.filter((r) => f.filter(r, values));
    const sorted = [...rows].sort(T[f.ref].sort || (() => 0));
    return sorted.map((r) => [r.id, T[f.ref].title(r, ctx)]);
  }
  if (f.t === 'chi') {
    const n = {}; all(table).forEach((r) => { if (r[f.k]) n[r[f.k]] = (n[r[f.k]] || 0) + 1; });
    const capi = all('capi').filter((c) => !c.disattivato).map((c) => c.nome).sort((a, b) => (n[b] || 0) - (n[a] || 0) || a.localeCompare(b));
    const rag = all('ragazzi').filter((r) => r.stato === 'Attivo').map((r) => T.ragazzi.title(r));
    return [...capi.map((x) => [x, x, 'Capi']), ['Cassa', 'Cassa', 'Altro'], ...rag.map((x) => [x, x, 'Ragazzi'])];
  }
  return [];
}

// ---- Stampa ed Excel ----
export function printNode(title, node, sub) {
  const p = document.getElementById('print');
  p.replaceChildren(h('h1', {}, title), h('p', { class: 'print-meta' }, [sub, 'Stampato il ' + fmtDate(today())].filter(Boolean).join(' · ')), node);
  setTimeout(() => window.print(), 50);
}
export function tableNode(cols, rows) {
  return h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, cols.map((c) => h('th', {}, c)))),
    h('tbody', {}, rows.map((r) => h('tr', {}, cols.map((c) => h('td', { class: typeof r[c] === 'number' ? 'num' : '' }, typeof r[c] === 'number' ? eur(r[c]).replace('€ ', '') : r[c] ?? ''))))));
}
let xlsxP;
function loadXlsx() {
  return xlsxP || (xlsxP = new Promise((ok, ko) => { const s = h('script', { src: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js' }); s.onload = () => ok(window.XLSX); s.onerror = () => ko(new Error('Impossibile caricare il modulo Excel')); document.head.append(s); }));
}
export async function exportXlsx(name, sheets) {
  try {
    const X = await loadXlsx(); const wb = X.utils.book_new();
    for (const s of sheets) X.utils.book_append_sheet(wb, X.utils.json_to_sheet(s.rows.length ? s.rows : [{ '': '' }]), s.name.slice(0, 31).replace(/[\\/?*[\]:]/g, ' '));
    X.writeFile(wb, name.replace(/[\\/:*?"<>|]/g, ' ') + '.xlsx');
  } catch (e) { toast(e.message, 1); }
}
export function rowsForExport(table, rows) {
  const fs = T[table].fields.filter((f) => !f.hide);
  return rows.map((r) => {
    const o = {};
    for (const f of fs) o[f.l.replace(/ \(.*\)$/, '')] = f.t === 'money' || f.t === 'num' ? (r[f.k] === '' ? '' : Number(r[f.k])) : disp(table, f, r);
    o['Scritto da'] = r.creato_da || ''; o['Ultima modifica'] = [r.modificato_da, fmtDT(r.modificato_il)].filter(Boolean).join(' ');
    return o;
  });
}
export function exportBar(title, getRows, sub) {
  return h('div', { class: 'export' },
    h('button', { class: 'btn ghost', type: 'button', onclick: () => { const rows = getRows(); const cols = rows.length ? Object.keys(rows[0]).filter((c) => rows.some((r) => r[c] !== '' && r[c] != null)) : []; printNode(title, tableNode(cols, rows), sub?.()); } }, '🖨 PDF'),
    h('button', { class: 'btn ghost', type: 'button', onclick: () => exportXlsx(title, [{ name: title, rows: getRows() }]) }, '⬇ Excel'));
}

// ---- Modulo di inserimento ----
export function openForm(table, row = {}, opts = {}) {
  const def = T[table]; const isNew = !row.id;
  const vals = { ...(isNew ? def.defaults?.(ctx) || {} : {}), ...row };
  const inputs = {}; const pending = {};
  const build = (f) => {
    const id = 'f_' + f.k; let el; const v = vals[f.k];
    const common = { id, name: f.k, required: !!f.req };
    if (f.t === 'area') el = h('textarea', { ...common, rows: 4 }, v || '');
    else if (f.t === 'bool') el = h('input', { id, name: f.k, type: 'checkbox', checked: !!v });
    else if (f.t === 'sel' || f.t === 'ref' || f.t === 'chi') {
      const opts2 = optionsFor(table, f, vals);
      if (v && !opts2.some((o) => o[0] === v)) opts2.push([v, f.t === 'ref' ? ctx.name(f.ref, v) || v : v]);
      const groups = {}; opts2.forEach((o) => { (groups[o[2] || ''] = groups[o[2] || ''] || []).push(o); });
      el = h('select', common, h('option', { value: '' }, '—'), Object.entries(groups).map(([g, os]) => {
        const ops = os.map((o) => h('option', { value: o[0], selected: o[0] === v }, o[1]));
        return g ? h('optgroup', { label: g }, ops) : ops;
      }));
    } else if (f.t === 'multi' || f.t === 'mref') {
      const cur = new Set(v || []);
      el = h('div', { class: 'chips', id, role: 'group' }, optionsFor(table, f, vals).map((o) => h('label', { class: 'chip-check' }, h('input', { type: 'checkbox', value: o[0], checked: cur.has(o[0]) }), h('span', {}, o[1]))));
      if (!el.children.length) el.append(h('span', { class: 'muted' }, 'Nessuna voce disponibile'));
    } else if (f.t === 'file') {
      const info = h('span', { class: 'muted' }, v ? 'File già allegato' : '');
      const inp = h('input', { id, type: 'file', accept: 'image/*,application/pdf', onchange: () => { pending[f.k] = inp.files[0]; info.textContent = inp.files[0] ? inp.files[0].name : ''; } });
      el = h('div', { class: 'file' }, inp, info, v ? h('button', { class: 'link', type: 'button', onclick: () => { vals[f.k] = ''; info.textContent = 'Allegato rimosso'; } }, 'Rimuovi') : null);
    } else {
      const type = { date: 'date', datetime: 'datetime-local', num: 'number', money: 'number', url: 'url', tel: 'tel', email: 'email' }[f.t] || 'text';
      el = h('input', { ...common, type, value: v ?? '', step: f.t === 'money' ? '0.01' : null, inputmode: f.t === 'money' ? 'decimal' : null, placeholder: f.t === 'url' ? 'https://…' : null });
    }
    inputs[f.k] = { f, el };
    el.addEventListener('change', () => { Object.assign(vals, read()); const ch = HOOKS[table]?.onChange?.(f.k, vals); if (ch) { Object.assign(vals, ch); redraw(); } else if (f.t === 'sel' && def.fields.some((x) => x.filter)) redraw(); });
    return f.t === 'bool' ? h('label', { class: 'field check' }, el, h('span', {}, f.l)) : h('div', { class: 'field' }, h('label', { for: id }, f.l, f.req ? h('span', { class: 'req' }, ' *') : null), el);
  };
  const read = () => {
    const o = {};
    for (const { f, el } of Object.values(inputs)) {
      if (f.t === 'bool') o[f.k] = el.checked;
      else if (f.t === 'multi' || f.t === 'mref') o[f.k] = [...el.querySelectorAll('input:checked')].map((i) => i.value);
      else if (f.t === 'file') o[f.k] = vals[f.k] || '';
      else if (f.t === 'num' || f.t === 'money') o[f.k] = el.value === '' ? '' : Number(el.value);
      else o[f.k] = el.value.trim();
    }
    return o;
  };
  const fieldsBox = h('div', {});
  const redraw = () => {
    let sec = null; const nodes = [];
    for (const f of def.fields) {
      if (f.hide || opts.hide?.includes(f.k)) continue;
      if ((f.sec || null) !== sec) { sec = f.sec || null; if (sec) nodes.push(h('h3', { class: 'form-sec' }, sec)); }
      nodes.push(build(f));
    }
    fieldsBox.replaceChildren(...nodes);
  };
  redraw();
  const err = h('p', { class: 'error', role: 'alert' });
  const btn = h('button', { class: 'btn primary', type: 'submit' }, 'Salva');
  const form = h('form', { novalidate: true, onsubmit: async (e) => {
    e.preventDefault(); err.textContent = '';
    const data = { ...vals, ...read() };
    const miss = def.fields.filter((f) => f.req && !f.hide && (data[f.k] === '' || data[f.k] == null));
    if (miss.length) { err.textContent = 'Manca: ' + miss.map((f) => f.l.replace(/ \(.*\)$/, '')).join(', '); return; }
    btn.disabled = true; btn.textContent = 'Salvo…';
    try {
      for (const [k, file] of Object.entries(pending)) if (file) data[k] = await upload(file, def.fields.find((f) => f.k === k).folder);
      let saved = await save(table, data);
      if (HOOKS[table]?.afterSave) saved = (await HOOKS[table].afterSave(saved)) || saved;
      m.close(); toast('Salvato'); opts.onSaved?.(saved); refresh();
    } catch (ex) { err.textContent = ex.message; btn.disabled = false; btn.textContent = 'Salva'; }
  } },
  def.hint ? h('p', { class: 'hint' }, def.hint) : null, fieldsBox, err,
  h('div', { class: 'row end sticky' }, h('button', { class: 'btn', type: 'button', onclick: () => m.close() }, 'Annulla'), btn));
  const m = modal((isNew ? 'Nuovo: ' : 'Modifica: ') + def.sing, form);
  return m;
}
export async function del(table, row, after) {
  if (!(await confirmBox('Eliminare "' + T[table].title(row, ctx) + '"? L\'operazione non si può annullare.'))) return;
  try { await remove(table, row.id); await HOOKS[table]?.afterRemove?.(row); toast('Eliminato'); after ? after() : refresh(); } catch (e) { toast(e.message, 1); }
}

// ---- Scheda breve ----
export function card(table, r, o = {}) {
  const c = T[table].card ? T[table].card(r, ctx, o.alt) : { t: T[table].title(r, ctx) };
  const href = o.go ? o.go(r) : '#/t/' + table + '/' + r.id;
  const inner = [
    h('div', { class: 'card-main' }, h('div', { class: 'card-title' }, c.t || '—'), c.s ? h('div', { class: 'card-sub' }, c.s) : null,
      (c.b || []).filter(Boolean).length ? h('div', { class: 'badges' }, c.b.filter(Boolean).map((b) => h('span', { class: 'badge' }, b))) : null),
    c.r || c.sub ? h('div', { class: 'card-right' + (c.pos ? ' pos' : '') }, c.r, c.sub ? h('small', {}, c.sub) : null) : null,
  ];
  const cls = 'card' + (c.done ? ' done' : '');
  if (o.onclick) return h('button', { class: cls, type: 'button', onclick: () => o.onclick(r) }, inner);
  return href ? h('a', { class: cls, href }, inner) : h('div', { class: cls }, inner);
}

// ---- Elenco generico ----
const states = {};
export function listView(table, o = {}) {
  const def = T[table]; const st = (states[o.key || table] = states[o.key || table] || { q: '', f: {} });
  const box = h('div', { class: 'cards' }); const count = h('span', { class: 'muted' });
  const rowsNow = () => {
    let rows = ofYear(table); if (o.filter) rows = rows.filter(o.filter);
    for (const [k, v] of Object.entries(st.f)) {
      if (!v) continue; const f = def.fields.find((x) => x.k === k);
      rows = rows.filter((r) => (k === 'unita' ? inUnita(r[k], v) : Array.isArray(r[k]) ? r[k].includes(v) : r[k] === v));
      void f;
    }
    if (st.q) { const q = st.q.toLowerCase(); rows = rows.filter((r) => def.fields.some((f) => disp(table, f, r).toLowerCase().includes(q))); }
    return [...rows].sort(def.sort || (() => 0));
  };
  const draw = () => {
    const rows = rowsNow(); count.textContent = rows.length + (rows.length === 1 ? ' voce' : ' voci');
    box.replaceChildren(...(rows.length ? rows.map((r) => card(table, r)) : [h('p', { class: 'empty' }, o.empty || 'Ancora niente qui. Usa il pulsante + per aggiungere.')]));
  };
  const filters = (def.filters || []).map((k) => {
    const f = def.fields.find((x) => x.k === k); let opts = optionsFor(table, f);
    if (f.t === 'chi') opts = [...new Set(ofYear(table).map((r) => r[k]).filter(Boolean))].map((x) => [x, x]);
    if (k === 'unita' && f.o.includes('Noviziato')) opts.splice(1, 0, ['Clan + Noviziato', 'Clan + Noviziato']);
    return h('select', { 'aria-label': f.l, onchange: (e) => { st.f[k] = e.target.value; draw(); } },
      h('option', { value: '' }, f.l.replace(/ \(.*\)$/, '') + ': tutti'), opts.map((x) => h('option', { value: x[0], selected: st.f[k] === x[0] }, x[1])));
  });
  draw();
  return h('section', { class: 'view' },
    o.noHead ? null : h('div', { class: 'view-head' }, h('h1', {}, o.title || def.label), exportBar(o.title || def.label, () => rowsForExport(table, rowsNow()), () => ctx.name('anni', S.anno))),
    o.top || null,
    h('div', { class: 'toolbar' }, h('input', { type: 'search', placeholder: 'Cerca…', 'aria-label': 'Cerca', value: st.q, oninput: (e) => { st.q = e.target.value; draw(); } }), filters),
    count, box,
    h('button', { class: 'fab', type: 'button', 'aria-label': 'Aggiungi ' + def.sing, onclick: () => openForm(table, { ...(o.preset || {}) }) }, '+'));
}

// ---- Scheda di dettaglio generica ----
export function detailView(table, id, o = {}) {
  const def = T[table]; const r = get(table, id);
  if (!r) return h('section', { class: 'view' }, h('p', { class: 'empty' }, 'Scheda non trovata.'), h('a', { href: '#/t/' + table }, '← Torna all\'elenco'));
  const body = h('div', { class: 'detail' });
  let sec = null;
  for (const f of def.fields) {
    if (f.hide || !disp(table, f, r)) continue;
    if ((f.sec || null) !== sec) { sec = f.sec || null; if (sec) body.append(h('h3', { class: 'sec' }, sec)); }
    body.append(h('div', { class: 'kv' }, h('div', { class: 'k' }, f.l.replace(/ \(.*\)$/, '')), h('div', { class: 'v' }, valueNode(table, f, r))));
  }
  const rel = (def.related || []).map((x) => {
    const rows = all(x.t).filter((y) => y[x.fk] === id).sort(T[x.t].sort || (() => 0));
    return h('div', { class: 'rel' }, h('div', { class: 'rel-head' }, h('h3', {}, x.l, h('span', { class: 'muted' }, ' ' + rows.length)),
      h('button', { class: 'btn small', type: 'button', onclick: () => openForm(x.t, { [x.fk]: id }, { hide: [x.fk] }) }, '+ Aggiungi')),
    rows.length ? h('div', { class: 'cards' }, rows.map((y) => h('div', { class: 'rel-row' }, card(x.t, y, { alt: x.alt, go: x.go ? (z) => x.go(z) || '#/t/' + x.t + '/' + z.id : null }),
      x.go ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Modifica', onclick: () => openForm(x.t, y) }, '✎') : null))) : h('p', { class: 'muted' }, 'Niente ancora.'));
  });
  const notes = def.notes ? notesBox(table + ':' + id) : null;
  const printable = () => { const n = body.cloneNode(true); const w = h('div', {}, n); rel.forEach((x) => w.append(x.cloneNode(true))); w.querySelectorAll('button').forEach((b) => b.remove()); return w; };
  return h('section', { class: 'view' },
    h('a', { class: 'back', href: o.back || '#/t/' + table }, '← ' + def.label),
    h('div', { class: 'view-head' }, h('h1', {}, def.title(r, ctx)),
      h('div', { class: 'export' },
        h('button', { class: 'btn ghost', type: 'button', onclick: () => printNode(def.title(r, ctx), printable()) }, '🖨 PDF'),
        h('button', { class: 'btn', type: 'button', onclick: () => openForm(table, r) }, '✎ Modifica'))),
    o.extraTop?.(r) || null, body, o.extra?.(r) || null, rel, notes,
    h('p', { class: 'audit' }, 'Scritto da ' + (r.creato_da || '—') + ' il ' + fmtDT(r.creato_il) + (r.modificato_il && r.modificato_il !== r.creato_il ? ' · modificato da ' + r.modificato_da + ' il ' + fmtDT(r.modificato_il) : '')),
    h('button', { class: 'btn danger ghost', type: 'button', onclick: () => del(table, r, () => { location.hash = o.back || '#/t/' + table; }) }, 'Elimina'));
}

function notesBox(rif) {
  const rows = all('note').filter((n) => n.rif === rif).sort((a, b) => (b.creato_il || '').localeCompare(a.creato_il || ''));
  const ta = h('textarea', { rows: 2, placeholder: 'Scrivi una nota…', 'aria-label': 'Nuova nota' });
  return h('div', { class: 'rel notes' }, h('h3', {}, 'Note dei capi'),
    h('div', { class: 'note-new' }, ta, h('button', { class: 'btn small primary', type: 'button', onclick: async () => {
      if (!ta.value.trim()) return;
      try { await save('note', { rif, testo: ta.value.trim() }); refresh(); } catch (e) { toast(e.message, 1); }
    } }, 'Aggiungi')),
    rows.map((n) => h('div', { class: 'note' }, h('div', { class: 'note-meta' }, h('strong', {}, n.creato_da || '—'), ' · ' + fmtDT(n.creato_il),
      h('button', { class: 'link', type: 'button', onclick: () => openForm('note', n, { hide: ['rif'] }) }, 'modifica'),
      h('button', { class: 'link', type: 'button', onclick: () => del('note', n) }, 'elimina')), h('div', { class: 'pre' }, n.testo))));
}
export { UNITA };