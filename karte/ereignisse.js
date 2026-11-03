// Ereignisse aus Medienberichten. Zeiten in Ortszeit (31.10.2026).
// zeit_sicher: "genau" = Uhrzeit im Bericht genannt, "ca." = ungefähr genannt,
// "Reihenfolge" = nur aus der Abfolge im Newsblog geschätzt.
// ort = Name aus orte.js
// ansage: "polizei" bzw. "leitung" = zentrale Durchsage von Polizei oder Versammlungsleitung (auf der Zeitleiste hervorgehoben)
// quelle: Medien und Polizei mit Link und Datum (Prüfung recht-db 1.11.); Streams und Einsendungen ohne Link
(() => {
const a = (url, text) => `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
const TAZ = (zeit) => a("https://taz.de/Live-Ticker-GenZ-regelt/!6226335/", "taz-Liveticker, 31.10." + (zeit ? " " + zeit : ""));
const TONLINE = a("https://koeln.t-online.de/region/koeln/id_101503544/newsblog-gen-z-demo-koeln-bollerwuerfe-in-der-innenstadt.html",
                  "t-online-Newsblog, Stand 1.11. 07:21");
const ANTENNE = a("https://antenne.nrw/nrw/gen-z-demo-in-koeln-eskaliert-boeller-wasserwerfer-und-chaos-am-rheinufer/", "Antenne NRW, 31.10.");
const WZ = a("https://www.wz.de/nrw/wasserwerfereinsatz-gegen-gewaltbereite-demonstranten_aid-157591421", "Innenministerium NRW via WZ/dpa, 31.10.");
const WDR = a("https://www.zdf.de/video/magazine/collection-index-page-ard-collection-ard-dxjuomfyzdpzag93omuwm2exywzhmdmxmtc5zmq-448/page-video-ard-aktuelle-stunde---31102026-100",
              "WDR Aktuelle Stunde, 31.10.");
const POLIZEI_1 = a("https://www.presseportal.de/blaulicht/pm/12415/6381520", "Polizei Köln, PM 261031-1-K, 31.10.");
const POLIZEI_2 = a("https://www.presseportal.de/blaulicht/pm/12415/6381831", "PM 261101-2-K, 1.11.");
const BILD = a("https://www.youtube.com/watch?v=K4kQf-2JuDw", "BILD-Video, 31.10.");
const AUF1 = a("https://t.me/auf1tv/22148", "Video, veröffentlicht von AUF1 (Telegram), 31.10.");
const TAZ_BERICHT = a("https://taz.de/Gen-Z-regelt-Protest/!6226457/", "taz, 1.11.");
const SZ_DPA = a("https://www.sueddeutsche.de/politik/gen-z-demo-in-koeln-demonstranten-werfen-pyrotechnik-und-steine-auf-beamte-dpa.urn-newsml-dpa-com-20090101-261031-930-924424", "dpa via SZ, 31.10.");
const DERWESTEN = a("https://www.derwesten.de/staedte/essen/gen-z-demo-nrw-essen-duesseldorf-koeln-ausschreitungen-polizei-id302190122.html", "DerWesten-Ticker, 31.10.");
const ZDFHEUTE = a("https://www.tiktok.com/@zdfheute/video/7703163964519173398", "ZDFheute-Video auf TikTok, 1.11.");
window.EREIGNISSE = [
  { von: "14:06", ort: "Kundgebung Konrad-Adenauer-Ufer", zeit_sicher: "genau", quelle: TAZ("14.06 Uhr"),
    text: "Etwa 20 Minuten vor Beginn sind erst „wenige hundert“ Menschen da" },
  { von: "15:30", ort: "Kundgebung Konrad-Adenauer-Ufer", zeit_sicher: "genau", quelle: TAZ("15.30 Uhr"),
    text: "Polizeisprecherin: Die Teilnehmerzahl liegt „deutlich“ unter den angemeldeten 15.000" },
  { von: "19:00", ort: "Thürmchenswall", zeit_sicher: "Reihenfolge", quelle: `${SZ_DPA}; ${TAZ_BERICHT}`,
    text: "Laut Polizeisprecherin am Abend zwei Umschließungen: rund 600 Personen in einem Abschnitt am Rheinufer, weitere 100 in einem anderen; Personalien werden aufgenommen (Uhrzeit nur „am Abend“)" },
  { von: "20:11", ort: "Thürmchenswall", zeit_sicher: "genau", quelle: DERWESTEN,
    text: "Laut Polizei „bis zu 700“ Menschen am Rheinufer festgesetzt, Personalien werden aufgenommen" },
  { von: "17:37", ort: "Weckschnapp", zeit_sicher: "genau", quelle: "Livestream A (Ton teils unverständlich, automatische Abschrift)",
    text: "Ein Polizist begründet auf Nachfrage im Livestream, warum die Menschen nicht nach Hause gehen können: Wenn aus dieser Personengruppe Straftaten begangen worden seien, sei die Polizei „verpflichtet, die Straftaten aufzuklären“" },
  { von: "13:00", ort: "Bastei", zeit_sicher: "ca.", quelle: TONLINE,
    text: "Etwa 30 Menschen an der Bastei, starke Polizeipräsenz zwischen Hbf und Kundgebungsort" },
  { von: "13:20", ort: "Kundgebung Konrad-Adenauer-Ufer", zeit_sicher: "genau", quelle: TAZ(),
    text: "Erst wenige hundert Menschen, Polizei personell zurückhaltend" },
  { von: "14:00", ort: "Bastei", zeit_sicher: "genau", quelle: TONLINE,
    text: "Offizieller Beginn, ca. 100 Demonstrierende an der Bastei" },
  { von: "13:45", ort: "Musical Dome", zeit_sicher: "genau", quelle: "Livestream B, Livestream A",
    text: "Sammlung am Musical Dome / ehem. Eisenbahndirektion, Hohenzollernbrücke im Blick" },
  { von: "14:06", ort: "Kundgebung Konrad-Adenauer-Ufer", zeit_sicher: "genau", quelle: TAZ(),
    text: "Es wird voll, einige tausend Menschen am Rheinufer, Parolen gegen Merz und Faschismus" },
  { von: "14:06", ort: "Musical Dome", zeit_sicher: "genau", quelle: "Livestream B, Livestream A",
    text: "Demozug startet am Ufer nach Norden, begleitet von Polizeiketten in Schutzausrüstung" },
  { von: "14:20", ort: "Kundgebung Konrad-Adenauer-Ufer", zeit_sicher: "genau", quelle: "Livestream A",
    text: "Kundgebung am Lautsprecherwagen südlich der Bastei beginnt" },
  { von: "14:06", ort: "Musical Dome", zeit_sicher: "genau", quelle: "Livestream B (unsicher, ob Panik)",
    text: "Mögliche Paniksituation: „Hey, warum rennen die jetzt auf einmal los da alle?“ – Bildprüfung: Leute gehen/rennen schnell über die Kreuzung zum Zug – eher Aufbruch als Panik." },
  { ansage: "polizei", von: "16:37", ort: "Weckschnapp", zeit_sicher: "genau", quelle: "Livestream A (unsicher, ob Panik)",
    text: "Mögliche Paniksituation: Flaschen und Farbbeutel fliegen („das fliegt jetzt langsam schon in unsere Richtung“), kurz darauf Durchsagen „Räumen Sie die Straße“. Bildprüfung: Polizeikette quer, Menge steht – keine Panik im Bild (evtl. außerhalb)." },
  { von: "17:24", ort: "Kreuzung KAU/Theodor-Heuss-Ring", zeit_sicher: "genau", quelle: "Livestream A und Livestream D (unsicher, ob Panik)",
    text: "Mögliche Paniksituation: Polizei schiebt die Solidaritätskundgebung weg („Gehen Sie jetzt zurück!“), Gruppen rennen („die rennen ja von einer Ecke zur anderen“). Bildprüfung: Streamer läuft selbst einer Gruppe hinterher (Bahnunterführung) – keine Panik in einer Menge erkennbar." },
  { von: "15:00", ort: "Kundgebung Konrad-Adenauer-Ufer", zeit_sicher: "Reihenfolge", quelle: TONLINE,
    text: "Pyrotechnik und Rauchtöpfe aus einer pro-palästinensischen Gruppe, Polizei positioniert sich daneben" },
  { von: "15:30", ort: "Kundgebung Konrad-Adenauer-Ufer", zeit_sicher: "genau", quelle: `${TAZ()} (Angabe der Polizei)`,
    text: "Polizei: Teilnehmerzahl „deutlich“ unter den angemeldeten 15.000" },
  { von: "15:29", ort: "Kundgebung Konrad-Adenauer-Ufer", zeit_sicher: "genau", quelle: "Einsendung (anonyme Ablage, KI), Handy-Zeitstempel",
    text: "Dichte Menge auf der Uferstraße bei der Haltestelle, rote und Palästina-Fahnen" },
  { von: "15:54", ort: "St. Vincenz-Haus", zeit_sicher: "genau", quelle: "Einsendung (anonyme Ablage, KI), Handy-Zeitstempel; Augenzeugenbericht",
    text: "Rauch über der Menge; viele Einsatzkräfte an der Straße. Über die kleine Seitenstraße am Vincenz-Haus werden Leute noch hinausgelassen" },
  { von: "16:00", ort: "St. Vincenz-Haus", zeit_sicher: "ca.", quelle: "Augenzeugenbericht",
    text: "Kessel wird geschlossen – die kleine Seitenstraße am Vincenz-Haus ist danach zu (früher als in anderen Quellen sichtbar)" },
  { ansage: "leitung", von: "16:00", ort: "Kundgebung Konrad-Adenauer-Ufer", zeit_sicher: "ca.", quelle: `${TONLINE}; ${TAZ()}; ${TAZ_BERICHT}`,
    text: "Versammlungsleiterin beendet die Kundgebung. Strittig: laut Versammlungsleiterin auf Druck der Polizei (Haftung für Gewalttaten), laut Polizeisprecher allein auf ihre Initiative" },
  { von: "16:30", ort: "Kundgebung Konrad-Adenauer-Ufer", zeit_sicher: "genau", quelle: `${TAZ()}; ${TONLINE}; ${WZ}`,
    text: "Wasserwerfer gegen Gruppen am Ufer, laut taz in die Menge; Polizei beginnt einzukesseln; mind. eine Festnahme" },
  { von: "15:24", ort: "Musical Dome", zeit_sicher: "genau", quelle: "Einsendung per Mail (Video, Handy-Zeitstempel), Blick von der Hohenzollernbrücke",
    text: "Mindestens zwei Polizeitransporter und ein Wasserwerfer (dunkles Fahrzeug) stehen auf der Uferstraße vor dem Musical Dome, wenige Personen auf der Promenade. Laut einsendender Person fährt der Wasserwerfer direkt danach zügig nach Norden (von der Brücke aus nach rechts) Richtung Kundgebung" },
  { von: "15:28", ort: "Kundgebung Konrad-Adenauer-Ufer", zeit_sicher: "genau", quelle: "Livestream A",
    text: "Roter Rauch auf dem Ufer südlich der Bastei" },
  { von: "16:36", ort: "Weckschnapp", zeit_sicher: "genau", quelle: "Livestream A",
    text: "Polizeiketten rücken auf der Fahrbahn vor; ab 16:38 Wasserwerfer und Räumpanzer sichtbar" },
  { von: "16:31", ort: "Weckschnapp", zeit_sicher: "ca.", quelle: `${WZ}; ${WDR}`,
    text: "Laut Innenministerium richtete sich der Wasserwerfer gegen „gewaltbereite Demonstranten“, die die Standkundgebung verlassen wollten; dpa: nach mehreren Böllern. WDR-Reporter (Aktuelle Stunde): Einsatz führte „sofort zur Eskalation“" },
  { von: "16:34", ort: "Weckschnapp", zeit_sicher: "genau", quelle: "Livestream A",
    text: "„Da stehen die Wasserwerfer, drei Stück!“; 16:37 „der tropft schon“; 16:41 Blick zur Zoobrücke: „da steht scheinbar auch alles voll“" },
  { ansage: "polizei", von: "16:41", ort: "Weckschnapp", zeit_sicher: "genau", quelle: "Livestream A",
    text: "Polizeidurchsagen: „Bitte räumen Sie die Straße … Begeben Sie sich auf den Gehweg“, 16:45 „Verlassen Sie die Fahrbahnen“; 16:47 Wasserwerfer zieht sich zurück" },
  { von: "17:12", ort: "Kreuzung KAU/Theodor-Heuss-Ring", zeit_sicher: "genau", quelle: "Livestream A",
    text: "Redner am Lautsprecher: „Macht die Kessel auf“; ab 17:14 Reden der spontanen Solidaritätskundgebung (u. a. aus Gewerkschaft und MLPD): „Wir bleiben hier stehen, bis ihr freigelassen werdet“" },
  { von: "16:40", ort: "Weckschnapp", zeit_sicher: "ca.", quelle: `TikTok-Video; ${AUF1}`,
    text: "Fluchtbewegung: Polizeikette rückt über den Rasen am Ufer vor, Wasserwerfer spritzen, Menge weicht schnell zur Seite aus" },
  { von: "16:45", ort: "Dagobertstraße", zeit_sicher: "ca.", quelle: "TikTok (zwei Clips mit Straßenschild Dagobertstr.)",
    text: "Fluchtbewegung: Räumpanzer und Wasserwerfer rücken vor, Rauch, Menge rennt weg, Polizei mit Helmen hinterher" },
  { von: "17:22", ort: "Kreuzung KAU/Theodor-Heuss-Ring", zeit_sicher: "genau", quelle: `${ZDFHEUTE} (Zeiteinblendung), Ort unsicher`,
    text: "ZDF-Reporter wird beim Polizeieinsatz umgerannt; 17:28 Live-Schalte" },
  { von: "16:49", ort: "Weckschnapp", zeit_sicher: "genau", quelle: "Livestream A",
    text: "Wasserwerfer K1 spritzt auf der Uferstraße (Vincenz-Haus/Weckschnapp). Ein TikTok mit Einblendung „16:30“ (Upload 16:43) zeigt schon nasse Fahrbahn und K2 im Einsatz – gespritzt wurde also wohl ab ca. 16:30, wie taz meldet" },
  { von: "16:57", ort: "Kundgebung Konrad-Adenauer-Ufer", zeit_sicher: "genau", quelle: "Livestream D",
    text: "Rauchwolke auf der Fahrbahn, Polizeifahrzeuge, umgeworfene Leihräder" },
  { von: "17:20", ort: "Weckschnapp", zeit_sicher: "ca.", quelle: "Livestream A",
    text: "Kessel bildet sich zwischen Weckschnapp und Vincenz-Haus; 17:49 Festnahme am Boden" },
  { von: "16:45", ort: "Thürmchenswall", zeit_sicher: "Reihenfolge", quelle: `${TONLINE} (Angabe der Polizei)`,
    text: "Gruppe von mehreren hundert Menschen bleibt am Thürmchenswall; weitere Festnahme nach Würfen auf Beamte" },
  { von: "17:00", ort: "Theodor-Heuss-Ring", zeit_sicher: "Reihenfolge", quelle: `${TONLINE}; ${ANTENNE}`,
    text: "Laut t-online und Antenne NRW sprach eine Sprecherin der Demonstrierenden auf der Kundgebung von Polizeigewalt: "
      + "Ein Eingekesselter soll von einem Beamten ins Gesicht geschlagen worden sein. Das ist nicht unabhängig bestätigt. "
      + "Eine Äußerung der Polizei dazu ist nicht bekannt (Stand 1.11.2026)." },
  { von: "17:24", ort: "Theodor-Heuss-Ring", zeit_sicher: "genau", quelle: TAZ("17:24"),
    text: "Dutzende Polizisten mit Schlagstöcken gehen auf Demonstrierende zu, Wasserwerfer rückt vor" },
  { von: "17:24", ort: "Hohe Straße", zeit_sicher: "genau", quelle: TAZ("17:24"),
    text: "Teil der Demo zieht in die Hohe Straße, entkommt teils durch eine Seitengasse" },
  { von: "17:15", ort: "Thürmchenswall", zeit_sicher: "ca.", quelle: `${POLIZEI_1}; ${POLIZEI_2}`,
    text: "Polizei: „polizeiliche Umschließung“ am Konrad-Adenauer-Ufer auf Höhe Thürmchenswall; Personalien von „knapp 1000 Personen einer Gruppe“ festgestellt, bis etwa 1.30 Uhr. 23 verletzte Polizisten in der gesamten Nacht; sichergestellt u. a. Molotow-Cocktails, Stichwaffen, Pyrotechnik" },
  { von: "17:20", ort: "Kreuzung KAU/Theodor-Heuss-Ring", zeit_sicher: "ca.", quelle: "Augenzeugenbericht",
    text: "Während ca. 400 Menschen eingekesselt sind, wird verbal eine 2. Kundgebung angekündigt (ohne echte Kooperation mit der Polizei). Sie steht beim 2. Kessel an der Kreuzung und geht fließend in eine Solidaritätskundgebung über, u. a. mit einer pro-palästinensischen Gruppe" },
  { ansage: "polizei", von: "17:29", ort: "Kreuzung KAU/Theodor-Heuss-Ring", zeit_sicher: "genau", quelle: `Livestream A; ${TAZ("17:40")}`,
    text: "Polizeidurchsage „Die Versammlung ist aufgelöst“ – die Solidaritätskundgebung wird nach ca. 15 min aufgelöst; ab 17:24 schiebt die Polizei sie weg, danach Fahrbahn bis zur Bastei geräumt. 17:28 Drohne über der Szene" },
  { von: "18:00", ort: "Hohe Straße", zeit_sicher: "Reihenfolge", quelle: `${TONLINE} (Video)`,
    text: "Böller bei Polizeieinsatz vor dem MediaMarkt" },
  { von: "19:00", ort: "Kundgebung Konrad-Adenauer-Ufer", zeit_sicher: "ca.", quelle: `${TONLINE}; ${ANTENNE} (Angaben der Polizei)`,
    text: "Kessel mit mehreren hundert Menschen, Personalienfeststellung, Wasser und mobile Toiletten" },
  { von: "20:53", ort: "Domplatte", zeit_sicher: "genau", quelle: "Livestream D LIVE",
    text: "Polizeikette in Schutzausrüstung vor dem Dom-Westportal; 20:56 Menge in schneller Bewegung (Räumung?)" },
  { von: "21:03", ort: "Hohe Straße", zeit_sicher: "genau", quelle: "Livestream D LIVE",
    text: "Polizeitransporter auf Hohe Straße und Schildergasse, viele Läden vernagelt" },
  { von: "22:03", ort: "Domplatte", zeit_sicher: "ca.", quelle: "Livestream D LIVE",
    text: "Viele junge Leute an der Kreuzung Komödienstraße/Trankgasse, 22:07 Polizeikette quer auf der Fahrbahn" },
  { von: "20:30", ort: "Domplatte", zeit_sicher: "Reihenfolge", quelle: `${TONLINE}; ${BILD}`,
    text: "Parolen und Feuerwerk am Dom, Blockadeversuche mit E-Scootern; Domplatte nach Flaschenwürfen geräumt" },
];
})();
