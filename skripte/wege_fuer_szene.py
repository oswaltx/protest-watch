#!/usr/bin/env python3
# Fasst die Wegpunkte der Livestreamer (szene/wege/<id>*.json) zu szene/wege.js zusammen.
# Uhrzeit je Bild = Streamstart (release_timestamp aus .info.json) + (bild-1)*60 s + 30 s.
# Die 30 s: Der fps-Filter in uebersicht.sh nimmt pro Minute das Bild aus der Minutenmitte
# (geprüft an Livestream A, Bild 10 = Sekunde ~569, nicht 540).
# Aufruf aus dem Projektordner: python3 -I skripte/wege_fuer_szene.py
import glob, json, os, re

basis = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FARBEN = ["#ff4d4d", "#4dd2ff", "#b4ff4d", "#ffb84d", "#d24dff", "#4dffb8"]

infos = {}
for f in glob.glob(os.path.join(basis, "rohmaterial/videos/*LIVE*.info.json")):
    d = json.load(open(f))
    video = f[: -len(".info.json")] + ".mp4"
    infos[d["id"]] = {"start": d["release_timestamp"], "kanal": d["channel"],
                      "datei": os.path.relpath(video, basis)}

teile = {}
for f in sorted(glob.glob(os.path.join(basis, "szene/wege/*.json"))):
    vid = re.sub(r"_teil\d+$", "", os.path.basename(f)[: -len(".json")])
    teile.setdefault(vid, []).extend(json.load(open(f)))

wege = []
for i, (vid, eintraege) in enumerate(sorted(teile.items())):
    if vid not in infos:
        print(f"übersprungen, kein Livestream bekannt: {vid}")
        continue
    info = infos[vid]
    punkte = []
    for e in sorted(eintraege, key=lambda e: e["bild"]):
        if e.get("lat") is None or e.get("lon") is None:
            continue
        punkte.append({"t": info["start"] + (e["bild"] - 1) * 60 + 30, "lat": e["lat"], "lon": e["lon"],
                       "sicher": e.get("sicher"), "blick": e.get("blick"),
                       "szene": e.get("szene", ""), "grund": e.get("grund", "")})
    wege.append({"id": vid, "kanal": info["kanal"], "datei": info["datei"], "start": info["start"],
                 "farbe": FARBEN[i % len(FARBEN)], "bilder": len(eintraege), "punkte": punkte})
    print(f"{vid} {info['kanal']}: {len(punkte)}/{len(eintraege)} Bilder verortet")

# Korrekturen der Sitzung Verortung (szene/kameras-korrektur.json): Wegpunkte, die im Rhein oder in Gebäuden lagen
korrektur = os.path.join(basis, "szene/kameras-korrektur.json")
if os.path.exists(korrektur):
    neu = {(w["id"], w["t"]): w for w in json.load(open(korrektur))["wege"]}
    n = 0
    for w in wege:
        for p in w["punkte"]:
            c = neu.get((w["id"], p["t"]))
            if c and abs(p["lat"] - c["alt"]["lat"]) < 1e-6 and abs(p["lon"] - c["alt"]["lon"]) < 1e-6:
                p.update(lat=c["neu"]["lat"], lon=c["neu"]["lon"], sicher=c["neu"]["sicher"])
                p["grund"] += f" Korrigiert ({c['regel']}): lag im {c['lag_in']}, um {c['verschiebung_m']} m verschoben."
                n += 1
    print(f"{n} Wegpunkte korrigiert")

with open(os.path.join(basis, "szene/wege.js"), "w") as fh:
    fh.write("// Automatisch erzeugt von skripte/wege_fuer_szene.py, nicht von Hand ändern.\n")
    fh.write("window.WEGE = " + json.dumps(wege, ensure_ascii=False) + ";\n")
