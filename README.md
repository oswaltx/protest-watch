# Protest-Watch: Gen-Z-Demo Köln, 31.10.2026

Eine begehbare 3D-Karte der Demonstration am 31. Oktober 2026 in Köln, mit Zeitachse von 12 bis 23 Uhr.
Sie führt öffentlich zugängliche Videos, Livestreams und Medienberichte an einem Ort zusammen:
Was ist wann wo passiert, und welche Aufnahme zeigt es?

**Karte:** https://protest-watch.org/karte/ · **Quellen:** https://protest-watch.org/quellen/ ·
**Material einreichen:** https://protest-watch.org/einreichen/ · **Kontakt (auch Presse):** protest-watch@pm.me

## Was die Karte zeigt

- **Ereignisse** aus Medienberichten und Polizeimeldungen, mit Quelle und Angabe, wie genau die Uhrzeit ist.
- **Laufwege von Livestreams**, Minute für Minute aus dem Bild verortet, pseudonym („Livestream A–D“), nur im
  Demo-Gebiet und im Zeitfenster des jeweiligen Streams; die Orte sind aus den Videos geschätzt (Genauigkeit je Punkt angegeben). Klick auf den Punkt öffnet den Stream an der passenden Stelle;
  Stream und Zeitachse laufen gekoppelt.
- **Verortete Clips**: Kamerastandort und Blickrichtung je Szene, mit Zeitfenster.
- **Menge, Polizei und Fahrzeuge** wahlweise als simulierte Punkte, als **gezählte Dichte** oder beides,
  dazu ein Diagramm über den Tag.
  - *Punkte*: geschätzte Zahlen, auf die Flächen verteilt, auf denen Videos und Berichte Menschen zeigen. Die Leute
    gehen in normalem Tempo über Straßen und Plätze von Ort zu Ort; Fahrzeuge fahren nur auf Fahrbahnen.
  - *Dichte*: Menschen pro m², in öffentlichen Videobildern gezählt (Zählmodell ZIP, Tiefenschätzung
    Depth Anything V2), zu sieben Zeitpunkten auf einem 15-m-Raster, mit 68-%-Intervall. Wo kein Feld ist, hat
    keine Kamera hingesehen. Methode: `dokumentation/dichte-methode.md` (im Arbeitsrepo, auf Anfrage).
- **Aus Videos verortet**: Wasserwerfer und Polizeiketten, deren Lage aus Kamerastandort und bekannten Größen im
  Bild bestimmt wurde, mit Unsicherheitskreis (±3 bis 25 m).
- **Schlichte Karte**: weißer Grund, Rhein, Straßen, Gleise und die beiden Brücken aus OpenStreetMap; der bunte
  Stadtplan lässt sich zuschalten.

## Wie belastbar ist das?

Die Karte ist eine **Rekonstruktion**, kein Messergebnis.

- Die Punkte der Menge sind eine Simulation, die geschätzte Personenzahlen auf die Flächen verteilt, auf denen
  Videos und Berichte Menschen zeigen. Sie sind keine gezählten Personen und keine echten Positionen.
- Eine offizielle Gesamtzahl der eingesetzten Polizei gibt es nicht. Die Polizeizahlen sind aus sichtbaren Ketten
  und Fahrzeugen geschätzt.
- Jede Angabe aus Medien oder von der Polizei ist mit Link und Datum belegt.
- Jede Verortung und jede Uhrzeit hat eine Sicherheitsangabe (hoch, mittel, niedrig). Die Begründung steht
  jeweils dabei.
- Die gezählte Dichte ist eine zweite, unabhängige Schätzung. In den gefilmten Bereichen zählt sie meist mehr
  Menschen als die Simulation (etwa um 14:20 rund 3.360, Spanne 3.110–3.800, nur im gefilmten Ausschnitt).
- Stand der Daten: 3.11.2026.

## Für Journalistinnen und Journalisten

- **Zitieren und Screenshots** sind ausdrücklich erwünscht, mit Nennung „Rekonstruktion: Protest-Watch,
  protest-watch.org; Kartendaten © OpenStreetMap-Mitwirkende“. Bitte die Kennzeichnung als Rekonstruktion bzw.
  Simulation mitnehmen.
- **Belegt** ist, was in der Karte mit Quelle verlinkt ist (Medien, Polizei, Innenministerium) und was aus Videos
  verortet ist (mit Unsicherheit). **Geschätzt** sind Mengen, Polizeistärken, Wege und Fahrzeuge ohne Video-Beleg.
- Einen bestimmten Moment teilen: in der Karte unter „Mehr“ → „🔗 Link zu diesem Moment“.
- Alle verwendeten Quellen: https://protest-watch.org/quellen/.
- Rückfragen, Korrekturen, Hinweise: protest-watch@pm.me.

## Mitmachen

- **Öffentliche Quellen** (Links zu Videos, Streams, Berichten) und **Korrekturen**: [Issue öffnen](https://github.com/oswaltx/protest-watch/issues/new/choose).
  Issues sind **öffentlich**, mit deinem GitHub-Konto verknüpft und werden auch außerhalb von GitHub kopiert und archiviert. Wer mitliest, sieht also, dass du dich mit der Demo befasst. Willst du das nicht, nutze die [Einreichseite](https://protest-watch.org/einreichen/), dort geht es auch anonym. Bitte nur Links zu schon öffentlich gepostetem Material. Lade keine Fotos oder Videos hoch und nenne keine Namen, Kennzeichen oder Dienstnummern. Beiträge mit Angaben zu anderen Personen lösche ich. Entfernen lassen: protest-watch@pm.me.
- **Eigenes Material oder anonym**: [Einreichseite](https://protest-watch.org/einreichen/), oder in der Karte „⚑ Melden“.
- **Entfernen-Wünsche**: per Mail an protest-watch@pm.me, nicht als Issue.

## Videos

Die Karte enthält keine Kopien von Videos. Sie bettet nur öffentlich gepostete Originale über die offiziellen
Einbett-Funktionen der Plattformen ein (YouTube, TikTok, Instagram, Telegram) und lädt sie erst nach einem Klick;
Mediathek-Beiträge sind verlinkt. Eingesandtes Material wird auf der Karte nicht gezeigt. Aus Einsendungen stammen nur Zeit- und Ortsangaben und kurze Beschreibungen des Geschehens, ohne erkennbare Personen und ohne Angaben, die die Einsendenden erkennbar machen.

Kanalnamen stehen nur auf der Karte bei Medienhäusern und Organisationen sowie bei regelmäßig berichtenden Kanälen
mit mindestens 10.000 Abonnierenden; keine Minderjährigen, keine privaten Konten. Alle anderen erscheinen als
„Video (Plattform)“, ihren Namen zeigt erst der Player nach dem Klick. Livestreams, deren Weg auf der Karte
verfolgt werden kann, sind pseudonym („Livestream A–D“), solange die Betreibenden nicht zugestimmt haben. Wird ein Original gelöscht,
verschwindet es auch hier, Ort und Zeit der Szene bleiben stehen.

## Keine Identifizierung

Das Projekt identifiziert keine Personen, weder Demonstrierende noch Polizeibeamte. Die Daten enthalten keine
Namen, Gesichter oder Beschreibungen einzelner Menschen. Wer sich auf der Karte oder in einem eingebetteten
Video wiederfindet und das nicht möchte, schreibt an protest-watch@pm.me; ich prüfe das innerhalb von 3 Tagen.
Vorwürfe stehen nur mit benannter Medienquelle auf der Karte und sind als unbestätigt gekennzeichnet.

## Aufbau

```
seite/            Startseite, Quellenliste (quellen/), Impressum/Datenschutz (protest-watch.org/)
karte/            die Karte (statisch, CesiumJS; protest-watch.org/karte/)
  index.html, app.js
  ereignisse.js   Ereignisse aus Medienberichten
  orte.js         benannte Orte
  videos.js       Livestreams und Clips (Metadaten und Links)
  kameras.js      verortete Szenen der Clips
  wege.js         Laufwege der Livestreamer
  mengen.json     Eingabe der Mengensimulation (Zahlen, Flächen, Zeitpunkte, Quellen)
  menge.js        berechnete Wege der simulierten Personen
  dichte-flaechen.json  gezählte Dichte, auf Straßen und Plätze zugeschnitten
  objekte-verortet.json aus Videos verortete Fahrzeuge und Polizeiketten
  grundkarte.js   schlichte Karte: Wasser, Straßen, Gleise, Brücken (OpenStreetMap)
  gebaeude.js     Gebäude aus OpenStreetMap
skripte/          Erzeugung der Daten (brauchen die nicht veröffentlichten Rohdaten,
                  außer menge_berechnen.py, das nur mengen.json und OSM-Daten liest)
```

Über „✎ Einzeichnen“ können Besuchende Fahrzeuge, Gruppen und Zonen einsenden. Ein Dienst auf dem Server
nimmt sie an, verschlüsselt sie sofort und speichert keine IP-Adressen; auf die Karte kommt nichts automatisch.

Auf dem Server zählt ein kleiner Dienst die Seitenaufrufe anonym (Tagessummen, ohne Skript, Cookies oder
gespeicherte IP-Adressen). Die Hintergrundkarte kommt über einen eigenen Kachel-Cache (`/osm/`), damit beim Aufruf keine IP-Adressen an
Dritte gehen; der lokale Testserver reicht diese Anfragen an OpenStreetMap durch.

Lokal ansehen:

```bash
skripte/cesium_holen.sh
python3 skripte/server.py 8000
```

Dann http://localhost:8000 öffnen. Die Karte braucht einen Browser mit WebGL.

## Lizenzen

- Code: MIT, siehe `LICENSE`.
- Daten (Ereignisse, Orte, Verortungen, Mengen): CC BY 4.0, Namensnennung „Protest-Watch, protest-watch.org“.
  Zitate aus Medien und Streams sind von der CC-Lizenz ausgenommen.
- `gebaeude.js`, `grundkarte.js` und die Kartenkacheln: © OpenStreetMap-Mitwirkende, ODbL.
- CesiumJS: Apache 2.0, wird mit `skripte/cesium_holen.sh` geladen (mit eigener LICENSE).
- Die eingebetteten Videos gehören ihren Urheberinnen und Urhebern und stehen unter den Bedingungen der jeweiligen Plattform.
