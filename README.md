# Protest-Watch: Gen-Z-Demo Köln, 31.10.2026

Eine begehbare 3D-Karte der Demonstration am 31. Oktober 2026 in Köln, mit Zeitachse von 12 bis 23 Uhr.
Sie führt öffentlich zugängliche Videos, Livestreams und Medienberichte an einem Ort zusammen:
Was ist wann wo passiert, und welche Aufnahme zeigt es?

**Karte:** https://protest-watch.org/karte/ · **Material einreichen:** https://protest-watch.org/einreichen/

## Was die Karte zeigt

- **Ereignisse** aus Medienberichten und Polizeimeldungen, mit Quelle und Angabe, wie genau die Uhrzeit ist.
- **Laufwege von Livestreams**, Minute für Minute aus dem Bild verortet, pseudonym („Livestream A–D“), nur im
  Demo-Gebiet und im Zeitfenster des jeweiligen Streams; die Orte sind aus den Videos geschätzt (Genauigkeit je Punkt angegeben). Klick auf den Punkt öffnet den Stream an der passenden Stelle;
  Stream und Zeitachse laufen gekoppelt.
- **Verortete Clips**: Kamerastandort und Blickrichtung je Szene, mit Zeitfenster.
- **Menge, Polizei und Fahrzeuge** als simulierte Punkte (nah als Figuren) und als Diagramm über den Tag.

## Wie belastbar ist das?

Die Karte ist eine **Rekonstruktion**, kein Messergebnis.

- Die Punkte der Menge sind eine Simulation, die geschätzte Personenzahlen auf die Flächen verteilt, auf denen
  Videos und Berichte Menschen zeigen. Sie sind keine gezählten Personen und keine echten Positionen.
- Eine offizielle Gesamtzahl der eingesetzten Polizei gibt es nicht. Die Polizeizahlen sind aus sichtbaren Ketten
  und Fahrzeugen geschätzt.
- Jede Angabe aus Medien oder von der Polizei ist mit Link und Datum belegt.
- Jede Verortung und jede Uhrzeit hat eine Sicherheitsangabe (hoch, mittel, niedrig). Die Begründung steht
  jeweils dabei.
- Stand der Daten: 1.11.2026.

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
seite/            Startseite und Impressum/Datenschutz (protest-watch.org/)
karte/            die Karte (statisch, CesiumJS; protest-watch.org/karte/)
  index.html, app.js
  ereignisse.js   Ereignisse aus Medienberichten
  orte.js         benannte Orte
  videos.js       Livestreams und Clips (Metadaten und Links)
  kameras.js      verortete Szenen der Clips
  wege.js         Laufwege der Livestreamer
  mengen.json     Eingabe der Mengensimulation (Zahlen, Flächen, Zeitpunkte, Quellen)
  menge.js        berechnete Wege der simulierten Personen
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
- `gebaeude.js` und die Kartenkacheln: © OpenStreetMap-Mitwirkende, ODbL.
- CesiumJS: Apache 2.0, wird mit `skripte/cesium_holen.sh` geladen (mit eigener LICENSE).
- Die eingebetteten Videos gehören ihren Urheberinnen und Urhebern und stehen unter den Bedingungen der jeweiligen Plattform.
