/* ============ AJUSTES PARA TELÉFONO ============
   Se carga al final de index.html y comentarios.html.

   1) Menú móvil: un solo manejador (cierra al tocar un enlace, fuera del panel,
      con Esc o al pasar a escritorio). Sustituye al botón por una copia para
      quitar cualquier manejador previo y evitar que se "alterne dos veces".
   2) Enlaces placeholder href="#": no saltan al inicio de la página.
   3) Avisos "Desliza para ver más" sobre tablas, tablero y carrusel (solo se
      muestran en teléfono; el CSS los oculta en escritorio).
   4) Estado de la navbar al hacer scroll.
*/
(() => {
  const PHONE = window.matchMedia("(max-width: 860px)");
  const onChange = (mq, fn) => (mq.addEventListener ? mq.addEventListener("change", fn) : mq.addListener(fn));

  /* ---------- 1) Menú móvil ---------- */
  const oldToggle = document.getElementById("navToggle");
  const panel = document.getElementById("navPanel");
  if (oldToggle && panel) {
    const toggle = oldToggle.cloneNode(true);
    oldToggle.replaceWith(toggle);

    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      panel.hidden = !open;
    };

    toggle.addEventListener("click", () => setOpen(panel.hidden));
    panel.addEventListener("click", (e) => { if (e.target.closest("a, button")) setOpen(false); });
    document.addEventListener("click", (e) => {
      if (!panel.hidden && !panel.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden) { setOpen(false); toggle.focus(); }
    });
    onChange(PHONE, () => setOpen(false));
  }

  /* ---------- 2) Enlaces placeholder ---------- */
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href="#"]');
    if (a) e.preventDefault();
  });

  /* ---------- 3) Avisos de deslizamiento ---------- */
  document.querySelectorAll(".tabs__table-wrap, .cycle-board, .rail").forEach((el) => {
    const prev = el.previousElementSibling;
    if (prev && prev.classList.contains("swipe-hint")) return;
    const hint = document.createElement("p");
    hint.className = "swipe-hint";
    hint.setAttribute("aria-hidden", "true");
    hint.textContent = "Desliza para ver más →";
    el.before(hint);
  });

  /* ---------- 4) Navbar: estado al hacer scroll ---------- */
  const nav = document.getElementById("nav");
  if (nav) {
    const sync = () => nav.classList.toggle("is-scrolled", window.scrollY > 10);
    window.addEventListener("scroll", sync, { passive: true });
    sync();
  }
})();
