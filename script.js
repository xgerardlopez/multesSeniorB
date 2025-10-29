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
      jugador: m["Jugador"] || m["jugador"],
      import: parseFloat(m["Import"] || m["import"] || 0),
      tipus: m["Tipus"] || m["tipus"],
      comentari: m["Comentari"] || m["comentari"],
      data: m["Data"] || m["data"],
      estat: m["Estat"] || m["estat"] || "Pendent"
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
    const pendents = multesJugador.filter(m => m.estat.toLowerCase() === "pendent").length;

    const div = document.createElement('div');
    div.className = 'player-card';
    div.innerHTML = `<h3>${nom}</h3><p>Total: ${total.toFixed(2)} €</p><p>Pendents: ${pendents}</p>`;
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
  { norma: "Arribar tard a entrenament o partit", excepcio: "Només si es justifica amb antelació" },
  { norma: "No portar equipació completa", excepcio: "Cap" },
  { norma: "Comportament poc esportiu", excepcio: "Cap" }
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
