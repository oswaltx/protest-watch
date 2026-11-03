#!/usr/bin/env python3
# Fasst die verorteten Clip-Szenen (szene/clips/<id>.json) zu szene/kameras.js zusammen.
# Nur Szenen mit Koordinaten und Zeitfenster; Zeiten "HH:MM" = Ortszeit 31.10.2026.
# Aufruf aus dem Projektordner: python3 -I skripte/kameras_fuer_szene.py
import glob, json, os
from datetime import datetime
from zoneinfo import ZoneInfo

basis = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
berlin = ZoneInfo("Europe/Berlin")
videos = {v["id"]: v for v in json.loads(
    open(os.path.join(basis, "szene/videos.js")).read().split("=", 1)[1].rstrip().rstrip(";"))}


def uhr(hhmm):
    if not hhmm or ":" not in str(hhmm):
        return None
    h, m = str(hhmm).split(":")[:2]
    return int(datetime(2026, 10, 31, int(h), int(m), tzinfo=berlin).timestamp())


kameras, ohne = [], 0
for f in sorted(glob.glob(os.path.join(basis, "szene/clips/*.json"))):
    clip = json.load(open(f))
    v = videos.get(clip.get("id"))
    if not v:
        continue
    for s in clip.get("szenen", []):
        von, bis = uhr(s.get("zeit_von")), uhr(s.get("zeit_bis"))
        if s.get("lat") is None or s.get("lon") is None or von is None:
            ohne += 1
            continue
        kameras.append({
            "id": v["id"], "kanal": v["kanal"], "datei": v["datei"], "url": v["url"],
            "sek_von": s.get("sek_von", 0), "sek_bis": s.get("sek_bis"),
            "lat": s["lat"], "lon": s["lon"], "blick": s.get("blick"), "hoehe": s.get("hoehe"),
            "von": von, "bis": max(bis or von, von + 60),
            "ort": s.get("ort", ""), "ort_sicher": s.get("ort_sicher"), "zeit_sicher": s.get("zeit_sicher"),
            "inhalt": s.get("inhalt", ""), "ort_grund": s.get("ort_grund", ""), "zeit_grund": s.get("zeit_grund", ""),
        })

# Korrekturen der Sitzung Verortung (szene/kameras-korrektur.json): Orte, die im Rhein oder in Gebäuden lagen
korrektur = os.path.join(basis, "szene/kameras-korrektur.json")
if os.path.exists(korrektur):
    neu = {(k["id"], k["sek_von"], k["sek_bis"]): k for k in json.load(open(korrektur))["kameras"]}
    n = 0
    for k in kameras:
        c = neu.get((k["id"], k["sek_von"], k["sek_bis"]))
        if c and abs(k["lat"] - c["alt"]["lat"]) < 1e-6 and abs(k["lon"] - c["alt"]["lon"]) < 1e-6:
            k.update(lat=c["neu"]["lat"], lon=c["neu"]["lon"], ort_sicher=c["neu"]["ort_sicher"])
            k["ort_grund"] += f" Korrigiert ({c['regel']}): lag im {c['lag_in']}, um {c['verschiebung_m']} m verschoben."
            n += 1
    print(f"{n} Kameraorte korrigiert")

# Im Rendering eingepasste Kameraposen (szene/kameras-verfeinert.json) gehen vor: Ort und Blickrichtung der Szene,
# in der die eingepasste Sekunde liegt
verfeinert = os.path.join(basis, "szene/kameras-verfeinert.json")
if os.path.exists(verfeinert):
    RICHTUNGEN = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"]
    n = 0
    for e in json.load(open(verfeinert))["kameras"]:
        for k in kameras:
            if k["id"] == e["id"] and k["sek_von"] <= e["sek"] <= (k["sek_bis"] if k["sek_bis"] is not None else k["sek_von"]):
                k.update(lat=e["lat"], lon=e["lon"], ort_sicher="hoch")
                if e.get("kurs_grad") is not None:
                    k["blick"] = RICHTUNGEN[round(e["kurs_grad"] / 45) % 8]
                u = e.get("unsicherheit_m", {})
                k["ort_grund"] += (f" Kamerapose im Rendering eingepasst (Sekunde {e['sek']}, ±{u.get('laengs', '?')} m längs,"
                                   f" ±{u.get('quer', '?')} m quer).")
                n += 1
    print(f"{n} eingepasste Kameraposen übernommen")

with open(os.path.join(basis, "szene/kameras.js"), "w") as fh:
    fh.write("// Automatisch erzeugt von skripte/kameras_fuer_szene.py, nicht von Hand ändern.\n")
    fh.write("window.KAMERAS = " + json.dumps(kameras, ensure_ascii=False) + ";\n")
print(f"{len(kameras)} Kamera-Szenen, {ohne} ohne Ort oder Zeit übersprungen")
