// Stadtmöblierung als zuschaltbare Ebene (Knopf #moebel-knopf unter „Steuerung“), Daten aus 3d/moebel.js
// (skripte/moebel_bauen.py: OpenStreetMap, zusätzliche Baumkronen aus dem Laserscan von Geobasis NRW).
// Lädt nach app.js und nutzt window.viewer und window.boden (Gelände, sonst GRUND). Gebaut wird erst beim ersten Klick;
// einfache Körper statt Modellen, Kleinteile nur aus der Nähe; schwache Geräte zeigen nur die Bäume aus OSM.
(function () {
  const M = window.MOEBEL, knopf = document.getElementById("moebel-knopf");
  if (!M || !knopf || !window.viewer) return;
  const viewer = window.viewer, boden = window.boden || (() => 0);
  const SCHWACH = !new URLSearchParams(location.search).has("voll") &&
    (matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4);
  let ebene = null;

  const farbe = (css) => Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString(css));
  const sichtbarBis = (m) => new Cesium.DistanceDisplayConditionGeometryInstanceAttribute(0, m);
  // Körper am Boden: Geometrie im Ost-Nord-Oben-System, Mittelpunkt dz über dem Gelände
  const koerper = (geometrie, lon, lat, dz, css, bis) => new Cesium.GeometryInstance({ geometry: geometrie,
    modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(lon, lat, boden(lon, lat) + dz)),
    attributes: { color: farbe(css), distanceDisplayCondition: sichtbarBis(bis) } });
  const saeule = (r, l) => new Cesium.CylinderGeometry({ length: l, topRadius: r, bottomRadius: r, slices: 8,
    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT });
  const primitive = (instanzen) => new Cesium.Primitive({ geometryInstances: instanzen,
    appearance: new Cesium.PerInstanceColorAppearance({ translucent: false }) });

  function baue() {
    const p = new Cesium.PrimitiveCollection(), stamm = [], krone = [];
    for (const [lon, lat, h, q] of M.baeume) {
      if (SCHWACH && q) continue;
      const r = Math.min(6, Math.max(1.5, h * 0.28)), l = Math.max(1, h - 1.6 * r);
      stamm.push(koerper(saeule(0.25, l), lon, lat, l / 2, "#6d5a45", 1500));
      krone.push(koerper(new Cesium.EllipsoidGeometry({ radii: new Cesium.Cartesian3(r, r, r * 0.85), stackPartitions: 6,
        slicePartitions: 8, vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT }),
        lon, lat, h - r * 0.85, q ? "#93b97f" : "#7aa865", 3000));
    }
    p.add(primitive(stamm));
    p.add(primitive(krone));
    const klein = [];
    const bank = Cesium.BoxGeometry.fromDimensions({ dimensions: new Cesium.Cartesian3(1.8, 0.55, 0.5),
      vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT });
    for (const [lon, lat] of M.baenke) klein.push(koerper(bank, lon, lat, 0.25, "#8a6a4a", 600));
    for (const [lon, lat] of M.laternen) klein.push(koerper(saeule(0.12, 6), lon, lat, 3, "#4b4f55", 900));
    for (const [lon, lat] of M.ampeln) klein.push(koerper(saeule(0.1, 3.5), lon, lat, 1.75, "#2f3236", 900));
    for (const [lon, lat] of M.poller) klein.push(koerper(saeule(0.12, 0.9), lon, lat, 0.45, "#3a3d42", 400));
    for (const [lon, lat] of M.muell) klein.push(koerper(saeule(0.25, 0.9), lon, lat, 0.45, "#5b6b5b", 400));
    for (const [lon, lat] of M.saeulen) klein.push(koerper(saeule(0.6, 3), lon, lat, 1.5, "#c9b98f", 900));
    p.add(primitive(klein));
    // Mauern, Zäune, Hecken als Wände auf dem Gelände
    const waende = [];
    const wand = (linie, hoch, css, bis) => {
      const pos = [], unten = [], oben = [];
      for (let i = 0; i < linie.length; i += 2) {
        const b = boden(linie[i], linie[i + 1]);
        pos.push(Cesium.Cartesian3.fromDegrees(linie[i], linie[i + 1], b));
        unten.push(b - 0.3);
        oben.push(b + hoch);
      }
      if (pos.length > 1) waende.push(new Cesium.GeometryInstance({ geometry: new Cesium.WallGeometry({ positions: pos,
        minimumHeights: unten, maximumHeights: oben, vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT }),
        attributes: { color: farbe(css), distanceDisplayCondition: sichtbarBis(bis) } }));
    };
    for (const l of M.mauern) wand(l, 1.2, "#a39c90", 1500);
    for (const l of M.zaeune) wand(l, 1.3, "#7d8288", 700);
    for (const l of M.hecken) wand(l, 1.2, "#6f9a5c", 900);
    if (waende.length) p.add(primitive(waende));
    // Treppen als kräftige Linien knapp über dem Boden
    const treppen = new Cesium.PolylineCollection();
    for (const l of M.treppen) {
      const pos = [];
      for (let i = 0; i < l.length; i += 2) pos.push(Cesium.Cartesian3.fromDegrees(l[i], l[i + 1], boden(l[i], l[i + 1]) + 0.3));
      treppen.add({ positions: pos, width: 5, material: Cesium.Material.fromType("Color",
        { color: Cesium.Color.fromCssColorString("#6f6a62") }), distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 900) });
    }
    p.add(treppen);
    viewer.creditDisplay.addStaticCredit(new Cesium.Credit("Baumkronen ergänzt aus dem Laserscan: © Geobasis NRW (dl-de/zero-2.0)"));
    return viewer.scene.primitives.add(p);
  }

  knopf.onclick = () => {
    if (!ebene) ebene = baue();
    else ebene.show = !ebene.show;
    knopf.textContent = ebene.show ? "🌳 Bäume, Bänke, Laternen ausblenden" : "🌳 Bäume, Bänke, Laternen zeigen";
    viewer.scene.requestRender();
  };
})();
