// Schema dati: ogni tabella corrisponde a un foglio di Google Sheets.
// Tipi campo: text, area, date, datetime, num, money, bool, sel, multi,
//             ref, mref, url, file, tel, email, chi

export const UNITA = ['Clan', 'Noviziato', 'Partenti', 'Staff'];
export const UNITA_RAGAZZI = ['Clan', 'Noviziato', 'Partenti'];
export const REGIONI = ['Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
  'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche', 'Molise', 'Piemonte',
  'Puglia', 'Sardegna', 'Sicilia', 'Toscana', 'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta",
  'Veneto', 'Estero'];
export const RICORRENZE = { 'Nessuna': 0, 'Ogni settimana': 7, 'Ogni 2 settimane': 14, 'Ogni mese': 'm1',
  'Ogni 2 mesi': 'm2', 'Ogni 3 mesi': 'm3', 'Ogni 6 mesi': 'm6', 'Ogni anno': 'm12' };
export const COLLEGAMENTI = { '': '—', '#/servizi': 'Riepilogo servizi', '#/t/strada': 'Punti della strada',
  '#/t/ragazzi': 'Ragazzi', '#/t/attivita': 'Attività', '#/t/todo': 'Cose da fare', '#/bilancio': 'Bilancio',
  '#/t/movimenti': 'Spese e incassi', '#/t/campi': 'Campi e route', '#/t/strutture': 'Ospitalità',
  '#/t/carte': 'Carta di clan', '#/programmi': 'Programmi', '#/calendario': 'Calendario' };

const d = (s) => (s ? s.split('-').reverse().join('/') : '');
const eur = (n) => (n === '' || n == null ? '' : '€ ' + Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const arr = (v) => (Array.isArray(v) ? v.join(', ') : v || '');

export const T = {
  anni: {
    label: 'Anni scout', sing: 'anno', icon: '📅',
    title: (r) => r.nome,
    card: (r) => ({ t: r.nome, s: [d(r.inizio), d(r.fine)].filter(Boolean).join(' → ') }),
    sort: (a, b) => (b.inizio || '').localeCompare(a.inizio || ''),
    fields: [
      { k: 'nome', l: 'Nome (es. 2026-27)', t: 'text', req: 1 },
      { k: 'inizio', l: 'Inizio', t: 'date' },
      { k: 'fine', l: 'Fine', t: 'date' },
      { k: 'note', l: 'Note', t: 'area' },
    ],
  },

  capi: {
    label: 'Capi', sing: 'capo', icon: '🧭',
    title: (r) => r.nome,
    card: (r) => ({ t: r.nome, s: [r.ruolo, arr(r.unita)].filter(Boolean).join(' · '), b: r.disattivato ? ['non attivo'] : [] }),
    sort: (a, b) => (a.nome || '').localeCompare(b.nome || ''),
    fields: [
      { k: 'nome', l: 'Nome e cognome', t: 'text', req: 1 },
      { k: 'email', l: 'Account Google (email di accesso)', t: 'email' },
      { k: 'telefono', l: 'Telefono', t: 'tel' },
      { k: 'ruolo', l: 'Ruolo', t: 'sel', o: ['Capo clan', 'Capo fuoco', 'Maestro dei novizi', 'Aiuto capo', 'Assistente ecclesiastico', 'Altro'] },
      { k: 'unita', l: 'Unità seguite', t: 'multi', o: UNITA_RAGAZZI },
      { k: 'disattivato', l: 'Non più in staff (accesso disattivato)', t: 'bool' },
    ],
  },

  ragazzi: {
    label: 'Ragazzi', sing: 'ragazzo/a', icon: '🎒', notes: 1,
    hint: 'Dati anagrafici e contatti: niente informazioni sanitarie.',
    title: (r) => [r.nome, r.cognome].filter(Boolean).join(' '),
    card: (r) => ({ t: [r.nome, r.cognome].filter(Boolean).join(' '), s: r.telefono || '', b: [r.unita, r.stato !== 'Attivo' ? r.stato : null] }),
    sort: (a, b) => (a.cognome || a.nome || '').localeCompare(b.cognome || b.nome || ''),
    filters: ['unita', 'stato'],
    defaults: () => ({ stato: 'Attivo', unita: 'Clan' }),
    fields: [
      { k: 'nome', l: 'Nome', t: 'text', req: 1 },
      { k: 'cognome', l: 'Cognome', t: 'text' },
      { k: 'unita', l: 'Unità', t: 'sel', o: UNITA_RAGAZZI, req: 1 },
      { k: 'stato', l: 'Stato', t: 'sel', o: ['Attivo', 'Partenza presa', 'Uscito'] },
      { k: 'data_nascita', l: 'Data di nascita', t: 'date', sec: 'Anagrafica' },
      { k: 'luogo_nascita', l: 'Luogo di nascita', t: 'text', sec: 'Anagrafica' },
      { k: 'indirizzo', l: 'Residenza: indirizzo', t: 'text', sec: 'Anagrafica' },
      { k: 'comune', l: 'Residenza: comune', t: 'text', sec: 'Anagrafica' },
      { k: 'telefono', l: 'Cellulare', t: 'tel', sec: 'Contatti' },
      { k: 'email', l: 'Email', t: 'email', sec: 'Contatti' },
      { k: 'genitore', l: 'Genitore di riferimento', t: 'text', sec: 'Contatti' },
      { k: 'telefono_genitore', l: 'Cellulare del genitore', t: 'tel', sec: 'Contatti' },
      { k: 'ingresso', l: 'In comunità R/S dal', t: 'date', sec: 'Percorso' },
      { k: 'firma_carta', l: 'Firma della carta di clan', t: 'date', sec: 'Percorso' },
    ],
    related: [
      { t: 'servizi', fk: 'ragazzo_id', l: 'Servizio' },
      { t: 'strada', fk: 'ragazzo_id', l: 'Punto della strada' },
    ],
  },

  servizi: {
    label: 'Servizi', sing: 'servizio', icon: '🤝', year: 1,
    title: (r, x) => (r.dove || 'Servizio') + (x ? ' – ' + x.name('ragazzi', r.ragazzo_id) : ''),
    card: (r, x) => ({ t: x.name('ragazzi', r.ragazzo_id) || '—', s: [r.dove, r.tipo].filter(Boolean).join(' · '), r: r.dal ? 'dal ' + d(r.dal) : '' }),
    filters: ['tipo'],
    fields: [
      { k: 'ragazzo_id', l: 'Ragazzo/a', t: 'ref', ref: 'ragazzi', req: 1 },
      { k: 'dove', l: 'Dove (realtà di servizio)', t: 'text', req: 1 },
      { k: 'tipo', l: 'Tipo', t: 'sel', o: ['Associativo', 'Extra-associativo'] },
      { k: 'referente', l: 'Referente', t: 'text' },
      { k: 'contatto', l: 'Contatto del referente', t: 'text' },
      { k: 'dal', l: 'Dal', t: 'date' },
      { k: 'al', l: 'Al', t: 'date' },
      { k: 'ultima_verifica', l: 'Ultima verifica', t: 'date' },
      { k: 'verifica', l: 'Verifica', t: 'area' },
    ],
  },

  strada: {
    label: 'Punti della strada', sing: 'punto della strada', icon: '🥾',
    title: (r, x) => 'Punto della strada' + (x ? ' – ' + x.name('ragazzi', r.ragazzo_id) : ''),
    card: (r, x) => ({ t: x.name('ragazzi', r.ragazzo_id) || '—', s: [r.passo, r.impegni].filter(Boolean).join(' · '), r: d(r.data) }),
    sort: (a, b) => (b.data || '').localeCompare(a.data || ''),
    filters: ['passo'],
    fields: [
      { k: 'ragazzo_id', l: 'Ragazzo/a', t: 'ref', ref: 'ragazzi', req: 1 },
      { k: 'data', l: 'Data', t: 'date', req: 1 },
      { k: 'passo', l: 'Passi di…', t: 'sel', o: ['Scoperta', 'Competenza', 'Responsabilità'] },
      { k: 'impegni', l: 'Impegni presi', t: 'area' },
      { k: 'verifica', l: 'Verifica', t: 'area' },
      { k: 'prossima_verifica', l: 'Prossima verifica', t: 'date' },
    ],
  },

  note: {
    label: 'Note', sing: 'nota', hidden: 1,
    title: (r) => (r.testo || '').slice(0, 40),
    fields: [{ k: 'rif', l: 'Riferimento', t: 'text' }, { k: 'testo', l: 'Nota', t: 'area', req: 1 }],
  },

  obiettivi: {
    label: 'Obiettivi', sing: 'obiettivo', icon: '🎯', year: 1,
    title: (r) => r.testo,
    card: (r, x) => ({ t: r.testo, s: [r.livello === 'Obiettivo specifico' ? x.name('obiettivi', r.area_id) : r.progetto, arr(r.unita)].filter(Boolean).join(' · '), b: [r.livello] }),
    defaults: () => ({ livello: 'Obiettivo specifico' }),
    fields: [
      { k: 'livello', l: 'Livello', t: 'sel', o: ['Area', 'Obiettivo specifico'], req: 1 },
      { k: 'progetto', l: 'Progetto di riferimento', t: 'sel', o: ['Progetto educativo di gruppo', 'Progetto di branca', 'Programma di unità'] },
      { k: 'area_id', l: 'Area (per gli obiettivi specifici)', t: 'ref', ref: 'obiettivi', filter: (r) => r.livello === 'Area' },
      { k: 'testo', l: 'Testo', t: 'area', req: 1 },
      { k: 'unita', l: 'Unità', t: 'multi', o: UNITA_RAGAZZI },
      { k: 'verifica', l: 'Verifica periodica', t: 'area' },
    ],
  },

  attivita: {
    label: 'Attività', sing: 'attività', icon: '🔥', year: 1, notes: 1,
    title: (r) => r.titolo,
    card: (r, x) => ({ t: r.titolo, s: [r.tipo, arr(r.unita), x.name('campi', r.campo_id)].filter(Boolean).join(' · '), r: d(r.data) }),
    sort: (a, b) => (a.data || '9999').localeCompare(b.data || '9999'),
    filters: ['tipo', 'unita'],
    defaults: () => ({ tipo: 'Attività' }),
    fields: [
      { k: 'titolo', l: 'Titolo', t: 'text', req: 1 },
      { k: 'tipo', l: 'Tipo', t: 'sel', o: ['Attività', 'Riunione di staff', 'Uscita', 'Altro'] },
      { k: 'data', l: 'Data', t: 'date' },
      { k: 'unita', l: 'Unità', t: 'multi', o: UNITA },
      { k: 'campo_id', l: 'Fa parte del campo / route', t: 'ref', ref: 'campi' },
      { k: 'obiettivi', l: 'Obiettivi a cui risponde', t: 'mref', ref: 'obiettivi', filter: (r) => r.livello !== 'Area' },
      { k: 'descrizione', l: 'Descrizione generale', t: 'area' },
      { k: 'formazione_resp', l: 'Chi la prepara', t: 'ref', ref: 'capi', sec: 'Formazione' },
      { k: 'formazione', l: 'Contenuti', t: 'area', sec: 'Formazione' },
      { k: 'tecnica_resp', l: 'Chi la prepara', t: 'ref', ref: 'capi', sec: 'Tecnica' },
      { k: 'tecnica', l: 'Contenuti', t: 'area', sec: 'Tecnica' },
      { k: 'preghiera_resp', l: 'Chi la prepara', t: 'ref', ref: 'capi', sec: 'Preghiera' },
      { k: 'preghiera', l: 'Contenuti', t: 'area', sec: 'Preghiera' },
      { k: 'logistica_resp', l: 'Chi se ne occupa', t: 'ref', ref: 'capi', sec: 'Logistica e materiali' },
      { k: 'logistica', l: 'Logistica e materiali', t: 'area', sec: 'Logistica e materiali' },
      { k: 'verifica', l: 'Verifica (com\'è andata rispetto agli obiettivi)', t: 'area', sec: 'Verifica' },
    ],
    related: [
      { t: 'todo', fk: 'attivita_id', l: 'Cose da fare' },
      { t: 'movimenti', fk: 'attivita_id', l: 'Spese e incassi' },
    ],
  },

  todo: {
    label: 'Cose da fare', sing: 'compito', icon: '✅', year: 1,
    title: (r) => r.titolo,
    card: (r, x) => ({ t: r.titolo, s: [x.name('capi', r.assegnato_a) || 'Non assegnato', x.name('attivita', r.attivita_id) || x.name('campi', r.campo_id) || r.ambito].filter(Boolean).join(' · '), r: d(r.scadenza), b: [r.stato], done: r.stato === 'Fatto' }),
    sort: (a, b) => (a.stato === 'Fatto') - (b.stato === 'Fatto') || (a.scadenza || '9999').localeCompare(b.scadenza || '9999'),
    filters: ['stato', 'assegnato_a', 'ambito'],
    defaults: (x) => ({ stato: 'Da fare', ambito: 'Staff', assegnato_a: x.user?.id }),
    fields: [
      { k: 'titolo', l: 'Cosa c\'è da fare', t: 'text', req: 1 },
      { k: 'assegnato_a', l: 'Assegnato a', t: 'ref', ref: 'capi' },
      { k: 'scadenza', l: 'Scadenza', t: 'date' },
      { k: 'stato', l: 'Stato', t: 'sel', o: ['Da fare', 'In corso', 'Fatto'] },
      { k: 'ambito', l: 'Ambito', t: 'sel', o: ['Staff', 'Attività', 'Campo', 'Altro'] },
      { k: 'attivita_id', l: 'Attività collegata', t: 'ref', ref: 'attivita' },
      { k: 'campo_id', l: 'Campo collegato', t: 'ref', ref: 'campi' },
      { k: 'note', l: 'Note', t: 'area' },
    ],
  },

  campi: {
    label: 'Campi e route', sing: 'campo', icon: '⛺', year: 1, notes: 1,
    title: (r) => r.titolo,
    card: (r) => ({ t: r.titolo, s: [r.tipo, r.luogo, arr(r.unita)].filter(Boolean).join(' · '), r: [d(r.dal), d(r.al)].filter(Boolean).join(' → ') }),
    sort: (a, b) => (a.dal || '9999').localeCompare(b.dal || '9999'),
    filters: ['tipo', 'unita'],
    fields: [
      { k: 'titolo', l: 'Titolo (es. Campetto invernale 2025-26)', t: 'text', req: 1 },
      { k: 'tipo', l: 'Tipo', t: 'sel', o: ['Route di strada', 'Route di servizio', 'Campetto (3 giorni)', 'Campo invernale', 'Uscita', 'Altro'], req: 1 },
      { k: 'dal', l: 'Dal', t: 'date' },
      { k: 'al', l: 'Al', t: 'date' },
      { k: 'luogo', l: 'Luogo / percorso', t: 'text' },
      { k: 'unita', l: 'Unità', t: 'multi', o: UNITA },
      { k: 'programma', l: 'Programma generale', t: 'area' },
      { k: 'documento', l: 'Documento / programma dettagliato', t: 'file' },
      { k: 'verifica', l: 'Verifica', t: 'area' },
    ],
    related: [
      { t: 'utilizzi', fk: 'campo_id', l: 'Ospitalità', go: (r) => '#/t/strutture/' + r.struttura_id, alt: 'struttura' },
      { t: 'attivita', fk: 'campo_id', l: 'Attività del campo' },
      { t: 'todo', fk: 'campo_id', l: 'Cose da fare' },
      { t: 'movimenti', fk: 'campo_id', l: 'Spese e incassi' },
    ],
  },

  strutture: {
    label: 'Ospitalità', sing: 'struttura', icon: '🏠', notes: 1,
    title: (r) => r.nome,
    card: (r) => ({ t: r.nome, s: [r.localita, r.provincia && '(' + r.provincia + ')', r.regione].filter(Boolean).join(' '), r: r.costo_notte !== '' && r.costo_notte != null ? eur(r.costo_notte) + '/notte' : '', b: r.caratteristiche || [] }),
    sort: (a, b) => (a.nome || '').localeCompare(b.nome || ''),
    filters: ['regione', 'caratteristiche', 'tipo'],
    fields: [
      { k: 'nome', l: 'Nome della struttura', t: 'text', req: 1 },
      { k: 'tipo', l: 'Tipo di struttura', t: 'sel', o: ['Casa scout', 'Parrocchia / oratorio', 'Rifugio', 'Convento / monastero', 'Casa privata', 'Terreno per tende', 'Altro'] },
      { k: 'referente', l: 'Nome del referente', t: 'text' },
      { k: 'telefono', l: 'Telefono', t: 'tel' },
      { k: 'email', l: 'Email', t: 'email' },
      { k: 'sito', l: 'Sito web', t: 'url' },
      { k: 'localita', l: 'Località', t: 'text' },
      { k: 'provincia', l: 'Provincia', t: 'text' },
      { k: 'regione', l: 'Regione', t: 'sel', o: REGIONI },
      { k: 'indirizzo', l: 'Indirizzo', t: 'text' },
      { k: 'costo_notte', l: 'Costo per notte (indicativo)', t: 'money' },
      { k: 'costo_note', l: 'Come si calcola (a persona, forfait…)', t: 'text' },
      { k: 'posti', l: 'Posti', t: 'num' },
      { k: 'caratteristiche', l: 'Caratteristiche', t: 'multi', o: ['Montagna', 'Collina', 'Pianura', 'Mare', 'Lago', 'Città', 'Cucina', 'Riscaldamento', 'Spazio tende', 'Raggiungibile con mezzi pubblici'] },
    ],
    related: [
      { t: 'utilizzi', fk: 'struttura_id', l: 'Quando l\'abbiamo usata', go: (r) => (r.campo_id ? '#/t/campi/' + r.campo_id : r.attivita_id ? '#/t/attivita/' + r.attivita_id : null), alt: 'uso' },
    ],
  },

  utilizzi: {
    label: 'Utilizzi delle strutture', sing: 'utilizzo', hidden: 1,
    title: (r, x) => x.name('strutture', r.struttura_id) + ' → ' + (x.name('campi', r.campo_id) || x.name('attivita', r.attivita_id) || ''),
    card: (r, x, alt) => alt === 'struttura'
      ? { t: x.name('strutture', r.struttura_id) || '—', s: [d(r.dal), d(r.al)].filter(Boolean).join(' → '), r: r.costo_notte !== '' && r.costo_notte != null ? eur(r.costo_notte) + '/notte' : '' }
      : { t: x.name('campi', r.campo_id) || x.name('attivita', r.attivita_id) || 'Utilizzo', s: [[d(r.dal), d(r.al)].filter(Boolean).join(' → '), r.note].filter(Boolean).join(' · '), r: r.costo_notte !== '' && r.costo_notte != null ? eur(r.costo_notte) + '/notte' : '', link: 1 },
    sort: (a, b) => (b.dal || '').localeCompare(a.dal || ''),
    fields: [
      { k: 'struttura_id', l: 'Struttura', t: 'ref', ref: 'strutture', req: 1 },
      { k: 'campo_id', l: 'Campo / route', t: 'ref', ref: 'campi', allYears: 1 },
      { k: 'attivita_id', l: 'oppure attività', t: 'ref', ref: 'attivita', allYears: 1 },
      { k: 'dal', l: 'Dal', t: 'date' },
      { k: 'al', l: 'Al', t: 'date' },
      { k: 'costo_notte', l: 'Costo per notte pagato', t: 'money' },
      { k: 'note', l: 'Com\'è andata / note', t: 'area' },
    ],
  },

  movimenti: {
    label: 'Spese e incassi', sing: 'movimento', icon: '💶', year: 1,
    title: (r) => r.descrizione || r.tipo,
    card: (r, x) => ({ t: r.descrizione || x.name('causali', r.causale_id) || r.tipo, s: [x.name('causali', r.causale_id), r.chi, r.unita].filter(Boolean).join(' · '), r: (r.tipo === 'Incasso' ? '+ ' : '− ') + eur(r.importo), sub: d(r.data), b: [r.da_rimborsare && !r.rimborsato ? 'da rimborsare' : null, r.foto ? '📎' : null], pos: r.tipo === 'Incasso' }),
    sort: (a, b) => (b.data || '').localeCompare(a.data || ''),
    filters: ['tipo', 'causale_id', 'unita', 'chi'],
    defaults: (x) => ({ tipo: 'Spesa', data: new Date().toISOString().slice(0, 10), chi: x.user?.nome, metodo: 'Contanti', unita: 'Clan' }),
    fields: [
      { k: 'tipo', l: 'Tipo', t: 'sel', o: ['Spesa', 'Incasso'], req: 1 },
      { k: 'data', l: 'Data', t: 'date', req: 1 },
      { k: 'importo', l: 'Importo (€)', t: 'money', req: 1 },
      { k: 'causale_id', l: 'Causale (voce di bilancio)', t: 'ref', ref: 'causali', filter: (c, v) => !c.tipo || c.tipo === 'Entrambi' || c.tipo === v.tipo },
      { k: 'descrizione', l: 'Descrizione', t: 'text' },
      { k: 'chi', l: 'Chi ha pagato / incassato', t: 'chi' },
      { k: 'metodo', l: 'Come', t: 'sel', o: ['Contanti', 'Carta / bancomat', 'Bonifico', 'Satispay / PayPal', 'Altro'] },
      { k: 'unita', l: 'Per chi', t: 'sel', o: ['Clan', 'Noviziato', 'Partenti', 'Staff', 'Tutta la comunità R/S'] },
      { k: 'attivita_id', l: 'Attività collegata', t: 'ref', ref: 'attivita' },
      { k: 'campo_id', l: 'Campo collegato', t: 'ref', ref: 'campi' },
      { k: 'da_rimborsare', l: 'Anticipata di tasca propria (da rimborsare)', t: 'bool' },
      { k: 'rimborsato', l: 'Già rimborsata', t: 'bool' },
      { k: 'foto', l: 'Foto scontrino / fattura', t: 'file', folder: 'Ricevute' },
      { k: 'note', l: 'Note', t: 'area' },
    ],
  },

  causali: {
    label: 'Causali di bilancio', sing: 'causale', icon: '🏷️',
    title: (r) => [r.codice, r.descrizione].filter(Boolean).join(' – '),
    card: (r) => ({ t: [r.codice, r.descrizione].filter(Boolean).join(' – '), b: [r.tipo] }),
    sort: (a, b) => (a.codice || '').localeCompare(b.codice || '', 'it', { numeric: true }),
    filters: ['tipo'],
    fields: [
      { k: 'codice', l: 'Codice', t: 'text' },
      { k: 'descrizione', l: 'Descrizione', t: 'text', req: 1 },
      { k: 'tipo', l: 'Vale per', t: 'sel', o: ['Spesa', 'Incasso', 'Entrambi'] },
    ],
  },

  eventi: {
    label: 'Appuntamenti', sing: 'appuntamento', icon: '🗓️', hidden: 1,
    title: (r) => r.titolo,
    card: (r) => ({ t: r.titolo, s: [r.livello, arr(r.destinatari), r.luogo].filter(Boolean).join(' · '), r: d((r.inizio || '').slice(0, 10)), b: [r.visibile_ragazzi ? 'condiviso' : 'solo capi'] }),
    sort: (a, b) => (a.inizio || '').localeCompare(b.inizio || ''),
    defaults: () => ({ livello: 'Gruppo', destinatari: ['Capi'] }),
    fields: [
      { k: 'tipo_id', l: 'Tipo di appuntamento (precompila i campi)', t: 'ref', ref: 'tipi_evento' },
      { k: 'titolo', l: 'Titolo', t: 'text', req: 1 },
      { k: 'livello', l: 'Livello', t: 'sel', o: ['Gruppo', 'Branca / staff', 'Zona', 'Regione', 'Nazionale'] },
      { k: 'destinatari', l: 'Per chi', t: 'multi', o: ['Capi', 'Clan', 'Noviziato', 'Partenti'] },
      { k: 'tutto_il_giorno', l: 'Tutto il giorno', t: 'bool' },
      { k: 'inizio', l: 'Inizio', t: 'datetime', req: 1 },
      { k: 'fine', l: 'Fine', t: 'datetime' },
      { k: 'luogo', l: 'Luogo', t: 'text' },
      { k: 'visibile_ragazzi', l: 'Condiviso con i ragazzi', t: 'bool' },
      { k: 'note', l: 'Note', t: 'area' },
      { k: 'gcal_id', l: 'ID Google Calendar', t: 'text', hide: 1 },
      { k: 'gcal_cal', l: 'Calendario', t: 'text', hide: 1 },
    ],
  },

  tipi_evento: {
    label: 'Tipi di appuntamento', sing: 'tipo di appuntamento', icon: '🧩',
    title: (r) => r.nome,
    card: (r) => ({ t: r.nome, s: [r.livello, arr(r.destinatari)].filter(Boolean).join(' · '), b: [r.visibile_ragazzi ? 'condiviso' : null] }),
    sort: (a, b) => (a.nome || '').localeCompare(b.nome || ''),
    fields: [
      { k: 'nome', l: 'Nome', t: 'text', req: 1 },
      { k: 'livello', l: 'Livello', t: 'sel', o: ['Gruppo', 'Branca / staff', 'Zona', 'Regione', 'Nazionale'] },
      { k: 'destinatari', l: 'Per chi', t: 'multi', o: ['Capi', 'Clan', 'Noviziato', 'Partenti'] },
      { k: 'visibile_ragazzi', l: 'Condiviso con i ragazzi', t: 'bool' },
      { k: 'luogo', l: 'Luogo abituale', t: 'text' },
      { k: 'note', l: 'Note precompilate', t: 'area' },
    ],
  },

  promemoria: {
    label: 'Promemoria', sing: 'promemoria', icon: '🔔',
    title: (r) => r.testo,
    card: (r, x) => ({ t: r.testo, s: [r.ricorrenza, (r.destinatari || []).map((i) => x.name('capi', i)).join(', ') || 'Tutti i capi'].filter(Boolean).join(' · '), r: d(r.prossima), b: [r.completato ? 'chiuso' : null], done: r.completato }),
    sort: (a, b) => (a.prossima || '9999').localeCompare(b.prossima || '9999'),
    defaults: () => ({ ricorrenza: 'Nessuna', mostra_in: ['Apertura app'] }),
    fields: [
      { k: 'testo', l: 'Cosa ricordare', t: 'text', req: 1 },
      { k: 'prossima', l: 'Quando (prossima data)', t: 'date', req: 1 },
      { k: 'ricorrenza', l: 'Si ripete', t: 'sel', o: Object.keys(RICORRENZE) },
      { k: 'collegamento', l: 'Apre la scheda', t: 'sel', o: Object.keys(COLLEGAMENTI), ol: COLLEGAMENTI },
      { k: 'mostra_in', l: 'Dove compare l\'avviso', t: 'multi', o: ['Apertura app', 'Programmazione attività', 'Cose da fare dello staff'] },
      { k: 'destinatari', l: 'Per chi (vuoto = tutti i capi)', t: 'mref', ref: 'capi' },
      { k: 'dettagli', l: 'Dettagli', t: 'area' },
      { k: 'completato', l: 'Chiuso', t: 'bool' },
    ],
  },

  carte: {
    label: 'Carta di clan', sing: 'carta', icon: '📜',
    title: (r) => 'Carta di ' + (r.unita || 'clan').toLowerCase() + (r.data_scrittura ? ' del ' + d(r.data_scrittura) : ''),
    card: (r, x) => ({ t: 'Carta di ' + (r.unita || 'clan').toLowerCase(), s: [r.occasione, x.name('anni', r.anno_rif)].filter(Boolean).join(' · '), r: d(r.data_scrittura), b: [r.pdf ? 'PDF' : 'PDF mancante'] }),
    sort: (a, b) => (b.data_scrittura || '').localeCompare(a.data_scrittura || ''),
    defaults: (x) => ({ unita: 'Clan', anno_rif: x.anno }),
    fields: [
      { k: 'unita', l: 'Unità', t: 'sel', o: ['Clan', 'Noviziato'], req: 1 },
      { k: 'data_scrittura', l: 'Data di scrittura', t: 'date', req: 1 },
      { k: 'data_firma', l: 'Data della firma', t: 'date' },
      { k: 'anno_rif', l: 'Anno scout', t: 'ref', ref: 'anni' },
      { k: 'occasione', l: 'Occasione (route, uscita…)', t: 'text' },
      { k: 'firmatari', l: 'Chi l\'ha firmata', t: 'area' },
      { k: 'pdf', l: 'PDF della carta', t: 'file', folder: 'Carta di clan' },
      { k: 'note', l: 'Note', t: 'area' },
    ],
  },

  documenti: {
    label: 'Link e documenti', sing: 'link / documento', icon: '🔗',
    title: (r) => r.titolo,
    card: (r) => ({ t: r.titolo, s: [r.categoria, arr(r.unita), r.note].filter(Boolean).join(' · '), b: [r.sezione, !(r.url || r.file) ? 'da inserire' : null] }),
    sort: (a, b) => (a.sezione || '').localeCompare(b.sezione || '') || (a.titolo || '').localeCompare(b.titolo || ''),
    filters: ['sezione', 'categoria'],
    defaults: () => ({ sezione: 'Link rapidi' }),
    fields: [
      { k: 'sezione', l: 'Sezione dell\'app', t: 'sel', o: ['Programmi', 'Formazione', 'Link rapidi'], req: 1 },
      { k: 'categoria', l: 'Categoria', t: 'sel', o: ['Progetto educativo di gruppo', 'Progetto di branca', 'Programma di unità', 'Drive di zona', 'Metodo', 'Formativo particolare', 'Eventi per ragazzi', 'Altro'] },
      { k: 'titolo', l: 'Titolo', t: 'text', req: 1 },
      { k: 'url', l: 'Indirizzo (link)', t: 'url' },
      { k: 'file', l: 'oppure file', t: 'file', folder: 'Documenti' },
      { k: 'unita', l: 'Mostra nella pagina di', t: 'multi', o: ['Home', 'Clan', 'Noviziato', 'Partenti'] },
      { k: 'note', l: 'Note', t: 'area' },
    ],
  },
};

// ---- Dati iniziali (inseriti al primo avvio, tutti modificabili) ----
export function seeds() {
  const now = new Date();
  const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const BC = 'https://buonacaccia.agesci.it/Events.aspx';
  return {
    anni: [{ id: 'anno_' + y, nome: y + '-' + String(y + 1).slice(2), inizio: y + '-10-01', fine: (y + 1) + '-09-30' }],
    causali: [
      // Voci del Rendiconto per cassa (Modello D, enti del Terzo settore) usato da AGESCI
      ['E-A1', 'Quote associative e apporti dei fondatori', 'Incasso'], ['E-A2', 'Entrate dagli associati per attività mutualistiche', 'Incasso'],
      ['E-A3', 'Prestazioni e cessioni ad associati e fondatori', 'Incasso'], ['E-A4', 'Erogazioni liberali', 'Incasso'],
      ['E-A5', 'Entrate del 5 per mille', 'Incasso'], ['E-A6', 'Contributi da soggetti privati', 'Incasso'],
      ['E-A7', 'Entrate per prestazioni e cessioni a terzi', 'Incasso'], ['E-A8', 'Contributi da enti pubblici', 'Incasso'],
      ['E-A9', 'Entrate da contratti con enti pubblici', 'Incasso'], ['E-A10', 'Altre entrate', 'Incasso'],
      ['E-C1', 'Raccolte fondi abituali (autofinanziamento)', 'Incasso'], ['E-C2', 'Raccolte fondi occasionali (autofinanziamento)', 'Incasso'],
      ['U-A1', 'Materie prime, sussidiarie, di consumo e di merci', 'Spesa'], ['U-A2', 'Servizi', 'Spesa'],
      ['U-A3', 'Godimento di beni di terzi', 'Spesa'], ['U-A4', 'Personale', 'Spesa'], ['U-A5', 'Uscite diverse di gestione', 'Spesa'],
      ['U-C1', 'Uscite per raccolte fondi abituali', 'Spesa'], ['U-C2', 'Uscite per raccolte fondi occasionali', 'Spesa'],
    ].map(([codice, descrizione, tipo]) => ({ id: 'cau_' + codice.replace('-', '').toLowerCase(), codice, descrizione, tipo })),
    tipi_evento: [
      ['Riunione di clan', 'Gruppo', ['Capi', 'Clan'], true], ['Riunione di noviziato', 'Gruppo', ['Capi', 'Noviziato'], true],
      ['Staff di branca', 'Branca / staff', ['Capi'], false], ['Attività di gruppo', 'Gruppo', ['Capi', 'Clan', 'Noviziato'], true],
      ['Comunità capi', 'Gruppo', ['Capi'], false], ['Formazione capi di zona', 'Zona', ['Capi'], false],
      ['Challenge di zona', 'Zona', ['Capi', 'Clan', 'Noviziato'], true], ['San Paolo di zona', 'Zona', ['Capi', 'Clan', 'Noviziato'], true],
      ['Uscita', 'Gruppo', ['Capi', 'Clan'], true], ['Route', 'Gruppo', ['Capi', 'Clan'], true],
    ].map(([nome, livello, destinatari, vis], i) => ({ id: 'tipo_' + (i + 1), nome, livello, destinatari, visibile_ragazzi: vis })),
    documenti: [
      { id: 'doc_bc_partenti_it', sezione: 'Link rapidi', categoria: 'Eventi per ragazzi', titolo: 'Uscite partenti – tutta Italia', url: BC + '?CID=3010102', unita: ['Partenti'], note: 'Buona Caccia' },
      { id: 'doc_bc_partenti_ve', sezione: 'Link rapidi', categoria: 'Eventi per ragazzi', titolo: 'Uscite partenti – Veneto', url: BC + '?CID=3010102&RID=Z', unita: ['Partenti'], note: 'Buona Caccia' },
      { id: 'doc_bc_epppi_it', sezione: 'Link rapidi', categoria: 'Eventi per ragazzi', titolo: 'EPPPI – tutta Italia', url: BC + '?CID=3010103', unita: ['Clan'], note: 'Buona Caccia' },
      { id: 'doc_bc_epppi_ve', sezione: 'Link rapidi', categoria: 'Eventi per ragazzi', titolo: 'EPPPI – Veneto', url: BC + '?CID=3010103&RID=Z', unita: ['Clan'], note: 'Buona Caccia' },
      { id: 'doc_bc_ross_it', sezione: 'Link rapidi', categoria: 'Eventi per ragazzi', titolo: 'ROSS – tutta Italia', url: BC + '?CID=3010101', unita: ['Clan'], note: 'Buona Caccia' },
      { id: 'doc_bc_ross_ve', sezione: 'Link rapidi', categoria: 'Eventi per ragazzi', titolo: 'ROSS – Veneto', url: BC + '?CID=3010101&RID=Z', unita: ['Clan'], note: 'Buona Caccia' },
      { id: 'doc_veneto_rs', sezione: 'Link rapidi', categoria: 'Altro', titolo: 'AGESCI Veneto – Branca R/S', url: 'https://veneto.agesci.it/branca-rs/', unita: ['Home'] },
      { id: 'doc_drive_zona', sezione: 'Formazione', categoria: 'Drive di zona', titolo: 'Drive di zona', url: '', unita: ['Home'] },
      { id: 'doc_metodo', sezione: 'Formazione', categoria: 'Metodo', titolo: 'Regolamento metodologico e manuale di branca R/S', url: '' },
      { id: 'doc_peg', sezione: 'Programmi', categoria: 'Progetto educativo di gruppo', titolo: 'Progetto educativo di gruppo', url: '' },
      { id: 'doc_pdb', sezione: 'Programmi', categoria: 'Progetto di branca', titolo: 'Progetto di branca R/S (esempio)', url: 'esempi/progetto-di-branca-esempio.pdf', note: 'Documento di esempio: sostituiscilo con il vostro, oppure scrivilo dagli obiettivi qui sotto' },
      { id: 'doc_pdu', sezione: 'Programmi', categoria: 'Programma di unità', titolo: 'Programma di unità dell\'anno', url: '' },
    ],
    carte: [{ id: 'carta_esempio', unita: 'Clan', data_scrittura: y + '-10-01', anno_rif: 'anno_' + y, occasione: 'ESEMPIO da sostituire', pdf: 'esempi/carta-di-clan-esempio.pdf', note: 'Carta di esempio: carica quella vera con "+ Nuova carta" ed elimina questa.' }],
    promemoria: [
      { id: 'pro_servizi', testo: 'Verifica periodica dei servizi', prossima: addMonths(now, 2), ricorrenza: 'Ogni 2 mesi', collegamento: '#/servizi', mostra_in: ['Apertura app', 'Cose da fare dello staff'] },
      { id: 'pro_strada', testo: 'Punto della strada dei ragazzi', prossima: addMonths(now, 3), ricorrenza: 'Ogni 3 mesi', collegamento: '#/t/strada', mostra_in: ['Apertura app', 'Programmazione attività'] },
    ],
  };
}
function addMonths(dt, n) { const x = new Date(dt); x.setMonth(x.getMonth() + n); return x.toISOString().slice(0, 10); }