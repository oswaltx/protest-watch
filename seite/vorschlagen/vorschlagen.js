// Demo vorschlagen: Formular an /api/demo-vorschlag (dort sofort verschlüsselt). Einsendecode nur anzeigen, nie im Browser speichern.
(() => {
  const $ = (id) => document.getElementById(id);
  // Wortlaut-Fassungen 2026-11-02-vorschlag-ki / -manuell (Nachweis in dokumentation/)
  const EINWILLIGUNG = {
    ki: "Ich bin mindestens 16 Jahre alt und einverstanden, dass David Oswalt meinen Vorschlag, auch soweit er zeigt, dass ich "
      + "an der Demo teilgenommen habe oder teilnehmen will, für die Dokumentation auf protest-watch.org nutzt und mit dem "
      + "KI-Dienst Claude auswerten lässt. Dafür gehen die Angaben an Anthropic Ireland, Limited, die sie eigenständig "
      + "verantwortet und an Anthropic PBC in den USA weitergibt. Veröffentlicht werden höchstens Angaben zur Demo selbst, "
      + "nie zu mir. Widerruf jederzeit per Mail an protest-watch@pm.me mit meinem Einsendecode.",
    manuell: "Ich bin mindestens 16 Jahre alt und einverstanden, dass David Oswalt meinen Vorschlag, auch soweit er zeigt, dass "
      + "ich an der Demo teilgenommen habe oder teilnehmen will, für die Dokumentation auf protest-watch.org nutzt, ohne "
      + "KI-Dienste. Veröffentlicht werden höchstens Angaben zur Demo selbst, nie zu mir. Widerruf jederzeit per Mail an "
      + "protest-watch@pm.me mit meinem Einsendecode.",
  };
  const gewaehlt = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;

  function freigeben() {
    const w = gewaehlt("auswertung");
    $("einwilligung-text").textContent = w ? EINWILLIGUNG[w] : "Bitte zuerst die Auswertung wählen.";
    $("einwilligung").disabled = !w;
    if (!w) $("einwilligung").checked = false;
    const fertig = w && $("einwilligung").checked && gewaehlt("zeitbezug") && $("datum").value
      && $("stadt").value.trim() && $("anlass").value.trim();
    $("senden").disabled = !fertig;
    $("senden").classList.toggle("aus", !fertig);
  }
  // Datumsbereich passend zum Zeitbezug (der Server prüft dasselbe): vergangen ab 2020 bis heute, geplant bis 180 Tage voraus
  const iso = (d) => d.toISOString().slice(0, 10);
  function datumsbereich() {
    const heute = new Date(), spaeter = new Date(Date.now() + 180 * 86400000);
    const z = gewaehlt("zeitbezug");
    $("datum").min = z === "kommend" ? iso(heute) : "2020-01-01";
    $("datum").max = z === "kommend" ? iso(spaeter) : iso(heute);
  }
  document.querySelectorAll('input[name="zeitbezug"]').forEach((e) => e.addEventListener("change", datumsbereich));
  datumsbereich();
  document.querySelectorAll("input, textarea").forEach((e) => e.addEventListener("input", freigeben));
  document.querySelectorAll("input[type=radio], input[type=checkbox]").forEach((e) => e.addEventListener("change", freigeben));

  $("senden").addEventListener("click", async () => {
    $("senden").disabled = true;
    $("status").textContent = "wird gesendet …";
    const links = $("links").value.split("\n").map((l) => l.trim()).filter(Boolean);
    try {
      const r = await fetch("/api/demo-vorschlag", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auswertung: gewaehlt("auswertung"), einwilligung: true, zeitbezug: gewaehlt("zeitbezug"),
          datum: $("datum").value, uhrzeit: $("uhrzeit").value, stadt: $("stadt").value, ort: $("ort").value,
          anlass: $("anlass").value, organisationen: $("organisationen").value, links, notiz: $("notiz").value,
        }),
      });
      const a = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(a.fehler || r.status);
      $("code").textContent = a.einsendecode;
      $("ergebnis").hidden = false;
      $("status").textContent = "";
      document.querySelectorAll("input[type=text], input[type=date], input[type=time], textarea").forEach((e) => { e.value = ""; });
    } catch (e) {
      $("status").textContent = `Hat nicht geklappt (${e.message}).`;
    }
    freigeben();
  });
  freigeben();
})();
