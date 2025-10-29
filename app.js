// =====================
// app.js – Komplettdatei
// =====================

// --- Konstanten (Zürich als Default) ---
const LAT = 47.3769;
const LON = 8.5417;

// --- Helper: Blumen-Loader (HTML) ---
function flowerLoader() {
  return `
    <div class="loader" aria-live="polite" aria-busy="true">
      <span class="flower"></span><span class="flower"></span><span class="flower"></span><span class="flower"></span><span class="flower"></span>
      <span class="ms-2 text-secondary">Lade…</span>
    </div>`;
}

// --- Helper: Bootstrap-Toast ---
function showToast(message, type = "danger") {
  const icon = type === "danger" ? "exclamation-triangle" : "info-circle";
  const toast = $(`
    <div class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body"><i class="bi bi-${icon} me-2"></i>${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `);
  $(".toast-container").append(toast);
  new bootstrap.Toast(toast[0], { delay: 3500 }).show();
}

// --- Zahlenformat de-CH ---
const fmt = new Intl.NumberFormat("de-CH", { maximumFractionDigits: 2 });

// ======================
// Event-Bindings (jQuery)
// ======================
$(function () {
  $("#btnCat").on("click", loadCat);
  $("#btnBtc").on("click", loadBitcoin);
  $("#btnWeather").on("click", loadWeather);

  // Ladestationen:
  $("#btnCharging").on("click", () => fetchAndRenderStations(LAT, LON)); // Standard: Zürich
  $("#btnChargingZip").on("click", loadChargingStationsByZip);           // Suche per PLZ

  // Enter-Taste im PLZ-Feld triggert Suche
  $("#zipInput").on("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      $("#btnChargingZip").click();
    }
  });

  $("#btnMap").on("click", showMap);
});

// ========================
// 1) Zufälliges Katzenbild
// ========================
async function loadCat() {
  const $area = $("#catResult");
  $area.html(flowerLoader());

  try {
    const res = await fetch("https://api.thecatapi.com/v1/images/search");
    if (!res.ok) throw new Error("TheCatAPI nicht erreichbar.");
    const data = await res.json();
    const url = data?.[0]?.url;
    if (!url) throw new Error("Kein Bild erhalten.");
    $area.html(`<img src="${url}" alt="Random Cat" class="w-100 h-100 object-fit-cover">`);
  } catch (err) {
    console.error("CatAPI Fehler:", err);
    $area.html(`<div class="alert alert-danger">Fehler beim Laden des Katzenbilds.</div>`);
    showToast(err.message || "Unbekannter Fehler bei TheCatAPI.");
  }
}

// ==============================
// 2) Bitcoin-Preis USD & CHF
// ==============================
async function loadBitcoin() {
  const $area = $("#btcResult");
  $area.html(flowerLoader());

  try {
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,chf";
    const res = await fetch(url);
    if (!res.ok) throw new Error("CoinGecko nicht erreichbar.");
    const data = await res.json();
    const usd = data?.bitcoin?.usd;
    const chf = data?.bitcoin?.chf;
    if (usd == null || chf == null) throw new Error("Preisangaben fehlen.");

    $area.html(`
      <ul class="list-group">
        <li class="list-group-item d-flex justify-content-between align-items-center">
          USD <span class="fw-semibold">$ ${fmt.format(usd)}</span>
        </li>
        <li class="list-group-item d-flex justify-content-between align-items-center">
          CHF <span class="fw-semibold">CHF ${fmt.format(chf)}</span>
        </li>
      </ul>
    `);
  } catch (err) {
    console.error("BTC Fehler:", err);
    $area.html(`<div class="alert alert-danger">Fehler beim Laden des Bitcoin-Preises.</div>`);
    showToast(err.message || "Unbekannter Fehler bei CoinGecko.");
  }
}

// ==========================================
// 3) Wetter (Open-Meteo, heute, Zürich-Coords)
// ==========================================
async function loadWeather() {
  const $area = $("#weatherResult");
  $area.html(flowerLoader());

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&forecast_days=1&timezone=Europe/Zurich`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Open-Meteo nicht erreichbar.");
    const data = await res.json();

    const d = data?.daily;
    const tmax = d?.temperature_2m_max?.[0];
    const tmin = d?.temperature_2m_min?.[0];
    const prec = d?.precipitation_sum?.[0];

    if ([tmax, tmin, prec].some((v) => v == null)) throw new Error("Wetterdaten unvollständig.");

    $area.html(`
      <div class="row g-2">
        <div class="col-12 col-sm-4">
          <div class="p-3 border rounded bg-light-subtle">
            <div class="small text-secondary">Max</div>
            <div class="fs-5 fw-semibold">${fmt.format(tmax)} °C</div>
          </div>
        </div>
        <div class="col-12 col-sm-4">
          <div class="p-3 border rounded bg-light-subtle">
            <div class="small text-secondary">Min</div>
            <div class="fs-5 fw-semibold">${fmt.format(tmin)} °C</div>
          </div>
        </div>
        <div class="col-12 col-sm-4">
          <div class="p-3 border rounded bg-light-subtle">
            <div class="small text-secondary">Niederschlag</div>
            <div class="fs-5 fw-semibold">${fmt.format(prec)} mm</div>
          </div>
        </div>
      </div>
    `);
  } catch (err) {
    console.error("Wetter Fehler:", err);
    $area.html(`<div class="alert alert-danger">Fehler beim Laden des Wetters.</div>`);
    showToast(err.message || "Unbekannter Fehler bei Open-Meteo.");
  }
}

// ==========================================================
// 4) EV-Ladestationen (OpenChargeMap) + PLZ-Suche per Nominatim
//    HINWEIS: Seite über http://localhost:... öffnen (Live Server)
// ==========================================================

// Öffentliche Helferfunktion (falls anderswo genutzt)
async function loadChargingStations() {
  // Standard: Zürich-Umkreis
  fetchAndRenderStations(LAT, LON);
}

// Gemeinsame Funktion: OpenChargeMap abfragen und im selben DOM-Bereich rendern
async function fetchAndRenderStations(lat, lon) {
  const $area = $("#chargingResult");
  $area.html(flowerLoader());

  // OCM: "key" dient der Identifikation (hier generisch, kein Secret)
  const params = new URLSearchParams({
    output: "json",
    countrycode: "CH",
    latitude: lat,
    longitude: lon,
    distance: 10,
    distanceunit: "KM",
    maxresults: 5,
    compact: true,
    verbose: false,
    key: "OCM-API-KEY"
  });

  const url = `https://api.openchargemap.io/v3/poi/?${params.toString()}`;

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} – ${t.slice(0, 120) || "Antwort fehlerhaft"}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      $area.html(`<div class="alert alert-warning">Keine Stationen im 10-km-Umkreis gefunden.</div>`);
      return;
    }

    const items = data
      .map((p, i) => {
        const info = p.AddressInfo || {};
        const title = info.Title || "Unbenannte Station";
        const addr = [info.AddressLine1, info.Town].filter(Boolean).join(", ");
        const dist =
          typeof info.Distance === "number" ? `${fmt.format(info.Distance)} km` : "";
        return `
          <li class="list-group-item">
            <div class="d-flex justify-content-between">
              <div>
                <div class="fw-semibold">${i + 1}. ${title}</div>
                <div class="text-secondary small">${addr}</div>
              </div>
              <div class="text-nowrap small">${dist}</div>
            </div>
          </li>`;
      })
      .join("");

    $area.html(`<ul class="list-group">${items}</ul>`);
  } catch (err) {
    console.error("OpenChargeMap Fehler:", err);
    $area.html(`<div class="alert alert-danger">Fehler beim Laden der Ladestationen.</div>`);
    showToast(`Ladestationen: ${err.message || "Unbekannter Fehler"}`);
  }
}

// NEU: PLZ -> Koordinaten (Nominatim), dann OCM abrufen
async function loadChargingStationsByZip() {
  const $area = $("#chargingResult");
  const raw = $("#zipInput").val()?.trim() || "";

  // Basis-Validierung CH-PLZ (4 Ziffern)
  if (!/^\d{4}$/.test(raw)) {
    showToast("Bitte eine gültige 4-stellige PLZ eingeben (CH).", "info");
    $("#zipInput").focus();
    return;
  }

  $area.html(flowerLoader());

  try {
    // Geocoding mit OpenStreetMap Nominatim (auf CH beschränkt)
    const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ch&q=${encodeURIComponent(
      raw
    )}&limit=1`;
    const geoRes = await fetch(geoUrl, { headers: { Accept: "application/json" } });
    if (!geoRes.ok) throw new Error("Geocoding (Nominatim) fehlgeschlagen.");
    const matches = await geoRes.json();

    if (!Array.isArray(matches) || matches.length === 0) {
      $area.html(`<div class="alert alert-warning">PLZ nicht gefunden.</div>`);
      return;
    }

    const lat = parseFloat(matches[0].lat);
    const lon = parseFloat(matches[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lon))
      throw new Error("Ungültige Koordinaten für diese PLZ.");

    // Danach wie gewohnt OCM abfragen & im selben Bereich rendern
    await fetchAndRenderStations(lat, lon);
  } catch (err) {
    console.error("PLZ-Suche Fehler:", err);
    $area.html(`<div class="alert alert-danger">Fehler bei der PLZ-Suche.</div>`);
    showToast(err.message || "Unbekannter Fehler bei der PLZ-Suche.");
  }
}

// ==========================
// 5) Karte (Leaflet, Zürich)
// ==========================
let mapInstance = null;

function showMap() {
  if (!mapInstance) {
    mapInstance = L.map("map").setView([LAT, LON], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap-Mitwirkende"
    }).addTo(mapInstance);

    L.marker([LAT, LON]).addTo(mapInstance).bindPopup("Zürich").openPopup();
  } else {
    mapInstance.setView([LAT, LON], 13);
  }
}
