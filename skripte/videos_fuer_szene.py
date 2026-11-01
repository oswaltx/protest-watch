#!/usr/bin/env python3
# Erzeugt szene/videos.js: jedes Video mit Zeitfenster für die Zeitachse.
# Livestreams: Start = release_timestamp, Ende = Start + Dauer (genau bis auf Unterbrechungen).
# Andere Videos: nur Uploadzeit bekannt = spätester Aufnahmezeitpunkt.
# Handangaben aus quellen.csv (Spalte aufnahmezeit, Format HH:MM) haben Vorrang.
# Aufruf aus dem Projektordner: python3 -I skripte/videos_fuer_szene.py
import csv, glob, json, os

basis = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
hand = {}
with open(os.path.join(basis, "quellen.csv"), newline="") as fh:
    for z in csv.DictReader(fh):
        if z["aufnahmezeit"]:
            hand[z["datei"]] = z

videos = []
for info in sorted(glob.glob(os.path.join(basis, "rohmaterial/videos/**/*.info.json"), recursive=True)):
    stamm = info[: -len(".info.json")]
    datei = next((stamm + e for e in (".mp4", ".webm") if os.path.exists(stamm + e)), None)
    if not datei:
        continue
    d = json.load(open(info))
    rel = os.path.relpath(datei, basis)
    v = {
        "id": d["id"],
        "datei": rel,
        "kanal": d.get("channel") or d.get("uploader"),
        "titel": (d.get("title") or d.get("description") or "")[:140],
        "url": d.get("webpage_url"),
        "dauer": d.get("duration") or 0,
        "hochkant": (d.get("height") or 0) > (d.get("width") or 1),
        "folgende": d.get("channel_follower_count"),  # Reichweite: ab 10.000 erscheint der Kanalname öffentlich
        "plattform": next((n for p, n in (("tiktok", "tiktok"), ("instagram", "instagram"), ("youtu", "youtube"),
                                ("t.me/", "telegram"), ("zdf.de", "zdf")) if p in (d.get("webpage_url") or "")), "web"),
    }
    if d.get("was_live") and d.get("release_timestamp"):
        v["art"] = "live"
        v["start"] = d["release_timestamp"]
        v["ende"] = d["release_timestamp"] + v["dauer"]
    else:
        v["art"] = "clip"
        v["spaetestens"] = d.get("timestamp")
    if rel in hand:
        v["hand"] = {k: hand[rel][k] for k in ("aufnahmezeit", "zeit_sicherheit", "ort", "blickrichtung") if hand[rel][k]}
    videos.append(v)

ziel = os.path.join(basis, "szene/videos.js")
with open(ziel, "w") as fh:
    fh.write("// Automatisch erzeugt von skripte/videos_fuer_szene.py, nicht von Hand ändern.\n")
    fh.write("window.VIDEOS = " + json.dumps(videos, ensure_ascii=False, indent=1) + ";\n")
print(f"{len(videos)} Videos, davon {sum(v['art'] == 'live' for v in videos)} Livestreams -> {ziel}")
