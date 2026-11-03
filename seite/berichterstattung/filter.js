// Filter für /berichterstattung/: Medientyp, Phase, Geschichte, Rahmung an- und abwählen; Leisten und Zeitverlauf
// werden aus daten.js neu berechnet. Ohne JavaScript bleibt die statische Fassung stehen. Keine Bibliotheken, keine Anfragen.
(function () {
  "use strict";
  const D = window.PW_BERICHTE;
  if (!D || !document.getElementById("themen")) return;
  // Vergleiche zwischen Medientypen erst nach der Zweitcodierung (Schalter MEDIENTYPEN_FREIGEGEBEN beim Export)
  const MT = window.PW_MEDIENTYPEN === true;

  const TYPEN = [["oerr", "Öffentlich-rechtlich"], ["lokal_regional", "Lokal und regional"], ["ueberregional", "Überregional online"],
    ["boulevard", "Boulevard"], ["agentur", "Agenturmeldungen"], ["social", "Social Media"]];
  const PHASEN = [["vorher", "vorher"], ["nachher", "nachher"]];
  const GESCH = [["vorbereitung", "Sicherheitslage vorher"], ["anliegen", "Worum es der Gen Z geht"], ["planung", "Ankündigung, Organisation"],
    ["kundgebung", "Kundgebung 31.10."], ["ufer", "Wasserwerfer, Kessel"], ["abend", "Randale Abend/Nacht"], ["bilanz", "Bundesweiter Überblick"],
    ["reaktionen", "Reaktionen, Folgen"], ["unklar", "nicht zugeordnet"]];
  const GESCH_LANG = {vorbereitung: "Sicherheitslage vor der Demo", anliegen: "Worum es der Gen Z geht", planung: "Ankündigung und Organisation in Köln",
    kundgebung: "Die Kundgebung am 31.10.", ufer: "Wasserwerfer und Kessel am Ufer", abend: "Randale am Abend und in der Nacht",
    bilanz: "Bundesweiter Überblick", reaktionen: "Reaktionen und Folgen"};
  const RAHMEN = [["gewalt", "Gewalt"], ["polizei", "Polizeieinsatz"], ["anliegen", "Anliegen"], ["politik_reaktion", "Politik-Reaktion"], ["neutral", "neutral, Ablauf"]];
  const THEMEN = [["gewalt", "Gewalt, Krawall", "f1"], ["polizei", "Polizeieinsatz", "f2"], ["forderungen", "Forderungen", "f3"],
    ["politik", "Politik-Reaktionen", "f4"], ["ablauf", "Ablauf, Teilnehmende", "f5"], ["sonstiges", "Sonstiges", "f0"]];
  const SPRECHER = [["polizei", "Polizei", "f2"], ["politik", "Politik, Behörden", "f4"], ["protest", "Demonstrierende, Orga", "f3"],
    ["fachleute", "Fachleute", "f5"], ["andere", "Andere", "f0"]];
  const TYPFARBE = {oerr: "t1", lokal_regional: "t2", ueberregional: "t3", boulevard: "t4", agentur: "t5", social: "f0"};
  const R3 = [["gewalt", "Gewalt oder Polizei", "f1"], ["anliegen", "Anliegen", "f3"], ["neutral", "neutral, Ablauf, Politik", "f0"]];
  const ZEITFARBE = {gewalt: "f1", polizei: "f2", anliegen: "f3", politik_reaktion: "f4", neutral: "f0"};
  const MIN_N = 5, BLIND = 1 / 3, MIN_ERWARTET = 3;

  const gruppen = MT ? {t: TYPEN, p: PHASEN, g: GESCH, r: RAHMEN} : {p: PHASEN, g: GESCH, r: RAHMEN};
  const titel = {t: "Medientyp", p: "Phase", g: "Geschichte", r: "Rahmung der Überschrift"};
  const wahl = {};
  for (const k in gruppen) wahl[k] = new Set(gruppen[k].map(x => x[0]));

  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
  const voll = k => wahl[k].size === gruppen[k].length;

  function passt(e) {
    if ((MT && !wahl.t.has(e.t)) || !wahl.p.has(e.p)) return false;
    if (e.nurtext) return voll("g") && voll("r");  // Sendungen ohne Überschriften-Zeile: nur ohne Geschichten-/Rahmenfilter
    return wahl.g.has(e.g) && wahl.r.has(e.r);
  }

  function leiste(werte, schl, titelText) {
    const summe = schl.reduce((a, [k]) => a + (werte[k] || 0), 0) || 1;
    const vorlesen = [], teile = [];
    for (const [k, name, farbe] of schl) {
      const v = 100 * (werte[k] || 0) / summe;
      vorlesen.push(`${name} ${Math.round(v)} %`);
      if (v > 0) teile.push(`<i class="${farbe}" style="width:${v.toFixed(1)}%" title="${esc(name)}: ${Math.round(v)} %">${v >= 8 ? Math.round(v) : ""}</i>`);
    }
    return `<div class="stapel" role="img" aria-label="${esc(titelText)}: ${esc(vorlesen.join(", "))}">${teile.join("")}</div>`;
  }
  const legende = (schl, t) => `<div class="legende">${t ? `<b>${esc(t)}</b>` : ""}${schl.map(([, n, f]) => `<span><i class="${f}"></i>${esc(n)}</span>`).join("")}</div>`;
  const tsd = n => n.toLocaleString("de-DE");

  function diagrammNach(id) {
    let el = document.getElementById(id);
    while (el && !(el.classList && el.classList.contains("diagramm"))) el = el.nextElementSibling;
    return el;
  }
  function diagrammNachH3(text) {
    const h = [...document.querySelectorAll("h3")].find(x => x.textContent.startsWith(text));
    if (!h) return null;
    let el = h.nextElementSibling;
    while (el && !(el.classList && el.classList.contains("diagramm"))) el = el.nextElementSibling;
    return el;
  }

  function themen(liste) {
    const zeilen = MT ? [["redaktionen", "Alle Redaktionen"], ...TYPEN] : [["redaktionen", "Alle Redaktionen"]];
    let html = legende(THEMEN);
    for (const [typ, name] of zeilen) {
      let inhalt = "";
      for (const [ph] of PHASEN) {
        if (!wahl.p.has(ph)) continue;
        const b = liste.filter(e => e.s && e.p === ph && (typ === "redaktionen" ? e.t !== "social" : e.t === typ));
        if (!b.length) continue;
        if (b.length < MIN_N) { inhalt += `<div class="reihe"><span class="ph">${ph}</span><span class="klein">zu wenige Beiträge (n = ${b.length})</span></div>`; continue; }
        const mittel = {};
        for (const [k] of THEMEN) mittel[k] = b.reduce((a, e) => a + (e.s[k] || 0), 0) / b.length;
        inhalt += `<div class="reihe"><span class="ph">${ph}</span>${leiste(mittel, THEMEN, name + " " + ph)}<span class="anz">n = ${b.length}</span></div>`;
      }
      if (inhalt) html += `<div class="gruppe"><div class="name"><b>${esc(name)}</b></div>${inhalt}</div>`;
    }
    return html;
  }

  function sprecher(liste) {
    const zeilen = [["redaktionen", "vorher", "Alle Redaktionen, vorher"], ["redaktionen", "nachher", "Alle Redaktionen, nachher"],
      ...(MT ? TYPEN.map(([t, n]) => [t, "nachher", n + ", nachher"]) : [])];
    let html = legende(SPRECHER);
    for (const [typ, ph, name] of zeilen) {
      const b = liste.filter(e => e.sp && e.p === ph && (typ === "redaktionen" ? e.t !== "social" : e.t === typ));
      const sum = {};
      for (const e of b) for (const k in e.sp) sum[k] = (sum[k] || 0) + e.sp[k];
      const n = Object.values(sum).reduce((a, x) => a + x, 0);
      if (b.length >= MIN_N && n >= 20) html += `<div class="reihe breit"><span class="ph">${esc(name)}</span>${leiste(sum, SPRECHER, name)}<span class="anz">${tsd(n)} Aussagen</span></div>`;
    }
    return html;
  }

  function saeulen(zellen, beschr, titelText, art) {
    const hoch = Math.max(1, ...zellen.map(c => Object.values(c).reduce((a, x) => a + x, 0)));
    let html = `<div class="saeulen ${art}" role="img" aria-label="${esc(titelText)}">`;
    zellen.forEach((c, j) => {
      const n = Object.values(c).reduce((a, x) => a + x, 0);
      const teile = RAHMEN.slice().reverse().filter(([k]) => c[k]).map(([k, name]) =>
        `<i class="${ZEITFARBE[k]}" style="height:${(100 * c[k] / hoch).toFixed(1)}%" title="${esc(name)}: ${c[k]}"></i>`).join("");
      html += `<div class="saeule" title="${esc(beschr[j])}: ${n} Beiträge"><span class="wert">${n || ""}</span><div class="turm">${teile}</div><span class="tag">${esc(beschr[j])}</span></div>`;
    });
    return html + "</div>";
  }

  function zeit(liste) {
    const tage = [], std = [];
    for (let d = new Date(2026, 9, 23); d <= new Date(2026, 10, 4); d.setDate(d.getDate() + 1)) tage.push(new Date(d));
    for (let h = 0; h < 24; h++) std.push(new Date(2026, 9, 31, 12 + h));
    const iso = (d, mitStunde) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` + (mitStunde ? " " + String(d.getHours()).padStart(2, "0") : "");
    const b = liste.filter(e => e.h && e.r);
    const zelle = schl => { const c = {}; for (const e of b) if (schl(e)) c[e.r] = (c[e.r] || 0) + 1; return c; };
    const zt = tage.map(d => zelle(e => e.h.slice(0, 10) === iso(d)));
    // letzte Tage ohne Beiträge nicht zeigen
    while (zt.length > 11 && !Object.keys(zt[zt.length - 1]).length) { zt.pop(); tage.pop(); }
    const zs = std.map(d => zelle(e => e.h === iso(d, true)));
    return legende(RAHMEN.map(([k, n]) => [k, n, ZEITFARBE[k]])) +
      saeulen(zt, tage.map(d => d.getDate() + "."), "Beiträge je Tag", "tage") +
      '<p class="klein" style="margin-top:1rem">31.10., 12 Uhr bis 1.11., 11 Uhr (je Stunde)</p>' +
      saeulen(zs, std.map(d => String(d.getHours())), "Beiträge je Stunde am Demotag", "std");
  }

  function r3(e) {
    if (e.r === "gewalt" || e.r === "polizei" || (e.r === "politik_reaktion" && e.w)) return "gewalt";
    return e.r === "anliegen" ? "anliegen" : "neutral";
  }

  function geschichten(liste) {
    const b0 = liste.filter(e => !e.nurtext && e.g && e.g !== "unklar");
    let html = (MT ? legende(TYPEN.filter(([t]) => wahl.t.has(t)).map(([t, n]) => [t, n, TYPFARBE[t]]), "Wer berichtet:") : "") + legende(R3, "Rahmung:");
    let gezeigt = 0;
    for (const [g, name] of Object.entries(GESCH_LANG)) {
      if (!wahl.g.has(g)) continue;
      const b = b0.filter(e => e.g === g);
      if (b.length < MIN_N) { if (b.length) html += `<div class="geschichte"><div class="kopf"><b>${esc(name)}</b><span class="anz">zu wenige Beiträge (n = ${b.length})</span></div></div>`; continue; }
      gezeigt++;
      const typ = {}, rah = {}, sp = {};
      for (const e of b) { typ[e.t] = (typ[e.t] || 0) + 1; const k = r3(e); rah[k] = (rah[k] || 0) + 1; if (e.sp) for (const s in e.sp) sp[s] = (sp[s] || 0) + e.sp[s]; }
      const blind = [];
      if (MT && b.length >= 10) {
        const zaehl = {}; b.forEach(e => zaehl[e.p] = (zaehl[e.p] || 0) + 1);
        const ph = Object.entries(zaehl).sort((x, y) => y[1] - x[1])[0][0];
        const basis = b0.filter(e => e.p === ph), nb = basis.length;
        for (const [t, tn] of TYPEN) {
          if (!wahl.t.has(t) || t === "social") continue;  // Social Media ist keine Redaktion (recht-b0 R1)
          const erw = b.length * basis.filter(e => e.t === t).length / nb;
          if (erw >= MIN_ERWARTET && (typ[t] || 0) < BLIND * erw) blind.push(`${tn} (${typ[t] || 0} statt etwa ${Math.round(erw)} erwartet)`);
        }
      }
      const nsp = Object.values(sp).reduce((a, x) => a + x, 0);
      const zuwort = nsp >= 20 ? "Zu Wort: " + SPRECHER.filter(([k]) => sp[k] && 100 * sp[k] / nsp >= 5).map(([k, n]) => `${n} ${Math.round(100 * sp[k] / nsp)} %`).join(", ") + ` (${tsd(nsp)} Aussagen)` : "Zu Wort: zu wenige Aussagen für eine Angabe";
      html += `<div class="geschichte"><div class="kopf"><b>${esc(name)}</b><span class="anz">${b.length} Beiträge</span></div>` +
        (MT ? `<div class="reihe breit"><span class="ph">Wer berichtet</span>${leiste(typ, TYPEN.map(([t, n]) => [t, n, TYPFARBE[t]]), name + ", Medientypen")}<span class="anz"></span></div>` : "") +
        `<div class="reihe breit"><span class="ph">Rahmung</span>${leiste(rah, R3, name + ", Rahmung")}<span class="anz"></span></div>` +
        `<p class="klein zuwort">${esc(zuwort)}${blind.length ? `<br><span class="fleck">Wenig berichtet: ${esc(blind.join(", "))}</span>` : ""}</p></div>`;
    }
    return gezeigt ? html : html + '<p class="klein">Mit dieser Auswahl hat keine Geschichte mindestens 5 Beiträge.</p>';
  }

  const ziele = {themen: diagrammNach("themen"), sprecher: diagrammNachH3("Wer kommt zu Wort"), zeit: diagrammNach("zeitverlauf"), gesch: diagrammNach("geschichten")};

  // Filterleiste vor dem ersten gefilterten Abschnitt einfügen
  const box = document.createElement("section");
  box.className = "filter";
  box.setAttribute("aria-label", "Filter");
  let html = `<details${window.innerWidth > 700 ? " open" : ""}><summary><h2>Filter</h2> <span class="klein" id="filter-kurz"></span></summary>` +
    '<p class="klein">Wähle aus, welche Beiträge in die Leisten, den Zeitverlauf und die Geschichten eingehen. ' +
    "Die Sätze im Text darunter beziehen sich immer auf alle Beiträge.</p>";
  for (const k in gruppen) {
    html += `<fieldset><legend>${esc(titel[k])}</legend>` + gruppen[k].map(([v, n]) =>
      `<button type="button" class="chip" aria-pressed="true" data-gruppe="${k}" data-wert="${v}">${esc(n)}</button>`).join("") + "</fieldset>";
  }
  html += '<p class="klein"><span id="filter-zahl" aria-live="polite"></span> · <button type="button" class="chip" id="filter-reset">alle zurücksetzen</button></p></details>';
  box.innerHTML = html;
  document.getElementById("themen").before(box);

  function zeichne() {
    const liste = D.filter(passt);
    const mitTitel = liste.filter(e => !e.nurtext).length;
    const aktiv = Object.keys(gruppen).filter(k => !voll(k)).map(k => titel[k]);
    document.getElementById("filter-kurz").textContent = aktiv.length ? "aktiv: " + aktiv.join(", ") : "alle Beiträge";
    document.getElementById("filter-zahl").textContent = `${tsd(mitTitel)} von ${tsd(D.filter(e => !e.nurtext).length)} Überschriften, ${tsd(liste.filter(e => e.s).length)} Beiträge im Volltext`;
    if (ziele.themen) ziele.themen.innerHTML = themen(liste);
    if (ziele.sprecher) ziele.sprecher.innerHTML = sprecher(liste);
    if (ziele.zeit) ziele.zeit.innerHTML = zeit(liste);
    if (ziele.gesch) ziele.gesch.innerHTML = geschichten(liste);
  }

  box.addEventListener("click", ev => {
    const b = ev.target.closest("button");
    if (!b) return;
    if (b.id === "filter-reset") {
      for (const k in gruppen) wahl[k] = new Set(gruppen[k].map(x => x[0]));
      box.querySelectorAll(".chip[data-gruppe]").forEach(c => c.setAttribute("aria-pressed", "true"));
    } else {
      const k = b.dataset.gruppe, v = b.dataset.wert;
      if (wahl[k].has(v)) { if (wahl[k].size > 1) wahl[k].delete(v); } else wahl[k].add(v);  // mindestens eine Auswahl je Gruppe
      b.setAttribute("aria-pressed", String(wahl[k].has(v)));
    }
    zeichne();
  });
  zeichne();
})();
