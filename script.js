// URL del full publicat (Multes)
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUfrZ7AIsVOACiOZSEPBE7b_jfuL5TUFufgHVVze5-eeOqXRYwxbt6FGJ9TltBI2AMxVQTQ2ZE1crw/pub?gid=0&single=true&output=csv";

// Carrega automàtica cada 60 segons
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

    const multes = data.map(m => ({
      jugador: m["Jugador"] || "",
      import: parseFloat(m["Import"] || m["Import"] || 0),
      tipus: m["Tipus"] || "",
      comentari: m["Comentari"] || "-",
      data: m["Data"] || "",
      estat: m["Estat"] || "Pendent"
    }));

    window.multes = multes;
    carregarJugadors(multes);
    carregarTaula(multes);
  } catch (error) {
    console.error("Error carregant dades:", error);
  }
}

function carregarJugadors(multes) {
  const playersDiv = document.getElementById('players');
  playersDiv.innerHTML = '';

  const jugadors = [...new Set(multes.map(m => m.jugador))];

  jugadors.forEach(nom => {
    const multesJugador = multes.filter(m => m.jugador === nom);
    const total = multesJugador.reduce((acc, m) => acc + (m.import || 0), 0);

    const div = document.createElement('div');
    div.className = 'player-row';
    div.innerHTML = `
      <div class="player-info">
        <span class="player-name">${nom}</span>
      </div>
      <div class="total-fines">
        <span class="amount">${total.toFixed(2)} €</span>
      </div>
    `;
    playersDiv.appendChild(div);
  });
}

function carregarTaula(data) {
  const tbody = document.querySelector('#taulaMultes tbody');
  tbody.innerHTML = '';
  data.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.jugador}</td>
      <td>${m.import.toFixed(2)}</td>
      <td>${m.tipus}</td>
      <td>${m.comentari}</td>
      <td>${m.data}</td>
      <td>${m.estat}</td>
    `;
    tbody.appendChild(tr);
  });
}

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

// Normes (pots canviar-les des de la pestanya “Normes”)
const normes = [
  { norma: "Arribar tard entreno/partit (+20min): 5€", excepcio: "Motiu justificat" },
  { norma: "Tècnica: 5€ la primera, 10€ la segona, etc. Màxim 30€", excepcio: "Cap" },
  { norma: "No assistir sopar oficial: 10€", excepcio: "Motiu justificat" },
  { norma: "No entrar espai o carpa en sopar oficial: 10€", excepcio: "Si no s'ha assistit al sopar" },
  { norma: "Deixar-se la blanca fora de casa: 15€", excepcio: "Lesionat" },
  { norma: "No assistir entreno: 5€", excepcio: "Motiu justificat" },
  { norma: "No assistir físic: 3€", excepcio: "Motiu justificat" },
  { norma: "Fallar oráculo: 1€ per jugador fallat", excepcio: "Cap" }
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

// Crear el modal dinàmicament
function mostrarDetallJugador(nom, multes) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Multes de ${nom}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <table class="fines-table">
          <thead>
            <tr>
              <th>Tipus de Multa</th>
              <th>Comentari</th>
              <th>Import</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            ${multes.map(m => `
              <tr>
                <td>${m.tipus}</td>
                <td>${m.comentari || '-'}</td>
                <td style="text-align:right;">${parseFloat(m.import).toFixed(2)} €</td>
                <td>${m.data}</td>
              </tr>`).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2"><strong>Total:</strong></td>
              <td style="text-align:right; color:#dc3545; font-weight:700;">
                ${multes.reduce((a, m) => a + parseFloat(m.import || 0), 0).toFixed(2)} €
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector(".close-btn").onclick = () => modal.remove();
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
}

// Afegir l’event al clicar un jugador
document.addEventListener("click", (e) => {
  const card = e.target.closest(".player-card, .player-row");
  if (card && window.multes) {
    const nom = card.querySelector(".player-name").textContent.trim();
    const multesJugador = window.multes.filter(m => m.jugador === nom);
    if (multesJugador.length > 0) mostrarDetallJugador(nom, multesJugador);
  }
});

