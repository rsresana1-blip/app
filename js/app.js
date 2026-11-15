// Avvio, accesso e navigazione.
import { T } from './schema.js';
import { S, CFG, DEMO, boot, all, setYear, loginDemo, loginGoogle, loginCode, listProfiles, ctx } from './store.js';
import { h, setRerender, listView, detailView, toast, openForm } from './ui.js';
import { MENU, homeView, menuView, calendarView, unitaView, serviziView, bilancioView, programmiView, formazioneView, attivitaDetail, settingsView, reminderBanner, reminderPopup } from './views.js';

const app = document.getElementById('app');
const NAME = CFG.NOME_APP || 'Staff R/S';
document.title = NAME;

function route() {
  const p = (location.hash.replace(/^#\/?/, '') || 'home').split('/').map(decodeURIComponent);
  switch (p[0]) {
    case 'home': return homeView();
    case 'menu': return menuView();
    case 'calendario': return calendarView();
    case 'unita': return unitaView(['Clan', 'Noviziato', 'Partenti'].includes(p[1]) ? p[1] : 'Clan');
    case 'servizi': return serviziView();
    case 'bilancio': return bilancioView();
    case 'programmi': return programmiView();
    case 'formazione': return formazioneView();
    case 'impostazioni': return settingsView();
    case 't': {
      if (!T[p[1]]) break;
      if (p[2]) return p[1] === 'attivita' ? attivitaDetail(p[2]) : detailView(p[1], p[2], p[1] === 'obiettivi' ? { back: '#/programmi' } : {});
      if (p[1] === 'attivita') return listView('attivita', { top: reminderBanner('Programmazione attività') });
      if (p[1] === 'todo') return listView('todo', { top: reminderBanner('Cose da fare dello staff') });
      if (p[1] === 'anni') return listView('anni', { top: h('p', { class: 'muted' }, 'Per iniziare un nuovo anno scout premi +. L\'anno su cui stai lavorando si sceglie in alto.') });
      if (p[1] === 'causali') return listView('causali', { top: h('p', { class: 'hint' }, 'Elenco provvisorio: sostituiscilo con le voci ufficiali del bilancio AGESCI del tuo gruppo.') });
      return listView(p[1]);
    }
    default:
  }
  return h('section', { class: 'view' }, h('p', { class: 'empty' }, 'Pagina non trovata.'), h('a', { href: '#/home' }, '← Home'));
}

function shell() {
  const cur = '#/' + (location.hash.replace(/^#\/?/, '') || 'home');
  const is = (href) => cur === href || cur.startsWith(href + '/');
  const yearSel = h('select', { class: 'year', 'aria-label': 'Anno scout', onchange: (e) => { if (e.target.value === '+') { e.target.value = S.anno || ''; openForm('anni', {}, { onSaved: (a) => setYear(a.id) }); } else { setYear(e.target.value); render(); } } },
    [...all('anni')].sort(T.anni.sort).map((a) => h('option', { value: a.id, selected: a.id === S.anno }, a.nome)), h('option', { value: '+' }, '+ Nuovo anno'));
  const tabs = [['#/home', '🏠', 'Home'], ['#/t/attivita', '🔥', 'Attività'], ['#/t/movimenti', '💶', 'Cassa'], ['#/calendario', '🗓️', 'Calendario'], ['#/menu', '☰', 'Menu']];
  const main = h('main', { id: 'main', tabindex: '-1' }, route());
  return [
    h('header', { class: 'top' }, h('a', { class: 'brand', href: '#/home' }, NAME), DEMO ? h('span', { class: 'demo-tag' }, 'demo') : null, h('div', { class: 'spacer' }), yearSel,
      h('a', { class: 'avatar', href: '#/impostazioni', 'aria-label': 'Impostazioni e profilo di ' + S.user.nome }, (S.user.nome || '?').trim().slice(0, 1).toUpperCase())),
    h('div', { class: 'layout' },
      h('nav', { class: 'side', 'aria-label': 'Sezioni' }, h('a', { href: '#/home', class: is('#/home') ? 'on' : '' }, '🏠 Home'), MENU.map(([sec, items]) => [h('div', { class: 'side-sec' }, sec), items.map(([href, ic, l]) => h('a', { href, class: is(href) ? 'on' : '' }, ic + ' ' + l))])),
      main),
    h('nav', { class: 'tabs', 'aria-label': 'Navigazione principale' }, tabs.map(([href, ic, l]) => h('a', { href, class: is(href) || (href === '#/menu' && !tabs.slice(0, 4).some((t) => is(t[0]))) ? 'on' : '' }, h('span', { 'aria-hidden': 'true' }, ic), l))),
  ];
}
function render(keepScroll) {
  const y = window.scrollY;
  try { app.replaceChildren(...shell()); } catch (e) { console.error(e); app.replaceChildren(h('div', { class: 'login' }, h('h1', {}, 'Qualcosa non ha funzionato'), h('p', {}, e.message), h('a', { class: 'btn', href: '#/home' }, 'Torna alla Home'))); }
  window.scrollTo(0, keepScroll ? y : 0);
}
setRerender(() => render(true));
void ctx;

// ---- Accesso ----
function loginScreen(msg) {
  const err = h('p', { class: 'error', role: 'alert' }, msg || '');
  const done = () => location.reload();
  const fail = (e) => { err.textContent = e.message === 'NON_AUTORIZZATO' ? 'Questo account non è nell\'elenco dei capi autorizzati.' : e.message === 'CODICE' ? 'Codice staff non corretto.' : e.message; };
  let body;
  if (DEMO) {
    const capi = all('capi');
    const name = h('input', { type: 'text', id: 'nome', placeholder: 'Nome e cognome', autocomplete: 'name' });
    body = h('div', {},
      h('p', { class: 'hint' }, 'Modalità demo: i dati restano solo in questo browser. Serve per provare l\'app prima di collegare Google.'),
      capi.length ? h('div', { class: 'field' }, h('label', {}, 'Chi sei?'), h('div', { class: 'cards' }, capi.map((c) => h('button', { class: 'card', type: 'button', onclick: () => loginDemo(c.id).then(done) }, h('div', { class: 'card-title' }, c.nome))))) : null,
      h('form', { onsubmit: (e) => { e.preventDefault(); if (name.value.trim()) loginDemo(null, name.value.trim()).then(done); } }, h('div', { class: 'field' }, h('label', { for: 'nome' }, capi.length ? 'Oppure crea un nuovo profilo' : 'Crea il tuo profilo di capo'), name), h('button', { class: 'btn primary block-btn', type: 'submit' }, 'Entra')));
  } else if (CFG.GOOGLE_CLIENT_ID) {
    const gbtn = h('div', { class: 'gbtn' });
    const s = h('script', { src: 'https://accounts.google.com/gsi/client', async: true });
    s.onload = () => { window.google.accounts.id.initialize({ client_id: CFG.GOOGLE_CLIENT_ID, callback: (r) => loginGoogle(r.credential).then(done).catch(fail) }); window.google.accounts.id.renderButton(gbtn, { theme: 'filled_black', size: 'large', text: 'signin_with', shape: 'pill', locale: 'it' }); };
    s.onerror = () => { err.textContent = 'Impossibile caricare l\'accesso Google: controlla la connessione.'; };
    document.head.append(s);
    body = h('div', {}, h('p', {}, 'Accedi con il tuo account Google personale. Possono entrare solo i capi in elenco.'), gbtn);
  } else {
    const code = h('input', { type: 'password', id: 'codice', autocomplete: 'current-password' });
    const sel = h('div', {});
    body = h('form', { onsubmit: async (e) => {
      e.preventDefault(); err.textContent = '';
      try {
        const capi = await listProfiles(code.value);
        const name = h('input', { type: 'text', placeholder: 'Nome e cognome', 'aria-label': 'Nuovo profilo' });
        sel.replaceChildren(h('div', { class: 'field' }, h('label', {}, 'Chi sei?'), h('div', { class: 'cards' }, capi.map((c) => h('button', { class: 'card', type: 'button', onclick: () => loginCode(code.value, c.id).then(done).catch(fail) }, h('div', { class: 'card-title' }, c.nome))))),
          h('div', { class: 'field' }, h('label', {}, 'Oppure nuovo profilo'), name, h('button', { class: 'btn', type: 'button', onclick: () => name.value.trim() && loginCode(code.value, null, name.value.trim()).then(done).catch(fail) }, 'Crea ed entra')));
      } catch (ex) { fail(ex); }
    } }, h('div', { class: 'field' }, h('label', { for: 'codice' }, 'Codice dello staff'), code), h('button', { class: 'btn primary block-btn', type: 'submit' }, 'Continua'), sel);
  }
  app.replaceChildren(h('div', { class: 'login' }, h('img', { src: 'icons/icon.svg', alt: '', width: 72, height: 72 }), h('h1', {}, NAME), CFG.NOME_GRUPPO ? h('p', { class: 'eyebrow' }, CFG.NOME_GRUPPO) : null, body, err));
}

(async function start() {
  let ok = false, msg = '';
  try { ok = await boot(); } catch (e) { msg = e.message; }
  if (!ok) return loginScreen(msg);
  window.addEventListener('hashchange', () => render(false));
  render(false);
  reminderPopup();
  try { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* niente */ }
  void toast;
})();
