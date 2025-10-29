# Bootstrap Frontend – API Demo

## Setup
1. Dateien in einen Ordner legen:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `readme.md`
2. Öffne **index.html** lokal im Browser (oder via Live Server in VS Code).

## Features
- **Zufälliges Katzenbild:** TheCatAPI
- **Bitcoin-Preis in USD & CHF:** CoinGecko
- **Wetter (Zürich, heute):** Open-Meteo
- **5 nächste Strom-Tankstellen:** OpenChargeMap (CH, Umkreis 10 km)
- **Karte:** Leaflet + OpenStreetMap – zentriert auf Zürich

## Bedienung
Jede Karte hat einen eigenen Button. Beim Klicken erscheinen:
- **Blumen-Loader** während des Ladens
- **Bootstrap-Toasts** bei Fehlern
- Ergebnisse überschreiben vorherige Inhalte
