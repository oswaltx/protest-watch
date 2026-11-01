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
const GRUND = OEFFENTLICH ? 0 : 97;

const TAG = "2026-10-31";
const ortsZeit = (hhmm) => Cesium.JulianDate.fromIso8601(`${TAG}T${hhmm}:00+01:00`);
const start = ortsZeit("12:00");
const ende = ortsZeit("23:00");
const sek = (jd) => Cesium.JulianDate.toDate(jd).getTime() / 1000;   // Unix-Sekunden
const startS = sek(start), endeS = sek(ende);

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
  skyAtmosphere: new Cesium.SkyAtmosphere(),
  // Nur zeichnen, wenn sich etwas ändert (Kamera, Zeit, nachgeladene Kacheln, Menge) – sonst läuft die Grafikkarte
  // auch im Stillstand auf Volllast. Höchstens 30 Bilder pro Sekunde.
  requestRenderMode: true,
  targetFrameRate: 30,
});

viewer.clock.startTime = start.clone();
viewer.clock.stopTime = ende.clone();
viewer.clock.currentTime = ortsZeit("16:30");
viewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
viewer.clock.multiplier = 60;
viewer.clock.shouldAnimate = false;
viewer.timeline.zoomTo(start, ende);

// Zeit in deutscher Ortszeit anzeigen (Standard wäre UTC)
const uhr = (s) => new Date(s * 1000).toLocaleTimeString("de-DE",
  { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });
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
let osmGebaeude = null;

async function ladeOsm(grund) {
  if (!viewer.scene.globe) {
    viewer.scene.globe = new Cesium.Globe();
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#e8e4dc");
    viewer.imageryLayers.addImageryProvider(new Cesium.OpenStreetMapImageryProvider({
      // öffentlich über den eigenen Kachel-Cache, damit keine IP-Adressen an die OSM Foundation gehen
      url: OEFFENTLICH ? "/osm/" : "https://tile.openstreetmap.org/", credit: "© OpenStreetMap-Mitwirkende" }));
  }
  viewer.scene.globe.show = true;
  if (!osmGebaeude) osmGebaeude = viewer.scene.primitives.add(OEFFENTLICH ? eigeneGebaeude() : await Cesium.createOsmBuildingsAsync());
  osmGebaeude.show = true;
  if (stadt) stadt.show = false;
  status(grund ? `OSM-Ansicht (${grund})` : "OSM-Ansicht");
  $("google-knopf").textContent = "📷 Google-Fotokacheln";
  setTimeout(messeUferHoehe, 4000);
}

// Gebäude aus gebaeude.js (OpenStreetMap, Höhe aus height bzw. Geschossen) als ein einziges Primitive
function eigeneGebaeude() {
  const instanzen = window.GEBAEUDE.map(([hoehe, punkte], i) => new Cesium.GeometryInstance({
    id: i,
    geometry: new Cesium.PolygonGeometry({
      polygonHierarchy: new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(punkte)),
      height: 0, extrudedHeight: hoehe, vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
    }),
    attributes: { color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString(hoehe > 60 ? "#b9b2a6" : "#dcd8cf")) },
  }));
  return new Cesium.Primitive({ geometryInstances: instanzen, appearance: new Cesium.PerInstanceColorAppearance({ translucent: false }) });
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

function zeigeOrte() {
  const liste = $("orte");
  for (const o of window.ORTE) {
    ortEntity[o.name] = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(o.lon, o.lat),
      point: { pixelSize: 9, color: Cesium.Color.ORANGE, outlineColor: Cesium.Color.BLACK, outlineWidth: 1,
               heightReference: AUF_KACHELN, disableDepthTestDistance: 50 },
      label: { text: o.name, font: "13px sans-serif", fillColor: Cesium.Color.WHITE, outlineColor: Cesium.Color.BLACK,
               outlineWidth: 3, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(0, -14),
               heightReference: AUF_KACHELN, disableDepthTestDistance: Number.POSITIVE_INFINITY },
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
    destination: Cesium.Cartesian3.fromDegrees(lon, lat - hoehe / 111000 * 1.3, hoehe + 40),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-35), roll: 0 },
    duration: 1.5,
  });
}

// ---------- Ereignisse ----------
const EREIGNISSE = window.EREIGNISSE.map((e) => ({ ...e, s: sek(ortsZeit(e.von)) }));
const FENSTER = 20 * 60;  // Ereignis gilt 20 min als "aktuell"

// ---------- Videos ----------
const VIDEOS = window.VIDEOS;
const LIVES = VIDEOS.filter((v) => v.art === "live").sort((a, b) => a.start - b.start);

// ---------- Streifen über der Zeitachse ----------
const streifen = $("streifen");
const zeileH = 9;

function zeichneStreifen() {
  const tl = viewer.timeline.container.getBoundingClientRect();
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
    ? aktiv.map((e) => `<div class="ev"><b>${e.von}</b> <a href="#" data-ort="${e.ort}">${e.ort}</a>
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

function zeigeWege() {
  for (const w of window.WEGE || []) {
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
                 heightReference: AUF_KACHELN, disableDepthTestDistance: Number.POSITIVE_INFINITY },
        label: { text: `📹 ${w.kanal}`, font: "12px sans-serif", fillColor: farbe, outlineColor: Cesium.Color.BLACK,
                 outlineWidth: 3, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(0, 18),
                 heightReference: AUF_KACHELN, disableDepthTestDistance: Number.POSITIVE_INFINITY },
        path: { leadTime: 0, trailTime: 15 * 60, width: 3, resolution: 30,
                material: new Cesium.PolylineGlowMaterialProperty({ color: farbe, glowPower: 0.15 }) },
        properties: { stream: w.id },
        description: new Cesium.CallbackProperty((zeit) => wegBeschreibung(w, sek(zeit)), false),
      });
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
// Kamera-Symbol mit Blickpfeil (30 m), sichtbar nur im Zeitfenster der Szene.
const RICHTUNG = { N: 0, NO: 45, O: 90, SO: 135, S: 180, SW: 225, W: 270, NW: 315 };
const SICHER_FARBE = { hoch: "#ffffff", mittel: "#ffd24d", niedrig: "#ff8c4d", unbekannt: "#999999" };

function zeigeKameras() {
  for (const k of window.KAMERAS || []) {
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
      position: Cesium.Cartesian3.fromDegrees(k.lon, k.lat),
      point: { pixelSize: 8, color: farbe, outlineColor: Cesium.Color.BLACK, outlineWidth: 1,
               heightReference: AUF_KACHELN, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      properties: { kamera: k },
      description: beschreibung,
    });
    if (k.blick in RICHTUNG) {
      const w = Cesium.Math.toRadians(RICHTUNG[k.blick]);
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
// skripte/menge_berechnen.py). Fern: Punkte, nah (< NAH m): Männekin-Sprites in echter Größe.
const MENGE = window.MENGE;
const [LAT0, LON0] = MENGE.ursprung, [MX, MY] = MENGE.m_pro_grad;
const FEHLT = MENGE.fehlt;
const FARBE_GRUPPE = { menge: Cesium.Color.fromCssColorString("#ffcf66"), polizei: Cesium.Color.fromCssColorString("#4d8bff"),
                       fahrzeug: Cesium.Color.fromCssColorString("#2d5fd6"), krawall: Cesium.Color.fromCssColorString("#ff3b3b") };
const NAH = 180;
let bodenHoehe = GRUND;  // Ellipsoid-Höhe Uferstraße, nach Laden der Kacheln gemessen

function maennekin(koerper, kopf, polizei) {
  const c = document.createElement("canvas");
  c.width = 40; c.height = 116;
  const g = c.getContext("2d");
  g.fillStyle = koerper;
  g.beginPath(); g.roundRect(11, 22, 18, 44, 6); g.fill();               // Rumpf
  g.fillRect(12, 62, 7, 52); g.fillRect(21, 62, 7, 52);                  // Beine
  g.beginPath(); g.roundRect(4, 25, 6, 36, 3); g.roundRect(30, 25, 6, 36, 3); g.fill();  // Arme
  g.fillStyle = kopf;
  g.beginPath(); g.arc(20, 12, 10, 0, 2 * Math.PI); g.fill();           // Kopf
  if (polizei) {
    g.fillStyle = "#e8e8e8"; g.fillRect(11, 9, 18, 5);                   // Helmvisier
    g.fillStyle = "rgba(200,220,255,0.55)"; g.fillRect(2, 30, 14, 40);   // Schild
  }
  return c;
}
function mannschaftswagen() {
  const c = document.createElement("canvas");
  c.width = 120; c.height = 60;
  const g = c.getContext("2d");
  g.fillStyle = "#e9edf2"; g.beginPath(); g.roundRect(2, 6, 116, 44, 6); g.fill();   // Aufbau
  g.fillStyle = "#1f4fa8"; g.fillRect(2, 30, 116, 8);                                 // Streifen
  g.fillStyle = "#3a4656"; g.fillRect(84, 12, 28, 14);                                // Frontscheibe
  g.fillStyle = "#222"; g.beginPath(); g.arc(24, 52, 7, 0, 7); g.arc(92, 52, 7, 0, 7); g.fill();
  g.fillStyle = "#3d7bff"; g.fillRect(50, 1, 20, 5);                                  // Blaulicht
  return c;
}
const BILDER = {
  menge: ["#3b3b42", "#5a4632", "#2f4a5e", "#6b2f2f", "#444f3a"].map((k) => maennekin(k, "#c9a58a", false)),
  polizei: [maennekin("#1d2b4d", "#26324f", true)],
  krawall: [maennekin("#151515", "#2a2a2a", false), maennekin("#1c1c1c", "#3a1414", false)],  // dunkel, vermummt
  fahrzeug: [mannschaftswagen()],
};

const punkteSammlung = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
// scene muss übergeben werden, sonst können Billboards nicht an Kacheln haften
const figurenSammlung = viewer.scene.primitives.add(new Cesium.BillboardCollection({ scene: viewer.scene }));

const populationen = MENGE.populationen.map((p) => {
  const roh = Uint8Array.from(atob(p.wege), (c) => c.charCodeAt(0));
  const wege = new Int16Array(roh.buffer);  // [person][zeitpunkt][x,y] in Dezimetern
  const farbe = FARBE_GRUPPE[p.gruppe], bilder = BILDER[p.gruppe], fz = p.gruppe === "fahrzeug";
  const punkte = [], figuren = [];
  for (let i = 0; i < p.personen; i++) {
    punkte.push(punkteSammlung.add({ show: false, color: farbe, pixelSize: { polizei: 5, fahrzeug: 9, krawall: 5 }[p.gruppe] || 4,
      scaleByDistance: new Cesium.NearFarScalar(50, 2.0, 2000, 0.6) }));
    figuren.push(figurenSammlung.add({ show: false, image: bilder[i % bilder.length], sizeInMeters: true,
      width: fz ? 6 : 0.6, height: fz ? 2.8 : 1.75,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM, heightReference: AUF_KACHELN }));
  }
  return { ...p, wege, K: p.T.length, punkte, figuren };
});

const fahrzeugEntities = MENGE.fahrzeuge.map((f) => {
  const pos = new Cesium.SampledPositionProperty();
  for (const w of f.wege) pos.addSample(Cesium.JulianDate.fromDate(new Date(w.t * 1000)), Cesium.Cartesian3.fromDegrees(w.lon, w.lat));
  const von = Cesium.JulianDate.fromDate(new Date(f.wege[0].t * 1000));
  const bis = Cesium.JulianDate.fromDate(new Date(f.wege[f.wege.length - 1].t * 1000));
  return viewer.entities.add({
    name: f.name,
    availability: new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({ start: von, stop: bis })]),
    position: pos,
    point: { pixelSize: 14, color: Cesium.Color.fromCssColorString("#2d5fd6"), outlineColor: Cesium.Color.WHITE, outlineWidth: 2,
             heightReference: AUF_KACHELN, disableDepthTestDistance: Number.POSITIVE_INFINITY },
    label: { text: f.name, font: "12px sans-serif", fillColor: Cesium.Color.WHITE, outlineColor: Cesium.Color.BLACK, outlineWidth: 3,
             style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(0, -16),
             heightReference: AUF_KACHELN, disableDepthTestDistance: Number.POSITIVE_INFINITY },
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

const zuGrad = (dx, dy) => [LON0 + dx / 10 / MX, LAT0 + dy / 10 / MY];
let mengeSichtbar = true;
let letzteAktualisierung = 0, letzteZeit = -1;
const mengeZahlen = {};

function aktualisiereMenge() {
  // höchstens ~10 Mal pro Sekunde, und nur wenn sich Zeit oder Kamera geändert haben
  const jetzt = performance.now();
  const t = sek(viewer.clock.currentTime);
  if (jetzt - letzteAktualisierung < 100 || (t === letzteZeit && letzteZeit !== -2)) return;
  letzteAktualisierung = jetzt; letzteZeit = t;
  const kamera = viewer.camera.positionWC;
  for (const p of populationen) {
    const { T, K, wege, punkte, figuren } = p;
    let k = -1;
    if (mengeSichtbar && t >= T[0] && t < T[K - 1]) { k = 0; while (k < K - 2 && T[k + 1] <= t) k++; }
    const f = k >= 0 ? (t - T[k]) / (T[k + 1] - T[k]) : 0;
    let n = 0;
    for (let i = 0; i < punkte.length; i++) {
      const pp = punkte[i], fig = figuren[i];
      const a = (i * K + k) * 2, b = a + 2;
      if (k < 0 || wege[a] === FEHLT || wege[b] === FEHLT) { pp.show = false; fig.show = false; continue; }
      // leichte Eigenbewegung im Stand (±0,3 m), damit die Menge nicht wie eingefroren wirkt
      const wackeln = p.gruppe === "fahrzeug" ? 0 : 3 * Math.sin(t / 7 + i * 1.7);
      const x = wege[a] + (wege[b] - wege[a]) * f + wackeln;
      const y = wege[a + 1] + (wege[b + 1] - wege[a + 1]) * f + wackeln * 0.6;
      const [lon, lat] = zuGrad(x, y);
      const boden = Cesium.Cartesian3.fromDegrees(lon, lat, bodenHoehe);
      const nah = Cesium.Cartesian3.distance(boden, kamera) < NAH;
      if (nah) fig.position = boden; else pp.position = Cesium.Cartesian3.fromDegrees(lon, lat, bodenHoehe + 1);
      fig.show = nah;
      pp.show = !nah;
      n++;
    }
    mengeZahlen[p.name] = { n, gruppe: p.gruppe, quelle: p.quelle };
  }
  zeigeMengeZahlen();
  viewer.scene.requestRender();  // Punkte und Figuren haben sich bewegt
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
  const max = Math.max(100, ...alle.flatMap((r) => r.werte));
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
  svg += `<line id="diagramm-jetzt" x1="0" x2="0" y1="6" y2="${H - U}" stroke="#fff" stroke-width="1" stroke-dasharray="3 2"/></svg>`;
  $("diagramm-flaeche").innerHTML = svg;
  $("diagramm-legende").innerHTML = alle.map((r) =>
    `<span title="${r.quelle || "aus den geschätzten Mengen (mengen.json)"}"><i style="background:${r.farbe}"></i>${r.name}</span>`).join("") +
    "<br>Alle Zahlen geschätzt; Gewaltbereite sind eine Teilmenge der Demonstrierenden. Klick setzt die Uhrzeit.";
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
const uebersicht = () => fliegeZu(50.9445, 6.9620, 1100);
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
  return `${location.origin}${location.pathname}#t=${uhr(sek(viewer.clock.currentTime))}&k=${k.join(",")}`;
}
$("link-knopf").onclick = async () => {
  const url = momentAlsAdresse();
  history.replaceState(null, "", url);
  try { await navigator.clipboard.writeText(url); status("Link kopiert: " + url.split("#")[1]); }
  catch { status("Link steht jetzt in der Adresszeile"); }
};
// ---------- Melden ----------
// Ergänzung, Korrektur oder Entfernen-Wunsch mit Uhrzeit, Kartenmitte und ausgewähltem Element: per Mail (eigenes
// Mailprogramm) oder anonym über die Einreichseite; dorthin geht der Text nur im #-Teil der Adresse, nie an einen Server.
const MELDE_MAIL = "protest-watch@pm.me";
const EINREICHEN = "https://oswalt.eu/demo-koeln/";
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
    const beschriftung = { text: `${i + 1}`, font: "13px sans-serif", fillColor: Cesium.Color.WHITE, outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(0, -16),
      disableDepthTestDistance: Number.POSITIVE_INFINITY };
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

if (!OEFFENTLICH) $("hilfe").hidden = true;  // lokal kennt man die Karte, öffentlich erscheint die Hilfe beim Start
$("hilfe-zu").onclick = () => { $("hilfe").hidden = true; };
$("hilfe-knopf").onclick = () => { $("hilfe").hidden = !$("hilfe").hidden; };
document.querySelectorAll(".feld .einklappen").forEach((b) => {
  b.onclick = () => b.closest(".feld").classList.toggle("zu");
});
if (window.matchMedia("(max-width: 700px)").matches) { $("jetzt").classList.add("zu"); $("leiste").classList.add("zu"); }

zeigeOrte();
zeigeWege();
zeigeKameras();
ladeStadt();
if (!momentAusAdresse()) uebersicht();
zeichneStreifen();
window.addEventListener("resize", () => setTimeout(zeichneStreifen, 50));
viewer.clock.onTick.addEventListener(aktualisiereJetzt);
viewer.clock.onTick.addEventListener(aktualisiereMenge);
// Kamerabewegung ändert, welche Personen als Figur gezeigt werden
viewer.camera.percentageChanged = 0.05;
viewer.camera.changed.addEventListener(() => { letzteZeit = -2; });
$("menge-knopf").onclick = () => {
  mengeSichtbar = !mengeSichtbar;
  letzteZeit = -2;
  $("menge-knopf").textContent = mengeSichtbar ? "👥 Menge aus" : "👥 Menge an";
};
aktualisiereJetzt();
})();
