// 🔗 Consulta directa al Google Sheets en format CSV
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1un2vHvkFn8V9T9JQkDYhDu_WYGXY584ilDuACKzt-Ak/gviz/tq?tqx=out:csv&sheet=Multes";

// 🕐 Actualitza automàticament cada 15 segons
carregarMultes();
setInterval(carregarMultes, 15000);

// 🔹 Ordre manual de jugadors
const ordreJugadors = [
  "Uri",
  "Geri",
  "Albesa",
  "Calma",
  "Higueras",
  "Nocete",
  "Estany",
  "Urban",
  "Gómez",
  "Barros",
  "Bruno", 
  "Balada"
];

const normalitzarNom = (nom = "") => nom
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim();

const dorsalsJugadors = {
  uri: "1",
  geri: "10",
  albesa: "12",
  calma: "13",
  higueras: "14",
  nocete: "15",
  estany: "17",
  urban: "19",
  gomez: "21",
  barros: "22",
  bruno: "24",
  balada: "C"
};

function parsejarCSV(text) {
  const files = [];
  let fila = [];
  let camp = "";
  let entreCometes = false;

  for (let i = 0; i < text.length; i++) {
    const caracter = text[i];

    if (caracter === '"') {
      if (entreCometes && text[i + 1] === '"') {
        camp += '"';
        i++;
      } else {
        entreCometes = !entreCometes;
      }
    } else if (caracter === "," && !entreCometes) {
      fila.push(camp);
      camp = "";
    } else if ((caracter === "\n" || caracter === "\r") && !entreCometes) {
      if (caracter === "\r" && text[i + 1] === "\n") i++;
      fila.push(camp);
      files.push(fila);
      fila = [];
      camp = "";
    } else {
      camp += caracter;
    }
  }

  if (camp !== "" || fila.length > 0) {
    fila.push(camp);
    files.push(fila);
  }

  return files;
}


async function carregarMultes() {
  try {
    const urlActualitzada = `${SHEET_URL}&_=${Date.now()}`;
    const res = await fetch(urlActualitzada, { cache: "no-store" });
    const text = await res.text();
    const rows = parsejarCSV(text);
    const headers = rows.shift().map(h => h.trim());

    const data = rows
      .filter(r => r.length >= headers.length && r[0] !== "")
      .map(r => {
        let obj = {};
        headers.forEach((h, i) => obj[h] = r[i] ? r[i].trim() : "");
        return obj;
      });

    // 🔹 Calcula i mostra el total global de totes les multes
    const totalGlobal = data.reduce((acc, multa) => {
    // Captura el valor de la columna Import (o Import (€))
      let valor = multa["Import"] || multa["Import (€)"] || "0";

      // 🔹 Neteja espais, símbols d'euro i comes
      valor = valor.toString().replace(/[^\d.,-]/g, "").replace(",", ".");

      const num = parseFloat(valor);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);

    document.getElementById("totalGlobal").textContent = `TOTAL: ${totalGlobal.toFixed(2)} €`;
    // 🔹 Ordenem de més nova a més antiga (la data més recent primer)
    const multes = data
      .map(m => ({
        jugador: m["Jugador"],
        import: parseFloat(m["Import"] || 0),
        tipus: m["Tipus"],
        comentari: m["Comentari"],
        data: m["Data"],
        estat: m["Estat"] || "Pendent"
      }))
      .sort((a, b) => {
        const da = new Date(a.data.split(" ")[0].split("/").reverse().join("-"));
        const db = new Date(b.data.split(" ")[0].split("/").reverse().join("-"));
        return db - da; // més noves primer
      });

    window.multes = multes;
    carregarJugadors(multes);
    carregarTaula(multes);
  } catch (error) {
    console.error("Error carregant dades:", error);
  }
}

// 🔹 Mostra el total per jugador (incloent els que no tenen multes)
function carregarJugadors(multes) {
  const playersDiv = document.getElementById('players');
  playersDiv.innerHTML = '';

  // 🔹 Calcula total per jugador
  const totals = {};
  multes.forEach(m => {
    const nom = normalitzarNom(m.jugador);
    if (!totals[nom]) totals[nom] = 0;
    totals[nom] += parseFloat(m.import) || 0;
  });

  // 🔹 Recorre la llista manual d'ordre
  ordreJugadors.forEach(nom => {
    const total = totals[normalitzarNom(nom)] || 0; // si no hi ha multes → 0€
    const dorsal = dorsalsJugadors[normalitzarNom(nom)];

    const div = document.createElement('div');
    div.className = 'player-card';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-label', `Veure les multes de ${nom}`);
    div.innerHTML = `
      <span class="player-avatar" aria-hidden="true">${dorsal}</span>
      <span class="player-name">${nom}</span>
      <div class="divider"></div>
      <span class="player-amount">${total.toFixed(2)} €</span>
    `;
    playersDiv.appendChild(div);
  });
}


// 🔹 Mostra la taula principal
function carregarTaula(data) {
  const tbody = document.querySelector('#taulaMultes tbody');
  tbody.innerHTML = '';

  data.forEach(m => {
    const tr = document.createElement('tr');
    const estatClass = normalitzarNom(m.estat).replace(/\s+/g, '-');
    tr.innerHTML = `
      <td>${m.jugador}</td>
      <td>${m.import.toFixed(2)} €</td>
      <td>${m.tipus}</td>
      <td>${m.comentari || '-'}</td>
      <td>${m.data}</td>
      <td><span class="status ${estatClass}">${m.estat}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// 🔹 Filtres
function aplicarFiltres() {
  const jugador = normalitzarNom(document.getElementById('filterJugador').value);
  const estat = document.getElementById('filterEstat').value.toLowerCase();

  const filtrat = window.multes.filter(m =>
    (jugador === "" || normalitzarNom(m.jugador).includes(jugador)) &&
    (estat === "" || m.estat.toLowerCase() === estat)
  );

  carregarTaula(filtrat);
}

function resetFiltres() {
  document.getElementById('filterJugador').value = '';
  document.getElementById('filterEstat').value = '';
  carregarTaula(window.multes);
}

// 🔹 Normes
const normes = [
  { norma: "Tard a entreno", detall: "1 € + 1 €/5 min (màxim 5 €)" },
  { norma: "Saltar-se entreno", detall: "5 €" },
  { norma: "Tard partit", detall: "1 €/minut (màxim 20 €)" },
  { norma: "Saltar-se partit", detall: "20 €" },
  { norma: "Tècnica", detall: "5 € la 1a, 10 € la 2a, etc. (fins a 20 €)" },
  { norma: "Deixar-se peto divendres", detall: "3 €" },
  { norma: "Demanar TL tècnica i fallar", detall: "1 €" },
  { norma: "Fer aigua al partit", detall: "1 €" },
  { norma: "Fallar entrada sol al partit", detall: "1 €" },
  { norma: "Deixar-se blanca", detall: "5 €" },
  { norma: "Saltar-se sopar oficial", detall: "10 €" },
  { norma: "Tirar a mig entreno", detall: "1 €" },
  { norma: "🚀 4 victòries seguides", detall: "Coach porta birres al vestuari" },
  { norma: "📋 Excepcions", detall: "Faltar per feina/motius de salut/motius de causa major (decideix entrenador)" }
];

function carregarNormes() {
  const container = document.getElementById('normesList');
  container.innerHTML = '';
  normes.forEach(n => {
    const div = document.createElement('div');
    const esPremi = n.norma.startsWith('🚀');
    const esExcepcio = n.norma.startsWith('📋');
    const tipus = esPremi ? 'norma--premi' : esExcepcio ? 'norma--excepcio' : '';

    div.className = `norma ${tipus}`.trim();
    div.innerHTML = `
      <div class="norma-content">
        <strong>${n.norma}</strong>
        <span class="norma-detail">${n.detall}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

carregarNormes();

// --- MODAL DETALL DE MULTES PER JUGADOR ---
function mostrarDetallJugador(nom, multes) {
  const existent = document.querySelector(".modal-overlay");
  if (existent) existent.remove();

  const total = multes.reduce((a, m) => a + parseFloat(m.import || 0), 0);

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Multes de ${nom}</h3>
        <button class="close-btn" title="Tancar">&times;</button>
      </div>
      <div class="modal-body">
        <table class="fines-table">
          <thead>
            <tr>
              <th>Tipus</th>
              <th>Import</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            ${multes.map(m => `
              <tr>
                <td class="tipus-multa ${m.comentari ? 'clicable' : ''}" data-comentari="${m.comentari || ''}">
                  ${m.tipus}
                </td>
                <td style="text-align:right;">${parseFloat(m.import).toFixed(2)} €</td>
                <td>${(m.data || '').split(' ')[0]}</td>
              </tr>`).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td style="text-align:left;"><strong style="color:#dc3545;">Total:</strong></td>
              <td style="text-align:right; color:#dc3545; font-weight:700;">${total.toFixed(2)} €</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add("visible"), 10);
  modal.querySelector(".close-btn").onclick = () => modal.remove();
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  
  // 🔹 Obrir finestra emergent amb comentari (només si existeix)
  modal.querySelectorAll(".tipus-multa.clicable").forEach(td => {
    td.addEventListener("click", () => {
      const comentari = td.dataset.comentari.trim();
      if (!comentari) return;

      const popup = document.createElement("div");
      popup.className = "comentari-popup";
      popup.innerHTML = `
        <div class="comentari-content">
          <p>${comentari}</p>
        </div>
      `;
      document.body.appendChild(popup);

      // Tancar clicant fora
      popup.addEventListener("click", e => {
        if (e.target === popup) popup.remove();
      });
  });


});
  
}

// 🔹 Obrir modal en clicar un jugador
document.addEventListener("click", (e) => {
  const card = e.target.closest(".player-card, .player-row");
  if (card && window.multes) {
    const nom = card.querySelector(".player-name").textContent.trim();
    const multesJugador = window.multes.filter(m => normalitzarNom(m.jugador) === normalitzarNom(nom));
    if (multesJugador.length > 0) mostrarDetallJugador(nom, multesJugador);
  }
});

document.addEventListener("keydown", (e) => {
  const card = e.target.closest(".player-card, .player-row");
  if (card && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    card.click();
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) carregarMultes();
});

window.addEventListener("pageshow", carregarMultes);
