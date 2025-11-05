// =====================
// app.js – Komplettdatei
// =====================

// --- Konstanten ---
const LAT = 47.3769; // Zürich (für Wetter & Karte)
const LON = 8.5417;

const WINT_LAT = 47.4988; // Winterthur (Default für Ladestationen)
const WINT_LON = 8.7237;

// Offizielles BFE-GeoJSON mit deutschen Texten
const BFE_GEOJSON_DE =
  "https://data.geo.admin.ch/ch.bfe.ladestellen-elektromobilitaet/data/ch.bfe.ladestellen-elektromobilitaet_de.json";

// --- Helper UI ---
function flowerLoader() {
  return `
    <div class="loader" aria-live="polite" aria-busy="true">
      <span class="flower"></span><span class="flower"></span><span class="flower"></span><span class="flower"></span><span class="flower"></span>
      <span class="ms-2 text-secondary">Lade…</span>
    </div>`;
}
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
const fmt = new Intl.NumberFormat("de-CH", { maximumFractionDigits: 2 });

// ======================
// Event-Bindings
// ======================
$(function () {
  $("#btnCat").on("click", loadCat);
  $("#btnBtc").on("click", loadBitcoin);
  $("#btnWeather").on("click", loadWeather);

  // Ladestationen (Default Winterthur + PLZ-Suche)
  $("#btnCharging").on("click", () => loadChargingStationsNearest(WINT_LAT, WINT_LON));
  $("#btnChargingZip").on("click", loadChargingStationsByZip);
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
    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,chf";
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
    $area.html(
      `<div class="alert alert-danger">Fehler beim Laden des Bitcoin-Preises.</div>`
    );
    showToast(err.message || "Unbekannter Fehler bei CoinGecko.");
  }
}

// ==========================================
// 3) Wetter (Open-Meteo, heute, Zürich)
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
    if ([tmax, tmin, prec].some((v) => v == null))
      throw new Error("Wetterdaten unvollständig.");

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
// 4) EV-Ladestationen (BFE GeoJSON), Adresse + PLZ-Suche
// ==========================================================
let BFE_CACHE = null;

// LV95 (CH1903+) -> WGS84 (Dezimalgrad)
function lv95ToWgs(E, N) {
  const e = (E - 2600000) / 1e6,
    n = (N - 1200000) / 1e6;
  let lon =
    2.6779094 + 4.728982 * e + 0.791484 * e * n + 0.1306 * e * n * n - 0.0436 * e ** 3;
  let lat =
    16.9023892 +
    3.238272 * n -
    0.270978 * e ** 2 -
    0.002528 * n ** 2 -
    0.0447 * e ** 2 * n -
    0.014 * n ** 3;
  return { lat: lat * (100 / 36), lon: lon * (100 / 36) };
}
// Haversine-Distanz (km)
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180,
    R = 6371;
  const dLat = toRad(lat2 - lat1),
    dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const toNum = (v) =>
  typeof v === "number"
    ? v
    : Number(String(v ?? "").replace(/\s+/g, "").replace(",", "."));

// GeoJSON laden (einmalig)
async function loadBfeGeo() {
  if (BFE_CACHE) return BFE_CACHE;
  const res = await fetch(BFE_GEOJSON_DE, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(
      `BFE-GeoJSON HTTP ${res.status} – ${t.slice(0, 120) || "Antwort fehlerhaft"}`
    );
  }
  const data = await res.json();
  const feats = Array.isArray(data.features) ? data.features : [];
  BFE_CACHE = feats;
  return feats;
}

// Koordinaten & Basisinfo (inkl. Adresse) robust extrahieren
function extractStationInfo(f) {
  const p = f.properties || {};
  const g = f.geometry || {};
  let lon, lat;

  // --- Koordinaten aus GeoJSON ---
  if (g && Array.isArray(g.coordinates)) {
    const flat = g.coordinates.flat(3);
    if (flat.length >= 2) {
      const x = toNum(flat[0]),
        y = toNum(flat[1]);
      if (x > 1000 || y > 1000) {
        const { lat: lt, lon: ln } = lv95ToWgs(x, y);
        lon = ln;
        lat = lt;
      } else {
        lon = x;
        lat = y;
      }
    }
  }
  // --- Fallback: LV95 in Properties ---
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    const E = toNum(p.E || p.E_EPSG_2056 || p.x_lv95 || p.x);
    const N = toNum(p.N || p.N_EPSG_2056 || p.y_lv95 || p.y);
    if (Number.isFinite(E) && Number.isFinite(N) && (E > 1000 || N > 1000)) {
      const { lat: lt, lon: ln } = lv95ToWgs(E, N);
      lon = ln;
      lat = lt;
    }
  }

  // --- Name (DE) ---
  const title =
    p.name || p.title || p.titel || p.standortbezeichnung || "Ladestation";

  // --- Adresse (robust zusammenbauen) ---
  const street = p.address || p.adresse || p.strasse || p.street || p.STRASSE || "";
  const houseno = p.hausnr || p.hausnummer || p.housenumber || "";
  const zip = p.plz || p.PLZ || p.postcode || p.postleitzahl || "";
  const city = p.ort || p.ORT || p.gemeinde || p.locality || p.town || "";
  const extras = p.zusatz || p.adresszusatz || "";

  const streetLine = [street, houseno].filter(Boolean).join(" ").trim();
  const cityLine = [zip, city].filter(Boolean).join(" ").trim();
  const address = [streetLine, extras, cityLine]
    .filter((s) => String(s).trim().length > 0)
    .join(", ");

  return { lat, lon, title, address };
}

// Top-5 Stationen zu (lat,lon) anzeigen
async function loadChargingStationsNearest(lat, lon) {
  const $area = $("#chargingResult");
  $area.html(flowerLoader());
  try {
    const feats = await loadBfeGeo();
    const stations = feats
      .map(extractStationInfo)
      .filter(
        (s) =>
          Number.isFinite(s.lat) &&
          Number.isFinite(s.lon) &&
          s.title &&
          s.title.trim().length > 0
      );

    stations.forEach((s) => (s._km = haversineKm(lat, lon, s.lat, s.lon)));
    const top5 = stations.sort((a, b) => a._km - b._km).slice(0, 5);

    if (top5.length === 0) {
      $area.html(`<div class="alert alert-warning">Keine Stationen gefunden.</div>`);
      return;
    }

    $area.html(
      `<ul class="list-group">${top5
        .map(
          (s, i) => `
        <li class="list-group-item d-flex justify-content-between">
          <div>
            <div class="fw-semibold">${i + 1}. ${s.title}</div>
            ${s.address ? `<div class="text-secondary small">${s.address}</div>` : ""}
          </div>
          <div class="text-nowrap small">${fmt.format(s._km)} km</div>
        </li>`
        )
        .join("")}</ul>`
    );
  } catch (err) {
    console.error("BFE Ladestationen Fehler:", err);
    $area.html(`<div class="alert alert-danger">Fehler beim Laden der Ladestationen.</div>`);
    showToast(err.message || "Unbekannter Fehler beim BFE-Dataset.");
  }
}

// PLZ -> Geocoding (Nominatim), dann gleiche Logik
async function loadChargingStationsByZip() {
  const $area = $("#chargingResult");
  const raw = $("#zipInput").val()?.trim() || "";
  if (!/^\d{4}$/.test(raw)) {
    showToast("Bitte eine gültige 4-stellige PLZ (CH) eingeben.", "info");
    $("#zipInput").focus();
    return;
  }
  $area.html(flowerLoader());
  try {
    const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ch&q=${encodeURIComponent(
      raw
    )}&limit=1`;
    const r = await fetch(geoUrl, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("Geocoding fehlgeschlagen.");
    const matches = await r.json();
    if (!Array.isArray(matches) || matches.length === 0) {
      $area.html(`<div class="alert alert-warning">PLZ nicht gefunden.</div>`);
      return;
    }
    const lat = parseFloat(matches[0].lat),
      lon = parseFloat(matches[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon))
      throw new Error("Ungültige Koordinaten zu dieser PLZ.");
    await loadChargingStationsNearest(lat, lon);
  } catch (err) {
    console.error("PLZ-Suche Fehler:", err);
    $area.html(`<div class="alert alert-danger">Fehler bei der PLZ-Suche.</div>`);
    showToast(err.message || "Unbekannter Fehler bei der PLZ-Suche.");
  }
}

// =====================================
// 5) Karte mit api3.geo.admin.ch (WMTS)
// =====================================
let mapInstance = null;

function showMap() {
  if (mapInstance) {
    mapInstance.setView([LAT, LON], 13);
    return;
  }

  // Leaflet Map
  mapInstance = L.map("map", { zoomControl: true }).setView([LAT, LON], 13);

  // WMTS-Rasterkachel von api3.geo.admin.ch (swisstopo)
  // Doku: https://api3.geo.admin.ch/  |  WMTS-Endpunkt: https://wmts.geo.admin.ch/1.0.0/{layer}/default/current/3857/{z}/{x}/{y}.png
  L.tileLayer(
    "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.png",
    {
      attribution:
        '© <a href="https://www.swisstopo.admin.ch" target="_blank" rel="noopener">swisstopo</a>',
      maxZoom: 19,
      tileSize: 256
    }
  ).addTo(mapInstance);

  // Marker Zürich
  L.marker([LAT, LON]).addTo(mapInstance).bindPopup("Zürich").openPopup();

  // Maßstab
  L.control.scale({ imperial: false }).addTo(mapInstance);
}
