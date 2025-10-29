// 🔗 Enllaç al teu Google Sheets publicat com CSV
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUfrZ7AIsVOACiOZSEPBE7b_jfuL5TUFufgHVVze5-eeOqXRYwxbt6FGJ9TltBI2AMxVQTQ2ZE1crw/pub?gid=0&single=true&output=csv";

// 🕐 Actualitza automàticament cada 60 segons
carregarMultes();
setInterval(carregarMultes, 60000);

async function carregarMultes() {
  try {
    const res = await fetch(SHEET_URL);
    const text = await res.text();

    // Converteix el CSV a JSON
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
      jugador: m["Jugador"] || m["Jugador"],
      import: parseFloat(m["Import"] || m["Import"] || 0),
      tipus: m["Tipus"] || m["Tipus"],
      comentari: m["Comentari"] || m["Comentari"],
      data: m["Data"] || m["Data"],
      estat: m["Estat"] || m["Estat"] || "Pendent"
    }));

    window.multes = multes;
    carregarJugadors(multes);
    carregarTaula(multes);
  } catch (error) {
    console.error("Error carregant dades del Google Sheets:", error);
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
    div.className = 'player-card';
    div.innerHTML = `
      <span class="player-name">${nom}</span>
      <div class="divider"></div>
      <span class="player-amount">${total.toFixed(2)} €</span>
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
      <td>${m.comentari || '-'}</td>
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

// Normes (pots afegir-ne més)
const normes = [
  { norma: "Arribar tard entreno/partit (+20min): 5€", excepcio: "Motiu justificat" },
  { norma: "Tècnica: 5€ la primera, 10€ la segona, etc. Màxim 30€" , excepcio: "Cap"},
  { norma: "No assistir sopar oficial: 10€.", excepcio: "Motiu justificat" },
  { norma: "No entrar espai o carpa en sopar oficial: 10€", excepcio: "Si no s'ha assistit al sopar" },
  { norma: "Deixar-se la blanca fora de casa: 15€", excepcio: "Lesionat" },
  { norma: "No assistir entreno: 5€", excepcio: "Motiu justificat" },
  { norma: "No assistir físic: 3€", excepcio: "Motiu justificat" },
  { norma: "Fallar oráculo: 1€ tots per jugador fallat", excepcio: "Cap" }
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
