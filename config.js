// ============================================================
//  CONFIGURAZIONE DELL'APP  (unico file da modificare)
// ============================================================
//  Finché API_URL è vuoto l'app funziona in MODALITÀ DEMO:
//  i dati restano solo nel browser di chi la usa.
//  Quando incolli l'indirizzo della web app di Google Apps Script,
//  l'app legge e scrive su Google Sheets, Drive e Calendar.
// ============================================================
window.SCOUT_CONFIG = {
  // Nome mostrato in alto e nella schermata di accesso
  NOME_APP: 'Staff R/S',
  NOME_GRUPPO: 'Vulclan RS Resana 1',                // es. "Castelfranco 1"

  // Indirizzo della web app Apps Script (finisce con /exec)
  API_URL: '',

  // ID client OAuth di Google per l'accesso con account personale.
  // Se vuoto, l'accesso avviene con il codice staff + scelta del profilo.
  GOOGLE_CLIENT_ID: '',
};
