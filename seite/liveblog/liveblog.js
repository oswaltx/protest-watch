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
  // Nach dem Demotag: Bilanz, Ermittlungen, Landtag (nur belegte Angaben, keine Herkunftsangaben; Stand 10.11.)
  const NACHTRAEGE = [
    { tag: "1.11.", text: "Die SPD-Fraktion im Landtag NRW beantragt einen Bericht der Landesregierung im Innenausschuss, unter anderem zur Lage und zu den Rechtsgrundlagen der Polizeimaßnahmen.",
      quelle: '<a href="https://www.spd-mi-lk.de/2026/11/01/konsequenz-gegen-gewalt-und-eine-sorgfaeltige-aufarbeitung-des-einsatzes-gehoeren-zusammen/" target="_blank" rel="noopener">SPD-Landtagsfraktion NRW, 1.11.</a>' },
    { tag: "6.11.", text: "Laut Polizeibilanz gab es 34 Ingewahrsamnahmen, 28 davon an den Ringen oder am Dom, also bei den Ausschreitungen am Abend und in der Nacht. Beim Staatsschutz ermittelt eine Gruppe mit 30 Beamtinnen und Beamten, unter anderem wegen Landfriedensbruchs und Verstößen gegen das Sprengstoffgesetz; rund 200 Hinweise sind eingegangen.",
      quelle: '<a href="https://antenne.nrw/nrw/chaos-nach-gen-z-demo-in-koeln-polizei-zieht-bilanz/" target="_blank" rel="noopener">Antenne NRW, 6.11.</a>' },
    { tag: "12.11.", text: "Der Innenausschuss des Landtags NRW befasst sich voraussichtlich mit dem Einsatz (angekündigt, noch nicht stattgefunden).",
      quelle: '<a href="https://www.spd-mi-lk.de/2026/11/01/konsequenz-gegen-gewalt-und-eine-sorgfaeltige-aufarbeitung-des-einsatzes-gehoeren-zusammen/" target="_blank" rel="noopener">SPD-Landtagsfraktion NRW</a>, <a href="https://www.landtagsblog.de/post/ministerpr%C3%A4sidenten-zeigten-herz-f%C3%BCr-merz-staatskanzlei-half-beim-cdu-brief" target="_blank" rel="noopener">Landtagsblog</a>' },
  ];

  function zeige(filter) {
    let html = "", stunde = -1;
    for (const e of eintraege) {
      const k = art(e);
      if (filter !== "alle" && k !== filter) continue;
      const h = Math.floor(minuten(e.von) / 60);
      if (h !== stunde) { html += `<h2 class="stunde">${h} Uhr</h2>`; stunde = h; }
      const genau = e.zeit_sicher === "genau" ? "" : `<small>${e.zeit_sicher === "ca." ? "ca." : "Reihenfolge"}</small>`;
      html += `<article class="eintrag${e.ansage ? " mit-ansage" : ""}"><div class="zeit">${e.von}${genau}</div><div>
        <div class="ort"><span class="art ${k}">${NAME[k]}</span><a href="${kartenlink(e)}">${e.ort} auf der Karte ↗</a></div>
        ${e.ansage ? `<div class="ansage ${e.ansage}">📢 ${e.ansage === "polizei" ? "Ansage der Polizei" : "Ansage der Versammlungsleitung"}</div>` : ""}
        <div>${e.text}</div><div class="quelle">Quelle: ${e.quelle}</div></div></article>`;
    }
    if (filter === "alle") {
      html += `<h2 class="stunde">Nach dem 31. Oktober</h2>`;
      for (const n of NACHTRAEGE) html += `<article class="eintrag"><div class="zeit">${n.tag}</div><div>
        <div>${n.text}</div><div class="quelle">Quelle: ${n.quelle}</div></div></article>`;
    }
    document.getElementById("blog").innerHTML = html || "<p>Keine Einträge für diesen Filter.</p>";
  }
  document.querySelectorAll("#filter button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#filter button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    zeige(b.dataset.art);
  }));
  zeige("alle");
})();
