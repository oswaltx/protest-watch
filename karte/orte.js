// Orte aus den Medienberichten. Koordinaten per OpenStreetMap/Nominatim,
// Heumarkt, Domplatte und Kundgebung von Hand korrigiert. "genau" = wie sicher der Punkt ist.
// Quellen aus Medien und Polizei mit Link und Datum (Prüfung recht-db 1.11.)
(() => {
const a = (url, text) => `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
const TAZ = a("https://taz.de/Live-Ticker-GenZ-regelt/!6226335/", "taz-Liveticker, 31.10.");
const TONLINE = a("https://koeln.t-online.de/region/koeln/id_101503544/newsblog-gen-z-demo-koeln-bollerwuerfe-in-der-innenstadt.html",
                  "t-online-Newsblog, Stand 1.11. 07:21");
const ANTENNE = a("https://antenne.nrw/nrw/gen-z-demo-in-koeln-eskaliert-boeller-wasserwerfer-und-chaos-am-rheinufer/", "Antenne NRW, 31.10.");
const POLIZEI = a("https://www.presseportal.de/blaulicht/pm/12415/6381520", "Polizei Köln, PM 261031-1-K, 31.10.") + "; "
              + a("https://www.presseportal.de/blaulicht/pm/12415/6381831", "PM 261101-2-K, 1.11.");
const BILD = a("https://www.youtube.com/watch?v=K4kQf-2JuDw", "BILD-Video, 31.10.");
window.ORTE = [
  { name: "Kundgebung Konrad-Adenauer-Ufer", lat: 50.94967, lon: 6.96578, genau: "±30 m: Lautsprecherwagen auf dem KAU südlich der Bastei, eingepasst am Luftbild (DOP) von Geobasis NRW",
    info: "Kundgebung ab ca. 14–15 Uhr, Wasserwerfer ca. 16:30, Kessel bis nach 19 Uhr" },
  { name: "Bastei", lat: 50.95007, lon: 6.96673, genau: "Gebäude",
    info: "Ursprünglich genannter Treffpunkt „nahe der Bastei“" },
  { name: "Theodor-Heuss-Ring", lat: 50.95006, lon: 6.96117, genau: "Straßenmitte",
    info: `Laut taz Beamte mit Schlagstöcken; Rede zu Polizeigewalt (${TAZ})` },
  { name: "Thürmchenswall", lat: 50.94880, lon: 6.96550, genau: "ungefähr: Konrad-Adenauer-Ufer in Höhe der Einmündung Thürmchenswall (Ortsangabe der Polizei-PM 31.10.), neben Weckschnapp",
    info: `Laut Polizei Identitätsfeststellung bei knapp 1000 Personen (${POLIZEI}). `
      + "Laut einer Sprecherin der Demonstrierenden soll ein Eingekesselter von einem Beamten ins Gesicht geschlagen worden sein "
      + `(${TONLINE}; ${ANTENNE}). Das ist nicht unabhängig bestätigt und ließ sich laut beiden Medien vor Ort nicht überprüfen. `
      + "Eine Äußerung der Polizei dazu ist nicht bekannt (Stand 1.11.2026)." },
  { name: "Weckschnapp", lat: 50.94934, lon: 6.96540, genau: "Gebäude (Turm am Ufer)",
    info: "Wasserwerfer 16:49 (Livestream A), danach Kessel zwischen Weckschnapp und Vincenz-Haus" },
  { name: "St. Vincenz-Haus", lat: 50.94850, lon: 6.96420, genau: "Gebäude (Nominatim, Konrad-Adenauer-Ufer 55)",
    info: `Backsteinbau mit Portikus; Wasserwerfer davor ca. 16:45–17:00 (Video im ${TONLINE}; Livestream A)` },
  { name: "Musical Dome", lat: 50.94283, lon: 6.96172, genau: "Gebäude",
    info: "Sammelpunkt vor dem Demozug ca. 13:45–14:05 (Livestream B, Livestream A)" },
  { name: "Kreuzung KAU/Theodor-Heuss-Ring", lat: 50.94985, lon: 6.96600, genau: "ungefähr (Kreuzung zwischen Weckschnapp und Bastei)",
    info: "2. Kessel (Augenzeugenbericht); davor ab ca. 17:20 spontane Solidaritätskundgebung" },
  { name: "Dagobertstraße", lat: 50.94765, lon: 6.96428, genau: "Straße (Nominatim), Einmündung am KAU",
    info: "Straßenschild in zwei Clips: Wasserwerfer, Räumpanzer, Fluchtbewegung ca. 16:40–17:00" },
  { name: "Breslauer Platz", lat: 50.94425, lon: 6.95888, genau: "Platzmitte", info: "" },
  { name: "Ebertplatz", lat: 50.95076, lon: 6.95921, genau: "Platzmitte", info: "" },
  { name: "Domplatte", lat: 50.94230, lon: 6.95780, genau: "ungefähr",
    info: `Abends Böller, Räumung (${BILD}; ${TONLINE})` },
  { name: "Roncalliplatz", lat: 50.94044, lon: 6.95820, genau: "Platzmitte", info: "" },
  { name: "Hohe Straße", lat: 50.93528, lon: 6.95620, genau: "Straßenmitte",
    info: `Böllerwürfe (${TONLINE})` },
  { name: "Heumarkt", lat: 50.93580, lon: 6.96000, genau: "ungefähr",
    info: "Ursprünglicher Kundgebungsort, abgesagte Gegendemo „Antifa regelt“" },
];
})();
