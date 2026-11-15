// Viste specifiche dell'app.
import { T, RICORRENZE, COLLEGAMENTI } from './schema.js';
import { S, CFG, DEMO, LS, all, get, ofYear, save, ctx, today, calLoad, calPush, calDrop, exportAll, importAll, logout, sync } from './store.js';
import { h, fmtDate, fmtDT, eur, HOOKS, refresh, toast, modal, openForm, card, listView, detailView, inUnita, exportBar, exportXlsx, printNode, tableNode, rowsForExport, disp } from './ui.js';

export const MENU = [
  ['Programmazione', [['#/t/attivita', '🔥', 'Attività'], ['#/t/todo', '✅', 'Cose da fare'], ['#/calendario', '🗓️', 'Calendario'], ['#/t/promemoria', '🔔', 'Promemoria'], ['#/programmi', '🎯', 'Programmi e obiettivi']]],
  ['Unità', [['#/unita/Clan', '🔴', 'Clan'], ['#/unita/Noviziato', '🟡', 'Noviziato'], ['#/unita/Partenti', '🧳', 'Partenti'], ['#/t/ragazzi', '🎒', 'Ragazzi'], ['#/servizi', '🤝', 'Riepilogo servizi'], ['#/t/strada', '🥾', 'Punti della strada'], ['#/t/carte', '📜', 'Carta di clan']]],
  ['Campi e ospitalità', [['#/t/campi', '⛺', 'Campi e route'], ['#/t/strutture', '🏠', 'Ospitalità']]],
  ['Cassa', [['#/t/movimenti', '💶', 'Spese e incassi'], ['#/bilancio', '📊', 'Bilancio']]],
  ['Formazione', [['#/formazione', '📚', 'Formazione capi']]],
  ['Gestione', [['#/t/anni', '📅', 'Anni scout'], ['#/t/capi', '🧭', 'Capi'], ['#/t/causali', '🏷️', 'Causali di bilancio'], ['#/t/tipi_evento', '🧩', 'Tipi di appuntamento'], ['#/t/documenti', '🔗', 'Link e documenti'], ['#/impostazioni', '⚙️', 'Impostazioni']]],
];

// ---- Agganci ----
HOOKS.eventi = {
  onChange(k, v) {
    if (k !== 'tipo_id' || !v.tipo_id) return null;
    const t = get('tipi_evento', v.tipo_id); if (!t) return null;
    return { titolo: v.titolo || t.nome, livello: t.livello || v.livello, destinatari: t.destinatari?.length ? t.destinatari : v.destinatari,
      visibile_ragazzi: t.visibile_ragazzi, luogo: v.luogo || t.luogo, note: v.note || t.note };
  },
  async afterSave(ev) { try { return await calPush(ev); } catch (e) { toast('Salvato nell\'app, ma non su Google Calendar: ' + e.message, 1); return ev; } },
  async afterRemove(ev) { try { await calDrop(ev); } catch (e) { toast('Eliminato nell\'app, ma non da Google Calendar: ' + e.message, 1); } },
};

// ---- Promemoria ----
const mine = (p) => !p.destinatari?.length || p.destinatari.includes(S.user?.id);
export const dueReminders = (place, days = 0) => {
  const lim = new Date(); lim.setDate(lim.getDate() + days); const l = lim.toISOString().slice(0, 10);
  return all('promemoria').filter((p) => !p.completato && p.prossima && p.prossima <= l && mine(p) && (!place || (p.mostra_in || []).includes(place)))
    .sort((a, b) => a.prossima.localeCompare(b.prossima));
};
function nextDate(p) {
  const step = RICORRENZE[p.ricorrenza]; if (!step) return null;
  const base = new Date((p.prossima > today() ? p.prossima : today()) + 'T12:00');
  if (typeof step === 'number') base.setDate(base.getDate() + step); else base.setMonth(base.getMonth() + Number(step.slice(1)));
  return base.toISOString().slice(0, 10);
}
async function doneReminder(p) {
  const n = nextDate(p);
  try { await save('promemoria', n ? { ...p, prossima: n } : { ...p, completato: true }); toast(n ? 'Fatto. Prossimo: ' + fmtDate(n) : 'Promemoria chiuso'); refresh(); } catch (e) { toast(e.message, 1); }
}
function reminderRow(p, onNav) {
  return h('div', { class: 'alert' }, h('div', { class: 'alert-text' }, h('strong', {}, '🔔 ' + p.testo), h('small', {}, (p.prossima < today() ? 'Scaduto il ' : 'Per il ') + fmtDate(p.prossima) + (p.dettagli ? ' · ' + p.dettagli : ''))),
    h('div', { class: 'row' }, p.collegamento ? h('a', { class: 'btn small', href: p.collegamento, onclick: onNav }, 'Apri') : null,
      h('button', { class: 'btn small primary', type: 'button', onclick: () => { onNav?.(); doneReminder(p); } }, 'Fatto')));
}
export function reminderBanner(place) { const r = dueReminders(place); return r.length ? h('div', { class: 'alerts' }, r.map((p) => reminderRow(p))) : null; }
let popupShown = false;
export function reminderPopup() {
  if (popupShown) return; popupShown = true;
  const r = dueReminders('Apertura app'); if (!r.length) return;
  const m = modal('Promemoria', h('div', { class: 'alerts' }, r.map((p) => reminderRow(p, () => m.close()))), { small: 1 });
}

// ---- Agenda ----
function agenda() {
  const items = []; const linked = new Set(all('eventi').map((e) => e.gcal_id).filter(Boolean));
  for (const e of all('eventi')) items.push({ d: (e.inizio || '').slice(0, 10), time: e.tutto_il_giorno ? '' : (e.inizio || '').slice(11, 16), t: e.titolo, s: [e.livello, (e.destinatari || []).join(', '), e.luogo].filter(Boolean).join(' · '), k: e.visibile_ragazzi ? 'condiviso' : 'solo capi', who: e.destinatari || [], open: () => openForm('eventi', e), del: e });
  for (const g of S.cal) if (!linked.has(g.id)) items.push({ d: g.start.slice(0, 10), time: g.allDay ? '' : g.start.slice(11, 16), t: g.title, s: [g.location, 'da Google Calendar'].filter(Boolean).join(' · '), k: g.cal === 'ragazzi' ? 'condiviso' : 'Google', who: [], open: () => modal(g.title, h('div', { class: 'detail' }, h('p', {}, fmtDT(g.start) + (g.end ? ' → ' + fmtDT(g.end) : '')), g.location ? h('p', {}, '📍 ' + g.location) : null, g.description ? h('div', { class: 'pre' }, g.description) : null, h('p', { class: 'muted' }, 'Evento creato direttamente su Google Calendar: si modifica da lì.')), { small: 1 }) });
  for (const a of ofYear('attivita')) if (a.data) items.push({ d: a.data, time: '', t: a.titolo, s: [a.tipo, (a.unita || []).join(', ')].filter(Boolean).join(' · '), k: 'attività', who: a.unita || [], href: '#/t/attivita/' + a.id });
  for (const c of ofYear('campi')) if (c.dal) items.push({ d: c.dal, time: '', t: c.titolo, s: [c.tipo, c.al && c.al !== c.dal ? 'fino al ' + fmtDate(c.al) : '', c.luogo].filter(Boolean).join(' · '), k: 'campo', who: c.unita || [], href: '#/t/campi/' + c.id });
  return items.filter((i) => i.d).sort((a, b) => (a.d + a.time).localeCompare(b.d + b.time));
}
function agendaRow(i) {
  const inner = [h('div', { class: 'date-pill' }, h('strong', {}, i.d.slice(8, 10)), h('small', {}, ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'][Number(i.d.slice(5, 7)) - 1])),
    h('div', { class: 'card-main' }, h('div', { class: 'card-title' }, i.t), h('div', { class: 'card-sub' }, [i.time, i.s].filter(Boolean).join(' · ')), h('div', { class: 'badges' }, h('span', { class: 'badge' }, i.k)))];
  return i.href ? h('a', { class: 'card', href: i.href }, inner) : h('button', { class: 'card', type: 'button', onclick: i.open }, inner);
}

export function calendarView() {
  const st = (calendarView.st = calendarView.st || { past: false, who: '' });
  if (!DEMO && !S.calLoaded) calLoad().then(refresh).catch((e) => toast('Google Calendar: ' + e.message, 1));
  let items = agenda(); if (!st.past) items = items.filter((i) => i.d >= today());
  if (st.who) items = items.filter((i) => !i.who.length || i.who.includes(st.who));
  const groups = {}; items.forEach((i) => { (groups[i.d.slice(0, 7)] = groups[i.d.slice(0, 7)] || []).push(i); });
  const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const exp = () => items.map((i) => ({ Data: fmtDate(i.d), Ora: i.time, Titolo: i.t, Dettagli: i.s, Tipo: i.k }));
  return h('section', { class: 'view' },
    h('div', { class: 'view-head' }, h('h1', {}, 'Calendario'), exportBar('Calendario', exp)),
    h('p', { class: 'muted' }, DEMO ? 'Modalità demo: gli appuntamenti restano nell\'app. Con Google collegato vengono letti e scritti su Google Calendar.' : 'Collegato a Google Calendar: gli appuntamenti creati qui compaiono nel calendario, e quelli già presenti sono visibili qui.'),
    h('div', { class: 'toolbar' },
      h('select', { 'aria-label': 'Per chi', onchange: (e) => { st.who = e.target.value; refresh(); } }, h('option', { value: '' }, 'Per tutti'), ['Capi', 'Clan', 'Noviziato', 'Partenti'].map((x) => h('option', { value: x, selected: st.who === x }, x))),
      h('label', { class: 'chip-check' }, h('input', { type: 'checkbox', checked: st.past, onchange: (e) => { st.past = e.target.checked; refresh(); } }), h('span', {}, 'Mostra passati')),
      !DEMO ? h('button', { class: 'btn small', type: 'button', onclick: () => calLoad(true).then(refresh).catch((e) => toast(e.message, 1)) }, '↻ Aggiorna') : null),
    Object.keys(groups).length ? Object.entries(groups).map(([m, its]) => h('div', {}, h('h3', { class: 'sec' }, mesi[Number(m.slice(5)) - 1] + ' ' + m.slice(0, 4)), h('div', { class: 'cards' }, its.map(agendaRow)))) : h('p', { class: 'empty' }, 'Nessun appuntamento in programma.'),
    h('button', { class: 'fab', type: 'button', 'aria-label': 'Nuovo appuntamento', onclick: () => openForm('eventi', {}) }, '+'));
}

// ---- Home ----
function docLink(d) {
  const url = d.url || d.file;
  const edit = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Modifica ' + d.titolo, onclick: () => openForm('documenti', d) }, '✎');
  const main = url ? h('a', { class: 'card', href: url, target: '_blank', rel: 'noopener' }, h('div', { class: 'card-main' }, h('div', { class: 'card-title' }, '↗ ' + d.titolo), d.note ? h('div', { class: 'card-sub' }, d.note) : null))
    : h('button', { class: 'card todo-link', type: 'button', onclick: () => openForm('documenti', d) }, h('div', { class: 'card-main' }, h('div', { class: 'card-title' }, d.titolo), h('div', { class: 'card-sub' }, 'Link da inserire: tocca per aggiungerlo')));
  return h('div', { class: 'rel-row' }, main, edit);
}
const docsOf = (sez, unita) => all('documenti').filter((d) => (!sez || d.sezione === sez) && (!unita || (d.unita || []).includes(unita)));
function totals(rows) { let e = 0, u = 0; rows.forEach((r) => { if (r.tipo === 'Incasso') e += Number(r.importo) || 0; else u += Number(r.importo) || 0; }); return { e, u, s: e - u }; }

export function homeView() {
  const me = S.user; const tot = totals(ofYear('movimenti'));
  const todos = ofYear('todo').filter((t) => t.stato !== 'Fatto' && (!t.assegnato_a || t.assegnato_a === me.id)).sort(T.todo.sort).slice(0, 5);
  const next = agenda().filter((i) => i.d >= today()).slice(0, 5);
  const rem = dueReminders(null, 7);
  const links = docsOf(null, 'Home').filter((d) => d.url || d.file);
  return h('section', { class: 'view home' },
    h('div', { class: 'hero' }, h('p', { class: 'eyebrow' }, [CFG.NOME_GRUPPO, 'Anno ' + (ctx.name('anni', S.anno) || '—')].filter(Boolean).join(' · ')), h('h1', {}, 'Buona strada, ' + (me.nome || '').split(' ')[0])),
    h('div', { class: 'quick' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => openForm('movimenti', {}) }, '+ Spesa'),
      h('button', { class: 'btn', type: 'button', onclick: () => openForm('movimenti', { tipo: 'Incasso' }) }, '+ Incasso'),
      h('button', { class: 'btn', type: 'button', onclick: () => openForm('todo', {}) }, '+ Compito'),
      h('button', { class: 'btn', type: 'button', onclick: () => openForm('eventi', {}) }, '+ Appuntamento')),
    rem.length ? h('div', { class: 'block' }, h('h2', {}, 'Promemoria'), h('div', { class: 'alerts' }, rem.map((p) => reminderRow(p)))) : null,
    h('div', { class: 'block' }, h('div', { class: 'rel-head' }, h('h2', {}, 'I miei compiti'), h('a', { href: '#/t/todo' }, 'Tutti →')),
      todos.length ? h('div', { class: 'cards' }, todos.map((t) => card('todo', t))) : h('p', { class: 'muted' }, 'Nessun compito aperto.')),
    h('div', { class: 'block' }, h('div', { class: 'rel-head' }, h('h2', {}, 'Prossimi appuntamenti'), h('a', { href: '#/calendario' }, 'Calendario →')),
      next.length ? h('div', { class: 'cards' }, next.map(agendaRow)) : h('p', { class: 'muted' }, 'Niente in programma.')),
    h('a', { class: 'block cassa', href: '#/bilancio' }, h('h2', {}, 'Cassa dell\'anno'),
      h('div', { class: 'stats' }, h('div', {}, h('small', {}, 'Entrate'), h('strong', {}, eur(tot.e))), h('div', {}, h('small', {}, 'Uscite'), h('strong', {}, eur(tot.u))), h('div', {}, h('small', {}, 'Saldo'), h('strong', { class: tot.s < 0 ? 'neg' : 'pos' }, eur(tot.s))))),
    links.length ? h('div', { class: 'block' }, h('h2', {}, 'Link rapidi'), h('div', { class: 'cards' }, links.map(docLink))) : null);
}

export function menuView() {
  return h('section', { class: 'view' }, h('h1', {}, 'Tutte le sezioni'), MENU.map(([sec, items]) => h('div', { class: 'block' }, h('h2', {}, sec), h('div', { class: 'grid' }, items.map(([href, ic, l]) => h('a', { class: 'tile', href }, h('span', { class: 'tile-ic', 'aria-hidden': 'true' }, ic), l))))));
}

// ---- Unità ----
export const cartaInVigore = (u) => all('carte').filter((c) => c.unita === u).sort(T.carte.sort)[0];
function cartaBox(u) {
  const c = cartaInVigore(u);
  return h('div', { class: 'block' }, h('div', { class: 'rel-head' }, h('h2', {}, 'Carta di ' + u.toLowerCase()), h('button', { class: 'btn small', type: 'button', onclick: () => openForm('carte', { unita: u }) }, '+ Nuova carta')),
    c ? h('div', { class: 'cards' }, h('div', { class: 'rel-row' }, card('carte', c), c.pdf ? h('a', { class: 'btn small primary', href: c.pdf, target: '_blank', rel: 'noopener' }, 'Apri PDF') : null), h('p', { class: 'muted' }, 'In vigore: scritta il ' + fmtDate(c.data_scrittura) + (c.data_firma ? ', firmata il ' + fmtDate(c.data_firma) : '') + '. ', h('a', { href: '#/t/carte' }, 'Storico delle carte →')))
      : h('p', { class: 'muted' }, 'Nessuna carta caricata.'));
}
export function unitaView(u) {
  const key = 'scout_incl_nov'; const incl = u === 'Clan' && LS.get(key, false);
  const f = incl ? 'Clan + Noviziato' : u;
  const rag = all('ragazzi').filter((r) => r.stato === 'Attivo' && inUnita(r.unita, f)).sort(T.ragazzi.sort);
  const att = ofYear('attivita').filter((a) => (!a.data || a.data >= today()) && inUnita(a.unita, f)).sort(T.attivita.sort).slice(0, 6);
  const links = docsOf(null, u);
  return h('section', { class: 'view' },
    h('div', { class: 'view-head' }, h('h1', {}, u), exportBar(u + ' – ragazzi', () => rowsForExport('ragazzi', rag))),
    u === 'Clan' ? h('label', { class: 'chip-check big' }, h('input', { type: 'checkbox', checked: incl, onchange: (e) => { LS.set(key, e.target.checked); refresh(); } }), h('span', {}, 'Includi noviziato')) : null,
    links.length ? h('div', { class: 'block' }, h('h2', {}, 'Link diretti'), h('div', { class: 'cards' }, links.map(docLink))) : null,
    u !== 'Partenti' ? cartaBox(u) : null,
    h('div', { class: 'block' }, h('div', { class: 'rel-head' }, h('h2', {}, 'Ragazzi ', h('span', { class: 'muted' }, rag.length)), h('button', { class: 'btn small', type: 'button', onclick: () => openForm('ragazzi', { unita: u }) }, '+ Aggiungi')),
      rag.length ? h('div', { class: 'cards' }, rag.map((r) => card('ragazzi', r))) : h('p', { class: 'muted' }, 'Nessun ragazzo inserito.'),
      h('p', {}, h('a', { href: '#/servizi' }, 'Riepilogo servizi →'), ' · ', h('a', { href: '#/t/strada' }, 'Punti della strada →'))),
    h('div', { class: 'block' }, h('div', { class: 'rel-head' }, h('h2', {}, 'Prossime attività'), h('button', { class: 'btn small', type: 'button', onclick: () => openForm('attivita', { unita: [u] }) }, '+ Aggiungi')),
      att.length ? h('div', { class: 'cards' }, att.map((a) => card('attivita', a))) : h('p', { class: 'muted' }, 'Nessuna attività in programma.')));
}

// ---- Riepilogo servizi ----
export function serviziView() {
  const st = (serviziView.st = serviziView.st || { u: '' });
  const rag = all('ragazzi').filter((r) => r.stato === 'Attivo' && inUnita(r.unita, st.u)).sort(T.ragazzi.sort);
  const sv = ofYear('servizi');
  const rows = rag.flatMap((r) => { const s = sv.filter((x) => x.ragazzo_id === r.id); return s.length ? s.map((x) => ({ r, s: x })) : [{ r, s: null }]; });
  const exp = () => rows.map(({ r, s }) => ({ 'Ragazzo/a': T.ragazzi.title(r), Unità: r.unita, Servizio: s?.dove || 'SENZA SERVIZIO', Tipo: s?.tipo || '', Referente: s?.referente || '', Contatto: s?.contatto || '', Dal: fmtDate(s?.dal), 'Ultima verifica': fmtDate(s?.ultima_verifica), Verifica: s?.verifica || '' }));
  const senza = rows.filter((x) => !x.s).length;
  return h('section', { class: 'view' },
    h('div', { class: 'view-head' }, h('h1', {}, 'Riepilogo servizi'), exportBar('Riepilogo servizi', exp, () => ctx.name('anni', S.anno))),
    reminderBanner('Cose da fare dello staff'),
    h('div', { class: 'toolbar' }, h('select', { 'aria-label': 'Unità', onchange: (e) => { st.u = e.target.value; refresh(); } }, h('option', { value: '' }, 'Tutte le unità'), ['Clan', 'Clan + Noviziato', 'Noviziato', 'Partenti'].map((x) => h('option', { value: x, selected: st.u === x }, x)))),
    h('p', { class: 'muted' }, rag.length + ' ragazzi · ' + senza + ' senza servizio quest\'anno'),
    h('div', { class: 'cards' }, rows.map(({ r, s }) => h('div', { class: 'rel-row' },
      h('a', { class: 'card' + (s ? '' : ' warn'), href: '#/t/ragazzi/' + r.id }, h('div', { class: 'card-main' }, h('div', { class: 'card-title' }, T.ragazzi.title(r)), h('div', { class: 'card-sub' }, s ? [s.dove, s.tipo, s.referente].filter(Boolean).join(' · ') : 'Senza servizio'),
        h('div', { class: 'badges' }, h('span', { class: 'badge' }, r.unita), s?.ultima_verifica ? h('span', { class: 'badge' }, 'verifica ' + fmtDate(s.ultima_verifica)) : null))),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': s ? 'Modifica servizio' : 'Aggiungi servizio', onclick: () => (s ? openForm('servizi', s) : openForm('servizi', { ragazzo_id: r.id })) }, s ? '✎' : '+')))),
    rows.length ? null : h('p', { class: 'empty' }, 'Inserisci prima i ragazzi nella sezione Ragazzi.'));
}

// ---- Bilancio ----
export function bilancioView() {
  const st = (bilancioView.st = bilancioView.st || { u: '' });
  const rows = ofYear('movimenti').filter((r) => !st.u || r.unita === st.u);
  const tot = totals(rows);
  const by = (tipo) => { const m = {}; rows.filter((r) => r.tipo === tipo).forEach((r) => { const k = ctx.name('causali', r.causale_id) || 'Senza causale'; m[k] = (m[k] || 0) + (Number(r.importo) || 0); }); return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0], 'it', { numeric: true })); };
  const ent = by('Incasso'), usc = by('Spesa');
  const rimb = {}; rows.filter((r) => r.tipo === 'Spesa' && r.da_rimborsare && !r.rimborsato).forEach((r) => { rimb[r.chi || '—'] = (rimb[r.chi || '—'] || 0) + (Number(r.importo) || 0); });
  const perCampo = {}; rows.filter((r) => r.campo_id || r.attivita_id).forEach((r) => { const k = ctx.name('campi', r.campo_id) || ctx.name('attivita', r.attivita_id); if (!k) return; perCampo[k] = perCampo[k] || { e: 0, u: 0 }; perCampo[k][r.tipo === 'Incasso' ? 'e' : 'u'] += Number(r.importo) || 0; });
  const sumRows = () => [...ent.map(([k, v]) => ({ Sezione: 'Entrate', Voce: k, Importo: v })), { Sezione: 'Entrate', Voce: 'TOTALE ENTRATE', Importo: tot.e }, ...usc.map(([k, v]) => ({ Sezione: 'Uscite', Voce: k, Importo: v })), { Sezione: 'Uscite', Voce: 'TOTALE USCITE', Importo: tot.u }, { Sezione: 'Saldo', Voce: 'SALDO', Importo: tot.s }];
  const tbl = (title, list, total) => h('div', { class: 'block' }, h('h2', {}, title), list.length ? h('table', { class: 'tbl' }, h('tbody', {}, list.map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', { class: 'num' }, eur(v)))), h('tr', { class: 'total' }, h('td', {}, 'Totale'), h('td', { class: 'num' }, eur(total))))) : h('p', { class: 'muted' }, 'Nessun movimento.'));
  const name = 'Bilancio ' + (ctx.name('anni', S.anno) || '') + (st.u ? ' ' + st.u : '');
  return h('section', { class: 'view' },
    h('div', { class: 'view-head' }, h('h1', {}, 'Bilancio'), h('div', { class: 'export' },
      h('button', { class: 'btn ghost', type: 'button', onclick: () => printNode(name, h('div', {}, tableNode(['Sezione', 'Voce', 'Importo'], sumRows()), h('h2', {}, 'Movimenti'), tableNode(['Data', 'Tipo', 'Causale', 'Descrizione', 'Chi', 'Importo'], [...rows].sort(T.movimenti.sort).reverse().map((r) => ({ Data: fmtDate(r.data), Tipo: r.tipo, Causale: ctx.name('causali', r.causale_id), Descrizione: r.descrizione, Chi: r.chi, Importo: Number(r.importo) || 0 }))))) }, '🖨 PDF'),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => exportXlsx(name, [{ name: 'Riepilogo', rows: sumRows() }, { name: 'Movimenti', rows: rowsForExport('movimenti', [...rows].sort(T.movimenti.sort).reverse()) }]) }, '⬇ Excel'))),
    h('div', { class: 'toolbar' }, h('select', { 'aria-label': 'Per chi', onchange: (e) => { st.u = e.target.value; refresh(); } }, h('option', { value: '' }, 'Tutta la comunità R/S'), T.movimenti.fields.find((f) => f.k === 'unita').o.map((x) => h('option', { value: x, selected: st.u === x }, x)))),
    h('div', { class: 'block cassa' }, h('div', { class: 'stats' }, h('div', {}, h('small', {}, 'Entrate'), h('strong', {}, eur(tot.e))), h('div', {}, h('small', {}, 'Uscite'), h('strong', {}, eur(tot.u))), h('div', {}, h('small', {}, 'Saldo'), h('strong', { class: tot.s < 0 ? 'neg' : 'pos' }, eur(tot.s))))),
    tbl('Entrate per causale', ent, tot.e), tbl('Uscite per causale', usc, tot.u),
    Object.keys(rimb).length ? h('div', { class: 'block' }, h('h2', {}, 'Da rimborsare'), h('table', { class: 'tbl' }, h('tbody', {}, Object.entries(rimb).map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', { class: 'num' }, eur(v))))))) : null,
    Object.keys(perCampo).length ? h('div', { class: 'block' }, h('h2', {}, 'Per campo o attività'), h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['', 'Entrate', 'Uscite', 'Saldo'].map((x) => h('th', {}, x)))), h('tbody', {}, Object.entries(perCampo).map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', { class: 'num' }, eur(v.e)), h('td', { class: 'num' }, eur(v.u)), h('td', { class: 'num' }, eur(v.e - v.u))))))) : null,
    h('p', {}, h('a', { href: '#/t/movimenti' }, 'Elenco di spese e incassi →')));
}

// ---- Programmi e formazione ----
export function programmiView() {
  const ob = ofYear('obiettivi'); const aree = ob.filter((o) => o.livello === 'Area'); const spec = ob.filter((o) => o.livello !== 'Area');
  const item = (o) => h('div', { class: 'rel-row' }, h('a', { class: 'card', href: '#/t/obiettivi/' + o.id }, h('div', { class: 'card-main' }, h('div', { class: 'card-title' }, o.testo), (o.unita || []).length ? h('div', { class: 'badges' }, o.unita.map((u) => h('span', { class: 'badge' }, u))) : null)));
  const exp = () => spec.map((o) => ({ Area: ctx.name('obiettivi', o.area_id), Obiettivo: o.testo, Unità: (o.unita || []).join(', '), Progetto: o.progetto || get('obiettivi', o.area_id)?.progetto || '', Verifica: o.verifica }));
  const orphans = spec.filter((o) => !get('obiettivi', o.area_id));
  return h('section', { class: 'view' },
    h('div', { class: 'view-head' }, h('h1', {}, 'Programmi e obiettivi'), exportBar('Obiettivi', exp, () => ctx.name('anni', S.anno))),
    h('button', { class: 'btn', type: 'button', onclick: () => printNode('Progetto di branca R/S – ' + (CFG.NOME_GRUPPO || ''), h('div', {}, aree.map((a) => h('div', {}, h('h2', {}, a.testo), a.verifica ? h('p', {}, 'Verifica: ' + a.verifica) : null,
      h('ul', {}, spec.filter((o) => o.area_id === a.id).map((o) => h('li', {}, o.testo, (o.unita || []).length ? ' (' + o.unita.join(', ') + ')' : '', o.verifica ? h('div', {}, 'Verifica: ' + o.verifica) : null)))))), 'Anno ' + ctx.name('anni', S.anno)) }, '🖨 Stampa il progetto di branca dagli obiettivi'),
    h('div', { class: 'block' }, h('div', { class: 'rel-head' }, h('h2', {}, 'Documenti di riferimento'), h('button', { class: 'btn small', type: 'button', onclick: () => openForm('documenti', { sezione: 'Programmi' }) }, '+ Aggiungi')),
      h('div', { class: 'cards' }, docsOf('Programmi').map(docLink)), cartaInVigore('Clan') ? h('p', {}, h('a', { href: '#/t/carte/' + cartaInVigore('Clan').id }, 'Carta di clan in vigore →')) : null),
    h('div', { class: 'block' }, h('div', { class: 'rel-head' }, h('h2', {}, 'Obiettivi dell\'anno'), h('button', { class: 'btn small', type: 'button', onclick: () => openForm('obiettivi', { livello: 'Area' }) }, '+ Area')),
      aree.length ? aree.map((a) => h('div', { class: 'area' }, h('div', { class: 'rel-head' }, h('h3', {}, h('a', { href: '#/t/obiettivi/' + a.id }, a.testo), a.progetto ? h('small', { class: 'muted' }, ' · ' + a.progetto) : null), h('button', { class: 'btn small', type: 'button', onclick: () => openForm('obiettivi', { livello: 'Obiettivo specifico', area_id: a.id, progetto: a.progetto, unita: a.unita }) }, '+ Obiettivo')),
        h('div', { class: 'cards' }, spec.filter((o) => o.area_id === a.id).map(item)))) : h('p', { class: 'muted' }, 'Parti creando le aree (es. Strada, Comunità, Servizio, Fede), poi aggiungi gli obiettivi specifici.'),
      orphans.length ? h('div', { class: 'area' }, h('h3', {}, 'Senza area'), h('div', { class: 'cards' }, orphans.map(item))) : null));
}
export function formazioneView() {
  const docs = docsOf('Formazione'); const cats = [...new Set(docs.map((d) => d.categoria || 'Altro'))];
  return h('section', { class: 'view' }, h('div', { class: 'view-head' }, h('h1', {}, 'Formazione capi')),
    cats.map((c) => h('div', { class: 'block' }, h('h2', {}, c), h('div', { class: 'cards' }, docs.filter((d) => (d.categoria || 'Altro') === c).map(docLink)))),
    docs.length ? null : h('p', { class: 'empty' }, 'Aggiungi i link al Drive di zona, al metodo e ai materiali formativi.'),
    h('button', { class: 'fab', type: 'button', 'aria-label': 'Aggiungi link o documento', onclick: () => openForm('documenti', { sezione: 'Formazione', categoria: 'Metodo' }) }, '+'));
}

// ---- Attività: riferimenti per progettare ----
function riferimenti(a) {
  const ob = (a.obiettivi || []).map((i) => get('obiettivi', i)).filter(Boolean);
  const carta = cartaInVigore('Clan');
  modal('Riferimenti per progettare', h('div', {},
    h('h3', { class: 'sec' }, 'Obiettivi a cui risponde'), ob.length ? ob.map((o) => h('div', { class: 'note' }, h('div', { class: 'note-meta' }, ctx.name('obiettivi', o.area_id) || 'Obiettivo'), h('div', { class: 'pre' }, o.testo))) : h('p', { class: 'muted' }, 'Nessun obiettivo collegato: modificando l\'attività puoi sceglierli.'),
    h('h3', { class: 'sec' }, 'Programmi'), h('div', { class: 'cards' }, docsOf('Programmi').map(docLink)),
    carta ? h('p', {}, carta.pdf ? h('a', { href: carta.pdf, target: '_blank', rel: 'noopener' }, '↗ Carta di clan in vigore (PDF)') : h('a', { href: '#/t/carte/' + carta.id }, 'Carta di clan in vigore →')) : null,
    h('h3', { class: 'sec' }, 'Metodo e formazione'), h('div', { class: 'cards' }, docsOf('Formazione').map(docLink)),
    a.campo_id ? h('p', {}, h('a', { href: '#/t/campi/' + a.campo_id }, '⛺ ' + ctx.name('campi', a.campo_id) + ' →')) : null));
}
export function attivitaDetail(id) {
  return detailView('attivita', id, { extraTop: (a) => h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: () => riferimenti(a) }, '📖 Riferimenti per progettare'),
    h('div', { class: 'prep' }, ['formazione', 'tecnica', 'preghiera', 'logistica'].map((k) => h('span', { class: 'badge' + (a[k + '_resp'] ? '' : ' off') }, k[0].toUpperCase() + k.slice(1) + ': ' + (ctx.name('capi', a[k + '_resp']) || 'da assegnare'))))) });
}

// ---- Impostazioni ----
export function settingsView() {
  const fileIn = h('input', { type: 'file', accept: 'application/json', 'aria-label': 'File di backup', onchange: async () => { try { await importAll(JSON.parse(await fileIn.files[0].text())); toast('Dati importati'); refresh(); } catch (e) { toast('File non valido: ' + e.message, 1); } } });
  const dl = (name, text) => { const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name }); document.body.append(a); a.click(); a.remove(); };
  return h('section', { class: 'view' }, h('h1', {}, 'Impostazioni'),
    h('div', { class: 'block' }, h('h2', {}, 'Profilo'), h('p', {}, 'Stai usando l\'app come ', h('strong', {}, S.user.nome), S.user.email ? ' (' + S.user.email + ')' : '', '. Ogni cosa che scrivi viene firmata con questo nome.'),
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: () => openForm('capi', S.user) }, 'Modifica il mio profilo'), h('button', { class: 'btn', type: 'button', onclick: logout }, DEMO ? 'Cambia profilo' : 'Esci'))),
    h('div', { class: 'block' }, h('h2', {}, 'Collegamento dati'), h('p', {}, DEMO ? 'Modalità demo: i dati sono salvati solo in questo browser e non sono condivisi con gli altri capi. Per collegare Google Sheets, Drive e Calendar segui il file README.' : 'Collegato a Google Sheets, Drive e Calendar.' + (S.online ? '' : ' Al momento sei offline: vedi gli ultimi dati scaricati.')),
      !DEMO ? h('button', { class: 'btn', type: 'button', onclick: () => sync().then(() => { toast('Dati aggiornati'); refresh(); }).catch((e) => toast(e.message, 1)) }, '↻ Aggiorna i dati') : null),
    h('div', { class: 'block' }, h('h2', {}, 'Copia di sicurezza'), h('div', { class: 'row' },
      h('button', { class: 'btn', type: 'button', onclick: () => exportXlsx('App capi scout – tutti i dati', Object.keys(T).map((t) => ({ name: T[t].label, rows: rowsForExport(t, all(t)) }))) }, '⬇ Tutto in Excel'),
      h('button', { class: 'btn', type: 'button', onclick: () => dl('app-capi-scout-backup-' + today() + '.json', JSON.stringify(exportAll())) }, '⬇ File di backup')),
      DEMO ? h('div', { class: 'field' }, h('label', {}, 'Ripristina da un file di backup (sostituisce i dati della demo)'), fileIn) : null),
    h('div', { class: 'block' }, h('h2', {}, 'Gestione'), h('div', { class: 'grid' }, MENU[5][1].slice(0, 5).map(([href, ic, l]) => h('a', { class: 'tile', href }, h('span', { class: 'tile-ic', 'aria-hidden': 'true' }, ic), l)))),
    h('p', { class: 'audit' }, (CFG.NOME_APP || 'App capi scout') + ' · versione 1.0'));
}
void disp; void COLLEGAMENTI;