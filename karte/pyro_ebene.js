// Ebene „Pyrotechnik, Böller, Rauch“ (Daten: pyro.js aus skripte/pyro_fuer_szene.py). Lädt nach app.js und nutzt nur
// window.viewer; der Schalter kommt unter „Steuerung → Anzeigen“. Standard: aus.
(() => {
  const v = window.viewer, daten = window.PYRO || [];
  if (!v || !daten.length) return;
  const FARBE = { Bengalo: "#ff3b3b", Rauch: "#9aa0a6", "Böller": "#ffd400", Feuerwerk: "#c56bff" };
  const ZEICHEN = { Bengalo: "🔥", Rauch: "💨", "Böller": "💥", Feuerwerk: "🎆" };
  const ortsZeit = (hhmm) => Cesium.JulianDate.fromIso8601(`2026-10-31T${hhmm}:00+01:00`);
  const quelle = new Cesium.CustomDataSource("pyro");
  quelle.show = false;
  v.dataSources.add(quelle);
  for (const e of daten) {
    // Clips: Zeitfenster des Clips; gemeldete Ereignisse: 5 Minuten vorher bis 15 Minuten danach
    const von = e.von_uhr ? Cesium.JulianDate.addMinutes(ortsZeit(e.von_uhr), -5, new Cesium.JulianDate())
                          : Cesium.JulianDate.fromDate(new Date(e.von * 1000));
    const bis = e.von_uhr ? Cesium.JulianDate.addMinutes(ortsZeit(e.von_uhr), 15, new Cesium.JulianDate())
                          : Cesium.JulianDate.fromDate(new Date(e.bis * 1000));
    const farbe = Cesium.Color.fromCssColorString(FARBE[e.art]);
    quelle.entities.add({
      availability: new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({ start: von, stop: bis })]),
      // boden() aus app.js: Geländehöhe, ohne Gelände GRUND
      position: Cesium.Cartesian3.fromDegrees(e.lon, e.lat, (window.boden ? window.boden(e.lon, e.lat) : 0) + 3),
      point: { pixelSize: 12, color: farbe.withAlpha(0.9), outlineColor: Cesium.Color.BLACK, outlineWidth: 1,
               disableDepthTestDistance: Number.POSITIVE_INFINITY },
      label: { text: ZEICHEN[e.art], font: "22px sans-serif", pixelOffset: new Cesium.Cartesian2(0, -18),
               disableDepthTestDistance: Number.POSITIVE_INFINITY, distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2500) },
      name: `${ZEICHEN[e.art]} ${e.art}`,
      description: `<p>${e.text}</p><p><small>${e.quelle === "video"
        ? "Aus einem öffentlichen Video, Lage ungefähr (vor der Kamera in Blickrichtung). Sicherheit des Kameraorts: " + e.sicher
        : "Gemeldetes Ereignis, Lage am genannten Ort (ungefähr)."}</small></p>`,
    });
  }
  // Schalter unter „Steuerung → Anzeigen“
  const knopf = document.createElement("button");
  knopf.id = "pyro-knopf";
  knopf.textContent = "🔥 Pyrotechnik, Böller, Rauch zeigen";
  const anker = document.getElementById("fluss-knopf");
  if (anker) anker.before(knopf);
  knopf.onclick = () => {
    quelle.show = !quelle.show;
    knopf.textContent = quelle.show ? "🔥 Pyrotechnik, Böller, Rauch ausblenden" : "🔥 Pyrotechnik, Böller, Rauch zeigen";
    v.scene.requestRender();
  };
})();
