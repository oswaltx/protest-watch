#!/usr/bin/env python3
# Berechnet aus szene/mengen.json die Wege der einzelnen Personen -> szene/menge.js.
# Pro Zeitpunkt werden die Personen in den Teilflächen verteilt, ohne Gebäude und Wasser
# (OpenStreetMap, suche/osm/building.json und wasser.json). Zwischen zwei Zeitpunkten ordnet
# eine optimale Zuordnung (kürzeste Gesamtwege) die Personen einander zu. Überzählige gehen zum
# nächsten Zugang und verschwinden dort, neue kommen vom nächsten Zugang.
# Aufruf: .venv/bin/python skripte/menge_berechnen.py [--stadt NAME]
# Andere Städte (staedte/NAME/stadt.json): Ursprung = "bezug", Rasterausschnitt = "ausschnitt", Achse für die Formen
# korridor/laengs/linie = "achse" (Straßennamen, Richtung lat = Süd→Nord wie das KAU, lon = West→Ost wie der Mainkai;
# "rechts" ist rechts von der Achsrichtung), Uhrzeiten vor "nacht_bis" gehören zum Folgetag.
import json, math, os, sys
from datetime import datetime
from zoneinfo import ZoneInfo

import base64

import numpy as np
from scipy.optimize import linear_sum_assignment
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import polygonize, unary_union
from shapely.validation import make_valid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stadt import angaben, basis_fuer

basis = basis_fuer(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STADT = angaben(basis)  # leer für Köln
berlin = ZoneInfo("Europe/Berlin")
LAT0, LON0 = 50.9460, 6.9630  # Ursprung der lokalen Meter-Koordinaten
if STADT:
    LAT0, LON0 = STADT["bezug"]["lat"], STADT["bezug"]["lon"]
NACHT_BIS = STADT.get("nacht_bis")
MX = 111320 * math.cos(math.radians(LAT0))
MY = 110574


def lokal(lat, lon):
    return ((lon - LON0) * MX, (lat - LAT0) * MY)


def uhr(hhmm):
    h, m = map(int, hhmm.split(":"))
    tag = 1 if NACHT_BIS is not None and h < NACHT_BIS else 0  # nach Mitternacht = 1.11.
    return int(datetime(2026, 10, 31, h, m, tzinfo=berlin).timestamp()) + tag * 86400


def osm(datei):
    return json.load(open(os.path.join(basis, "suche/osm", datei)))["elements"]


# ---------- Hindernisse ----------
flaechen = []
def blockiert_tags(t):
    """Unterirdisches, reine Dächer und Überbauungen sind keine Hindernisse am Boden (z. B. unter der Domplatte)."""
    if t.get("building") in ("roof", "carport") or t.get("location") == "underground" or t.get("tunnel"):
        return False
    try:
        return int(t.get("layer", 0)) >= 0 and int(t.get("building:min_level", t.get("min_level", 0))) == 0
    except ValueError:
        return True


for e in osm("building.json") + osm("wasser.json"):
    if not blockiert_tags(e.get("tags", {})):
        continue
    if e["type"] == "way" and "geometry" in e and len(e["geometry"]) >= 4:
        g = [lokal(p["lat"], p["lon"]) for p in e["geometry"]]
        if g[0] == g[-1]:
            p = Polygon(g)
            if p.is_valid and p.area > 2:
                flaechen.append(p)
    elif e["type"] == "relation":  # Multipolygon (Rhein): äußere Linien zusammensetzen
        linien = [LineString([lokal(p["lat"], p["lon"]) for p in m["geometry"]])
                  for m in e.get("members", []) if m.get("role") == "outer" and m.get("geometry")]
        flaechen.extend(polygonize(unary_union(linien)))
# Steile Flächen aus dem DGM1 (Böschung am Ufer, Mauern; skripte/boeschung_bauen.py): dort steht niemand,
# Treppen sind ausgespart
boeschung = os.path.join(basis, "suche", "boeschung.json")
if os.path.exists(boeschung):
    for aussen, loecher in json.load(open(boeschung))["umrisse"]:
        p = Polygon([lokal(lat, lon) for lon, lat in zip(aussen[0::2], aussen[1::2])],
                    [[lokal(lat, lon) for lon, lat in zip(l[0::2], l[1::2])] for l in loecher])
        flaechen.append(make_valid(p))
hindernis = make_valid(unary_union([make_valid(f) for f in flaechen]))

# ---------- Mittellinie der Achse (Köln: Konrad-Adenauer-Ufer) ----------
# ys = Längskoordinate (Köln: Nord in m), xs = Querlage der Mitte (Köln: Ost in m); für eine West-Ost-Achse vertauscht
ACHSE = STADT.get("achse") or {"strassen": ["Konrad-Adenauer-Ufer"], "highway": ["primary", "primary_link"],
                               "datei": "strassen.json", "richtung": "lat"}
L = 1 if ACHSE["richtung"] == "lat" else 0   # Index der Längskoordinate in lokal()
knoten = [lokal(p["lat"], p["lon"]) for e in osm(ACHSE["datei"])
          if e.get("tags", {}).get("name") in ACHSE["strassen"]
          and e["tags"].get("highway") in ACHSE["highway"] for p in e["geometry"]]
knoten = np.array(sorted(knoten, key=lambda k: k[L]))
# alle 10 m in Achsrichtung die mittlere Querlage (beide Fahrbahnen gemittelt)
ys = np.arange(knoten[:, L].min(), knoten[:, L].max(), 10)
xs = np.array([knoten[np.abs(knoten[:, L] - y) < 15, 1 - L].mean() if np.any(np.abs(knoten[:, L] - y) < 15) else np.nan
               for y in ys])
ok = ~np.isnan(xs)
ys, xs = ys[ok], np.convolve(xs[ok], np.ones(5) / 5, mode="same")


def mitte(y):
    x = np.interp(y, ys, xs)
    dx = np.interp(y + 5, ys, xs) - np.interp(y - 5, ys, xs)
    if L == 1:
        t = np.array([dx, 10.0]) / math.hypot(dx, 10.0)  # Richtung nach Norden
        n = np.array([t[1], -t[0]])                       # quer, nach Osten (Rhein)
        return np.array([x, y]), n
    t = np.array([10.0, dx]) / math.hypot(dx, 10.0)      # Richtung nach Osten
    n = np.array([t[1], -t[0]])                           # quer, rechts davon = nach Süden (Main)
    return np.array([y, x]), n


def laenge_m(wert):
    """Achsposition in Grad (Köln: Breite, West-Ost-Achse: Länge) → Längskoordinate in m."""
    return lokal(wert, LON0)[1] if L == 1 else lokal(LAT0, wert)[0]


def korridor(lat_von, lat_bis, links, rechts):
    y0, y1 = laenge_m(lat_von), laenge_m(lat_bis)
    rand_l, rand_r = [], []
    for y in np.linspace(y0, y1, 20):
        m, n = mitte(y)
        rand_l.append(tuple(m + n * links))
        rand_r.append(tuple(m + n * rechts))
    return make_valid(Polygon(rand_l + rand_r[::-1]))


# Weitere Städte: Strecken und Routen folgen dem Straßennetz (skripte/strassen_route.py) statt der Luftlinie;
# "luftlinie": true an einer Strecke/Markierung behält die gerade Verbindung. Köln bleibt unverändert.
NETZ = None
if STADT and os.path.exists(os.path.join(basis, "suche", "osm", "strassen-gross.json")):
    from strassen_route import Netz
    NETZ = Netz(basis)
_ROUTEN = {}


def strassenweg(punkte, meldung=""):
    schluessel = json.dumps(punkte)
    if schluessel not in _ROUTEN:
        _ROUTEN[schluessel] = NETZ.route(punkte, meldung)
    return _ROUTEN[schluessel]


def form(schritt):
    if "korridor" in schritt:
        return korridor(*schritt["korridor"])
    if "kreis" in schritt:
        lat, lon, r = schritt["kreis"]
        return Point(lokal(lat, lon)).buffer(r)
    if "ring" in schritt:
        return korridor(*schritt["ring"]).convex_hull.exterior
    if "strecke" in schritt:  # Band entlang einer Strecke: [lat1, lon1, lat2, lon2, breite_m]
        lat1, lon1, lat2, lon2, breite = schritt["strecke"]
        if NETZ and not schritt.get("luftlinie"):
            linie = strassenweg([[lat1, lon1], [lat2, lon2]], "Strecke")
            return LineString([lokal(a, b) for a, b in linie]).buffer(breite / 2, cap_style="flat", join_style="round")
        return LineString([lokal(lat1, lon1), lokal(lat2, lon2)]).buffer(breite / 2, cap_style="flat")
    if "laengs" in schritt:  # Kette entlang des KAU in festem Abstand: [lat_von, lat_bis, abstand_m]
        lat0, lat1, ab = schritt["laengs"]
        y0, y1 = laenge_m(lat0), laenge_m(lat1)
        return LineString([tuple(mitte(y)[0] + mitte(y)[1] * ab) for y in np.linspace(y0, y1, 30)])
    if "ring_kreis" in schritt:
        lat, lon, r = schritt["ring_kreis"]
        return Point(lokal(lat, lon)).buffer(r).exterior
    if "linie" in schritt:
        lat, links, rechts = schritt["linie"]
        m, n = mitte(laenge_m(lat))
        return LineString([tuple(m + n * links), tuple(m + n * rechts)])
    raise ValueError(schritt)


def verteile(geo, anzahl, saat, frei_lassen=True):
    if anzahl <= 0:
        return np.zeros((0, 2))
    if geo.geom_type in ("LineString", "LinearRing"):
        punkte = np.array([geo.interpolate(i / anzahl, normalized=True).coords[0] for i in range(anzahl)])
        rng = np.random.default_rng(saat)
        return punkte + rng.normal(0, 0.3, punkte.shape)
    frei = geo.difference(hindernis) if frei_lassen else geo  # Fahrzeuge dürfen auf Brücken über Wasser
    if frei.area < 1:
        frei = geo
    rng = np.random.default_rng(saat)
    # Gitter mit Zufallsversatz; Abstand so, dass genug Punkte in die freie Fläche passen
    abstand = math.sqrt(frei.area / anzahl) * 0.95
    minx, miny, maxx, maxy = frei.bounds
    for _ in range(8):
        gx, gy = np.meshgrid(np.arange(minx, maxx, abstand), np.arange(miny, maxy, abstand))
        kand = np.c_[gx.ravel(), gy.ravel()] + rng.uniform(-0.35, 0.35, (gx.size, 2)) * abstand
        drin = kand[[frei.contains(Point(p)) for p in kand]]
        if len(drin) >= anzahl:
            break
        abstand *= 0.85
    drin = drin[rng.permutation(len(drin))[:anzahl]]
    return drin[np.lexsort((drin[:, 0], drin[:, 1]))]  # räumlich sortiert: Süd->Nord, dann West->Ost


FEHLT = -32768        # Int16-Marke: Person zu diesem Zeitpunkt nicht da
VORLAUF = 300         # s: so lange vor dem ersten Zeitpunkt laufen die ersten Leute herein


def zum_zugang(ziel, zugaenge, rng):
    """Nächster Zugang zu jeder Zielposition, mit etwas Streuung."""
    d = np.linalg.norm(ziel[:, None, :] - zugaenge[None, :, :], axis=2)
    gestreut = zugaenge[d.argmin(axis=1)] + rng.normal(0, 3, ziel.shape)
    return np.array([auf_freie_flaeche(p) for p in gestreut])  # Streuung nicht in Hauswände


def figuren(anzahl):
    """Personen → Figuren: mengen.json "figur_je" (Standard 1) Personen je Figur, damit große Mengen rechenbar bleiben."""
    return anzahl if FIGUR_JE == 1 else round(anzahl / FIGUR_JE)


def population(pop, pi):
    zugaenge = np.array([auf_freie_flaeche(np.array(lokal(a, b))) for a, b in pop["zugaenge"]])
    rng = np.random.default_rng(1000 + pi)
    frei = pop["gruppe"] != "fahrzeug"   # Fahrzeuge dürfen auf Brücken über Wasser
    stellen = []
    for si, s in enumerate(pop["schritte"]):
        teile = [verteile(form(t), figuren(t["anzahl"]), saat=pi * 1000 + si * 10 + ti, frei_lassen=frei) if frei
                 else auf_fahrspur(form(t), t["anzahl"]) for ti, t in enumerate(s["teile"])]  # Fahrzeuge einzeln
        stellen.append(np.vstack([t for t in teile if len(t)]) if any(len(t) for t in teile) else np.zeros((0, 2)))
    zeiten = [uhr(s["zeit"]) for s in pop["schritte"]]
    # Zeitachse: Vorlauf, alle Zeitpunkte, Nachlauf zum Weggehen
    T = [zeiten[0] - VORLAUF] + zeiten + [zeiten[-1] + VORLAUF]
    K = len(T)
    wege = []   # pro Person: Liste von K Positionen (oder None)

    def neu(k, pos):
        w = [None] * K
        w[k] = pos
        wege.append(w)
        return len(wege) - 1

    # erster Zeitpunkt: alle kommen vom Zugang
    aktiv = []
    for pos, start in zip(stellen[0], zum_zugang(stellen[0], zugaenge, rng)):
        i = neu(1, pos)
        wege[i][0] = start
        aktiv.append(i)
    for k in range(1, len(stellen)):
        alt = np.array([wege[i][k] for i in aktiv]).reshape(-1, 2)
        ziel = stellen[k]
        if len(alt) and len(ziel):
            kosten = np.linalg.norm(alt[:, None, :] - ziel[None, :, :], axis=2).astype(np.float32)
            zeile, spalte = linear_sum_assignment(kosten)
        else:
            zeile, spalte = np.array([], int), np.array([], int)
        naechste = []
        for r, c in zip(zeile, spalte):
            wege[aktiv[r]][k + 1] = ziel[c]
            naechste.append(aktiv[r])
        # Überzählige gehen zum Zugang
        weg = sorted(set(range(len(aktiv))) - set(zeile.tolist()))
        if weg:
            for r, ausgang in zip(weg, zum_zugang(alt[weg], zugaenge, rng)):
                wege[aktiv[r]][k + 1] = ausgang
        # Neue kommen vom Zugang
        dazu = sorted(set(range(len(ziel))) - set(spalte.tolist()))
        if dazu:
            for c, start in zip(dazu, zum_zugang(ziel[dazu], zugaenge, rng)):
                i = neu(k + 1, ziel[c])
                wege[i][k] = start
                naechste.append(i)
        aktiv = naechste
    # nach dem letzten Zeitpunkt: alle gehen
    if aktiv:
        letzte = np.array([wege[i][K - 2] for i in aktiv])
        for i, ausgang in zip(aktiv, zum_zugang(letzte, zugaenge, rng)):
            wege[i][K - 1] = ausgang

    # Zwischen zwei Zeitpunkten über begehbare Flächen laufen statt durch Häuser
    # (Fahrzeuge ausgenommen, die stehen z. B. auf der Brücke über dem Wasser)
    T, wege = mit_umwegen(T, wege) if pop["gruppe"] != "fahrzeug" else mit_fahrwegen(T, wege)
    K = len(T)

    feld = np.full((len(wege), K, 2), FEHLT, dtype=np.int16)
    for i, w in enumerate(wege):
        for k, pos in enumerate(w):
            if pos is not None:
                feld[i, k] = np.clip(np.round(np.asarray(pos) * 10), -32767, 32767)  # Dezimeter
    # zwischen: so viele Teilstücke bilden einen Weg von einem Zeitpunkt zum nächsten (die Karte lässt die Person
    # den ganzen Weg in einem Zug gehen und dann stehen)
    return {"name": pop["name"], "gruppe": pop["gruppe"], "quelle": pop["quelle"], "T": T,
            "zwischen": ZWISCHEN,
            "personen": len(wege), "wege": base64.b64encode(feld.tobytes()).decode()}


# ---------- Wege über begehbare Flächen ----------
# Raster 2 m; Gebäude und Wasser gesperrt. Pro Übergang ein Dijkstra von allen Zielpunkten aus
# (kürzester Weg zum nächsten Ziel); jede Person folgt dem Vorgänger-Baum und geht vom
# erreichten Zielfeld gerade zu ihrem eigenen Ziel. Jeder Übergang wird in ZWISCHEN Teilstücke
# gleicher Weglänge zerlegt (zusätzliche Zeitpunkte).
ZELLE = 2.0
ZWISCHEN = 6
_raster = {}
GEBIET = None   # Rasterausschnitt der gerade gerechneten Population (stadt.json "demo_gebiete", Feld "gebiet"); Köln: keiner


def raster():
    if _raster and _raster.get("gebiet") is GEBIET:
        return _raster
    _raster.clear()  # nur ein Raster im Speicher; beim Wechsel des Gebiets neu aufbauen
    import shapely
    from scipy.sparse import coo_matrix
    x0, y0, x1, y1 = -700, -800, 1700, 1300   # deckt Domplatte bis Zoobrücke ab
    if STADT:  # Ausschnitt der Stadt (für die Menge ggf. kleiner, bei mehreren Gebieten das der Population)
        a = GEBIET or STADT.get("menge_ausschnitt") or STADT["ausschnitt"]
        (x0, y0), (x1, y1) = [tuple(math.floor(v / ZELLE) * ZELLE for v in lokal(*p)) for p in
                              ((a["sued"], a["west"]), (a["nord"], a["ost"]))]
    xs_ = np.arange(x0, x1, ZELLE) + ZELLE / 2
    ys_ = np.arange(y0, y1, ZELLE) + ZELLE / 2
    gx, gy = np.meshgrid(xs_, ys_)
    frei = ~shapely.contains_xy(hindernis, gx, gy)
    h, w = frei.shape
    idx = -np.ones(frei.shape, dtype=np.int64)
    idx[frei] = np.arange(frei.sum())
    zeilen, spalten, laengen = [], [], []
    for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
        # Feld (y, x) mit Nachbar (y+dy, x+dx), nur wo beide im Raster liegen
        ya, yb = max(0, -dy), h - max(0, dy)
        xa, xb = max(0, -dx), w - max(0, dx)
        a = idx[ya:yb, xa:xb]
        b = idx[ya + dy:yb + dy, xa + dx:xb + dx]
        ok = (a >= 0) & (b >= 0)
        zeilen.append(a[ok]); spalten.append(b[ok])
        laengen.append(np.full(ok.sum(), ZELLE * math.hypot(dx, dy)))
    z, s, l = np.concatenate(zeilen), np.concatenate(spalten), np.concatenate(laengen)
    n = int(frei.sum())
    graph = coo_matrix((np.r_[l, l], (np.r_[z, s], np.r_[s, z])), shape=(n, n)).tocsr()
    pos = np.c_[gx[frei], gy[frei]]
    _raster.update(x0=x0, y0=y0, w=w, h=h, idx=idx, graph=graph, pos=pos, gebiet=GEBIET)
    return _raster


def zelle(p):
    """Nächstes freies Rasterfeld zu Punkt p (sucht bis 20 m im Umkreis)."""
    r = raster()
    cx, cy = int((p[0] - r["x0"]) // ZELLE), int((p[1] - r["y0"]) // ZELLE)
    for rad in range(0, 41):  # bis 80 m
        ys_, xs_ = np.mgrid[cy - rad:cy + rad + 1, cx - rad:cx + rad + 1]
        ok = (ys_ >= 0) & (ys_ < r["h"]) & (xs_ >= 0) & (xs_ < r["w"])
        kand = r["idx"][ys_[ok], xs_[ok]]
        kand = kand[kand >= 0]
        if len(kand):
            return int(kand[np.argmin(np.linalg.norm(r["pos"][kand] - p, axis=1))])
    return -1


def auf_freie_flaeche(p):
    """Zugang aus einem Gebäude (z. B. Hauptbahnhof) auf die nächste freie Stelle davor legen."""
    c = zelle(p)
    return raster()["pos"][c] if c >= 0 else p


def weg_ueber_strassen(start, ziel, vorg):
    """Polyline von start über den Vorgänger-Baum (Richtung Ziele) und dann gerade zu ziel."""
    r = raster()
    c = zelle(np.asarray(start))
    punkte = [np.asarray(start)]
    schritte = 0
    while c >= 0 and vorg[c] >= 0 and schritte < 5000:
        c = vorg[c]
        punkte.append(r["pos"][c])
        schritte += 1
    punkte.append(np.asarray(ziel))
    return np.array(punkte)


def auf_laenge(linie, n):
    """n+1 Punkte gleicher Weglänge entlang der Polyline (inkl. Anfang und Ende)."""
    seg = np.linalg.norm(np.diff(linie, axis=0), axis=1)
    kum = np.r_[0, np.cumsum(seg)]
    if kum[-1] == 0:
        return np.repeat(linie[:1], n + 1, axis=0)
    ziele = np.linspace(0, kum[-1], n + 1)
    return np.c_[np.interp(ziele, kum, linie[:, 0]), np.interp(ziele, kum, linie[:, 1])]


def frei_sichtbar(a, b):
    """True, wenn die gerade Linie a->b keine gesperrte Zelle kreuzt."""
    import shapely
    n = max(2, int(np.linalg.norm(b - a) / ZELLE))
    t = np.linspace(0, 1, n)
    return not shapely.contains_xy(hindernis, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t).any()


def mit_umwegen(T, wege):
    from scipy.sparse.csgraph import dijkstra
    r = raster()
    K = len(T)
    T2 = []
    for k in range(K - 1):
        T2 += list(np.linspace(T[k], T[k + 1], ZWISCHEN + 1)[:-1])
    T2.append(T[-1])
    neu = [[None] * len(T2) for _ in wege]
    for k in range(K - 1):
        paare = [(i, np.asarray(w[k]), np.asarray(w[k + 1])) for i, w in enumerate(wege)
                 if w[k] is not None and w[k + 1] is not None]
        blockiert = [(i, a, b) for i, a, b in paare if not frei_sichtbar(a, b)]
        vorg = None
        if blockiert:
            quellen = sorted({c for c in (zelle(b) for _, _, b in blockiert) if c >= 0})
            _, vorg, _ = dijkstra(r["graph"], directed=False, indices=quellen, min_only=True,
                                  return_predecessors=True)
        blockiert_ids = {i for i, _, _ in blockiert}
        eigene = {}  # Ziel-Zelle -> Vorgänger-Baum, falls der Weg zum nächsten Ziel nicht reicht
        for i, a, b in paare:
            linie = weg_ueber_strassen(a, b, vorg) if i in blockiert_ids else np.array([a, b])
            if i in blockiert_ids and not frei_sichtbar(linie[-2], b):
                # am falschen Ziel angekommen (z. B. Korridor statt Thürmchenswall): Weg direkt zum eigenen Ziel
                zc = zelle(b)
                if zc >= 0:
                    if zc not in eigene:
                        _, eigene[zc] = dijkstra(r["graph"], directed=False, indices=zc, limit=2500,
                                                 return_predecessors=True)
                    linie = weg_ueber_strassen(a, b, eigene[zc])
            for j, p in enumerate(auf_laenge(linie, ZWISCHEN)):
                neu[i][k * ZWISCHEN + j] = p
    return [int(t) for t in T2], neu


# ---------- Fahrzeuge: nur auf Fahrbahnen, Wege über das Straßennetz ----------
# Statt frei über Wasser und Gehwege: Fahrzeuge stehen hintereinander auf Fahrbahnen (OpenStreetMap, strassen-gross.json)
# und fahren zwischen zwei Zeitpunkten den kürzesten Weg über das Straßennetz, also über die Brücke und die Rampe.
FAHRBAR = {"motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link", "secondary", "secondary_link",
           "tertiary", "tertiary_link", "residential", "unclassified", "service", "living_street"}
_netz = {}


def fahrnetz():
    if _netz:
        return _netz
    from scipy.sparse import coo_matrix
    knoten, pos, z, s, l, linien = {}, [], [], [], [], []
    for e in osm("strassen-gross.json"):
        tags = e.get("tags", {})
        if tags.get("highway") not in FAHRBAR or tags.get("tunnel") or tags.get("access") in ("no", "private") \
                or len(e.get("geometry", [])) < 2:
            continue
        punkte = [lokal(p["lat"], p["lon"]) for p in e["geometry"]]
        ids = []
        for nid, pt in zip(e["nodes"], punkte):
            if nid not in knoten:
                knoten[nid] = len(pos)
                pos.append(pt)
            ids.append(knoten[nid])
        for a, b in zip(ids, ids[1:]):
            z.append(a); s.append(b); l.append(math.dist(pos[a], pos[b]) + 0.01)
        if tags.get("highway") != "service":  # Parken nur auf richtigen Straßen, nicht in Hofeinfahrten
            linien.append(LineString(punkte))
    n = len(pos)
    graph = coo_matrix((np.r_[l, l], (np.r_[z, s], np.r_[s, z])), shape=(n, n)).tocsr()
    _netz.update(pos=np.array(pos), graph=graph, linien=unary_union(linien))
    return _netz


def auf_fahrspur(geo, anzahl):
    """anzahl Fahrzeuge in gleichem Abstand auf den Fahrbahnen innerhalb der Fläche (bzw. entlang der Linie)."""
    if anzahl <= 0:
        return np.zeros((0, 2))
    spur = fahrnetz()["linien"].intersection(geo.buffer(4))
    teile = [g for g in getattr(spur, "geoms", [spur]) if g.geom_type == "LineString" and g.length > 1]
    gesamt = sum(g.length for g in teile)
    if gesamt < 5:
        return verteile(geo, anzahl, saat=anzahl, frei_lassen=False)
    abstand = gesamt / anzahl
    punkte, rest = [], abstand / 2
    for g in teile:
        while rest <= g.length and len(punkte) < anzahl:
            punkte.append(g.interpolate(rest).coords[0])
            rest += abstand
        rest -= g.length
    while len(punkte) < anzahl:
        punkte.append(teile[-1].interpolate(teile[-1].length).coords[0])
    return np.array(punkte)


def weg_ueber_fahrbahn(a, b):
    from scipy.sparse.csgraph import dijkstra
    netz = fahrnetz()
    if math.dist(a, b) < 15:
        return np.array([a, b])
    na = int(np.argmin(np.linalg.norm(netz["pos"] - a, axis=1)))
    nb = int(np.argmin(np.linalg.norm(netz["pos"] - b, axis=1)))
    _, vorg = dijkstra(netz["graph"], directed=False, indices=nb, return_predecessors=True, limit=6000)
    if na != nb and vorg[na] < 0:
        return np.array([a, b])
    kette, c = [np.asarray(a)], na
    while c >= 0 and c != nb:
        kette.append(netz["pos"][c])
        c = vorg[c]
    kette += [netz["pos"][nb], np.asarray(b)]
    return np.array(kette)


def mit_fahrwegen(T, wege):
    K = len(T)
    T2 = []
    for k in range(K - 1):
        T2 += list(np.linspace(T[k], T[k + 1], ZWISCHEN + 1)[:-1])
    T2.append(T[-1])
    neu = [[None] * len(T2) for _ in wege]
    for i, w in enumerate(wege):
        for k in range(K - 1):
            if w[k] is None or w[k + 1] is None:
                continue
            for j, p in enumerate(auf_laenge(weg_ueber_fahrbahn(np.asarray(w[k]), np.asarray(w[k + 1])), ZWISCHEN)):
                neu[i][k * ZWISCHEN + j] = p
    return [int(x) for x in T2], neu


def nach_grad(xy):
    x, y = xy
    return [round(LAT0 + y / MY, 6), round(LON0 + x / MX, 6)]


# MENGEN_VARIANTE=5790: Variante szene/mengen_5790.json -> szene/menge_5790.js (Kessel nach Vorlage 18/5790)
VARIANTE = os.environ.get("MENGEN_VARIANTE", "")
EIN, AUS = (f"szene/mengen_{VARIANTE}.json", f"szene/menge_{VARIANTE}.js") if VARIANTE else ("szene/mengen.json", "szene/menge.js")
daten = json.load(open(os.path.join(basis, EIN)))
FIGUR_JE = daten.get("figur_je", 1)
aus = {"ursprung": [LAT0, LON0], "m_pro_grad": [MX, MY], "fehlt": FEHLT, "populationen": [],
       "markierungen": [], "fahrzeuge": []}
if FIGUR_JE != 1:
    aus["figur_je"] = FIGUR_JE  # die Karte rechnet Figuren × figur_je = Personen (nicht bei gruppe "fahrzeug")
GEBIETE = {g["name"]: g for g in STADT.get("demo_gebiete", [])}
for pi, pop in enumerate(daten["populationen"]):
    GEBIET = GEBIETE[pop["gebiet"]] if pop.get("gebiet") else None
    p = population(pop, pi)
    aus["populationen"].append(p)
    print(f"{pop['name']}: {p['personen']} Personen insgesamt, Zeitpunkte " +
          ", ".join(f"{s['zeit']}={sum(t['anzahl'] for t in s['teile'])}" for s in pop["schritte"]))
for m in daten.get("markierungen", []):
    if "punkte" in m:  # Linie über feste Punkte [[lat, lon], …]
        punkte = [[round(a, 6), round(b, 6)] for a, b in m["punkte"]]
        if NETZ and m["art"] == "linie" and not m.get("luftlinie"):
            punkte = strassenweg(punkte, m["name"])
    elif "kreis" in m:
        punkte = [nach_grad(c) for c in form(m).exterior.coords]
    elif m["art"] == "flaeche":
        punkte = [nach_grad(c) for c in korridor(*m["korridor"]).exterior.coords]
    else:
        achse = m["kau"] if "kau" in m else m["achse"]
        y0, y1 = laenge_m(achse[0]), laenge_m(achse[1])
        punkte = [nach_grad(mitte(y)[0]) for y in np.linspace(y0, y1, 30)]
    aus["markierungen"].append({"name": m["name"], "art": m["art"], "quelle": m["quelle"], "punkte": punkte})
for r in daten.get("zusatzreihen", []):  # Kennzahlen ohne eigene Figuren, nur fürs Diagramm
    aus.setdefault("reihen", []).append({**r, "punkte": [[uhr(z), n] for z, n in r["punkte"]]})
for f in daten.get("fahrzeuge", []):
    aus["fahrzeuge"].append({"name": f["name"], "quelle": f["quelle"],
                             "wege": [{"t": uhr(w["zeit"]), "lat": w["lat"], "lon": w["lon"]} for w in f["wege"]]})

with open(os.path.join(basis, AUS), "w") as fh:
    fh.write(f"// Automatisch erzeugt von skripte/menge_berechnen.py aus {EIN}, nicht von Hand ändern.\n")
    fh.write("window.MENGE = " + json.dumps(aus, separators=(",", ":")) + ";\n")
print(f"-> szene/menge.js ({os.path.getsize(os.path.join(basis, 'szene/menge.js')) // 1024} KB)")
