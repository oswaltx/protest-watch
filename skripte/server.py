#!/usr/bin/env python3
# Lokaler Webserver für karte/ mit Range-Anfragen, damit Videos im Browser springen können.
# Aufruf: python3 skripte/server.py [port]
import os, re, sys, urllib.request
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

SZENE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "karte")
SEITE = os.path.join(os.path.dirname(SZENE), "seite")


class RangeHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Öffentliche Fassung (Ordner seite/ daneben): Startseite unter /, Karte unter /karte/ wie auf dem Server
        if os.path.isdir(SEITE):
            if path == "/karte" or path.startswith("/karte/"):
                path, self.directory = path[len("/karte"):] or "/", SZENE
            else:
                self.directory = SEITE
        return super().translate_path(path)

    def do_GET(self):
        # Kartenkacheln der öffentlichen Fassung (auf dem Server übernimmt das der Kachel-Cache)
        m = re.match(r"^/osm/(\d+/\d+/\d+\.png)$", self.path)
        if not m:
            return super().do_GET()
        anfrage = urllib.request.Request("https://tile.openstreetmap.org/" + m.group(1),
                                         headers={"User-Agent": "protest-watch.org lokaler Testserver"})
        try:
            daten = urllib.request.urlopen(anfrage, timeout=20).read()
        except OSError:
            return self.send_error(502)
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(daten)))
        self.end_headers()
        self.wfile.write(daten)

    def do_POST(self):
        # Einzeichnungen an den lokal gestarteten Annahme-Dienst (auf dem Server übernimmt das Caddy)
        if self.path != "/api/einzeichnen":
            return self.send_error(404)
        laenge = min(int(self.headers.get("Content-Length") or 0), 64 * 1024)
        anfrage = urllib.request.Request("http://127.0.0.1:8743/api/einzeichnen", data=self.rfile.read(laenge),
                                         headers={"Content-Type": "application/json", "X-Forwarded-For": "127.0.0.1"})
        try:
            antwort = urllib.request.urlopen(anfrage, timeout=20)
            code, daten = antwort.status, antwort.read()
        except urllib.error.HTTPError as e:
            code, daten = e.code, e.read()
        except OSError:
            code, daten = 502, b'{"fehler": "Annahme-Dienst laeuft lokal nicht"}'
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(daten)))
        self.end_headers()
        self.wfile.write(daten)

    def send_head(self):
        bereich = self.headers.get("Range")
        pfad = self.translate_path(self.path)
        if not bereich or not os.path.isfile(pfad):
            return super().send_head()
        m = re.match(r"bytes=(\d*)-(\d*)", bereich)
        groesse = os.path.getsize(pfad)
        von = int(m.group(1)) if m and m.group(1) else 0
        bis = int(m.group(2)) if m and m.group(2) else groesse - 1
        if von >= groesse:
            self.send_error(416)
            return None
        bis = min(bis, groesse - 1)
        f = open(pfad, "rb")
        f.seek(von)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(pfad))
        self.send_header("Content-Range", f"bytes {von}-{bis}/{groesse}")
        self.send_header("Content-Length", str(bis - von + 1))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        self._rest = bis - von + 1
        return f

    def copyfile(self, quelle, ziel):
        rest = getattr(self, "_rest", None)
        if rest is None:
            return super().copyfile(quelle, ziel)
        while rest > 0:
            stueck = quelle.read(min(1 << 16, rest))
            if not stueck:
                break
            try:
                ziel.write(stueck)
            except (BrokenPipeError, ConnectionResetError):
                break  # Browser hat abgebrochen, z. B. beim Springen
            rest -= len(stueck)

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        # Szene-Dateien ändern sich oft: Browser soll immer neu fragen (Videos dürfen gecacht werden)
        if not self.path.split("?")[0].endswith((".mp4", ".webm")):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8731
ThreadingHTTPServer(("127.0.0.1", port), partial(RangeHandler, directory=SZENE)).serve_forever()
