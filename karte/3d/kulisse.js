// 3D-Kulisse Weckschnapp (Gaussian Splats, 3D Tiles mit KHR_gaussian_splatting + SPZ), nur lokal, nicht im
// Export solange KULISSE_FREIGEGEBEN = False in skripte/oeffentlich_bauen.py.
// window.kulisseLaden(viewer, {klein}) lädt das Tileset und gibt es zurück. Lage, Peilung und Maßstab stehen
// schon im Tileset (skripte/kulisse_bauen.py aus 3d/kulisse.json; Höhe = GRUND 0 + 0,1 m).
(function () {
  async function kulisseLaden(viewer, { klein = false, basis = "3d/" } = {}) {
    const ts = await Cesium.Cesium3DTileset.fromUrl(basis + (klein ? "kulisse_klein" : "kulisse") + "/tileset.json");
    viewer.scene.primitives.add(ts);
    return ts;
  }
  window.kulisseLaden = kulisseLaden;
})();
