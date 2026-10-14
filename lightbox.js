/* ============ VISOR AMPLIADO DEL MAPA CURRICULAR ============
   Al hacer clic en una imagen con [data-lightbox] se abre una vista ampliada:
   - clic en la imagen: alterna entre "ajustada a la pantalla" y "tamaño grande" (con desplazamiento)
   - cerrar: botón ✕, tecla Esc o clic fuera de la imagen
   Si el JavaScript no carga, el enlace abre la imagen en una pestaña nueva.
*/
(() => {
  const triggers = document.querySelectorAll("a[data-lightbox]");
  if (!triggers.length) return;

  let box, img, closeBtn, lastFocus;

  function build() {
    box = document.createElement("div");
    box.className = "lightbox";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Mapa curricular ampliado");

    img = document.createElement("img");
    img.className = "lightbox__img";

    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "lightbox__close";
    closeBtn.setAttribute("aria-label", "Cerrar");
    closeBtn.textContent = "✕";

    const hint = document.createElement("div");
    hint.className = "lightbox__hint";
    hint.textContent = window.matchMedia("(hover: none)").matches
      ? "Toca la imagen para acercar · ✕ para cerrar"
      : "Clic en la imagen para acercar · Esc para cerrar";

    box.append(img, closeBtn, hint);
    document.body.appendChild(box);

    closeBtn.addEventListener("click", close);
    // clic fuera de la imagen cierra; clic en la imagen alterna el zoom
    box.addEventListener("click", (e) => {
      if (e.target === img) box.classList.toggle("is-zoomed");
      else if (e.target !== closeBtn) close();
    });
  }

  function open(a) {
    if (!box) build();
    lastFocus = document.activeElement;
    const thumb = a.querySelector("img");
    img.src = a.getAttribute("href");
    img.alt = thumb ? thumb.alt : "";
    box.classList.remove("is-zoomed");
    box.hidden = false;
    box.scrollTop = 0;
    box.scrollLeft = 0;
    document.body.classList.add("lb-open");
    closeBtn.focus();
  }

  function close() {
    if (!box || box.hidden) return;
    box.hidden = true;
    box.classList.remove("is-zoomed");
    document.body.classList.remove("lb-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  triggers.forEach((a) =>
    a.addEventListener("click", (e) => {
      // respeta Ctrl/Cmd+clic y clic central (abrir en pestaña nueva)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      open(a);
    })
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
})();