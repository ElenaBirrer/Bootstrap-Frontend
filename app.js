// =====================
// app.js – Logik unverändert + kleine UI-Ergänzungen
// =====================

// --- Konstanten ---
const LAT = 47.3769; // Zürich (für Wetter)
const LON = 8.5417;

const WINT_LAT = 47.4988; // Winterthur (Default EV)
const WINT_LON = 8.7237;

// BFE GeoJSON (deutsch)
const BFE_GEOJSON_DE =
  "https://data.geo.admin.ch/ch.bfe.ladestellen-elektromobilitaet/data/ch.bfe.ladestellen-elektromobilitaet_de.json";

// Helper UI
function flowerLoader() {
  return `<div class="loader" aria-live="polite" aria-busy="true">Lade…</div>`;
}
function showToast(message, type = "danger") {
  const toast = $(`
    <div class="toast align-items-center text-bg-${type} border-0">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `);
  $(".toast-container").append(toast);
  new bootstrap.Toast(toast[0], { delay: 3500 }).show();
}
const fmt = new Intl.NumberFormat("de-CH", { maximumFractionDigits: 2 });

// ======================
// Theme Switcher (optional, rein UI)
// ======================
(function initTheme(){
  const root = document.documentElement;
  const saved = localStorage.getItem("theme-sky") || "sky";
  root.setAttribute("data-theme", saved);

  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  btn.setAttribute("aria-pressed", saved === "sky" ? "true" : "false");
  btn.addEventListener("click", () => {
    const current = root.getAttribute("data-theme");
    const next = current === "sky" ? "sky-light" : "sky";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme-sky", next);
    btn.setAttribute("aria-pressed", next === "sky" ? "true" : "false");
  });
})();

// ======================
// Event-Bindings
// ======================
$(function () {
  $("#btnCat").on("click", loadCat);
  $("#btnBtc").on("click", loadBitcoin);
  $("#btnWeather").on("click", loadWeather);

  $("#btnCharging").on("click", () => loadChargingStationsNearest(WINT_LAT, WINT_LON));
  $("#btnChargingZip").on("click", loadChargingStationsByZip);
  $("#zipInput").on("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#btnChargingZip").click(); } });

  // Klick auf Listen-Item -> Karte zentrieren
  $("#chargingResult").on("click", ".js-station", function(){
    const lat = parseFloat(this.dataset.lat);
    const lon = parseFloat(this.dataset.lon);
    const title = this.dataset.title || "Ladestation";
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      focusMapOn([lat, lon], title, true);
    }
  });

  $("#btnMap").on("click", showMap);
});

// ========================
// 1) Katzenbild
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
    $area.html(`<img src="${url}" alt="Cat" class="w-100 h-100 object-fit-cover">`);
    updateLast("Katzenbild aktualisiert");
  } catch (err) {
    console.error(err);
    $area.html(`<div class="alert alert-danger">Fehler beim Laden des Katzenbilds.</div>`);
    showToast(err.message || "Unbekannter Fehler.");
  }
}

// ========================
// 2) Bitcoin
// ========================
async function loadBitcoin() {
  const $area = $("#btcResult");
  $area.html(flowerLoader());
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,chf");
    if (!res.ok) throw new Error("CoinGecko nicht erreichbar.");
    const data = await res.json();
    const usd = data?.bitcoin?.usd;
    const chf = data?.bitcoin?.chf;
    if (usd == null || chf == null) throw new Error("Preisangaben fehlen.");
    // render als Stat-Tiles
    $area.html(`
      <div class="stat">
        <div class="label">USD</div>
        <div class="value">$ ${fmt.format(usd)}</div>
      </div>
      <div class="stat">
        <div class="label">CHF</div>
        <div class="value">CHF ${fmt.format(chf)}</div>
      </div>
    `);
    $("#btcBadge").text(`letztes Update: ${new Date().toLocaleTimeString("de-CH")}`);
    updateLast("BTC aktualisiert");
  } catch (err) {
    console.error(err);
    $area.html(`<div class="alert alert-danger">Fehler beim Laden des Bitcoin-Preises.</div>`);
    showToast(err.message || "Unbekannter Fehler.");
  }
}

// ========================
// 3) Wetter (Open-Meteo)
// ========================
async function loadWeather() {
  const $area = $("#weatherResult");
  $area.html(flowerLoader());
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&forecast_days=1&timezone=Europe/Zurich`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error("Open-Meteo nicht erreichbar.");
    const data = await r.json();
    const d = data?.daily;
    const tmax = d?.temperature_2m_max?.[0];
    const tmin = d?.temperature_2m_min?.[0];
    const prec = d?.precipitation_sum?.[0];
    if ([tmax,tmin,prec].some(v=>v==null)) throw new Error("Wetterdaten unvollständig.");
    // render als Stat-Tiles
    $area.html(`
      <div class="stat"><div class="label">Max</div><div class="value">${fmt.format(tmax)} °C</div></div>
      <div class="stat"><div class="label">Min</div><div class="value">${fmt.format(tmin)} °C</div></div>
      <div class="stat"><div class="label">Niederschlag</div><div class="value">${fmt.format(prec)} mm</div></div>
    `);
    updateLast("Wetter aktualisiert");
  } catch (err) {
    console.error(err);
    $area.html(`<div class="alert alert-danger">Fehler beim Laden des Wetters.</div>`);
    showToast(err.message || "Unbekannter Fehler.");
  }
}

// ========================
// 4) EV-Ladestationen (Logik unverändert)
// ========================
let BFE_CACHE = null;

// LV95 -> WGS84
function lv95ToWgs(E, N) {
  const e = (E - 2600000) / 1e6, n = (N - 1200000) / 1e6;
  let lon = 2.6779094 + 4.728982*e + 0.791484*e*n + 0.1306*e*n*n - 0.0436*e**3;
  let lat = 16.9023892 + 3.238272*n - 0.270978*e**2 - 0.002528*n**2 - 0.0447*e**2*n - 0.014*n**3;
  return { lat: lat*(100/36), lon: lon*(100/36) };
}
function haversineKm(lat1, lon1, lat2, lon2){
  const R=6371, toRad=d=>d*Math.PI/180;
  const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
const toNum = v => typeof v==="number" ? v : Number(String(v??"").replace(/\s+/g,"").replace(",","."));

async function loadBfeGeo(){
  if (BFE_CACHE) return BFE_CACHE;
  const r = await fetch(BFE_GEOJSON_DE, { headers:{Accept:"application/json"} });
  if(!r.ok){ throw new Error(`BFE GeoJSON HTTP ${r.status}`); }
  const g = await r.json();
  const feats = Array.isArray(g.features) ? g.features : [];
  BFE_CACHE = feats;
  return feats;
}

function extractStationInfo(f){
  const p = f.properties || {};
  const g = f.geometry || {};
  let lon,lat;
  if (g && Array.isArray(g.coordinates)) {
    const c = g.coordinates.flat(3);
    if (c.length>=2) {
      const x=toNum(c[0]), y=toNum(c[1]);
      if (x>1000 || y>1000){ const ll=lv95ToWgs(x,y); lon=ll.lon; lat=ll.lat; }
      else { lon=x; lat=y; }
    }
  }
  if (!Number.isFinite(lon)||!Number.isFinite(lat)) {
    const E = toNum(p.E||p.E_EPSG_2056||p.x_lv95||p.x);
    const N = toNum(p.N||p.N_EPSG_2056||p.y_lv95||p.y);
    if (Number.isFinite(E)&&Number.isFinite(N)&&(E>1000||N>1000)) {
      const ll=lv95ToWgs(E,N); lon=ll.lon; lat=ll.lat;
    }
  }
  const title = p.name || p.title || p.titel || "Ladestation";
  const street = p.address || p.adresse || p.strasse || "";
  const houseno = p.hausnr || p.hausnummer || "";
  const zip = p.plz || p.PLZ || "";
  const city = p.ort || p.ORT || "";
  const address = [ [street,houseno].filter(Boolean).join(" "), [zip,city].filter(Boolean).join(" ") ]
                    .filter(s=>s.trim().length>0).join(", ");
  return {lat,lon,title,address};
}

async function loadChargingStationsNearest(lat, lon){
  const $area = $("#chargingResult");
  $area.html(flowerLoader());
  try{
    const feats = await loadBfeGeo();
    const stations = feats.map(extractStationInfo)
      .filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon) && s.title?.trim().length>0);

    stations.forEach(s=>s._km = haversineKm(lat,lon,s.lat,s.lon));
    const top5 = stations.sort((a,b)=>a._km-b._km).slice(0,5);

    if(top5.length===0){
      $area.html(`<div class="alert alert-warning">Keine Stationen gefunden.</div>`);
      clearMarkers(); updateEvCount(0); return;
    }

    $area.html(`<ul class="list-group list-group-flush">${top5.map((s,i)=>`
      <li class="list-group-item js-station" role="button"
          data-lat="${s.lat}" data-lon="${s.lon}"
          data-title="${(s.title||"").replace(/"/g,'&quot;')}">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${i+1}. ${s.title}</div>
            ${s.address ? `<div class="text-secondary small">${s.address}</div>` : ""}
          </div>
          <div class="text-nowrap small">${fmt.format(s._km)} km</div>
        </div>
      </li>`).join("")}
    </ul>`);

    ensureMap();
    setMarkers(top5, [lat, lon]);
    updateEvCount(top5.length);
    updateLast("EV-Liste aktualisiert");
  }catch(err){
    console.error(err);
    $area.html(`<div class="alert alert-danger">Fehler beim Laden der Ladestationen.</div>`);
    showToast(err.message || "Unbekannter Fehler beim BFE-Dataset.");
    clearMarkers(); updateEvCount(0);
  }
}

async function loadChargingStationsByZip(){
  const $area = $("#chargingResult");
  const raw = $("#zipInput").val()?.trim() || "";
  if(!/^\d{4}$/.test(raw)){
    showToast("Bitte eine gültige 4-stellige PLZ (CH) eingeben.","info");
    $("#zipInput").focus(); return;
  }
  $area.html(flowerLoader());
  try{
    const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ch&q=${encodeURIComponent(raw)}&limit=1`;
    const r = await fetch(url, { headers:{Accept:"application/json"} });
    if(!r.ok) throw new Error("Geocoding fehlgeschlagen.");
    const m = await r.json();
    if(!Array.isArray(m)||m.length===0){ $area.html(`<div class="alert alert-warning">PLZ nicht gefunden.</div>`); clearMarkers(); updateEvCount(0); return; }
    const lat = parseFloat(m[0].lat), lon = parseFloat(m[0].lon);
    await loadChargingStationsNearest(lat, lon);
  }catch(err){
    console.error(err);
    $area.html(`<div class="alert alert-danger">Fehler bei der PLZ-Suche.</div>`);
    showToast(err.message || "Unbekannter Fehler bei der PLZ-Suche.");
    clearMarkers(); updateEvCount(0);
  }
}

// ========================
// 5) Karte (Leaflet + OSM) – unverändert, Marker-Halos via CSS
// ========================
let map = null;
let baseMarker = null;
let evMarkers = [];

function ensureMap(){
  if (map) return;
  map = L.map("map").setView([LAT, LON], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap-Mitwirkende"
  }).addTo(map);
  baseMarker = L.marker([LAT, LON]).addTo(map).bindPopup("Zürich");
}
function showMap(){
  ensureMap();
  map.setView([LAT, LON], 13);
}

function clearMarkers(){
  if (!map) return;
  evMarkers.forEach(m=>map.removeLayer(m));
  evMarkers = [];
}
function setMarkers(stations, centerLatLon){
  clearMarkers();
  const bounds = [];
  stations.forEach((s, idx)=>{
    const m = L.marker([s.lat, s.lon], {title: s.title});
    m.bindPopup(`<strong>${idx+1}. ${s.title}</strong><br>${s.address || ""}`);
    m.addTo(map);
    evMarkers.push(m);
    bounds.push([s.lat, s.lon]);
  });
  if (centerLatLon) bounds.push(centerLatLon);
  if (bounds.length) map.fitBounds(bounds, { padding:[30,30] });
}
function focusMapOn([lat,lon], title="Ladestation", openPopup=false){
  ensureMap();
  map.setView([lat,lon], 15);
  const m = L.marker([lat,lon], {title}).addTo(map);
  if (openPopup) m.bindPopup(`<strong>${title}</strong>`).openPopup();
}

/* ===== kleine UI-Helpers ===== */
function updateEvCount(n){
  const chip = document.getElementById("evCountChip");
  if (chip) chip.textContent = n ? `${n} Treffer` : "—";
}
function updateLast(text){
  const chip = document.getElementById("lastUpdateChip");
  if (chip) chip.textContent = `${text} • ${new Date().toLocaleTimeString("de-CH")}`;
}
