// Quellenbibliothek: Liste mit Suche und Filtern über window.QUELLEN (aus daten.js, erzeugt von skripte/bibliothek_bauen.py).
// Ohne fremde Bibliotheken; Texte gehen nur über textContent ins Dokument.
(() => {
const Q = window.QUELLEN, INTERN = window.QUELLEN_INTERN, KARTE = window.KARTE;
const $ = (id) => document.getElementById(id);
const el = (tag, attr = {}, ...kinder) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attr)) k === "text" ? (e.textContent = v) : e.setAttribute(k, v);
  for (const k of kinder) if (k != null) e.append(k);
  return e;
};
const uhr = (iso) => iso ? iso.slice(11, 16) : "";
const datum = (iso) => {
  if (!iso) return "";
  const [j, m, t] = iso.slice(0, 10).split("-");
  return `${+t}.${+m}.${iso.length > 10 ? " " + uhr(iso) : ""}`;
};
const dauer = (s) => s == null ? "" : s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.round(s % 3600 / 60)} min`
                                    : s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`;
const SPRACHE = { de: "Deutsch", en: "Englisch", tr: "Türkisch", ro: "Rumänisch" };
const link = (href, text) => el("a", { href, target: "_blank", rel: "noopener noreferrer", text });
const kartenlink = (k, text = "auf der Karte") => k ? el("a", { href: KARTE + k, text }) : null;
const aufDieKarte = (e) => !!e.karte;

$("stand").textContent = window.QUELLEN_STAND;
$("zur-karte").href = KARTE;
if (INTERN) {
  document.title = "Quellen (intern)";
  $("hinweis").className = "hinweis intern";
  $("hinweis").textContent = "Interne Fassung: alle Kanalnamen, Dateipfade, Notizen und Abozahlen. Nicht veröffentlichen. "
    + "Kartenlinks gehen auf den lokalen Server (python3 skripte/server.py).";
}

// Filter füllen
const zaehle = (werte) => [...werte.reduce((m, w) => m.set(w, (m.get(w) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]);
function fuelle(id, werte, alle = "alle") {
  const s = $(id);
  s.append(el("option", { value: "", text: alle }));
  for (const [w, n] of zaehle(werte)) s.append(el("option", { value: w, text: `${w} (${n})` }));
}
// Private Videos und Livestreams (nur_quelle) haben öffentlich weder Ort noch Aufnahmezeit noch Szenen und tauchen
// in Suche, Orts-, Sicherheits- und Zeitfilter nicht auf (Prüfung recht-b0 2.11., Q1).
const VOLL = Q.filter((e) => !e.nur_quelle);
fuelle("f-art", Q.map((e) => e.art));
fuelle("f-plattform", Q.map((e) => e.plattform));
fuelle("f-ort", VOLL.flatMap((e) => e.orte));
fuelle("f-sicher", VOLL.map((e) => e.zeit_sicher || "unbekannt"));

const suchtext = (e) => e.nur_quelle ? "" : [e.titel, e.kanal, e.art, e.plattform, ...e.orte,
  ...e.szenen.flatMap((s) => [s.ort, s.inhalt, s.ort_grund, s.zeit_grund]),
  ...e.ereignisse.flatMap((v) => [v.ort, v.text]), INTERN ? e.notizen : "", INTERN ? e.datei : ""].join(" ").toLowerCase();
const INDEX = new Map(Q.map((e) => [e, suchtext(e)]));

const ZEIT_START = { von: $("f-von").value, bis: $("f-bis").value };
function passt(e) {
  const w = $("suche").value.trim().toLowerCase();
  if (e.nur_quelle) {
    const zeit = $("f-von").value !== ZEIT_START.von || $("f-bis").value !== ZEIT_START.bis;
    return !(w || $("f-ort").value || $("f-sicher").value || zeit)
      && (!$("f-art").value || e.art === $("f-art").value)
      && (!$("f-plattform").value || e.plattform === $("f-plattform").value)
      && (!$("f-karte").checked || aufDieKarte(e));
  }
  if (w && !w.split(/\s+/).every((t) => INDEX.get(e).includes(t))) return false;
  if ($("f-art").value && e.art !== $("f-art").value) return false;
  if ($("f-plattform").value && e.plattform !== $("f-plattform").value) return false;
  if ($("f-ort").value && !e.orte.includes($("f-ort").value)) return false;
  if ($("f-sicher").value && (e.zeit_sicher || "unbekannt") !== $("f-sicher").value) return false;
  if ($("f-karte").checked && !aufDieKarte(e)) return false;
  // Zeitfenster: Einträge ohne Aufnahmezeit (Berichte) bleiben drin, wenn ein verknüpftes Ereignis passt oder keins da ist
  const von = $("f-von").value || "00:00", bis = $("f-bis").value || "23:59";
  const a = uhr(e.aufnahme_von) || uhr(e.aufnahme_bis), b = uhr(e.aufnahme_bis) || a;
  const amTag = (iso) => !iso || iso.startsWith("2026-10-31");
  if (a && amTag(e.aufnahme_von || e.aufnahme_bis)) return !(b < von || a > bis);
  if (e.ereignisse.length) return e.ereignisse.some((v) => v.von >= von && v.von <= bis);
  return true;
}

function eintrag(e) {
  const titel = e.titel || e.kanal;
  const kopf = el("div", { class: "kopf" }, el("span", { class: "art", text: e.art }), el("h2", { text: titel }));
  const meta = [];
  const teil = (k, v) => v && meta.push(el("span", {}, k ? el("b", { text: k + " " }) : null, v), " · ");
  if (e.titel) teil("", e.kanal + (e.kanal_typ ? ` (${e.kanal_typ})` : ""));
  teil("", e.plattform);
  teil("veröffentlicht", datum(e.veroeffentlicht));
  teil("Dauer", dauer(e.dauer));
  if (e.aufnahme_von || e.aufnahme_bis) {
    const z = e.aufnahme_von ? `${uhr(e.aufnahme_von)}–${uhr(e.aufnahme_bis)}` : `spätestens ${datum(e.aufnahme_bis)}`;
    teil("Aufnahme", z + (e.zeit_sicher && e.zeit_sicher !== "nur Obergrenze" ? ` (Sicherheit ${e.zeit_sicher})` : ""));
  }
  teil("Orte", (e.orte || []).filter((o) => o !== "anderer Ort").join(", "));
  teil("Sprache", SPRACHE[e.sprache] || e.sprache);
  if (e.titel && !INTERN && /^„/.test(e.titel)) teil("", "Titel: Originaltitel des Kanals");
  if (e.status !== "nicht geprüft") teil("Status", e.status + (e.status_geprueft ? ` (${datum(e.status_geprueft.replace(" ", "T"))})` : ""));
  meta.pop();
  const weg = e.status === "gelöscht/privat" || e.status === "nicht mehr online";
  const links = el("div", { class: "links" }, link(e.url, weg ? "Original (nicht mehr online)" : "Original öffnen ↗"),
                   kartenlink(e.karte, "Moment auf der Karte →"));
  const li = el("li", { class: "eintrag", id: e.id.replace(":", "-") }, kopf, el("p", { class: "meta" }, ...meta), links);
  if (weg) links.firstChild.classList.add("status-geloescht");

  if (e.szenen?.length) {
    const ul = el("ul");
    for (const s of e.szenen) {
      const t = `${uhr(s.von)}–${uhr(s.bis)}`, sek = `Sek. ${s.sek_von}–${s.sek_bis}`;
      ul.append(el("li", {}, el("b", { text: `${sek}: ` }), `${s.inhalt}. ${s.ort}` + (s.blick ? `, Blick nach ${s.blick}` : "") + `, ca. ${t} `,
        el("span", { class: "sicher", title: `Ort: ${s.ort_grund}. Zeit: ${s.zeit_grund}`, text: `Ort ${s.ort_sicher}, Zeit ${s.zeit_sicher}` }),
        " ", kartenlink(s.karte)));
    }
    li.append(el("details", {}, el("summary", { text: `${e.szenen.length} verortete Szene${e.szenen.length > 1 ? "n" : ""}` }), ul));
  }
  if (e.ereignisse?.length) {
    const ul = el("ul");
    for (const v of e.ereignisse) ul.append(el("li", {}, el("b", { text: `${v.von} ${v.ort}: ` }), v.text, " ", kartenlink(v.karte)));
    li.append(el("details", {}, el("summary", { text: `${e.ereignisse.length} Ereignis${e.ereignisse.length > 1 ? "se" : ""} auf der Karte` }), ul));
  }
  if (INTERN) {
    const felder = ["id", "kanal_typ", "datei", "folgende", "notizen", "transkript", "sprache_quelle", "zeit_grund", "korpus_id"];
    const ul = el("ul");
    for (const f of felder) if (e[f] != null && e[f] !== "") ul.append(el("li", {}, el("b", { text: f + ": " }), String(e[f])));
    if (e.codierung) ul.append(el("li", {}, el("b", { text: "codierung: " }), JSON.stringify(e.codierung)));
    li.append(el("details", { class: "intern" }, el("summary", { text: "intern" }), ul));
  }
  return li;
}

const KNOTEN = new Map(Q.map((e) => [e, eintrag(e)]));
function zeige() {
  const treffer = Q.filter(passt);
  $("liste").replaceChildren(...treffer.map((e) => KNOTEN.get(e)));
  const versteckt = !Q.some((e) => e.nur_quelle && passt(e)) && Q.some((e) => e.nur_quelle);
  $("anzahl").textContent = `${treffer.length} von ${Q.length} Einträgen`
    + (versteckt && !INTERN ? " – Videos von Privatpersonen und Livestreams erscheinen bei Suche, Ort, Zeit und Zeitsicherheit nicht" : "");
}
$("filter").addEventListener("input", zeige);
$("filter").addEventListener("submit", (ev) => ev.preventDefault());
zeige();
// Direkter Link auf einen Eintrag: #v-ID
if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
})();
