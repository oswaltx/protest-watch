// Links auf einen Moment (#t=…&k=…) zeigten bis 1.11.2026 auf die Startseite; jetzt liegt die Karte unter /karte/.
if (/^#t=/.test(location.hash)) location.replace("/karte/" + location.hash);
