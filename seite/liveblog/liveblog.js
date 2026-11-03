// Rekonstruierter Liveblog: liest dieselben, schon bereinigten Ereignisse wie die Karte (/karte/ereignisse.js) und
// zeigt sie nach Stunden gruppiert, mit Quelle und Link auf den Moment in der Karte. Keine eigenen Daten.
(() => {
  const ORTE = Object.fromEntries((window.ORTE || []).map((o) => [o.name, o]));
  const minuten = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  // Art der Quelle aus dem Quelltext: Polizei/Innenministerium, Medien (Link) oder Livestream/Video
  const art = (e) => /polizei|innenministerium|presseportal/i.test(e.quelle) ? "polizei"
    : /<a /.test(e.quelle) && !/youtube\.com|tiktok\.com|t\.me\//.test(e.quelle) ? "medien" : "video";
  const NAME = { polizei: "Polizei/Behörde", medien: "Medien", video: "Video/Stream" };
  // Link auf die Karte zu diesem Moment, Blick schräg von Süden auf den Ort (wie „Orte anspringen“)
  const kartenlink = (e) => {
    const o = ORTE[e.ort];
    if (!o) return `/karte/#t=${e.von}`;
    const hoehe = 420;
    return `/karte/#t=${e.von}&k=${o.lon.toFixed(5)},${(o.lat - hoehe / 111000 * 1.65).toFixed(5)},${hoehe + 40},0,-35`;
  };
  const eintraege = [...(window.EREIGNISSE || [])].sort((a, b) => minuten(a.von) - minuten(b.von));

  function zeige(filter) {
    let html = "", stunde = -1;
    for (const e of eintraege) {
      const k = art(e);
      if (filter !== "alle" && k !== filter) continue;
      const h = Math.floor(minuten(e.von) / 60);
      if (h !== stunde) { html += `<h2 class="stunde">${h} Uhr</h2>`; stunde = h; }
      const genau = e.zeit_sicher === "genau" ? "" : `<small>${e.zeit_sicher === "ca." ? "ca." : "Reihenfolge"}</small>`;
      html += `<article class="eintrag"><div class="zeit">${e.von}${genau}</div><div>
        <div class="ort"><span class="art ${k}">${NAME[k]}</span><a href="${kartenlink(e)}">${e.ort} auf der Karte ↗</a></div>
        <div>${e.text}</div><div class="quelle">Quelle: ${e.quelle}</div></div></article>`;
    }
    document.getElementById("blog").innerHTML = html || "<p>Keine Einträge für diesen Filter.</p>";
  }
  document.querySelectorAll("#filter button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#filter button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    zeige(b.dataset.art);
  }));
  zeige("alle");
})();
