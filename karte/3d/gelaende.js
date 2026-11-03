// Gelände für die schlichte Karte (DGM1 Geobasis NRW, dl-de/zero-2.0; skripte/gelaende_bauen.py). Höhen relativ zur
// Fahrbahn Konrad-Adenauer-Ufer (= GRUND 0), am Rand des Demo-Gebiets auf 0 auslaufend, außerhalb 0.
// Braucht 3d/gelaende_daten.js davor (window.GELAENDE, synchron wie gebaeude.js), dann sofort nutzbar:
//   window.gelaendeHoehe(lon, lat)          Höhe in m (bilinear), 0 außerhalb
//   window.gelaendeTerrain()                Cesium-Terrain für den Globus aus demselben Gitter
//   await window.gelaendeSchatten(viewer, basis)  Schummerung (Böschungen, Ufermauern) als Bildlage über dem Globus
(function () {
  const G = window.GELAENDE;
  if (!G) return;
  const { nx, ny } = G;
  const h = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {  // je Zeile als Differenz zum linken Nachbarn gespeichert, in dm
    let wert = 0;
    for (let i = 0; i < nx; i++) {
      wert += G.z[j * nx + i];
      h[j * nx + i] = wert / 10;
    }
  }
  delete G.z;
  const lon1 = G.lon0 + G.dlon * (nx - 1), lat1 = G.lat0 + G.dlat * (ny - 1);

  function gelaendeHoehe(lon, lat) {
    const fx = (lon - G.lon0) / G.dlon, fy = (lat - G.lat0) / G.dlat;
    if (!(fx >= 0 && fy >= 0 && fx < nx - 1 && fy < ny - 1)) return 0;
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    const a = h[j * nx + i], b = h[j * nx + i + 1], c = h[(j + 1) * nx + i], d = h[(j + 1) * nx + i + 1];
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }

  function gelaendeTerrain() {
    const breite = 32, schema = new Cesium.GeographicTilingScheme();
    const W = Cesium.Math.toRadians(G.lon0), O = Cesium.Math.toRadians(lon1);
    const S = Cesium.Math.toRadians(G.lat0), N = Cesium.Math.toRadians(lat1);
    const leer = new Float32Array(breite * breite);
    return new Cesium.CustomHeightmapTerrainProvider({
      width: breite, height: breite, tilingScheme: schema,
      callback: (x, y, level) => {
        const r = schema.tileXYToRectangle(x, y, level);
        if (r.east < W || r.west > O || r.north < S || r.south > N) return leer;  // außerhalb: flach
        const z = new Float32Array(breite * breite);
        for (let j = 0; j < breite; j++) {  // Zeile 0 = Norden
          const lat = Cesium.Math.toDegrees(r.north - (r.north - r.south) * j / (breite - 1));
          for (let i = 0; i < breite; i++) {
            z[j * breite + i] = gelaendeHoehe(Cesium.Math.toDegrees(r.west + (r.east - r.west) * i / (breite - 1)), lat);
          }
        }
        return z;
      },
    });
  }

  async function gelaendeSchatten(viewer, basis = "3d/") {
    const anbieter = await Cesium.SingleTileImageryProvider.fromUrl(basis + "gelaende_schatten.png",
      { rectangle: Cesium.Rectangle.fromDegrees(G.lon0, G.lat0, lon1, lat1) });
    return viewer.imageryLayers.addImageryProvider(anbieter);
  }

  window.gelaendeHoehe = gelaendeHoehe;
  window.gelaendeTerrain = gelaendeTerrain;
  window.gelaendeSchatten = gelaendeSchatten;
})();
