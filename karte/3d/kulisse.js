// 3D-Kulisse Weckschnapp (Gaussian Splats, 3D Tiles mit KHR_gaussian_splatting + SPZ), nur lokal, nicht im
// Export solange KULISSE_FREIGEGEBEN = False in skripte/oeffentlich_bauen.py.
// window.kulisseLaden(viewer, {klein, boden}) lädt das Tileset und gibt es zurück. Lage, Peilung und Maßstab stehen
// schon im Tileset (skripte/kulisse_bauen.py aus 3d/kulisse.json; Höhe = GRUND 0 + 0,1 m). Mit boden(lon, lat)
// (Gelände der Karte) wird jeder Teil um die Geländehöhe an seinem Ursprung (Mitte der Kamerabahn) verschoben.
(function () {
  async function kulisseLaden(viewer, { klein = false, basis = "3d/", boden = null } = {}) {
    const ts = await Cesium.Cesium3DTileset.fromUrl(basis + (klein ? "kulisse_klein" : "kulisse") + "/tileset.json");
    if (boden) {
      for (const teil of ts.root.children) {
        const g = Cesium.Cartographic.fromCartesian(Cesium.Matrix4.getTranslation(teil.transform, new Cesium.Cartesian3()));
        g.height += boden(Cesium.Math.toDegrees(g.longitude), Cesium.Math.toDegrees(g.latitude));
        teil.transform = Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartographic.toCartesian(g));
      }
    }
    viewer.scene.primitives.add(ts);
    return ts;
  }
  window.kulisseLaden = kulisseLaden;
})();
