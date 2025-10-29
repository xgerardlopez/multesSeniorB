const { createApp } = Vue;

const SHEET_ID = "1un2vHvkFn8V9T9JQkDYhDu_WYGXY584ilDuACKzt-Ak";
const MULTES_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
const JUGADORS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=1534873034`;
const NORMES_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=666064212`;

const parsePrice = (v) => {
  if (v == null) return 0;
  const s = String(v).trim().replace(/[€\s]/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

const parseDate = (v) => String(v || "").split(" ")[0];

function rowsToObjects(papaResult) {
  const rows = papaResult.data || [];
  if (!rows.length) return [];
  return rows.map((r) => ({
    jugador: r["Jugador"] || "",
    tipodemulta: r["Tipus"] || "",
    precio: parsePrice(r["Import"] || "0"),
    comment: r["Comentari"] || "",
    fechacreacion: parseDate(r["Data"] || ""),
    status: (r["Estat"] || "Pendent").toLowerCase(),
  }));
}

createApp({
  data() {
    return {
      loading: false,
      error: "",
      parsedData: [],
      players: [],
      normes: [],
      selectedPlayer: null,
      filters: {
        jugador: "",
        tipodemulta: "",
        comment: "",
        status: "",
        fechaDesde: "",
        fechaHasta: "",
      },
      filtersVisible: false,
    };
  },
  computed: {
    playersWithFines() {
      const playersMap = {};
      this.players.forEach((player) => {
        playersMap[player.Nom] = {
          name: player.Nom,
          img: player.Foto,
          fines: [],
          totalFines: 0,
          pendingCount: 0,
        };
      });

      this.parsedData.forEach((fine) => {
        const playerName = fine.jugador;
        if (playersMap[playerName]) {
          if (fine.status.toLowerCase() === "pendent") {
            playersMap[playerName].fines.push(fine);
            playersMap[playerName].pendingCount++;
            playersMap[playerName].totalFines += fine.precio;
          }
        }
      });

      return Object.values(playersMap).sort(
        (a, b) => b.totalFines - a.totalFines
      );
    },
    filteredAllFines() {
      return this.parsedData.filter((fine) => {
        if (
          this.filters.jugador &&
          !fine.jugador
            .toLowerCase()
            .includes(this.filters.jugador.toLowerCase())
        )
          return false;
        if (
          this.filters.tipodemulta &&
          !fine.tipodemulta
            .toLowerCase()
            .includes(this.filters.tipodemulta.toLowerCase())
        )
          return false;
        if (
          this.filters.comment &&
          !fine.comment
            .toLowerCase()
            .includes(this.filters.comment.toLowerCase())
        )
          return false;
        if (
          this.filters.status &&
          fine.status.toLowerCase() !==
            this.filters.status.toLowerCase()
        )
          return false;
        if (
          this.filters.fechaDesde &&
          fine.fechacreacion < this.filters.fechaDesde
        )
          return false;
        if (
          this.filters.fechaHasta &&
          fine.fechacreacion > this.filters.fechaHasta
        )
          return false;
        return true;
      });
    },
    reversedFilteredAllFines() {
      return [...this.filteredAllFines].reverse();
    },
    totalFilteredFines() {
      return this.filteredAllFines.reduce(
        (total, fine) => total + fine.precio,
        0
      );
    },
  },
  methods: {
    async loadNormes() {
      try {
        const res = await fetch(NORMES_URL);
        const text = await res.text();
        const papa = Papa.parse(text, { header: true, skipEmptyLines: true });
        this.normes = papa.data;
      } catch (e) {
        this.error = String(e);
      }
    },
    async loadPlayers() {
      try {
        const res = await fetch(JUGADORS_URL);
        const text = await res.text();
        const papa = Papa.parse(text, { header: true, skipEmptyLines: true });
        this.players = papa.data;
      } catch (e) {
        this.error = String(e);
      }
    },
    async load() {
      this.loading = true;
      this.error = "";
      try {
        const res = await fetch(MULTES_URL, { cache: "no-store" });
        const text = await res.text();
        const papa = Papa.parse(text, { header: true, skipEmptyLines: true });
        this.parsedData = rowsToObjects(papa);
        await this.loadPlayers();
        await this.loadNormes();
      } catch (e) {
        this.error = String(e);
      } finally {
        this.loading = false;
      }
    },
    showPlayerDetails(player) {
      this.selectedPlayer = player;
    },
    closePlayerDetails() {
      this.selectedPlayer = null;
    },
    formatDateForDisplay(dateString) {
      return dateString;
    },
    clearFilters() {
      this.filters = {
        jugador: "",
        tipodemulta: "",
        comment: "",
        status: "",
        fechaDesde: "",
        fechaHasta: "",
      };
    },
    toggleFilters() {
      this.filtersVisible = !this.filtersVisible;
    },
    getAmountClass(amount) {
      if (amount <= 10) return "low";
      if (amount <= 25) return "medium";
      if (amount <= 40) return "high";
      return "critical";
    },
  },
  async mounted() {
    await this.load();
    document.getElementById("app-content").style.visibility = "visible";
  },
}).mount("#app");
