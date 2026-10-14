/* ============ TRADUCIR (español ⇄ inglés) ============
   Usa el widget gratuito de Google Translate, oculto, y lo controlamos
   desde nuestro propio botón (.js-translate).
   - Recuerda el idioma elegido en localStorage.
   - El botón muestra el idioma al que se cambiará ("English" / "Español").
   - Emite el evento "mythos:lang" para que otras páginas (comentarios.js)
     actualicen sus propios textos.
*/
(() => {
  const buttons = document.querySelectorAll(".js-translate");
  if (!buttons.length) return;

  const SOURCE = "es";
  const TARGET = "en";
  const KEY = "mythos-lang";

  let current = SOURCE;
  try { current = localStorage.getItem(KEY) === TARGET ? TARGET : SOURCE; } catch (e) {}

  function updateButtons() {
    buttons.forEach((b) => {
      b.textContent = current === SOURCE ? "English" : "Español";
      b.setAttribute("aria-label", current === SOURCE ? "Translate this page to English" : "Traducir la página al español");
    });
  }

  // Cambia el <select> oculto que crea Google; reintenta hasta que exista
  function setLanguage(lang, tries = 0) {
    const combo = document.querySelector("select.goog-te-combo");
    if (!combo) {
      if (tries < 40) setTimeout(() => setLanguage(lang, tries + 1), 150);
      return;
    }
    combo.value = lang;
    combo.dispatchEvent(new Event("change"));
  }

  // Volver al español: Google necesita su cookie borrada y recargar
  function resetToSource() {
    const expire = "expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    document.cookie = "googtrans=; " + expire;
    document.cookie = "googtrans=; " + expire + "; domain=" + location.hostname;
    location.reload();
  }

  function apply(lang) {
    current = lang;
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    updateButtons();
    window.dispatchEvent(new CustomEvent("mythos:lang", { detail: lang }));
    if (lang === SOURCE) resetToSource();
    else setLanguage(TARGET);
  }

  // Callback global que exige el script de Google
  window.googleTranslateElementInit = () => {
    new google.translate.TranslateElement(
      { pageLanguage: SOURCE, includedLanguages: TARGET, autoDisplay: false },
      "google_translate_element"
    );
    if (current === TARGET) setLanguage(TARGET);
  };

  function loadGoogle() {
    if (document.getElementById("gt-script")) return;
    const s = document.createElement("script");
    s.id = "gt-script";
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.head.appendChild(s);
  }

  buttons.forEach((b) =>
    b.addEventListener("click", () => {
      loadGoogle();
      apply(current === SOURCE ? TARGET : SOURCE);
      // cierra el panel móvil si estaba abierto
      const panel = document.getElementById("navPanel");
      const toggle = document.getElementById("navToggle");
      if (panel && !panel.hidden) { panel.hidden = true; toggle && toggle.setAttribute("aria-expanded", "false"); }
    })
  );

  updateButtons();
  if (current === TARGET) loadGoogle();   // si ya había elegido inglés, se traduce al cargar
})();