const SPREADSHEET_ID = "1un2vHvkFn8V9T9JQkDYhDu_WYGXY584ilDuACKzt-Ak";
const FINES_SHEET = "Multes";
const PLAYERS_SHEET = "Jugadors";

const FINE_SETTINGS = {
  "Arribar tard": { mode: "manual", min: 1, max: 20, hint: "Indica l'import segons el retard" },
  "No assistir partit": { mode: "fixed", amount: 20 },
  "Saltar-se entreno": { mode: "fixed", amount: 5 },
  "Deixar-se la blanca": { mode: "fixed", amount: 10 },
  "Tècnica": { mode: "manual", min: 5, max: 20, step: 5, hint: "5 €, 10 €, 15 € o 20 €" },
  "Aigua": { mode: "fixed", amount: 1 },
  "Fallar entrada sol": { mode: "fixed", amount: 1 },
  "No assistir sopar": { mode: "fixed", amount: 10 },
  "No anar Carpa/Espai": { mode: "manual", min: 0.5, max: 100, hint: "Indica l'import" },
  "Multa Extra": { mode: "manual", min: 0.5, max: 100, hint: "Indica l'import i el motiu" },
  "Fallar TL tècnica": { mode: "fixed", amount: 1 },
  "Mòbil": { mode: "manual", min: 0.5, max: 100, hint: "Indica l'import" },
  "Peto divendres": { mode: "fixed", amount: 3 },
  "Tir mig entreno": { mode: "fixed", amount: 1 }
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Afegir multa · Senior B")
    .setFaviconUrl("https://xgerardlopez.github.io/multesSeniorB/img/logo.png")
    .addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function getBootstrapData() {
  return {
    players: getPlayers_(),
    fines: getFineTypes_(),
    today: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd")
  };
}

function saveFine(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const player = String(payload.player || "").trim();
    const fineId = String(payload.fineId || "").trim();
    const comment = String(payload.comment || "").trim().slice(0, 250);
    const dateText = String(payload.date || "").trim();
    const fine = getFineTypes_().find(item => item.id === fineId);
    const players = getPlayers_();

    if (!players.includes(player)) throw new Error("Selecciona un jugador vàlid.");
    if (!fine) throw new Error("Selecciona una multa vàlida.");

    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Indica un import vàlid.");
    if (fine.min && amount < fine.min) throw new Error(`L'import mínim és ${fine.min} €.`);
    if (fine.max && amount > fine.max) throw new Error(`L'import màxim és ${fine.max} €.`);
    if (fine.step && amount % fine.step !== 0) throw new Error(`L'import ha de ser múltiple de ${fine.step} €.`);
    if (fine.label === "Multa Extra" && !comment) throw new Error("Escriu el motiu de la multa extra.");

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
    if (!match) throw new Error("Selecciona una data vàlida.");

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== Number(match[1]) ||
      date.getMonth() !== Number(match[2]) - 1 ||
      date.getDate() !== Number(match[3])
    ) throw new Error("Selecciona una data vàlida.");

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FINES_SHEET);
    if (!sheet) throw new Error("No s'ha trobat la pestanya Multes.");

    const row = sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, 6).setValues([[
      player,
      fine.label,
      amount,
      comment,
      date,
      "Pendent"
    ]]);
    sheet.getRange(row, 3).setNumberFormat('0.00 "€"');
    sheet.getRange(row, 5).setNumberFormat("dd/MM/yyyy");
    SpreadsheetApp.flush();

    return {
      ok: true,
      player,
      fine: fine.label,
      amount,
      date: Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy")
    };
  } finally {
    lock.releaseLock();
  }
}

function getFineTypes_() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FINES_SHEET);
  if (!sheet) throw new Error("No s'ha trobat la pestanya Multes.");

  const rules = sheet.getRange(2, 2, Math.max(sheet.getMaxRows() - 1, 1), 1)
    .getDataValidations()
    .flat();
  const rule = rules.find(item => item);
  if (!rule) throw new Error("No s'ha trobat el desplegable de multes al Google Sheets.");

  const type = rule.getCriteriaType();
  const values = rule.getCriteriaValues();
  let labels = [];

  if (type === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
    labels = values[0] || [];
  } else if (type === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
    labels = values[0].getDisplayValues().flat();
  } else {
    throw new Error("El desplegable de multes no té un format compatible.");
  }

  return [...new Set(labels.map(value => String(value).trim()).filter(Boolean))]
    .map(label => ({
      id: label,
      label,
      mode: "manual",
      min: 0.5,
      max: 100,
      hint: "Indica l'import",
      ...(FINE_SETTINGS[label] || {})
    }));
}

function getPlayers_() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PLAYERS_SHEET);
  if (!sheet) throw new Error("No s'ha trobat la pestanya Jugadors.");

  const lastRow = Math.max(sheet.getLastRow(), 3);
  const players = sheet.getRange(3, 1, lastRow - 2, 2)
    .getDisplayValues()
    .filter(row => row[0].trim() && row[1].trim() && row[1].trim().toLowerCase() !== "total")
    .map(row => row[1].trim());

  return [...new Set(players)];
}
