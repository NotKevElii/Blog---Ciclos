/* ============ PESTAÑAS DE "CICLOS DEL SOFTWARE" ============
   - Las pastillas (.tab-pill) cambian el contenido de la mitad izquierda del section.
   - La primera pestaña ("Ciclos del software") es el contenido principal y está activa al cargar.
   - Animación de entrada del panel (clase .is-in).
   - Accesible: roles ARIA, flechas izquierda/derecha, Home/End.
*/
(() => {
  const tablist = document.querySelector(".tabs__list");
  if (!tablist) return;

  const tabs = [...tablist.querySelectorAll(".tab-pill")];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute("aria-controls")));
  let first = true;   // la carga inicial no se anima

  function show(index) {
    tabs.forEach((t, i) => {
      const on = i === index;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });

    panels.forEach((p, i) => {
      p.hidden = i !== index;
      p.classList.remove("is-in");
    });

    if (!first) {
      const target = panels[index];
      void target.offsetWidth;          // reinicia la animación
      target.classList.add("is-in");
    }
    first = false;
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => show(i));

    tab.addEventListener("keydown", (e) => {
      let next = null;
      if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      if (next === null) return;
      e.preventDefault();
      tabs[next].focus();
      show(next);
    });
  });

  show(0);
})();