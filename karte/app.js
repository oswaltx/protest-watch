(() => {
// 3D-Szene: fotorealistisches Köln (Google 3D-Kacheln über Cesium ion),
// Orte und Ereignisse aus den Medienberichten, Videos auf der Zeitachse 31.10.2026 12–23 Uhr.

const $ = (id) => document.getElementById(id);
const status = (t) => ($("status").textContent = t);

// Öffentliche Fassung (window.OEFFENTLICH): kein ion-Schlüssel, eigene Gebäude aus OSM auf flachem Boden,
// Videos als eingebettete Originale der Plattformen statt eigener Kopien.
const OEFFENTLICH = !!window.OEFFENTLICH;
if (window.CESIUM_ION_TOKEN) Cesium.Ion.defaultAccessToken = window.CESIUM_ION_TOKEN;
// Bodenhöhe über dem Ellipsoid: ion-Kacheln liegen auf echter Höhe (≈ 50 m NHN + 47 m Geoid),
// die eigenen Gebäude auf dem flachen Globus bei 0
const GRUND = 0;  // flache Karte auf dem Ellipsoid (lokal wie öffentlich); in der Google-Ansicht liegen Linien dadurch tiefer

const TAG = "2026-10-31";
const ortsZeit = (hhmm) => Cesium.JulianDate.fromIso8601(`${TAG}T${hhmm}:00+01:00`);
const start = ortsZeit("12:00");
const ende = ortsZeit("23:00");
const sek = (jd) => Cesium.JulianDate.toDate(jd).getTime() / 1000;   // Unix-Sekunden
const startS = sek(start), endeS = sek(ende);

// Handys und schwache Rechner: weniger Kantenglättung, weniger Bilder pro Sekunde, nur jeder dritte simulierte Punkt
// ?voll in der Adresse erzwingt die volle Darstellung (für Aufnahmen von Zeitraffern)
const SCHWACH = !new URLSearchParams(location.search).has("voll") &&
  (matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4);
const SCHMAL = matchMedia("(max-width: 700px)");  // Handy-Layout (wie die CSS-Regel in index.html)
const viewer = new Cesium.Viewer("karte", {
  globe: false,                 // Google-Kacheln enthalten Gelände schon
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  navigationHelpButton: false,
  fullscreenButton: true,
  timeline: true,
  animation: true,
  skyAtmosphere: false, skyBox: false,   // Himmel, Sterne, Sonne, Mond kosten Grafikleistung und zeigen nichts
  // Nur zeichnen, wenn sich etwas ändert (Kamera, Zeit, nachgeladene Kacheln, Menge) – sonst läuft die Grafikkarte
  // auch im Stillstand auf Volllast. Höchstens 30 (schwache Geräte 20) Bilder pro Sekunde.
  requestRenderMode: true,
  targetFrameRate: SCHWACH ? 20 : 30,
  msaaSamples: SCHWACH ? 1 : 4,
});
viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#dfe8f0");
if (viewer.scene.sun) viewer.scene.sun.show = false;
if (viewer.scene.moon) viewer.scene.moon.show = false;

window.viewer = viewer;  // zum Messen in der Browser-Konsole
viewer.clock.startTime = start.clone();
viewer.clock.stopTime = ende.clone();
viewer.clock.currentTime = ortsZeit("16:30");
viewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
viewer.clock.multiplier = 60;
viewer.clock.shouldAnimate = false;
viewer.timeline.zoomTo(start, ende);

// Zeit in deutscher Ortszeit anzeigen (Standard wäre UTC)
const UHR_FORMAT = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });
const uhr = (s) => UHR_FORMAT.format(s * 1000);  // Formatierer einmal anlegen, toLocaleTimeString je Aufruf ist teuer
viewer.animation.viewModel.timeFormatter = (jd) => uhr(sek(jd));
viewer.animation.viewModel.dateFormatter = () => "31.10.2026";
viewer.timeline.makeLabel = (jd) => uhr(sek(jd));
viewer.timeline.zoomTo(start, ende);  // neu zeichnen, damit die Beschriftung die Ortszeit nutzt

// Tonmodell: Google-Kacheln ohne Fototextur, grau schattiert. Die Kacheln haben keine
// brauchbaren Normalen, darum die Flächennormale aus den Bildschirm-Ableitungen der Position.
let stadt = null;
const TONMODELL = new Cesium.CustomShader({
  lightingModel: Cesium.LightingModel.UNLIT,
  fragmentShaderText: `
    void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
      vec3 p = fsInput.attributes.positionEC;
      vec3 n = normalize(cross(dFdx(p), dFdy(p)));
      vec3 licht = normalize(vec3(0.4, 0.8, 0.5));
      float hell = 0.35 + 0.65 * abs(dot(n, licht));
      material.diffuse = vec3(0.86, 0.85, 0.82) * hell;
    }`,
});

function setzeTonmodell(an) {
  if (!stadt) return;
  stadt.customShader = an ? TONMODELL : undefined;
  $("tonmodell").textContent = an ? "🖼 Fotos an" : "◻ Fotos aus (Tonmodell)";
  viewer.scene.requestRender();
}

// Standard: OSM-Gebäude auf OSM-Karte (lädt einmal, kein Google-Kontingent).
// Per Knopf: fotorealistische Google-Kacheln über Cesium ion (begrenztes Kontingent).
let osmGebaeude = null, osmKacheln = null, grundkarte = null, kartenstil = "schlicht";

async function ladeOsm(grund) {
  if (!viewer.scene.globe) {
    viewer.scene.globe = new Cesium.Globe();
    viewer.scene.globe.showGroundAtmosphere = false;
    osmKacheln = viewer.imageryLayers.addImageryProvider(new Cesium.OpenStreetMapImageryProvider({
      // öffentlich über den eigenen Kachel-Cache, damit keine IP-Adressen an die OSM Foundation gehen
      url: OEFFENTLICH ? "/osm/" : "https://tile.openstreetmap.org/", credit: "© OpenStreetMap-Mitwirkende" }));
    viewer.creditDisplay.addStaticCredit(new Cesium.Credit("Karte: © OpenStreetMap-Mitwirkende"));
  }
  viewer.scene.globe.show = true;
  setzeKartenstil(kartenstil);
  if (!osmGebaeude) osmGebaeude = viewer.scene.primitives.add(window.GEBAEUDE ? eigeneGebaeude() : await Cesium.createOsmBuildingsAsync());
  osmGebaeude.show = true;
  if (stadt) stadt.show = false;
  status(grund ? `Hinweis: ${grund}` : "");
  bodenHoehe = GRUND; letzteZeit = -2;  // flache Karte: Boden ist GRUND (die Höhenmessung gilt nur für Google-Kacheln)
  $("google-knopf").textContent = "📷 Google-Fotokacheln";
}

// Schlichte Karte: weißer Grund, Rhein und Straßen aus grundkarte.js, Brücken als flache Körper, Straßennamen.
// Bunt: die OSM-Kacheln wie bisher. Umschalten unter „Steuerung“.
function baueGrundkarte() {
  const G = window.GRUNDKARTE;
  const hierarchie = ([aussen, loecher]) => new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(aussen),
    loecher.map((l) => new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(l))));
  // einfache Flächen knapp über dem flachen Boden (GroundPrimitive wäre auf Handys deutlich langsamer)
  const flaechen = (liste, farbe, hoehe) => viewer.scene.primitives.add(new Cesium.Primitive({
    geometryInstances: liste.map((f) => new Cesium.GeometryInstance({
      geometry: new Cesium.PolygonGeometry({ polygonHierarchy: hierarchie(f), height: GRUND + hoehe,
        vertexFormat: Cesium.PerInstanceColorAppearance.FLAT_VERTEX_FORMAT }),
      attributes: { color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString(farbe)) } })),
    appearance: new Cesium.PerInstanceColorAppearance({ flat: true, translucent: false }) }));
  const bruecken = viewer.scene.primitives.add(new Cesium.Primitive({
    geometryInstances: G.bruecken.flatMap((b) => b.flaeche.map((f) => new Cesium.GeometryInstance({
      geometry: new Cesium.PolygonGeometry({ polygonHierarchy: hierarchie(f), height: GRUND + b.hoehe - 1.2,
        extrudedHeight: GRUND + b.hoehe, vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT }),
      attributes: { color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString("#8d929a")) } }))),
    appearance: new Cesium.PerInstanceColorAppearance({ translucent: false }) }));
  const namen = viewer.scene.primitives.add(new Cesium.LabelCollection());
  for (const [name, lat, lon] of G.namen) namen.add({ position: Cesium.Cartesian3.fromDegrees(lon, lat, GRUND + 1), text: name,
    font: "500 22px system-ui, sans-serif", scale: 0.5, fillColor: Cesium.Color.fromCssColorString("#6b6f76"),
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1800), disableDepthTestDistance: 0 });
  return [flaechen(G.wasser, "#bcd7ea", 0.3), flaechen(G.strassen, "#c8cace", 0.6), flaechen(G.gleise || [], "#8f949b", 0.8),
    bruecken, namen];
}
function setzeKartenstil(stil) {
  kartenstil = stil;
  const schlicht = stil === "schlicht";
  if (schlicht && !grundkarte && window.GRUNDKARTE) grundkarte = baueGrundkarte();
  if (osmKacheln) osmKacheln.show = !schlicht;
  if (viewer.scene.globe) viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString(schlicht ? "#f7f6f3" : "#e8e4dc");
  for (const g of grundkarte || []) g.show = schlicht;
  $("stil-knopf").textContent = schlicht ? "🗺 Bunter Stadtplan statt schlichter Karte" : "⬜ Schlichte Karte statt Stadtplan";
  viewer.scene.requestRender();
}
$("stil-knopf").onclick = () => setzeKartenstil(kartenstil === "schlicht" ? "bunt" : "schlicht");
$("sichtfeld-knopf").onclick = () => {
  const an = !(sichtfelder[0]?.show ?? true);
  for (const e of sichtfelder) e.show = an;
  $("sichtfeld-knopf").textContent = an ? "📷 Sichtfelder ausblenden" : "📷 Sichtfelder der Kameras zeigen";
  viewer.scene.requestRender();
};

// Gebäude aus gebaeude.js (OpenStreetMap, Höhe aus height bzw. Geschossen): weiß mit schwarzen Kanten, ohne Schattierung,
// damit sie wie eine gezeichnete Karte wirken; als je ein Primitive für Flächen und Kanten
function eigeneGebaeude() {
  const sammlung = new Cesium.PrimitiveCollection();
  const weiss = Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE);
  const schwarz = Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString("#1d1d1f"));
  // Wände; bei Gebäudeteilen (Dom) von der Mindesthöhe bis unter das Dach
  const huelle = ([hoehe, punkte, unten = 0, dach = 0]) => ({
    polygonHierarchy: new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(punkte)),
    height: GRUND + unten, extrudedHeight: GRUND + hoehe - dach });
  const flaechen = window.GEBAEUDE.map((g, i) => new Cesium.GeometryInstance({ id: i,
    geometry: new Cesium.PolygonGeometry({ ...huelle(g), vertexFormat: Cesium.PerInstanceColorAppearance.FLAT_VERTEX_FORMAT }),
    attributes: { color: weiss } }));
  const kanten = window.GEBAEUDE.map((g) => new Cesium.GeometryInstance({
    geometry: new Cesium.PolygonOutlineGeometry(huelle(g)), attributes: { color: schwarz } }));
  // Dächer der Gebäudeteile (Dom): Spitze über der Mitte (Turmspitzen, Zeltdächer) oder First (Satteldach,
  // nur bei vier Ecken: First zwischen den Mitten der beiden kürzeren Seiten)
  for (const [hoehe, punkte, unten = 0, dach = 0, form] of window.GEBAEUDE) {
    if (!dach) continue;
    const n = punkte.length / 2;
    const ecken = Cesium.Cartesian3.fromDegreesArrayHeights(
      punkte.flatMap((z, j) => (j % 2 ? [z, GRUND + hoehe - dach] : [z])));
    const oben = [];   // Spitze bzw. die zwei Firstpunkte
    const dreiecke = [], linien = [];
    const mitte = (a, b) => [(punkte[2 * a] + punkte[2 * b]) / 2, (punkte[2 * a + 1] + punkte[2 * b + 1]) / 2];
    if (form === "first") {
      const laenge = (a, b) => Cesium.Cartesian3.distance(ecken[a], ecken[b]);
      const k = laenge(0, 1) + laenge(2, 3) < laenge(1, 2) + laenge(3, 0) ? 0 : 1;  // k: Beginn einer kurzen Seite
      const [a0, a1, b0, b1] = [k, k + 1, (k + 2) % 4, (k + 3) % 4];
      for (const [x, y] of [mitte(a0, a1), mitte(b0, b1)]) oben.push(Cesium.Cartesian3.fromDegrees(x, y, GRUND + hoehe));
      const F1 = n, F2 = n + 1;   // F1 über der Seite a0–a1, F2 über b0–b1
      dreiecke.push(a0, a1, F1, b0, b1, F2, a1, b0, F2, a1, F2, F1, b1, a0, F1, b1, F1, F2);
      linien.push(F1, F2, a0, F1, a1, F1, b0, F2, b1, F2);
    } else {
      let lon = 0, lat = 0;
      for (let j = 0; j < n; j++) { lon += punkte[2 * j] / n; lat += punkte[2 * j + 1] / n; }
      oben.push(Cesium.Cartesian3.fromDegrees(lon, lat, GRUND + hoehe));
      for (let j = 0; j < n; j++) { dreiecke.push(j, (j + 1) % n, n); linien.push(j, n); }
    }
    const alle = [...ecken, ...oben];
    const lage = new Float64Array(alle.length * 3);
    alle.forEach((c, j) => { lage[3 * j] = c.x; lage[3 * j + 1] = c.y; lage[3 * j + 2] = c.z; });
    const position = new Cesium.GeometryAttribute({ componentDatatype: Cesium.ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3, values: lage });
    const kugel = Cesium.BoundingSphere.fromPoints(alle);
    flaechen.push(new Cesium.GeometryInstance({ attributes: { color: weiss },
      geometry: new Cesium.Geometry({ attributes: { position }, indices: new Uint16Array(dreiecke),
        primitiveType: Cesium.PrimitiveType.TRIANGLES, boundingSphere: kugel }) }));
    kanten.push(new Cesium.GeometryInstance({ attributes: { color: schwarz },
      geometry: new Cesium.Geometry({ attributes: { position }, indices: new Uint16Array(linien),
        primitiveType: Cesium.PrimitiveType.LINES, boundingSphere: kugel }) }));
  }
  const darstellung = () => new Cesium.PerInstanceColorAppearance({ flat: true, translucent: false });
  sammlung.add(new Cesium.Primitive({ geometryInstances: flaechen, appearance: darstellung() }));
  sammlung.add(new Cesium.Primitive({ geometryInstances: kanten, appearance: darstellung() }));
  return sammlung;
}

async function ladeGoogle() {
  if (stadt) {
    stadt.show = true;
  } else {
    try {
      const res = await Cesium.IonResource.fromAssetId(2275207);
      stadt = viewer.scene.primitives.add(await Cesium.Cesium3DTileset.fromUrl(res, { enableCollision: true }));
      stadt.tileFailed.addEventListener((f) => status(`Kachel-Fehler: ${f.message}`));
    } catch (e) {
      console.error("Google-Kacheln:", e);
      return ladeOsm(`Google nicht verfügbar: ${e?.message || e?.statusCode || e}`);
    }
  }
  if (osmGebaeude) osmGebaeude.show = false;
  if (viewer.scene.globe) viewer.scene.globe.show = false;
  status("Google 3D-Kacheln geladen");
  $("google-knopf").textContent = "🗺 OSM-Ansicht";
  setTimeout(messeUferHoehe, 4000);
}

async function ladeStadt() {
  await ladeOsm();
}

// ---------- Orte ----------
const ortNach = Object.fromEntries(window.ORTE.map((o) => [o.name, o]));
const ortEntity = {};

// Punkte hängen an der Oberfläche der 3D-Kacheln (Cesium passt die Höhe laufend an,
// auch wenn genauere Kacheln nachladen). Auf Bäumen/Dächern sitzt der Punkt dann obendrauf.
const AUF_KACHELN = Cesium.HeightReference.CLAMP_TO_3D_TILE ?? Cesium.HeightReference.CLAMP_TO_GROUND;

// Beschriftungen: doppelt so groß gezeichnet und halb skaliert (scharf statt verwaschen), auf dunklem Hintergrund statt mit
// dickem Umriss – der ließ kleine Schrift auf hellem Grund (Wasser, Straßen) zusammenlaufen.
function schild(text, { farbe = Cesium.Color.WHITE, versatz = -14, amBoden = false, bis = Infinity } = {}) {
  return { text, font: "600 26px system-ui, sans-serif", scale: 0.5, fillColor: farbe, style: Cesium.LabelStyle.FILL,
           showBackground: true, backgroundColor: new Cesium.Color(0.08, 0.08, 0.09, 0.8),
           backgroundPadding: new Cesium.Cartesian2(10, 6), pixelOffset: new Cesium.Cartesian2(0, versatz),
           heightReference: amBoden ? AUF_KACHELN : Cesium.HeightReference.NONE,
           disableDepthTestDistance: Number.POSITIVE_INFINITY,
           // nur bis zu dieser Entfernung (m) zeigen, damit sich in der Übersicht nicht alles überlagert
           distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, bis) };
}

// in der Übersicht beschriftet; die übrigen Orte erst beim Heranzoomen (sie liegen dicht beieinander am Ufer)
const HAUPTORTE = new Set(["Bastei", "Musical Dome", "Breslauer Platz", "Ebertplatz", "Domplatte", "Heumarkt", "Theodor-Heuss-Ring"]);
function zeigeOrte() {
  const liste = $("orte");
  for (const o of window.ORTE) {
    const [lat, lon] = anLand(o.lat, o.lon);  // „ungefähr“ verortete Orte am Ufer nicht im Rhein zeigen
    ortEntity[o.name] = viewer.entities.add({
      // feste Höhe knapp über Straßen- und Wasserflächen (am Boden „haftend“ lag der Punkt halb darunter)
      position: Cesium.Cartesian3.fromDegrees(lon, lat, GRUND + 2),
      point: { pixelSize: 9, color: Cesium.Color.ORANGE, outlineColor: Cesium.Color.BLACK, outlineWidth: 1,
               disableDepthTestDistance: 50 },
      label: schild(o.name, { versatz: -16, amBoden: false, bis: HAUPTORTE.has(o.name) ? Infinity : 900 }),
      description: `<p>${o.info || ""}</p><p><small>Genauigkeit: ${o.genau}</small></p>`,
      name: o.name,
    });
    const b = document.createElement("button");
    b.textContent = o.name;
    b.onclick = () => fliegeZu(o.lat, o.lon, 250);
    liste.appendChild(b);
  }
}

function fliegeZu(lat, lon, hoehe) {
  // Blick schräg von Süden auf den Punkt
  viewer.camera.flyTo({
    // Kamera so weit südlich, dass der Punkt etwas über der Bildmitte liegt (unten links steht oft die Tour)
    destination: Cesium.Cartesian3.fromDegrees(lon, lat - hoehe / 111000 * 1.65, hoehe + 40),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-35), roll: 0 },
    duration: 1.5,
  });
}

// ---------- Ereignisse ----------
const EREIGNISSE = window.EREIGNISSE.map((e) => ({ ...e, s: sek(ortsZeit(e.von)) }));
const ANSAGE = { polizei: "Ansage der Polizei", leitung: "Ansage der Versammlungsleitung" };
const ANSAGE_FARBE = { polizei: "#4d8bff", leitung: "#3ecf8e" };
const FENSTER = 20 * 60;  // Ereignis gilt 20 min als "aktuell"

// ---------- Videos ----------
const VIDEOS = window.VIDEOS;
const LIVES = VIDEOS.filter((v) => v.art === "live").sort((a, b) => a.start - b.start);

// ---------- Streifen über der Zeitachse ----------
const streifen = $("streifen");
const zeileH = 9;

function zeichneStreifen() {
  const tl = $("zl-spur").getBoundingClientRect();
  streifen.style.left = tl.left + "px";
  streifen.style.width = tl.width + "px";
  streifen.style.bottom = (window.innerHeight - tl.top) + "px";
  const w = tl.width;
  const x = (s) => ((s - startS) / (endeS - startS)) * w;
  const zeilen = LIVES.length + 2;
  let svg = `<svg width="${w}" height="${zeilen * zeileH + 6}">`;
  LIVES.forEach((v, i) => {
    svg += `<rect x="${x(v.start)}" y="${i * zeileH + 2}" width="${x(v.ende) - x(v.start)}" height="${zeileH - 2}"
             fill="#3a8ee6" opacity=".8"><title>LIVE ${v.kanal} ${uhr(v.start)}–${uhr(v.ende)}</title></rect>`;
  });
  const yClips = LIVES.length * zeileH + 2;
  for (const v of VIDEOS.filter((v) => v.art === "clip" && v.spaetestens)) {
    if (v.spaetestens < startS || v.spaetestens > endeS) continue;
    svg += `<rect x="${x(v.spaetestens) - 1}" y="${yClips}" width="2" height="${zeileH - 2}" fill="${v.plattform === "tiktok" ? "#e64a8b" : "#ddd"}">
             <title>Upload ${uhr(v.spaetestens)} ${v.kanal}</title></rect>`;
  }
  const yEv = yClips + zeileH;
  for (const e of EREIGNISSE) {
    const farbe = e.zeit_sicher === "genau" ? "#ffb000" : "#a07020";
    svg += `<polygon points="${x(e.s) - 4},${yEv + zeileH} ${x(e.s) + 4},${yEv + zeileH} ${x(e.s)},${yEv}" fill="${farbe}">
             <title>${e.von} ${e.ort}: ${e.text}</title></polygon>`;
  }
  svg += "</svg>";
  streifen.innerHTML = svg;
}

streifen.addEventListener("click", (ev) => {
  const r = streifen.getBoundingClientRect();
  const s = startS + ((ev.clientX - r.left) / r.width) * (endeS - startS);
  viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date(s * 1000));
});

// ---------- "Jetzt"-Feld ----------
let zuletzt = -1;

function aktualisiereJetzt() {
  const jetzt = Math.round(sek(viewer.clock.currentTime) / 30) * 30;
  if (jetzt === zuletzt) return;
  zuletzt = jetzt;
  $("jetzt-uhr").textContent = uhr(jetzt);

  const aktiv = EREIGNISSE.filter((e) => jetzt >= e.s - 5 * 60 && jetzt <= e.s + FENSTER);
  const aktiveOrte = new Set(aktiv.map((e) => e.ort));
  for (const [name, ent] of Object.entries(ortEntity)) {
    const an = aktiveOrte.has(name);
    ent.point.color = an ? Cesium.Color.RED : Cesium.Color.ORANGE;
    ent.point.pixelSize = an ? 15 : 9;
  }
  $("jetzt-ereignisse").innerHTML = aktiv.length
    ? aktiv.map((e) => `<div class="ev${e.ansage ? " ansage " + e.ansage : ""}">${e.ansage ? `<div class="ansage-kopf">📢 ${ANSAGE[e.ansage]}</div>` : ""}
        <b>${e.von}</b> <a href="#" data-ort="${e.ort}">${e.ort}</a>
        <span class="sicher">${e.zeit_sicher}</span><br>${e.text}<br><small>${e.quelle}</small></div>`).join("")
    : "<i>keine gemeldeten Ereignisse</i>";

  const live = LIVES.filter((v) => jetzt >= v.start && jetzt <= v.ende);
  // Clips nur als verortete Köln-Szenen (aus kameras.js), Start an der passenden Sekunde.
  // Zusammenschnitte mit anderen Städten tauchen so nur mit ihren Köln-Abschnitten auf.
  const szenen = (window.KAMERAS || []).map((k, i) => ({ ...k, i })).filter((k) => jetzt >= k.von && jetzt <= k.bis)
    .sort((a, b) => a.von - b.von).slice(0, 25);
  $("jetzt-videos").innerHTML =
    live.map((v) => `<button data-id="${v.id}" data-ab="${jetzt - v.start}">▶ LIVE ${v.kanal}
      <small>(Minute ${Math.floor((jetzt - v.start) / 60)})</small></button>`).join("") +
    szenen.map((k) => `<button data-id="${k.id}" data-k="${k.i}" class="clip" title="${k.inhalt}">▶ ${k.kanal}
      <small>${k.ort} · ${uhr(k.von)}–${uhr(k.bis)}</small></button>`).join("") ||
    "<i>kein Video zu dieser Zeit</i>";
}

$("jetzt-ereignisse").addEventListener("click", (ev) => {
  const o = ortNach[ev.target.dataset.ort];
  if (o) { ev.preventDefault(); fliegeZu(o.lat, o.lon, 250); }
});

// ---------- Player, bei Livestreams mit der Zeitachse gekoppelt ----------
// Lokal spielt er die eigenen Kopien (v.datei). Öffentlich bettet er die Originale der Plattformen ein,
// geladen erst nach Klick (vorher gehen keine Daten an Google/TikTok/…). YouTube ist über die IFrame-API
// steuerbar und wie die eigenen Kopien gekoppelt, die anderen Plattformen laufen nur eingebettet.
// Kopplung: Video -> Zeitachse (Uhrzeit = Streamstart + Videozeit); bewegt jemand die Zeitachse, springt das Video mit.
const vid = $("player-video");
const einbettung = $("player-einbettung");
let laufend = null;   // aktuell geöffnetes Video
let spieler = null;   // { zeit(), springe(s) } der gekoppelten Quelle, sonst null
let letzteUhr = null, sperreBis = 0;
const erlaubt = {};   // Plattformen, deren Laden in dieser Sitzung bestätigt wurde

const PLATTFORM_NAME = { youtube: "YouTube (Google)", tiktok: "TikTok", instagram: "Instagram (Meta)", telegram: "Telegram", zdf: "ZDF" };
function plattformAus(url) {
  const h = new URL(url).hostname;
  return h.includes("youtu") ? "youtube" : h.includes("tiktok") ? "tiktok" : h.includes("instagram") ? "instagram"
       : h === "t.me" ? "telegram" : h.includes("zdf") ? "zdf" : "web";
}
// Adresse des offiziellen Einbettungs-Players, null wenn die Plattform keinen anbietet
function einbettAdresse(v) {
  const u = new URL(v.url);
  if (v.plattform === "tiktok") return `https://www.tiktok.com/embed/v2/${u.pathname.split("/").pop()}`;
  if (v.plattform === "instagram") return `https://www.instagram.com/p/${u.pathname.split("/").filter(Boolean)[1]}/embed`;
  if (v.plattform === "telegram") return `https://t.me${u.pathname}?embed=1`;
  return null;
}
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function schliessePlayer() {
  vid.pause(); vid.removeAttribute("src");
  if (ytSpieler) ytSpieler.pauseVideo?.();
  einbettung.querySelector("iframe.fremd")?.remove();
  laufend = null; spieler = null;
  $("player").hidden = true;
}

function oeffneVideo(v, ab) {
  ab = Math.max(0, ab);
  laufend = v; spieler = null; letzteUhr = null;
  const gekoppelt = v.art === "live";
  $("player-titel").textContent = `${v.kanal}: ${v.titel}` + (gekoppelt ? " · mit Zeitachse gekoppelt" : "");
  $("player-link").href = v.url;
  $("player").hidden = false;
  vid.hidden = true; einbettung.hidden = true; $("player-zustimmung").hidden = true;
  einbettung.querySelector("iframe.fremd")?.remove();
  if (ytSpieler) ytSpieler.pauseVideo?.();

  if (!OEFFENTLICH && v.datei) {
    vid.hidden = false;
    vid.src = v.datei;
    vid.currentTime = ab;
    vid.play();
    if (gekoppelt) spieler = { zeit: () => vid.currentTime, springe: (s) => { vid.currentTime = s; } };
    return;
  }
  const p = v.plattform;
  const adresse = p === "youtube" ? null : einbettAdresse(v);
  // ohne Einbettung (z. B. Mediathek) gibt es nichts zu laden, also auch nichts zu bestätigen
  if (!erlaubt[p] && (p === "youtube" || adresse)) return frageZustimmung(v, ab);
  einbettung.hidden = false;
  $("player-youtube").hidden = p !== "youtube";
  if (p === "youtube") return zeigeYoutube(v, ab, gekoppelt);
  $("player-hinweis").textContent = adresse
    ? `Die verortete Szene beginnt bei ${mmss(ab)}. Dieser Player lässt sich nicht mit der Zeitachse koppeln.`
    : `${PLATTFORM_NAME[p] || "Diese Seite"} bietet keine Einbettung. Szene ab ${mmss(ab)}: über „Original öffnen“.`;
  if (adresse) {
    const f = document.createElement("iframe");
    f.src = adresse;
    f.allow = "autoplay; fullscreen; encrypted-media";
    f.referrerPolicy = "strict-origin";
    f.className = p === "telegram" ? "fremd" : "fremd hochkant";
    einbettung.appendChild(f);
  }
}

// Zwei-Klick-Lösung: erst nach Bestätigung lädt etwas von der Plattform
function frageZustimmung(v, ab) {
  const z = $("player-zustimmung");
  const name = PLATTFORM_NAME[v.plattform] || v.plattform;
  z.querySelector("p").textContent = `Dieses Video liegt bei ${name}. Wenn du es hier lädst, überträgt dein Browser `
    + `Daten wie deine IP-Adresse an ${name}. Ohne Laden kannst du es auch direkt dort öffnen.`;
  z.querySelector("button").textContent = `Video von ${name.split(" ")[0]} laden`;
  z.querySelector("button").onclick = () => { erlaubt[v.plattform] = true; oeffneVideo(v, ab); };
  z.hidden = false;
}

// YouTube über die IFrame-API (youtube-nocookie.com), ein Player für alle Videos
let ytSpieler = null, ytBereit = null;
function ladeYoutubeApi() {
  ytBereit ??= new Promise((fertig) => {
    window.onYouTubeIframeAPIReady = fertig;
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return ytBereit;
}
async function zeigeYoutube(v, ab, gekoppelt) {
  $("player-hinweis").textContent = gekoppelt ? "" : `Die verortete Szene beginnt bei ${mmss(ab)}.`;
  await ladeYoutubeApi();
  if (laufend !== v) return;   // inzwischen anderes Video gewählt
  if (!ytSpieler) {
    await new Promise((fertig) => {
      ytSpieler = new YT.Player("player-youtube", {
        host: "https://www.youtube-nocookie.com", videoId: v.id,
        playerVars: { start: Math.floor(ab), autoplay: 1, playsinline: 1, rel: 0 },
        events: { onReady: fertig, onStateChange: (e) => { if (e.data === 1) viewer.clock.shouldAnimate = false; } },
      });
    });
  } else {
    ytSpieler.loadVideoById({ videoId: v.id, startSeconds: ab });
  }
  if (gekoppelt && laufend === v) {
    spieler = { zeit: () => ytSpieler.getCurrentTime(), springe: (s) => ytSpieler.seekTo(s, true) };
  }
}

vid.addEventListener("play", () => { viewer.clock.shouldAnimate = false; });

viewer.clock.onTick.addEventListener(() => {
  if (!spieler || !laufend) return;
  const vt = spieler.zeit();
  if (!Number.isFinite(vt)) return;
  const uhrJetzt = sek(viewer.clock.currentTime);
  // Zeitachse wurde bewegt (nicht von uns): Video springt mit
  if (letzteUhr !== null && Math.abs(uhrJetzt - letzteUhr) > 1) {
    const ziel = uhrJetzt - laufend.start;
    if (ziel >= 0 && ziel <= laufend.dauer) { spieler.springe(ziel); sperreBis = performance.now() + 1500; }
    letzteUhr = uhrJetzt;
    return;
  }
  // kurz nach einem Sprung meldet YouTube noch die alte Zeit
  if (performance.now() < sperreBis && Math.abs(laufend.start + vt - uhrJetzt) > 2) return;
  const soll = laufend.start + vt;
  if (Math.abs(soll - uhrJetzt) > 0.25) viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date(soll * 1000));
  letzteUhr = soll;
});

// Video zu einer verorteten Szene; Plattformen ohne Eintrag in VIDEOS (Instagram, ZDF, Telegram) aus kameras.js
function videoZurKamera(k) {
  return VIDEOS.find((x) => x.id === k.id)
    || { id: k.id, kanal: k.kanal, titel: k.inhalt, url: k.url, datei: k.datei, art: "clip", plattform: plattformAus(k.url) };
}

$("jetzt-videos").addEventListener("click", (ev) => {
  const b = ev.target.closest("button");
  if (!b) return;
  const v = VIDEOS.find((x) => x.id === b.dataset.id);
  if (v?.art === "live") return oeffneVideo(v, sek(viewer.clock.currentTime) - v.start);
  // Clips starten an ihrer verorteten Köln-Szene
  const k = window.KAMERAS[+b.dataset.k];
  oeffneVideo(videoZurKamera(k), k.sek_von);
});
$("player-zu").onclick = schliessePlayer;

// Klick auf einen Livestreamer-Punkt öffnet seinen Stream zur aktuellen Uhrzeit
viewer.selectedEntityChanged.addEventListener((ent) => {
  const id = ent?.properties?.stream?.getValue();
  const v = id && VIDEOS.find((x) => x.id === id);
  if (v && laufend !== v) oeffneVideo(v, sek(viewer.clock.currentTime) - v.start);
  // Klick auf eine Clip-Kamera spielt die Szene ab
  const k = ent?.properties?.kamera?.getValue();
  if (k) oeffneVideo(videoZurKamera(k), k.sek_von);
});

// ---------- Laufwege der Livestreamer ----------
// Punkt bewegt sich zwischen den Wegpunkten (1 pro Minute), Spur der letzten 15 min.
// Zwischen Lücken wird linear interpoliert; Lücken > 10 min werden nicht überbrückt.
const LUECKE = 10 * 60;

// Liegt ein geschätzter Wegpunkt im Rhein, wird er an die nächste Uferstelle gesetzt (4 m landeinwärts). Die Orte der
// Livestreams sind aus Bildern geschätzt; im Wasser stand niemand.
const WASSER = (window.GRUNDKARTE?.wasser || []).map(([aussen]) => {
  const xs = aussen.filter((_, i) => i % 2 === 0), ys = aussen.filter((_, i) => i % 2 === 1);
  return { aussen, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
});
function anLand(lat, lon) {
  const kx = Math.cos(lat * Math.PI / 180);
  for (const w of WASSER) {
    if (lon < w.minX || lon > w.maxX || lat < w.minY || lat > w.maxY) continue;
    const r = w.aussen;
    let drin = false;
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2)
      if ((r[i + 1] > lat) !== (r[j + 1] > lat) && lon < (r[j] - r[i]) * (lat - r[i + 1]) / (r[j + 1] - r[i + 1]) + r[i]) drin = !drin;
    if (!drin) continue;
    let best = null, bestD = Infinity;
    for (let i = 0; i + 3 < r.length; i += 2) {  // nächster Punkt auf dem Uferrand (in lokalen Metern gerechnet)
      const ax = r[i] * kx, ay = r[i + 1], bx = r[i + 2] * kx, by = r[i + 3], px = lon * kx, py = lat;
      const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
      const u = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
      const qx = ax + u * dx, qy = ay + u * dy, d = (px - qx) ** 2 + (py - qy) ** 2;
      if (d < bestD) { bestD = d; best = [qx, qy]; }
    }
    const [qx, qy] = best, laenge = Math.sqrt(bestD) || 1e-9, schritt = 4 / 111320;
    return [qy + (qy - lat) / laenge * schritt, (qx + (qx - lon * kx) / laenge * schritt) / kx];
  }
  return [lat, lon];
}

function zeigeWege() {
  for (const w of window.WEGE || []) {
    for (const p of w.punkte) [p.lat, p.lon] = anLand(p.lat, p.lon);
    if (w.punkte.length < 1) continue;
    const farbe = Cesium.Color.fromCssColorString(w.farbe);
    // Abschnitte ohne große Lücken
    const abschnitte = [];
    let akt = [];
    for (const p of w.punkte) {
      if (akt.length && p.t - akt[akt.length - 1].t > LUECKE) { abschnitte.push(akt); akt = []; }
      akt.push(p);
    }
    if (akt.length) abschnitte.push(akt);

    abschnitte.forEach((abschnitt, i) => {
      const pos = new Cesium.SampledPositionProperty();
      for (const p of abschnitt) {
        // Spur kann nicht an Kacheln haften: feste Höhe Straßenniveau plus 2 m
        pos.addSample(Cesium.JulianDate.fromDate(new Date(p.t * 1000)), Cesium.Cartesian3.fromDegrees(p.lon, p.lat, GRUND + 2));
      }
      const von = Cesium.JulianDate.fromDate(new Date(abschnitt[0].t * 1000));
      const bis = Cesium.JulianDate.fromDate(new Date((abschnitt[abschnitt.length - 1].t + 59) * 1000));
      viewer.entities.add({
        name: `LIVE ${w.kanal}`,
        availability: new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({ start: von, stop: bis })]),
        position: pos,
        point: { pixelSize: 12, color: farbe, outlineColor: Cesium.Color.WHITE, outlineWidth: 2,
                 disableDepthTestDistance: Number.POSITIVE_INFINITY },
        label: schild(`📹 ${w.kanal}`, { farbe, versatz: 20, bis: 1500 }),
        path: { leadTime: 0, trailTime: 15 * 60, width: 3, resolution: 30,
                material: new Cesium.PolylineGlowMaterialProperty({ color: farbe, glowPower: 0.15 }) },
        properties: { stream: w.id },
        description: new Cesium.CallbackProperty((zeit) => wegBeschreibung(w, sek(zeit)), false),
      });
      // Sichtfeld des Streams, wandert mit; Richtung aus dem zeitlich nächsten verorteten Bild
      if (abschnitt.some((p) => p.blick in RICHTUNG)) sichtfelder.push(viewer.entities.add({
        availability: new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({ start: von, stop: bis })]),
        polygon: {
          hierarchy: new Cesium.CallbackProperty((zeit) => {
            const c = pos.getValue(zeit);
            const p = naechsterPunkt({ punkte: abschnitt }, sek(zeit));
            if (!c || !(p.blick in RICHTUNG)) return undefined;
            const g = Cesium.Cartographic.fromCartesian(c);
            return sichtfeld(Cesium.Math.toDegrees(g.latitude), Cesium.Math.toDegrees(g.longitude), RICHTUNG[p.blick], 60, 60);
          }, false),
          height: GRUND + 1.6, material: farbe.withAlpha(0.15), outline: true, outlineColor: farbe.withAlpha(0.6) },
        properties: { stream: w.id },
      }));
    });
  }
}

function naechsterPunkt(w, s) {
  let best = null;
  for (const p of w.punkte) if (!best || Math.abs(p.t - s) < Math.abs(best.t - s)) best = p;
  return best;
}

function wegBeschreibung(w, s) {
  const p = naechsterPunkt(w, s);
  if (!p) return "";
  return `<p><b>${uhr(p.t)}</b> (Minute ${Math.round((p.t - w.start) / 60)} im Stream), Sicherheit: ${p.sicher}</p>
    <p>${p.szene || ""}</p><p><small>Erkannt an: ${p.grund || "–"}</small></p>`;
}

// ---------- Kameras der Clips ----------
// Kamera-Symbol mit Blickpfeil (30 m) und Sichtfeld, sichtbar nur im Zeitfenster der Szene.
// Sichtfeld: bei eingepassten Posen genaue Richtung und Bildwinkel, sonst Himmelsrichtung ±30°; Reichweite grob
// (am Boden 60 m, erhöht 120 m), weil Menschen und Gebäude den Blick meist früher begrenzen.
const sichtfelder = [];  // zum Ein- und Ausblenden unter „Steuerung“
function sichtfeld(lat, lon, kursGrad, winkelGrad, reichweite) {
  const kx = 111320 * Math.cos(lat * Math.PI / 180), punkte = [lon, lat];
  for (let j = 0; j <= 8; j++) {
    const w = (kursGrad - winkelGrad / 2 + winkelGrad * j / 8) * Math.PI / 180;
    punkte.push(lon + reichweite * Math.sin(w) / kx, lat + reichweite * Math.cos(w) / 111320);
  }
  return new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(punkte));
}
const RICHTUNG = { N: 0, NO: 45, O: 90, SO: 135, S: 180, SW: 225, W: 270, NW: 315 };
const SICHER_FARBE = { hoch: "#ffffff", mittel: "#ffd24d", niedrig: "#ff8c4d", unbekannt: "#999999" };

function zeigeKameras() {
  for (const k of window.KAMERAS || []) {
    // grob geschätzte Orte landen manchmal im Rhein, obwohl „Ufer“, „Rasen“ oder „Gehweg“ dasteht: ans Ufer setzen
    if (!/brücke|schiff|boot/i.test(k.ort)) [k.lat, k.lon] = anLand(k.lat, k.lon);
    const farbe = Cesium.Color.fromCssColorString(SICHER_FARBE[k.ort_sicher] || "#999999");
    const zeit = new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
      start: Cesium.JulianDate.fromDate(new Date(k.von * 1000)),
      stop: Cesium.JulianDate.fromDate(new Date(k.bis * 1000)),
    })]);
    const beschreibung = `<p><b>${k.kanal}</b>, Sekunde ${k.sek_von}–${k.sek_bis ?? "?"}</p><p>${k.inhalt}</p>
      <p><small>Ort (${k.ort_sicher}): ${k.ort} – ${k.ort_grund}<br>
      Zeit ${uhr(k.von)}–${uhr(k.bis)} (${k.zeit_sicher}): ${k.zeit_grund}</small></p>`;
    viewer.entities.add({
      name: `🎥 ${k.kanal}`,
      availability: zeit,
      position: Cesium.Cartesian3.fromDegrees(k.lon, k.lat, GRUND + 2),
      point: { pixelSize: 8, color: farbe, outlineColor: Cesium.Color.BLACK, outlineWidth: 1,
               disableDepthTestDistance: Number.POSITIVE_INFINITY },
      properties: { kamera: k },
      description: beschreibung,
    });
    if (k.blick in RICHTUNG || k.kurs != null) {
      const genau = k.kurs != null;  // eingepasste Pose: kräftiger, sonst nur angedeutet
      sichtfelder.push(viewer.entities.add({
        availability: zeit,
        polygon: { hierarchy: sichtfeld(k.lat, k.lon, k.kurs ?? RICHTUNG[k.blick], k.sichtfeld ?? 60, k.hoehe === "erhöht" ? 120 : 60),
          height: GRUND + 1.5, material: farbe.withAlpha(genau ? 0.2 : 0.07), outline: true,
          outlineColor: farbe.withAlpha(genau ? 0.8 : 0.3) },
        properties: { kamera: k },
        description: beschreibung,
      }));
    }
    if (k.blick in RICHTUNG) {
      const w = Cesium.Math.toRadians(k.kurs ?? RICHTUNG[k.blick]);
      const dLat = (30 * Math.cos(w)) / 111320;
      const dLon = (30 * Math.sin(w)) / (111320 * Math.cos(Cesium.Math.toRadians(k.lat)));
      viewer.entities.add({
        availability: zeit,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights([k.lon, k.lat, GRUND + 2, k.lon + dLon, k.lat + dLat, GRUND + 2]),
          width: 6, material: new Cesium.PolylineArrowMaterialProperty(farbe.withAlpha(0.8)),
        },
        properties: { kamera: k },
        description: beschreibung,
      });
    }
  }
}

// ---------- Menge, Polizei, Fahrzeuge (geschätzt, aus mengen.json) ----------
// Jede Person hat einen eigenen Weg über die Zeitpunkte ihrer Population (berechnet in
// skripte/menge_berechnen.py). Nur Punkte: Figuren am Boden haben beim Heranzoomen den Rechner überlastet.
const MENGE = window.MENGE;
const [LAT0, LON0] = MENGE.ursprung, [MX, MY] = MENGE.m_pro_grad;
const FEHLT = MENGE.fehlt;
const FARBE_GRUPPE = { menge: Cesium.Color.fromCssColorString("#ffcf66"), polizei: Cesium.Color.fromCssColorString("#4d8bff"),
                       fahrzeug: Cesium.Color.fromCssColorString("#2d5fd6"), krawall: Cesium.Color.fromCssColorString("#ff3b3b") };
let bodenHoehe = GRUND;  // Ellipsoid-Höhe Uferstraße, nach Laden der Kacheln gemessen

const punkteSammlung = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());

const populationen = MENGE.populationen.map((p) => {
  const roh = Uint8Array.from(atob(p.wege), (c) => c.charCodeAt(0));
  const wege = new Int16Array(roh.buffer);  // [person][zeitpunkt][x,y] in Dezimetern
  const farbe = FARBE_GRUPPE[p.gruppe], fz = p.gruppe === "fahrzeug";
  const punkte = [];
  for (let i = 0; i < p.personen; i++) {
    // schwache Geräte: nur jede dritte Person bekommt einen Punkt (spart Speicher und Rechenzeit; gezählt werden alle)
    if (SCHWACH && i % 3 && !fz) { punkte.push(null); continue; }
    punkte.push(punkteSammlung.add({ show: false, color: farbe, pixelSize: { polizei: 5, fahrzeug: 9, krawall: 5 }[p.gruppe] || 4,
      scaleByDistance: new Cesium.NearFarScalar(50, 2.0, 2000, 0.6) }));
  }
  return { ...p, wege, K: p.T.length, punkte };
});

const fahrzeugEntities = MENGE.fahrzeuge.map((f) => {
  const pos = new Cesium.SampledPositionProperty();
  for (const w of f.wege) pos.addSample(Cesium.JulianDate.fromDate(new Date(w.t * 1000)), Cesium.Cartesian3.fromDegrees(w.lon, w.lat, GRUND + 2.5));
  const von = Cesium.JulianDate.fromDate(new Date(f.wege[0].t * 1000));
  const bis = Cesium.JulianDate.fromDate(new Date(f.wege[f.wege.length - 1].t * 1000));
  return viewer.entities.add({
    name: f.name,
    availability: new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({ start: von, stop: bis })]),
    position: pos,
    point: { pixelSize: 14, color: Cesium.Color.fromCssColorString("#2d5fd6"), outlineColor: Cesium.Color.WHITE, outlineWidth: 2,
             disableDepthTestDistance: Number.POSITIVE_INFINITY },
    label: schild(f.name, { versatz: -18, bis: 700 }),
    description: `<p>Position geschätzt aus: ${f.quelle}</p>`,
  });
});

// Angemeldete Fläche (gestrichelt) und tatsächlicher Zug
for (const m of MENGE.markierungen) {
  const pos = Cesium.Cartesian3.fromDegreesArrayHeights(m.punkte.flatMap(([lat, lon]) => [lon, lat, GRUND + 2]));
  viewer.entities.add({
    name: m.name,
    polyline: { positions: pos, width: m.art === "flaeche" ? 3 : 5, clampToGround: false,
      material: m.art === "flaeche"
        ? new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.WHITE.withAlpha(0.9), dashLength: 16 })
        : new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString("#ff6b9a").withAlpha(0.8)) },
    description: `<p>${m.name}</p><p><small>${m.quelle}</small></p>`,
  });
}

const laengen = new Float64Array(64);
// Höhe der Fahrbahn, wenn der Punkt auf einer Brücke liegt (Umriss aus grundkarte.js), sonst 0;
// in den letzten 80 m vor der Brücke gleichmäßig ansteigend (Rampe)
const BRUECKEN = (window.GRUNDKARTE?.bruecken || []).map((b) => ({ hoehe: b.hoehe, r: b.flaeche[0][0] }));
function brueckenHoehe(lat, lon) {
  const kx = Math.cos(lat * Math.PI / 180) * 111320, ky = 111320;
  let best = 0;
  for (const { hoehe, r } of BRUECKEN) {
    let drin = false, d = Infinity;
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      if ((r[i + 1] > lat) !== (r[j + 1] > lat) && lon < (r[j] - r[i]) * (lat - r[i + 1]) / (r[j + 1] - r[i + 1]) + r[i]) drin = !drin;
      d = Math.min(d, Math.hypot((r[i] - lon) * kx, (r[i + 1] - lat) * ky));
    }
    best = Math.max(best, drin ? hoehe : hoehe * Math.max(0, 1 - d / 80));
  }
  return best;
}  // Hilfsfeld: Längen der Teilstücke eines Weges
const zuGrad = (dx, dy) => [LON0 + dx / 10 / MX, LAT0 + dy / 10 / MY];
let mengeSichtbar = true;  // umgeschaltet über setzeModus (Punkte / Dichte / Beides)
let nurPolizei = false;     // Modus „Dichte“: Polizei und Fahrzeuge bleiben sichtbar (Kessel), Menge kommt aus der Dichte
let letzteAktualisierung = 0, letzteZeit = -1;
const mengeZahlen = {};

function aktualisiereMenge() {
  // höchstens ~10 Mal pro Sekunde, und nur wenn sich Zeit oder Kamera geändert haben
  const jetzt = performance.now();
  const t = sek(viewer.clock.currentTime);
  if (jetzt - letzteAktualisierung < (SCHWACH ? 250 : 100) || (t === letzteZeit && letzteZeit !== -2)) return;
  letzteAktualisierung = jetzt; letzteZeit = t;
  for (const p of populationen) {
    const { T, K, wege, punkte } = p;
    let k = -1;
    if (t >= T[0] && t < T[K - 1]) { k = 0; while (k < K - 2 && T[k + 1] <= t) k++; }
    const f = k >= 0 ? (t - T[k]) / (T[k + 1] - T[k]) : 0;
    let n = 0;
    for (let i = 0; i < punkte.length; i++) {
      const pp = punkte[i];
      const a = (i * K + k) * 2, b = a + 2;
      if (k < 0 || wege[a] === FEHLT || wege[b] === FEHLT) { if (pp) pp.show = false; continue; }
      n++;
      if (!pp) continue;
      if (!mengeSichtbar || (nurPolizei && p.gruppe !== "polizei" && p.gruppe !== "fahrzeug")) { pp.show = false; continue; }
      // Wie echte Menschen: den ganzen Weg zum nächsten Platz (um Häuser herum, aus mehreren Teilstücken) in einem
      // Zug in normalem Tempo gehen, jede Person zu einer eigenen Zeit, dann dort stehen bleiben – statt eine halbe
      // Stunde lang gleichmäßig zu gleiten. Wege in Dezimetern.
      const Z = p.zwischen || 1, m0 = Math.floor(k / Z) * Z, m1 = Math.min(m0 + Z, K - 1);
      let von = m0, bis = m1;
      for (let m = m0; m <= m1; m++) if (wege[(i * K + m) * 2] === FEHLT) { von = k; bis = k + 1; break; }
      let strecke = 0;
      for (let m = von; m < bis; m++) {
        const u = (i * K + m) * 2;
        laengen[m - von] = Math.hypot(wege[u + 2] - wege[u], wege[u + 3] - wege[u + 1]) / 10;
        strecke += laengen[m - von];
      }
      const dauer = T[bis] - T[von], gehzeit = Math.min(dauer, strecke / (p.gruppe === "fahrzeug" ? 4 : 1.3));
      const versatz = ((Math.sin(i * 12.9898 + von * 78.233) * 43758.5453) % 1 + 1) % 1 * (dauer - gehzeit);
      const roh = gehzeit > 0 ? Math.max(0, Math.min(1, (t - T[von] - versatz) / gehzeit)) : 1;
      const g = roh * roh * (3 - 2 * roh);  // sanft anlaufen und abbremsen
      let rest = g * strecke, m = von;
      while (m < bis - 1 && rest > laengen[m - von]) { rest -= laengen[m - von]; m++; }
      const u = (i * K + m) * 2, anteil = laengen[m - von] > 0 ? rest / laengen[m - von] : 1;
      const x = wege[u] + (wege[u + 2] - wege[u]) * anteil, y = wege[u + 1] + (wege[u + 3] - wege[u + 1]) * anteil;
      const [lon, lat] = zuGrad(x, y);
      // Fahrzeuge auf einer Brücke in Fahrbahnhöhe statt unten auf dem Wasser
      const hoehe = bodenHoehe + 2 + (p.gruppe === "fahrzeug" ? 0.5 + brueckenHoehe(lat, lon) : 0);  // nicht halb im Boden
      pp.position = Cesium.Cartesian3.fromDegrees(lon, lat, hoehe);
      pp.show = true;
    }
    mengeZahlen[p.name] = { n, gruppe: p.gruppe, quelle: p.quelle };
  }
  zeigeMengeZahlen();
  viewer.scene.requestRender();  // Punkte haben sich bewegt
}

// Zahlen im "Jetzt"-Feld, direkt nach jeder Berechnung (nur neu schreiben, wenn sich etwas ändert)
function zeigeMengeZahlen() {
  const zonen = Object.entries(mengeZahlen).filter(([, z]) => z.n > 0);
  const html = zonen.length
    ? zonen.map(([name, z]) => `<div title="${z.quelle}">${{ polizei: "🔵", krawall: "🔴", fahrzeug: "🚐" }[z.gruppe] || "🟡"} ${name}: ~${z.n}</div>`).join("")
    : "<i>keine geschätzte Menge</i>";
  if ($("jetzt-menge").innerHTML !== html) $("jetzt-menge").innerHTML = html;
}

// ---------- Diagramm: Personen je Gruppe über den Tag ----------
// Zählt pro 5 min die anwesenden Personen aller Populationen derselben Gruppe
// (Fahrzeuge ausgenommen) und zeigt zusätzliche Kennzahlen (z. B. Gewaltbereite) aus MENGE.reihen.
const GRUPPEN = { menge: ["Demonstrierende", "#ffcf66"], polizei: ["Polizei", "#4d8bff"],
                  krawall: ["Gewaltbereite (Teil der Demo)", "#ff3b3b"] };
let diagrammX = null;

function zaehleGruppen() {
  const raster = [];
  for (let s = startS; s <= endeS; s += 300) raster.push(s);
  const reihen = {};
  for (const g of Object.keys(GRUPPEN)) reihen[g] = raster.map(() => 0);
  for (const p of populationen) {
    if (!reihen[p.gruppe]) continue;
    raster.forEach((s, j) => {
      if (s < p.T[0] || s >= p.T[p.K - 1]) return;
      let k = 0; while (k < p.K - 2 && p.T[k + 1] <= s) k++;
      const f = (s - p.T[k]) / (p.T[k + 1] - p.T[k]);
      let n0 = 0, n1 = 0;
      for (let i = 0; i < p.personen; i++) {
        if (p.wege[(i * p.K + k) * 2] !== FEHLT) n0++;
        if (p.wege[(i * p.K + k + 1) * 2] !== FEHLT) n1++;
      }
      reihen[p.gruppe][j] += Math.round(n0 + (n1 - n0) * f);
    });
  }
  return { raster, reihen };
}

function zeichneDiagramm() {
  const { raster, reihen } = zaehleGruppen();
  const extra = (MENGE.reihen || []).map((r) => ({ ...r,
    werte: raster.map((s) => {
      const p = r.punkte;
      if (s <= p[0][0]) return p[0][1];
      for (let i = 0; i < p.length - 1; i++)
        if (s < p[i + 1][0]) return p[i][1] + (p[i + 1][1] - p[i][1]) * (s - p[i][0]) / (p[i + 1][0] - p[i][0]);
      return p[p.length - 1][1];
    }) }));
  const alle = [...Object.entries(reihen).map(([g, w]) => ({ name: GRUPPEN[g][0], farbe: GRUPPEN[g][1], werte: w })),
                ...extra.map((r) => ({ name: r.name, farbe: r.farbe, werte: r.werte, quelle: r.quelle }))];
  const W = 540, H = 200, L = 40, U = 18;
  // aus Videobildern gezählt; zu kleine Ausschnitte (Domplatte abends) lässt das Diagramm weg
  const zaehlungen = dichteZeitpunkte.filter((z) => z.gesamt_sichtbereich && z.flaeche_sichtbereich_m2 >= KLEIN_M2);
  const max = Math.max(100, ...alle.flatMap((r) => r.werte), ...zaehlungen.map((z) => z.gesamt_sichtbereich.p84));
  const x = (s) => L + (s - startS) / (endeS - startS) * (W - L - 6);
  const y = (n) => H - U - n / max * (H - U - 8);
  let svg = `<svg viewBox="0 0 ${W} ${H}" id="diagramm-svg">`;
  for (let n = 0; n <= max; n += max > 2000 ? 1000 : 250) {
    svg += `<line x1="${L}" x2="${W}" y1="${y(n)}" y2="${y(n)}" stroke="#444" stroke-width=".5"/>
            <text x="${L - 4}" y="${y(n) + 3}" fill="#aaa" font-size="9" text-anchor="end">${n}</text>`;
  }
  for (let h = 12; h <= 23; h++) {
    svg += `<text x="${x(startS + (h - 12) * 3600)}" y="${H - 4}" fill="#aaa" font-size="9" text-anchor="middle">${h}</text>`;
  }
  for (const r of alle) {
    const pfad = r.werte.map((n, j) => `${j ? "L" : "M"}${x(raster[j]).toFixed(1)},${y(n).toFixed(1)}`).join("");
    svg += `<path d="${pfad}" fill="none" stroke="${r.farbe}" stroke-width="2"><title>${r.name}</title></path>`;
  }
  for (const z of zaehlungen) {  // Median mit 68-%-Spanne; nur der gefilmte Ausschnitt, Polizei mitgezählt
    const g = z.gesamt_sichtbereich, px = x(z.s).toFixed(1);
    svg += `<g><title>${z.zeit} Uhr, ${z.name}: etwa ${g.median} Menschen (${g.p16}–${g.p84}) im gefilmten Bereich
      (${z.flaeche_sichtbereich_m2} m²), in Videobildern gezählt</title>
      <line x1="${px}" x2="${px}" y1="${y(g.p84)}" y2="${y(g.p16)}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="${px}" cy="${y(g.median)}" r="3.5" fill="#fff" stroke="#111"/></g>`;
  }
  svg += `<line id="diagramm-jetzt" x1="0" x2="0" y1="6" y2="${H - U}" stroke="#fff" stroke-width="1" stroke-dasharray="3 2"/></svg>`;
  $("diagramm-flaeche").innerHTML = svg;
  $("diagramm-legende").innerHTML = alle.map((r) =>
    `<span title="${r.quelle || "aus den geschätzten Mengen (mengen.json)"}"><i style="background:${r.farbe}"></i>${r.name}</span>`).join("") +
    (zaehlungen.length ? `<span><i style="background:#fff;width:7px;height:7px;border-radius:50%"></i>gezählt in Videobildern
      (nur gefilmter Bereich, mit Polizei)</span>` : "") +
    "<br>Linien geschätzt, weiße Punkte mit Spanne in Videobildern gezählt. Gewaltbereite sind eine Teilmenge der " +
    "Demonstrierenden. Klick setzt die Uhrzeit.";
  $("diagramm-svg").addEventListener("click", (ev) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const s = startS + ((ev.clientX - r.left) / r.width * W - L) / (W - L - 6) * (endeS - startS);
    viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date(Math.min(endeS, Math.max(startS, s)) * 1000));
  });
  diagrammX = x;
}

function diagrammJetzt() {
  const linie = document.getElementById("diagramm-jetzt");
  if (!linie || !diagrammX) return;
  const px = diagrammX(sek(viewer.clock.currentTime));
  linie.setAttribute("x1", px); linie.setAttribute("x2", px);
}

$("diagramm-knopf").onclick = () => {
  $("diagramm").hidden = !$("diagramm").hidden;
  if (!$("diagramm").hidden && !diagrammX) zeichneDiagramm();
};
$("diagramm-zu").onclick = () => { $("diagramm").hidden = true; };
viewer.clock.onTick.addEventListener(diagrammJetzt);

async function messeUferHoehe() {
  try {
    const [p] = await viewer.scene.sampleHeightMostDetailed([Cesium.Cartographic.fromDegrees(6.9652, 50.9488)], [], 0.5);
    if (Number.isFinite(p.height)) { bodenHoehe = p.height; letzteZeit = -2; }
  } catch (e) { console.warn("Uferhöhe nicht messbar", e); }
}

// ---------- Start ----------
// Übersicht: der ganze Demo-Bereich vom Dom bis zur Bastei, schräg von Süden, das Ufer etwas links der Mitte
// (rechts liegt die Leiste über dem Rhein)
const uebersicht = () => viewer.camera.flyTo(SCHMAL.matches
  ? { destination: Cesium.Cartesian3.fromDegrees(6.9636, 50.9418, 900),   // Handy hochkant: steiler von oben
      orientation: { heading: Cesium.Math.toRadians(16), pitch: Cesium.Math.toRadians(-58), roll: 0 }, duration: 1.5 }
  : { destination: Cesium.Cartesian3.fromDegrees(6.9608, 50.9398, 560),
      orientation: { heading: Cesium.Math.toRadians(16), pitch: Cesium.Math.toRadians(-36), roll: 0 }, duration: 1.5 });
$("uebersicht").onclick = uebersicht;
$("tonmodell").onclick = () => setzeTonmodell(!stadt?.customShader);
$("google-knopf").onclick = () => (stadt && stadt.show ? ladeOsm() : ladeGoogle());
if (OEFFENTLICH) { $("google-knopf").hidden = true; $("tonmodell").hidden = true; }

// ---------- Link zu einem Moment ----------
// Adresse #t=16:49&k=lon,lat,höhe,richtung,neigung gibt Uhrzeit und Blick wieder; der Knopf kopiert sie.
function momentAusAdresse() {
  const a = new URLSearchParams(location.hash.slice(1));
  if (/^\d{1,2}:\d{2}$/.test(a.get("t") || "")) viewer.clock.currentTime = ortsZeit(a.get("t").padStart(5, "0"));
  const k = (a.get("k") || "").split(",").map(Number);
  if (k.length === 5 && k.every(Number.isFinite)) {
    viewer.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(k[0], k[1], k[2]),
      orientation: { heading: Cesium.Math.toRadians(k[3]), pitch: Cesium.Math.toRadians(k[4]), roll: 0 } });
    return true;
  }
  return false;
}
function momentAlsAdresse() {
  const c = viewer.camera.positionCartographic;
  const k = [Cesium.Math.toDegrees(c.longitude).toFixed(5), Cesium.Math.toDegrees(c.latitude).toFixed(5), Math.round(c.height),
             Math.round(Cesium.Math.toDegrees(viewer.camera.heading)), Math.round(Cesium.Math.toDegrees(viewer.camera.pitch))];
  // m = Darstellung der Menschen, s = Kartenstil, damit ein geteilter Link genauso aussieht
  return `${location.origin}${location.pathname}#t=${uhr(sek(viewer.clock.currentTime))}&k=${k.join(",")}&m=${modus}&s=${kartenstil}`;
}
$("link-knopf").onclick = async () => {
  const url = momentAlsAdresse();
  history.replaceState(null, "", url);
  let text;
  try { await navigator.clipboard.writeText(url); text = "✓ Link kopiert"; }
  catch { text = "✓ Link steht jetzt in der Adresszeile"; }
  const knopf = $("link-knopf"), vorher = knopf.textContent;
  knopf.textContent = text;
  setTimeout(() => { knopf.textContent = vorher; }, 2500);
};
// ---------- Melden ----------
// Ergänzung, Korrektur oder Entfernen-Wunsch mit Uhrzeit, Kartenmitte und ausgewähltem Element: per Mail (eigenes
// Mailprogramm) oder anonym über die Einreichseite; dorthin geht der Text nur im #-Teil der Adresse, nie an einen Server.
const MELDE_MAIL = "protest-watch@pm.me";
const EINREICHEN = "https://protest-watch.org/einreichen/";
function kartenmitte() {
  const c = viewer.scene.canvas;
  const p = viewer.camera.pickEllipsoid(new Cesium.Cartesian2(c.clientWidth / 2, c.clientHeight / 2));
  if (!p) return null;
  const g = Cesium.Cartographic.fromCartesian(p);
  return [Cesium.Math.toDegrees(g.latitude).toFixed(5), Cesium.Math.toDegrees(g.longitude).toFixed(5)];
}
function meldeKontext() {
  const m = kartenmitte();
  const ausgewaehlt = viewer.selectedEntity?.name || (laufend ? `${laufend.kanal} ${laufend.titel}`.trim() : "–");
  return [`Uhrzeit auf der Karte: ${uhr(sek(viewer.clock.currentTime))} (31.10.2026)`, `Kartenmitte: ${m ? m.join(", ") : "–"}`,
          `Ausgewählt: ${ausgewaehlt}`, `Link: ${momentAlsAdresse()}`].join("\n");
}
function meldungAktualisieren() {
  const art = document.querySelector('input[name="melden-art"]:checked').value;
  const text = `Meldung zur Karte protest-watch.org\nArt: ${art}\n${$("melden-kontext").textContent}\n\n${$("melden-text").value.trim()}\n`;
  $("melden-mail").href = `mailto:${MELDE_MAIL}?subject=${encodeURIComponent("Meldung Karte: " + art)}&body=${encodeURIComponent(text)}`;
  $("melden-anonym").href = `${EINREICHEN}#melden=${encodeURIComponent(text)}`;
}
$("melden-knopf").onclick = () => {
  $("melden-kontext").textContent = meldeKontext();
  meldungAktualisieren();
  $("hilfe").hidden = true;
  $("melden").hidden = false;
};
$("melden-zu").onclick = () => { $("melden").hidden = true; };
$("melden-text").addEventListener("input", meldungAktualisieren);
document.querySelectorAll('input[name="melden-art"]').forEach((r) => r.addEventListener("change", meldungAktualisieren));

// ---------- Info-Modus: Einzeichnen ----------
// Besuchende zeichnen Wagen, Gruppen und Zonen ein und senden sie an /api/einzeichnen. Dort werden sie sofort
// verschlüsselt; auf die Karte kommt nichts automatisch. Die Einträge sieht nur, wer sie gerade zeichnet.
const ZEICHEN = {
  mannschaftswagen: ["🚐 Mannschaftswagen", "#2d5fd6"], wasserwerfer: ["🚒 Wasserwerfer/Räumfahrzeug", "#7f4dff"],
  demo: ["🟡 Demonstrierende", "#ffcf66"], polizei: ["🔵 Polizei", "#4d8bff"],
  "demo-zone": ["▱ Zone Demonstrierende", "#ffcf66"], "polizei-zone": ["▱ Zone Polizei", "#4d8bff"],
};
// Wortlaut nach Prüfung recht-db 1.11. (Fassungen 2026-11-01-ki / -manuell, Nachweis in dokumentation/)
const EINWILLIGUNG = {
  ki: "Ich bin mindestens 16 Jahre alt und einverstanden, dass David Oswalt meine Einzeichnungen und Notizen, auch soweit sie "
    + "zeigen, dass ich bei der Demo war, für die Rekonstruktion nutzt und mit dem KI-Dienst Claude auswerten lässt. Dafür gehen "
    + "sie an Anthropic Ireland, Limited, die sie eigenständig verantwortet und an Anthropic PBC in den USA weitergibt. "
    + "Veröffentlicht werden höchstens daraus abgeleitete Schätzungen ohne Angaben zu mir. Widerruf jederzeit per Mail an "
    + "protest-watch@pm.me mit meinem Einsendecode.",
  manuell: "Ich bin mindestens 16 Jahre alt und einverstanden, dass David Oswalt meine Einzeichnungen und Notizen, auch soweit sie "
    + "zeigen, dass ich bei der Demo war, für die Rekonstruktion nutzt, ohne KI-Dienste. Veröffentlicht werden höchstens daraus "
    + "abgeleitete Schätzungen ohne Angaben zu mir. Widerruf jederzeit per Mail an protest-watch@pm.me mit meinem Einsendecode.",
};
const einzeichnungen = new Cesium.CustomDataSource("einzeichnungen");
viewer.dataSources.add(einzeichnungen);
let eintraege = [], zoneEcken = [], zoneLinie = null;
const zeichenArt = () => document.querySelector('input[name="zeichnen-art"]:checked').value;
const istZone = (art) => art.endsWith("-zone");
const zAuswertung = () => document.querySelector('input[name="z-auswertung"]:checked')?.value;

function zeitVonLeiste() {
  const s = sek(viewer.clock.currentTime);
  $("z-von").value = uhr(s);
  $("z-bis").value = uhr(Math.min(endeS, s + 15 * 60));
}

// Ort unter dem Mauszeiger: auf Gebäuden deren Dach, sonst der Boden
function ortAusKlick(pos) {
  const p = (viewer.scene.pickPositionSupported && viewer.scene.pickPosition(pos)) || viewer.camera.pickEllipsoid(pos);
  if (!p) return null;
  const g = Cesium.Cartographic.fromCartesian(p);
  return [Cesium.Math.toDegrees(g.latitude), Cesium.Math.toDegrees(g.longitude)];
}

function zeigeEintraege() {
  einzeichnungen.entities.removeAll();
  eintraege.forEach((e, i) => {
    const [name, farbe] = ZEICHEN[e.art];
    const c = Cesium.Color.fromCssColorString(farbe);
    const beschriftung = schild(`${i + 1}`, { versatz: -18, amBoden: false });
    if (istZone(e.art)) {
      const mitte = e.punkte.reduce((a, p) => [a[0] + p[0] / e.punkte.length, a[1] + p[1] / e.punkte.length], [0, 0]);
      einzeichnungen.entities.add({ polygon: { hierarchy: Cesium.Cartesian3.fromDegreesArray(e.punkte.flatMap(([la, lo]) => [lo, la])),
        material: c.withAlpha(0.35), outline: true, outlineColor: c, height: GRUND + 12 } });  // über niedrigen Dächern sichtbar
      einzeichnungen.entities.add({ position: Cesium.Cartesian3.fromDegrees(mitte[1], mitte[0], GRUND + 14), label: beschriftung });
    } else {
      einzeichnungen.entities.add({ position: Cesium.Cartesian3.fromDegrees(e.punkte[0][1], e.punkte[0][0], GRUND + 2),
        point: { pixelSize: 14, color: c, outlineColor: Cesium.Color.WHITE, outlineWidth: 2,
                 disableDepthTestDistance: Number.POSITIVE_INFINITY }, label: beschriftung });
    }
  });
  if (zoneEcken.length) {
    einzeichnungen.entities.add({ polyline: { width: 3, material: Cesium.Color.WHITE,
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(zoneEcken.flatMap(([la, lo]) => [lo, la, GRUND + 1])) } });
  }
  $("z-liste").innerHTML = eintraege.map((e, i) => `<li>${ZEICHEN[e.art][0]} ${e.von}–${e.bis}`
    + `${e.anzahl != null ? ", ca. " + e.anzahl : ""}${e.notiz ? ": " + e.notiz.replace(/[<>&]/g, "") : ""}`
    + ` <button data-i="${i}" title="entfernen">✕</button></li>`).join("");
  $("zone-ecken").textContent = zoneEcken.length;
  $("zone-fertig").hidden = !istZone(zeichenArt());
  zSendenFreigeben();
}

function neuerEintrag(art, punkte) {
  const anzahl = $("z-anzahl").value === "" ? null : Math.max(0, Math.min(100000, Math.round(+$("z-anzahl").value)));
  eintraege.push({ art, punkte: punkte.map(([la, lo]) => [+la.toFixed(6), +lo.toFixed(6)]),
                   von: $("z-von").value || uhr(sek(viewer.clock.currentTime)), bis: $("z-bis").value || $("z-von").value,
                   anzahl, notiz: $("z-notiz").value.trim().slice(0, 500) });
  $("z-notiz").value = "";
  $("z-status").textContent = "";
  zeigeEintraege();
}

const zeichenKlick = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
zeichenKlick.setInputAction((klick) => {
  if ($("zeichnen").hidden) return;
  const ort = ortAusKlick(klick.position);
  viewer.selectedEntity = undefined;
  if (!ort) return;
  if (istZone(zeichenArt())) { zoneEcken.push(ort); zeigeEintraege(); }
  else neuerEintrag(zeichenArt(), [ort]);
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

$("zone-fertig").onclick = () => {
  if (zoneEcken.length < 3) { $("z-status").textContent = "Eine Zone braucht mindestens 3 Ecken."; return; }
  neuerEintrag(zeichenArt(), zoneEcken.slice(0, 60));
  zoneEcken = [];
  zeigeEintraege();
};
$("z-liste").addEventListener("click", (ev) => {
  const i = ev.target.dataset?.i;
  if (i !== undefined) { eintraege.splice(+i, 1); zeigeEintraege(); }
});
document.querySelectorAll('input[name="zeichnen-art"]').forEach((r) => r.addEventListener("change", () => {
  zoneEcken = []; zeigeEintraege();
}));
$("z-zeit").onclick = zeitVonLeiste;

function zSendenFreigeben() {
  const w = zAuswertung();
  $("z-einw-text").textContent = w ? EINWILLIGUNG[w] : "Bitte zuerst die Auswertung wählen.";
  $("z-einwilligung").disabled = !w;
  if (!w) $("z-einwilligung").checked = false;
  $("z-senden").disabled = !(w && $("z-einwilligung").checked && eintraege.length);
}
document.querySelectorAll('input[name="z-auswertung"]').forEach((r) => r.addEventListener("change", zSendenFreigeben));
$("z-einwilligung").addEventListener("change", zSendenFreigeben);

$("z-senden").onclick = async () => {
  $("z-senden").disabled = true;
  $("z-status").textContent = "wird gesendet …";
  try {
    const r = await fetch("/api/einzeichnen", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auswertung: zAuswertung(), einwilligung: true, datum: "2026-10-31", eintraege,
                             notiz: $("z-gesamt").value.trim() }) });
    const a = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(a.fehler || r.status);
    eintraege = []; zoneEcken = []; $("z-gesamt").value = "";
    $("z-status").textContent = "";
    // Einsendecode nur anzeigen, nirgends speichern (auch nicht im Browser)
    $("z-code-wert").textContent = a.einsendecode;
    $("z-code").hidden = false;
  } catch (e) {
    $("z-status").textContent = `Hat nicht geklappt (${e.message}). Du kannst es auch über „⚑ Melden“ schicken.`;
  }
  zeigeEintraege();
};

$("zeichnen-knopf").onclick = () => {
  $("hilfe").hidden = true;
  $("melden").hidden = true;
  if ($("zeichnen").hidden) zeitVonLeiste();
  $("zeichnen").hidden = !$("zeichnen").hidden;
  einzeichnungen.show = !$("zeichnen").hidden;
  zeigeEintraege();
};
$("zeichnen-zu").onclick = () => { $("zeichnen").hidden = true; einzeichnungen.show = false; $("z-code").hidden = true; };
$("z-code-kopieren").onclick = async () => {
  try { await navigator.clipboard.writeText($("z-code-wert").textContent); $("z-code-kopieren").textContent = "kopiert ✓"; }
  catch { $("z-code-kopieren").textContent = "bitte abschreiben"; }
};

// ---------- Geführte Tour und einfache Bedienung ----------
// Für alle, die mit Drehrad, Zeitleiste und Maus-Steuerung nicht zurechtkommen: Startbildschirm mit Tour,
// eigener Abspiel-Knopf, Zoom-Knöpfe und drei feste Ansichten.
let tourSchritt = 0;
function zeigeTourSchritt(i) {
  const tour = window.TOUR || [];
  tourSchritt = Math.max(0, Math.min(tour.length - 1, i));
  const s = tour[tourSchritt], o = ortNach[s.ort];
  viewer.clock.shouldAnimate = false;
  viewer.clock.currentTime = ortsZeit(s.zeit);
  if (o) { normaleSicht(); fliegeZu(o.lat, o.lon, s.hoehe); }
  $("tour-schritt").textContent = `Schritt ${tourSchritt + 1} von ${tour.length}`;
  $("tour-zeit").textContent = `${s.zeit} Uhr`;
  $("tour-titel").textContent = s.titel;
  $("tour-text").textContent = s.text;
  $("tour-zurueck").disabled = tourSchritt === 0;
  $("tour-weiter").textContent = tourSchritt === tour.length - 1 ? "Selbst erkunden ✓" : "Weiter ▶";
  aktualisiereAbspielen();
}
function starteTour() {
  $("start").hidden = true; $("hilfe").hidden = true; $("melden").hidden = true; $("zeichnen").hidden = true;
  $("jetzt").classList.add("zu");  // Platz für Karte und Tour, ☰ klappt wieder auf
  $("tour").hidden = false;
  zeigeTourSchritt(0);
}
function beendeTour() { $("tour").hidden = true; }
$("tour-starten").onclick = starteTour;
$("tour-wieder").onclick = starteTour;
$("selbst-erkunden").onclick = () => { $("start").hidden = true; };
$("tour-zu").onclick = beendeTour;
$("tour-zurueck").onclick = () => zeigeTourSchritt(tourSchritt - 1);
$("tour-weiter").onclick = () => (tourSchritt === (window.TOUR || []).length - 1 ? beendeTour() : zeigeTourSchritt(tourSchritt + 1));

function aktualisiereAbspielen() {
  $("abspielen").textContent = viewer.clock.shouldAnimate ? "⏸ Anhalten" : "▶ Abspielen";
  $("zl-spielen").textContent = viewer.clock.shouldAnimate ? "⏸" : "▶";
}
$("abspielen").onclick = () => {
  if (sek(viewer.clock.currentTime) >= endeS - 60) viewer.clock.currentTime = start.clone();  // am Ende von vorn
  viewer.clock.shouldAnimate = !viewer.clock.shouldAnimate;
  aktualisiereAbspielen();
};
viewer.clock.onStop.addEventListener(aktualisiereAbspielen);
$("zl-spielen").onclick = () => $("abspielen").onclick();

// ---------- Zeitleiste ----------
// Oben die Abschnitte des Tages (aus der Tour, Klick springt hin und fliegt zum Ort), darunter gemeldete Ereignisse
// als Dreiecke, unten die Stunden. Ziehen oder Klicken stellt die Zeit.
const PHASEN = (window.TOUR || []).filter((s) => s.phase);
const PHASEN_FARBE = { "Wasserwerfer": "#8a3a2a", "Kessel": "#7a2f3f", "Domplatte": "#5a4a6a" };
function zeichneZeitleiste() {
  const spur = $("zl-spur"), w = spur.clientWidth, h = spur.clientHeight;
  const x = (s) => ((s - startS) / (endeS - startS)) * w;
  let svg = "";
  PHASEN.forEach((p, i) => {
    const a = x(sek(ortsZeit(p.zeit))), b = i + 1 < PHASEN.length ? x(sek(ortsZeit(PHASEN[i + 1].zeit))) : w;
    const farbe = PHASEN_FARBE[p.phase] || (i % 2 ? "#3d5a6e" : "#46677c");
    svg += `<g class="phase" data-i="${i}" style="cursor:pointer"><rect x="${a}" y="4" width="${b - a - 1}" height="20" rx="3" fill="${farbe}">
      <title>${p.zeit} Uhr: ${p.titel}</title></rect>
      <clipPath id="zl-c${i}"><rect x="${a}" y="4" width="${b - a - 4}" height="20"/></clipPath>
      <text x="${a + 4}" y="18" clip-path="url(#zl-c${i})">${p.phase}</text></g>`;
  });
  for (const e of EREIGNISSE) {
    if (e.s < startS || e.s > endeS) continue;
    const farbe = e.zeit_sicher === "genau" ? "#ffb000" : "#a07020";
    svg += `<polygon points="${x(e.s) - 4},36 ${x(e.s) + 4},36 ${x(e.s)},28" fill="${farbe}"><title>${uhr(e.s)} ${e.ort}: ${e.text}</title></polygon>`;
  }
  // zentrale Ansagen von Polizei und Versammlungsleitung: farbiger Kreis mit Megafon, Klick setzt die Zeit
  for (const e of EREIGNISSE.filter((e) => e.ansage)) {
    svg += `<g class="ansage-marke" data-s="${e.s}" style="cursor:pointer"><title>${uhr(e.s)} ${ANSAGE[e.ansage]}: ${e.text}</title>
      <circle cx="${x(e.s)}" cy="32" r="7.5" fill="${ANSAGE_FARBE[e.ansage]}" stroke="#111" stroke-width="1"/>
      <text x="${x(e.s)}" y="35.5" text-anchor="middle" style="font-size:9px">📢</text></g>`;
  }
  for (let s = startS; s <= endeS; s += 3600) {
    svg += `<line x1="${x(s)}" x2="${x(s)}" y1="40" y2="46" stroke="#888"/>`;
    if (w > 500 || (s - startS) % 7200 === 0) svg += `<text class="stunde" x="${x(s)}" y="${h - 4}" text-anchor="middle">${uhr(s).slice(0, 2)} Uhr</text>`;
  }
  $("zl-svg").innerHTML = svg;
  zeigeZeitleistenZeit();
}
let zlLetzte = -1;
function zeigeZeitleistenZeit() {
  const s = sek(viewer.clock.currentTime), m = Math.floor(s / 60);
  if (m === zlLetzte) return;
  zlLetzte = m;
  $("zl-griff").style.left = ((s - startS) / (endeS - startS)) * 100 + "%";
  $("zl-uhr").textContent = uhr(s);
}
function zeitAusZeiger(ev) {
  const r = $("zl-spur").getBoundingClientRect();
  const anteil = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
  viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date((startS + anteil * (endeS - startS)) * 1000));
  zlLetzte = -1; zeigeZeitleistenZeit(); viewer.scene.requestRender();
}
$("zl-spur").addEventListener("pointerdown", (ev) => {
  const phase = ev.target.closest?.(".phase");
  if (phase) {  // Abschnitt: an den Anfang springen und zum Ort fliegen
    const p = PHASEN[+phase.dataset.i], o = ortNach[p.ort];
    viewer.clock.currentTime = ortsZeit(p.zeit); zlLetzte = -1; zeigeZeitleistenZeit();
    if (o) { normaleSicht(); fliegeZu(o.lat, o.lon, p.hoehe); }
    return;
  }
  const ansage = ev.target.closest?.(".ansage-marke");
  if (ansage) {  // Ansage: genau auf ihre Uhrzeit springen
    viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date(+ansage.dataset.s * 1000)); zlLetzte = -1; zeigeZeitleistenZeit();
    return;
  }
  $("zl-spur").setPointerCapture(ev.pointerId);
  zeitAusZeiger(ev);
});
$("zl-spur").addEventListener("pointermove", (ev) => { if ($("zl-spur").hasPointerCapture(ev.pointerId)) zeitAusZeiger(ev); });
viewer.clock.onTick.addEventListener(zeigeZeitleistenZeit);

// Zoom und feste Ansichten; „Von oben“ ohne Perspektive wie ein Stadtplan
const hoeheJetzt = () => viewer.camera.positionCartographic.height;
$("zoom-rein").onclick = () => { viewer.camera.zoomIn(hoeheJetzt() * 0.35); viewer.scene.requestRender(); };
$("zoom-raus").onclick = () => { viewer.camera.zoomOut(hoeheJetzt() * 0.5); viewer.scene.requestRender(); };
function normaleSicht() {
  if (viewer.camera.frustum instanceof Cesium.OrthographicFrustum) viewer.camera.switchToPerspectiveFrustum();
}
function mitteOderUfer() {
  const m = kartenmitte();
  return m ? m.map(Number) : [50.9475, 6.9640];
}
$("ansicht-oben").onclick = () => {
  const [lat, lon] = mitteOderUfer();
  normaleSicht();
  // erst senkrecht nach unten fliegen, dann ohne Perspektive zeichnen (wie ein Stadtplan)
  viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(lon, lat, 1600),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }, duration: 1.2,
    complete: () => { viewer.camera.switchToOrthographicFrustum(); viewer.scene.requestRender(); } });
};
// Ohne Perspektive sieht ein schräger Blick verzerrt aus: sobald jemand aus „Von oben“ heraus kippt, zurück zur Perspektive
viewer.scene.postRender.addEventListener(() => {
  if (viewer.camera.frustum instanceof Cesium.OrthographicFrustum && viewer.camera.pitch > Cesium.Math.toRadians(-80)) {
    normaleSicht();
    viewer.scene.requestRender();
  }
});
$("ansicht-schraeg").onclick = () => { const [lat, lon] = mitteOderUfer(); normaleSicht(); fliegeZu(lat, lon, 700); };
$("ansicht-rhein").onclick = () => {
  normaleSicht();
  // über dem Wasser östlich des Konrad-Adenauer-Ufers, Blick nach Westen auf Bastei, Weckschnapp und Vincenz-Haus
  viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(6.9722, 50.9472, 140),
    orientation: { heading: Cesium.Math.toRadians(282), pitch: Cesium.Math.toRadians(-14), roll: 0 }, duration: 1.5 });
};

// Öffentlich zeigt der Start die Tour-Auswahl (nicht bei Links auf einen Moment), lokal nichts
$("start").hidden = !OEFFENTLICH || /^#t=/.test(location.hash);
$("hilfe").hidden = true;
$("hilfe-zu").onclick = () => { $("hilfe").hidden = true; };
$("hilfe-knopf").onclick = () => { $("hilfe").hidden = !$("hilfe").hidden; };
document.querySelectorAll(".feld .einklappen").forEach((b) => {
  b.onclick = () => b.closest(".feld").classList.toggle("zu");
});
if (window.matchMedia("(max-width: 700px)").matches) $("jetzt").classList.add("zu");
// Reiter der Leiste rechts
function zeigeReiter(name) {
  document.querySelectorAll(".reiter button").forEach((b) => b.classList.toggle("an", b.dataset.reiter === name));
  document.querySelectorAll("#jetzt section").forEach((s) => { s.hidden = s.id !== "reiter-" + name; });
  $("jetzt").classList.remove("zu");
}
document.querySelectorAll(".reiter button").forEach((b) => { b.onclick = () => zeigeReiter(b.dataset.reiter); });
// Übersichtsstreifen über der Zeitleiste: standardmäßig aus, unter „Steuerung“ einschaltbar
function setzeStreifen(an) {
  streifen.hidden = !an;
  $("streifen-knopf").textContent = an ? "▤ Übersichtsstreifen ausblenden" : "▤ Übersichtsstreifen an der Zeitleiste zeigen";
  if (an) zeichneStreifen();
}
$("streifen-knopf").onclick = () => setzeStreifen(streifen.hidden);
setzeStreifen(false);

zeigeOrte();
zeigeWege();
zeigeKameras();
ladeStadt();
if (!momentAusAdresse()) uebersicht();
zeichneZeitleiste();
zeichneStreifen();
window.addEventListener("resize", () => setTimeout(() => { zeichneZeitleiste(); zeichneStreifen(); }, 50));
viewer.clock.onTick.addEventListener(aktualisiereJetzt);
viewer.clock.onTick.addEventListener(aktualisiereMenge);

// ---------- Gezählte Dichte (aus Videobildern, dichte.json) ----------
// Sieben Zeitpunkte auf einem 15-m-Raster. Gezeigt wird der Zeitpunkt, in dessen Fenster (von–bis) die Uhrzeit liegt,
// bis 30 Minuten daneben blasser. Fehlende Zelle = nicht gesehen, nicht leer.
const DICHTE_STUFEN = [[0.05, "#fde68a"], [0.1, "#fbbf24"], [0.2, "#f97316"], [0.3, "#dc2626"], [Infinity, "#7f1d1d"]];
const dichteFarbe = (d) => DICHTE_STUFEN.find(([g]) => d < g)[1];
const zahl = (x) => Math.round(x).toLocaleString("de-DE");
let dichteSichtbar = false, dichteZeitpunkte = [], dichteAktiv = null, dichteBlass = null;
fetch("dichte-flaechen.json").then((a) => a.json()).then((d) => {
  dichteZeitpunkte = d.zeitpunkte.map((z) => ({ ...z, s: sek(ortsZeit(z.zeit)), von: sek(ortsZeit(z.von)), bis: sek(ortsZeit(z.bis)),
    ebenen: {} }));
  zeigeDichte(true);
}).catch(() => {});
// Eine Ebene (Primitive) je Zeitpunkt und Deckkraft, erst bei Bedarf gebaut: 5-m-Felder nur auf Straßen, Wegen und
// Plätzen (skripte/dichte_zuschneiden.py). Kräftig = oft gesehen; „blass“ = nächste Zählung liegt zeitlich daneben.
const KLEIN_M2 = 3000;  // darunter ist der gefilmte Ausschnitt zu klein für eine Aussage über die Menge (z. B. Domplatte abends)
function dichteEbene(z, blass) {
  if (z.ebenen[blass]) return z.ebenen[blass];
  const ring = (r) => Cesium.Cartesian3.fromDegreesArray(r.flatMap(([lat, lon]) => [lon, lat]));
  const instanzen = z.flaechen.flatMap((f) => f.teile.map((teil) => new Cesium.GeometryInstance({
    geometry: new Cesium.PolygonGeometry({
      polygonHierarchy: new Cesium.PolygonHierarchy(ring(teil.aussen), teil.loecher.map((l) => new Cesium.PolygonHierarchy(ring(l)))),
      height: GRUND + 1, vertexFormat: Cesium.PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
    }),
    attributes: { color: Cesium.ColorGeometryInstanceAttribute.fromColor(
      Cesium.Color.fromCssColorString(dichteFarbe(f.d)).withAlpha((0.3 + 0.4 * f.a) * (blass ? 0.4 : 1))) },
  })));
  z.ebenen[blass] = viewer.scene.primitives.add(new Cesium.Primitive({ geometryInstances: instanzen, show: false,
    appearance: new Cesium.PerInstanceColorAppearance({ flat: true, translucent: true }) }));
  return z.ebenen[blass];
}
function zeigeDichte(erzwingen) {
  const t = sek(viewer.clock.currentTime);
  let aktiv = dichteZeitpunkte.find((z) => t >= z.von && t <= z.bis) || null, blass = false;
  if (!aktiv) {
    const nah = dichteZeitpunkte.filter((z) => Math.abs(t - z.s) <= 1800).sort((a, b) => Math.abs(t - a.s) - Math.abs(t - b.s));
    aktiv = nah[0] || null; blass = !!aktiv;
  }
  if (!erzwingen && aktiv === dichteAktiv && blass === dichteBlass) return;
  for (const z of dichteZeitpunkte) for (const ebene of Object.values(z.ebenen)) ebene.show = false;
  if (aktiv && dichteSichtbar) dichteEbene(aktiv, blass).show = true;
  dichteAktiv = aktiv; dichteBlass = blass;
  const g = aktiv && aktiv.gesamt_sichtbereich;
  $("jetzt-dichte").innerHTML = aktiv
    ? `${blass ? `Nächste Zählung: <b>${aktiv.zeit} Uhr</b> (blass). ` : ""}Videos ${uhr(aktiv.von)}–${uhr(aktiv.bis)} Uhr, ${aktiv.name}:
       etwa <b>${zahl(g.median)}</b> Menschen (${zahl(g.p16)}–${zahl(g.p84)}) <b>im gefilmten Bereich</b> von ${zahl(aktiv.flaeche_sichtbereich_m2)} m²,
       Polizei mitgezählt. Keine Gesamtzahl der Demo.${aktiv.flaeche_sichtbereich_m2 < KLEIN_M2
         ? " <b>Hier wurde nur ein kleiner Ausschnitt gefilmt, die Zahl sagt über die Menge kaum etwas.</b>" : ""}`
    : `<i>Zu dieser Uhrzeit keine Zählung.</i> Gezählt sind: ${dichteZeitpunkte.map((z) => z.zeit).join(", ")} Uhr.`;
  viewer.scene.requestRender();
}
viewer.clock.onTick.addEventListener(() => zeigeDichte(false));

// ---------- Aus Videos verortete Fahrzeuge und Polizeiketten (objekte-verortet.json) ----------
// Genauer als die Schätzungen: Kamerastandort aus dem Bild bestimmt, Entfernung aus bekannten Größen. Kreis = Unsicherheit.
fetch("objekte-verortet.json").then((a) => a.json()).then((d) => {
  const BLAU = Cesium.Color.fromCssColorString("#2d5fd6");
  const beschriftet = [];  // nur ein Schild je Stelle und Zeit, sonst liegen sie am Vincenz-Haus übereinander
  for (const o of d.objekte) {
    const schildNoetig = o.art !== "Polizeigruppe" && !beschriftet.some((b) => b.von < o.zeit_bis && o.zeit_von < b.bis
      && Math.hypot((b.lat - o.lat) * 111320, (b.lon - o.lon) * 70000) < 30);
    if (schildNoetig) beschriftet.push({ lat: o.lat, lon: o.lon, von: o.zeit_von, bis: o.zeit_bis });
    const zeitraum = new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({ start: ortsZeit(o.zeit_von), stop: ortsZeit(o.zeit_bis) })]);
    const u = o.unsicherheit_m || {}, radius = Math.max(u.laengs || 10, u.quer || 0);
    const text = `<p><b>Aus einem öffentlichen Video verortet</b>, ${o.zeit_von}–${o.zeit_bis} Uhr (Zeitfenster des Videos).</p>
      <p>${o.ort || ""}</p><p><small>Verfahren: ${o.verfahren || ""}. Unsicherheit etwa ±${u.laengs || "?"} m längs, ±${u.quer || "?"} m quer.
      ${o.quelle ? "Quelle: " + o.quelle : ""}</small></p>`;
    const name = o.name || o.art;
    if (o.linie) viewer.entities.add({ availability: zeitraum, name, description: text,
      polyline: { positions: Cesium.Cartesian3.fromDegreesArrayHeights(o.linie.flatMap(([la, lo]) => [lo, la, GRUND + 1.5])),
        width: 6, material: BLAU } });
    viewer.entities.add({ availability: zeitraum, name, description: text,
      position: Cesium.Cartesian3.fromDegrees(o.lon, o.lat, GRUND + 1.2),
      ellipse: { semiMajorAxis: radius, semiMinorAxis: radius, height: GRUND + 1.1, material: BLAU.withAlpha(0.15),
        outline: true, outlineColor: BLAU.withAlpha(0.6) },
      point: o.linie ? undefined : { pixelSize: 11, color: BLAU, outlineColor: Cesium.Color.WHITE, outlineWidth: 3,
        disableDepthTestDistance: Number.POSITIVE_INFINITY },
      label: schildNoetig ? schild(`${o.art} (aus Video)`, { versatz: -20, amBoden: false, bis: 700 }) : undefined });
  }
  viewer.scene.requestRender();
}).catch(() => {});

// ---------- Darstellung der Menschen: Punkte (simuliert), Dichte (gezählt) oder beides ----------
const WARNUNG = {
  figuren: `<b>⚠ Simulation, keine Abbildung der Wirklichkeit.</b> Die Punkte sind <b>keine einzelnen Personen</b>
    und keine echten Positionen. Personenzahlen, Wege und Abläufe sind <b>Schätzungen</b> aus Videos und Berichten und können
    falsch sein. Belegt sind nur die verlinkten Quellen.`,
  dichte: `<b>⚠ Rekonstruktion, keine Abbildung der Wirklichkeit.</b> Die farbigen Felder sind <b>aus Videobildern gezählt</b>,
    ungenau (Kameraorte oft nur grob bekannt) und nur dort, wo eine Kamera hinsah. Blaue Punkte (Polizei), Fahrzeuge,
    Wege und Abläufe sind <b>Schätzungen</b>. Belegt sind nur die verlinkten Quellen.`,
};
WARNUNG.beides = WARNUNG.figuren.replace("Die Punkte sind", "Die Punkte sind simuliert,")
  + " Die farbigen Felder sind aus Videobildern gezählt und ungenau.";
// auf dem Handy kürzer, sonst verdeckt der Hinweis ein Fünftel des Bildschirms (die lange Fassung steht in der Hilfe)
const WARNUNG_KURZ = {
  figuren: "<b>⚠ Simulation:</b> Punkte sind keine echten Personen, Zahlen und Wege sind Schätzungen.",
  dichte: "<b>⚠ Rekonstruktion:</b> Felder aus Videos gezählt, ungenau; Wege und Abläufe geschätzt.",
  beides: "<b>⚠ Simulation:</b> Punkte sind keine echten Personen; Felder aus Videos gezählt, ungenau.",
};
let modus = "figuren";
function setzeModus(m) {
  modus = m;
  nurPolizei = m === "dichte"; dichteSichtbar = m !== "figuren"; letzteZeit = -2;
  document.querySelectorAll("#modus button").forEach((b) => b.classList.toggle("an", b.dataset.modus === m));
  $("warnung").innerHTML = (SCHMAL.matches ? WARNUNG_KURZ : WARNUNG)[m];
  zeigeDichte(true);
}
document.querySelectorAll("#modus button").forEach((b) => { b.onclick = () => setzeModus(b.dataset.modus); });
// Darstellung und Kartenstil aus einem geteilten Link übernehmen (#…&m=dichte&s=bunt)
{
  const a = new URLSearchParams(location.hash.slice(1));
  setzeModus(WARNUNG[a.get("m")] ? a.get("m") : "figuren");
  if (a.get("s") === "bunt" || a.get("s") === "schlicht") setzeKartenstil(a.get("s"));
}

// Tempo der Wiedergabe (Cesium-Multiplikator: 60 = eine Minute pro Sekunde)
$("zl-tempo").value = String(viewer.clock.multiplier);
$("zl-tempo").onchange = () => { viewer.clock.multiplier = +$("zl-tempo").value; };
aktualisiereJetzt();
})();
