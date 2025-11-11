// 🔗 Enllaç al Google Sheets publicat com CSV
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUfrZ7AIsVOACiOZSEPBE7b_jfuL5TUFufgHVVze5-eeOqXRYwxbt6FGJ9TltBI2AMxVQTQ2ZE1crw/pub?gid=0&single=true&output=csv";

// 🕐 Actualitza automàticament cada 60 segons
carregarMultes();
setInterval(carregarMultes, 60000);

async function carregarMultes() {
  try {
    const res = await fetch(SHEET_URL);
    const text = await res.text();
    const rows = text.split("\n").map(r => r.split(","));
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

// 🔹 Mostra el total per jugador
function carregarJugadors(multes) {
  const playersDiv = document.getElementById('players');
  playersDiv.innerHTML = '';

  const jugadors = [...new Set(multes.map(m => m.jugador))];

  jugadors.forEach(nom => {
    const multesJugador = multes.filter(m => m.jugador === nom);
    const total = multesJugador.reduce((acc, m) => acc + (m.import || 0), 0);

    const div = document.createElement('div');
    div.className = 'player-card';
    div.innerHTML = `
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
    tr.innerHTML = `
      <td>${m.jugador}</td>
      <td>${m.import.toFixed(2)} €</td>
      <td>${m.tipus}</td>
      <td>${m.comentari || '-'}</td>
      <td>${m.data}</td>
      <td>${m.estat}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 🔹 Filtres
function aplicarFiltres() {
  const jugador = document.getElementById('filterJugador').value.toLowerCase();
  const estat = document.getElementById('filterEstat').value.toLowerCase();

  const filtrat = window.multes.filter(m =>
    (jugador === "" || m.jugador.toLowerCase().includes(jugador)) &&
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
  { norma: "Tard entreno/partit: 1€ + 1€ cada 5min", excepcio: "Motiu justificat" },
  { norma: "No assistir partit: 20€", excepcio: "Motiu justificat" },
  { norma: "No assistir entreno: 5€", excepcio: "Motiu justificat" },
  { norma: "No assistir físic: 3€", excepcio: "Motiu justificat" },
  { norma: "Deixar-se la blanca: Partit 10€ | Entreno 1€", excepcio: "Lesionat" },
  { norma: "Tècnica: 5€ la primera, 10€ la segona, etc...", excepcio: "Cap" },
  { norma: "Aigua en tir lliure: 5€", excepcio: "Cap" }, 
  { norma: "Fallar entrada sol (partit): 1€", excepcio: "Cap" },
  { norma: "Fallar oráculo: 1€ per jugador fallat", excepcio: "Cap" },
  { norma: "No assistir sopar oficial: 10€", excepcio: "Motiu justificat" },
  { norma: "No anar Carpa/Espai en sopar oficial: 10€", excepcio: "Motiu justificat" }
];

function carregarNormes() {
  const container = document.getElementById('normesList');
  container.innerHTML = '';
  normes.forEach(n => {
    const div = document.createElement('div');
    div.className = 'norma';
    div.innerHTML = `<strong>${n.norma}</strong><br>Excepció: ${n.excepcio}`;
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
    const multesJugador = window.multes.filter(m => m.jugador === nom);
    if (multesJugador.length > 0) mostrarDetallJugador(nom, multesJugador);
  }
});

// 🔹 Mostrar / amagar el panell de filtres
document.getElementById("toggleFiltres").addEventListener("click", () => {
  const panel = document.getElementById("filtersPanel");
  const btn = document.getElementById("toggleFiltres");

  if (panel.style.display === "none") {
    panel.style.display = "flex";  // o "block" si ho prefereixes en columna
    btn.textContent = "Amagar filtres";
  } else {
    panel.style.display = "none";
    btn.textContent = "Mostrar filtres";
  }

  





