// Rekonstruierter Liveblog: liest dieselben, schon bereinigten Ereignisse wie die Karte (/karte/ereignisse.js) und
// zeigt sie nach Stunden gruppiert, mit Quelle und Link auf den Moment in der Karte. Keine eigenen Daten.
(() => {
  const ORTE = Object.fromEntries((window.ORTE || []).map((o) => [o.name, o]));
  // Stadt: <body data-karte="/frankfurt/karte/"> (ohne Angabe Köln). Ereignisse mit tag ≠ erstem Tag (Nacht danach)
  // zählen ab Mitternacht weiter, damit 00:17 nach 23:50 kommt
  const KARTE = document.body.dataset.karte || "/karte/";
  const ERSTER_TAG = document.body.dataset.tag || "31.10.";  // Tag der Demo; Einträge ohne tag gehören dazu
  const minuten = (hhmm, tag) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m + (tag && tag !== ERSTER_TAG ? 1440 : 0); };
  // Art der Quelle aus dem Quelltext: Polizei/Innenministerium, Medien (Link) oder Livestream/Video
  const art = (e) => /polizei|innenministerium|presseportal/i.test(e.quelle) ? "polizei"
    : /<a /.test(e.quelle) && !/youtube\.com|tiktok\.com|t\.me\//.test(e.quelle) ? "medien" : "video";
  const NAME = { polizei: "Polizei/Behörde", medien: "Medien", video: "Video/Stream" };
  // Link auf die Karte zu diesem Moment, Blick schräg von Süden auf den Ort (wie „Orte anspringen“)
  const kartenlink = (e) => {
    const o = ORTE[e.ort];
    if (!o) return `${KARTE}#t=${e.von}`;
    const hoehe = 420;
    return `${KARTE}#t=${e.von}&k=${o.lon.toFixed(5)},${(o.lat - hoehe / 111000 * 1.65).toFixed(5)},${hoehe + 40},0,-35`;
  };
  const eintraege = [...(window.EREIGNISSE || [])].sort((a, b) => minuten(a.von, a.tag) - minuten(b.von, b.tag));
  // Nach dem Demotag: Bilanz, Ermittlungen, Landtag (nur belegte Angaben, keine Herkunftsangaben; Stand 12.11.)
  const NACHTRAEGE = window.NACHTRAEGE || (KARTE !== "/karte/" ? [] : [
    { tag: "1.11.", text: "Laut Polizei (Meldung von 6:19 Uhr) ist ein Hinweisportal eingerichtet, auf dem Zeugen Fotos und Videos hochladen können. Neben Verstößen gegen das Versammlungsgesetz hätten Einzelpersonen und Gruppen in der Innenstadt unter anderem randaliert, Hausfassaden und Streifenwagen beschädigt, Einsatzkräfte angegriffen und Pyrotechnik gezündet. Plünderungen habe es nach Kenntnisstand von 6 Uhr nicht gegeben.",
      quelle: '<a href="https://www.presseportal.de/blaulicht/pm/12415/6381573" target="_blank" rel="noopener">Polizei Köln, Pressemitteilung 1.11., 06:19</a>' },
    { tag: "1.11.", text: "Die SPD-Fraktion im Landtag NRW kündigt an, im nächsten Innenausschuss um einen mündlichen Bericht zu bitten, unter anderem zur Entwicklung der Lage und zur Grundlage der einzelnen Einsatzmaßnahmen.",
      quelle: '<a href="https://www.spd-mi-lk.de/2026/11/01/konsequenz-gegen-gewalt-und-eine-sorgfaeltige-aufarbeitung-des-einsatzes-gehoeren-zusammen/" target="_blank" rel="noopener">Erklärung der innenpolitischen Sprecherin der SPD-Landtagsfraktion NRW, 1.11. (veröffentlicht von der SPD Minden-Lübbecke)</a>' },
    { tag: "6.11.", text: "Laut Polizeibilanz (nach Antenne NRW) wurden 34 Menschen in Gewahrsam genommen, 28 davon im Bereich der Ringe oder am Dom. Gegen die im Rahmen der Demo in Gewahrsam Genommenen werde wegen Landfriedensbruchs oder Verstoßes gegen das Sprengstoffgesetz ermittelt. Eine dem Staatsschutz unterstellte Ermittlungsgruppe mit 30 Beamtinnen und Beamten wertet rund 200 eingegangene Hinweise aus.",
      quelle: '<a href="https://antenne.nrw/nrw/chaos-nach-gen-z-demo-in-koeln-polizei-zieht-bilanz/" target="_blank" rel="noopener">Antenne NRW, 6.11.</a>' },
    { tag: "12.11.", text: "Der Innenausschuss des Landtags NRW hat am 12.11. getagt (86. Sitzung, Aufzeichnung in der Mediathek). Auf der Tagesordnung stand als TOP 2 „Gen-Z-Proteste in Nordrhein-Westfalen – Einsatzbilanz und Schlussfolgerungen“, Grundlage war ein schriftlicher Bericht des Innenministeriums. Was dazu gesagt wurde, ist noch nicht ausgewertet; das Protokoll steht aus.",
      quelle: '<a href="https://www.landtag.nrw.de/home/der-landtag/tagesordnungen/WP18/1900/E18-1972.html" target="_blank" rel="noopener">Landtag NRW, Tagesordnung E 18/1972</a>; <a href="https://www.landtag.nrw.de/home/mediathek/video.html?kid=a1da6ee3-59b0-48d8-87c2-bb5e3b7a7a69" target="_blank" rel="noopener">Mediathek, Innenausschuss 12.11.</a>' },
    { tag: "12.11.", text: "Laut Pressestelle der Polizei Köln hat die Polizei mit Stand 9. November im Zusammenhang mit der Halloween-Nacht über 200 Ermittlungsverfahren eingeleitet, unter anderem wegen Landfriedensbruchs, gefährlicher Körperverletzung und Verstößen gegen das Sprengstoffgesetz. Zwischen der Versammlung und den Geschehnissen der Halloween-Nacht müsse „weiterhin … differenziert werden“. Insgesamt seien 34 Personen in Gewahrsam genommen und eine Person festgenommen worden. Zu taktischen Maßnahmen, etwa zur Einschließung am Rheinufer, gibt die Polizei keine Auskunft. Es gebe vereinzelt Beschwerden, derzeit aber mehr Dankschreiben.",
      quelle: 'Pressestelle der Polizei Köln, Antwort auf eine Anfrage von protest-watch, 12.11.' },
  ]);

  function zeige(filter) {
    let html = "", stunde = -1;
    for (const e of eintraege) {
      const k = art(e);
      if (filter !== "alle" && k !== filter) continue;
      const h = Math.floor(minuten(e.von, e.tag) / 60);
      if (h !== stunde) { html += `<h2 class="stunde">${h >= 24 ? `${e.tag}, ${h - 24}` : h} Uhr</h2>`; stunde = h; }
      const genau = e.zeit_sicher === "genau" ? "" : `<small>${e.zeit_sicher === "ca." ? "ca." : "Reihenfolge"}</small>`;
      html += `<article class="eintrag${e.ansage ? " mit-ansage" : ""}"><div class="zeit">${e.von}${genau}</div><div>
        <div class="ort"><span class="art ${k}">${NAME[k]}</span><a href="${kartenlink(e)}">${e.ort} auf der Karte ↗</a></div>
        ${e.ansage ? `<div class="ansage ${e.ansage}">📢 ${e.ansage === "polizei" ? "Ansage der Polizei" : "Ansage der Versammlungsleitung"}</div>` : ""}
        <div>${e.text}</div><div class="quelle">Quelle: ${e.quelle}</div></div></article>`;
    }
    if (filter === "alle" && NACHTRAEGE.length) {
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
