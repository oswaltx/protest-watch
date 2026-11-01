// Mail-Knopf und Ablage-Knopf passend zur gewählten Auswertung (KI oder manuell).
// Ablage erst nach ausdrücklicher Einwilligung freigeben.
(() => {
  const SAETZE = {
    ki: "Ich bin einverstanden, dass David Oswalt mein Material und meine Angaben, auch zu meiner Teilnahme an der Demo, " +
        "für die Rekonstruktion nutzt und dafür auch mit dem KI-Dienst Claude von Anthropic (Anthropic Ireland, Limited, mit Weitergabe an Anthropic PBC in den USA) auswerten lässt, " +
        "wie im Datenschutzhinweis auf protest-watch.org/einreichen beschrieben. Widerruf jederzeit per Mail.",
    manuell: "Ich bin einverstanden, dass David Oswalt mein Material und meine Angaben, auch zu meiner Teilnahme an der Demo, " +
        "für die Rekonstruktion nutzt, ohne KI-Dienste, wie im Datenschutzhinweis auf protest-watch.org/einreichen beschrieben. " +
        "Widerruf jederzeit per Mail.",
  };
  const VORLAGE = "\n\nUhrzeit:\nOrt und Blickrichtung:\nDarf ich Standbilder/Ausschnitte ohne erkennbare Personen zeigen (mit/ohne Namen)?\nRückfragen erlaubt (ja/nein)?\n\n";

  const mail = document.getElementById("mail-knopf");
  const ablage = document.getElementById("ablage-knopf");
  const einwilligung = document.getElementById("einwilligung");

  // keine Vorauswahl: Knöpfe erst nach aktiver Wahl freigeben
  function wahl() {
    const r = document.querySelector('input[name="auswertung"]:checked');
    return r ? r.value : null;
  }

  function sperren(knopf, text, ziel) {
    knopf.classList.add("aus");
    knopf.setAttribute("aria-disabled", "true");
    knopf.href = ziel;
    knopf.textContent = text;
  }

  function aktualisieren() {
    const w = wahl();
    if (!w) {
      sperren(mail, "Bitte erst oben die Auswertung wählen", "#auswertung");
      sperren(ablage, "Bitte erst oben die Auswertung wählen", "#auswertung");
      return;
    }
    mail.classList.remove("aus");
    mail.setAttribute("aria-disabled", "false");
    mail.textContent = "Mail an protest-watch@pm.me schreiben";
    const betreff = "Material Demo Köln 31.10. (" + (w === "ki" ? "mit KI" : "nur manuell") + ")";
    mail.href = "mailto:protest-watch@pm.me?subject=" + encodeURIComponent(betreff) +
                "&body=" + encodeURIComponent(VORLAGE + SAETZE[w]);
    const frei = einwilligung.checked;
    ablage.classList.toggle("aus", !frei);
    ablage.setAttribute("aria-disabled", String(!frei));
    ablage.href = frei ? "/einreichen/ablage/" + w + "/" : "#anonym";
    ablage.textContent = "Zur anonymen Ablage (" + (w === "ki" ? "mit KI-Auswertung" : "nur manuell") + ")";
  }

  // Textfeld: Infos zu den Dateien als kleine Textdatei in denselben Briefkasten (PUT, ohne Namen/Mail)
  const infoText = document.getElementById("info-text");
  const infoKnopf = document.getElementById("info-knopf");
  const infoStatus = document.getElementById("info-status");

  function infoFreigeben() {
    const frei = Boolean(wahl()) && einwilligung.checked;
    infoText.disabled = !frei;
    const senden = frei && infoText.value.trim().length > 0;
    infoKnopf.disabled = !senden;
    infoKnopf.classList.toggle("aus", !senden);
  }

  infoKnopf.addEventListener("click", async () => {
    const w = wahl();
    if (!w || !einwilligung.checked || !infoText.value.trim()) return;
    const name = "info-" + new Date().toISOString().replace(/[:.]/g, "-") + "-" + Math.random().toString(36).slice(2, 8) + ".txt";
    infoKnopf.disabled = true;
    infoStatus.textContent = "wird gesendet …";
    try {
      const r = await fetch("/einreichen/ablage/" + w + "/" + name, {
        method: "PUT", headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: "Auswertung: " + w + "\n\n" + infoText.value.trim() + "\n",
      });
      if (!r.ok) throw new Error(r.status);
      infoStatus.textContent = "Danke, deine Infos sind angekommen.";
      infoText.value = "";
    } catch (e) {
      infoStatus.textContent = "Das hat nicht geklappt. Du kannst die Infos auch als .txt-Datei über die Ablage hochladen.";
    }
    infoFreigeben();
  });
  infoText.addEventListener("input", infoFreigeben);

  // Anonyme Beobachtung ohne Dateien: eigenes Textfeld mit eigener Einwilligung, gleicher Briefkasten-Weg
  const beobText = document.getElementById("beob-text");
  const beobKnopf = document.getElementById("beob-knopf");
  const beobStatus = document.getElementById("beob-status");
  const beobEinw = document.getElementById("beob-einwilligung");

  let vonKarte = "";  // Hinweis, wenn der Text von der Karte übernommen wurde

  function beobFreigeben() {
    const frei = Boolean(wahl()) && beobEinw.checked;
    beobText.disabled = !frei;
    const senden = frei && beobText.value.trim().length > 0;
    beobKnopf.disabled = !senden;
    beobKnopf.classList.toggle("aus", !senden);
    if (!wahl()) beobStatus.textContent = vonKarte + "Bitte erst oben die Auswertung wählen.";
    else if (beobStatus.textContent.includes("Bitte erst")) beobStatus.textContent = vonKarte;
  }

  beobKnopf.addEventListener("click", async () => {
    const w = wahl();
    if (!w || !beobEinw.checked || !beobText.value.trim()) return;
    const name = "beobachtung-" + new Date().toISOString().replace(/[:.]/g, "-") + "-" + Math.random().toString(36).slice(2, 8) + ".txt";
    beobKnopf.disabled = true;
    beobStatus.textContent = "wird gesendet …";
    try {
      const r = await fetch("/einreichen/ablage/" + w + "/" + name, {
        method: "PUT", headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: "Art: Beobachtung ohne Dateien\nAuswertung: " + w + "\n\n" + beobText.value.trim() + "\n",
      });
      if (!r.ok) throw new Error(r.status);
      beobStatus.textContent = "Danke, deine Beobachtung ist angekommen.";
      beobText.value = "";
    } catch (e) {
      beobStatus.textContent = "Das hat nicht geklappt. Bitte später noch einmal versuchen.";
    }
    beobFreigeben();
  });
  // Meldung von der Karte (protest-watch.org): Text steht nur im #-Teil der Adresse, wird hier vorbefüllt
  // und sofort aus der Adresszeile entfernt. Auswertung und Einwilligung wählt die Person trotzdem selbst.
  if (location.hash.startsWith("#melden=")) {
    try {
      beobText.value = decodeURIComponent(location.hash.slice(8)).slice(0, 10000);
      vonKarte = "Meldung von der Karte übernommen. ";
    } catch (e) { /* kaputte Adresse: Feld bleibt leer */ }
    history.replaceState(null, "", location.pathname + "#beobachtung");
    document.getElementById("beobachtung").scrollIntoView();
  }
  beobText.addEventListener("input", beobFreigeben);
  beobEinw.addEventListener("change", beobFreigeben);
  document.querySelectorAll('input[name="auswertung"]').forEach((r) => r.addEventListener("change", beobFreigeben));
  beobFreigeben();

  document.querySelectorAll('input[name="auswertung"]').forEach((r) => r.addEventListener("change", aktualisieren));
  document.querySelectorAll('input[name="auswertung"]').forEach((r) => r.addEventListener("change", infoFreigeben));
  einwilligung.addEventListener("change", infoFreigeben);
  einwilligung.addEventListener("change", aktualisieren);
  aktualisieren();
})();
