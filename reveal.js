/* ============ ENTRADA DE IMÁGENES (mapa y tarjetas del riel) ============
   Mismo efecto que la imagen del hero: columnas tipo persiana que se abren
   mientras la foto se acerca un poco. Se dispara cuando el elemento entra
   en pantalla. Requiere GSAP + CustomEase (ya cargados en la página).
   Si GSAP no carga o el usuario prefiere menos movimiento, no hace nada.
*/
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !window.gsap || !window.CustomEase) return;

  gsap.registerPlugin(CustomEase);
  const easeOpen = CustomEase.create("mythos-open", "0.47, 0.00, 0.49, 1.00");
  const easeZoom = CustomEase.create("mythos-zoom", "0.17, 0.17, 0.34, 1.00");
  const COLUMN_WIDTH = 30;

  // Tapa el elemento con columnas del color de fondo y prepara la foto
  function cover(el) {
    const img = el.querySelector("img");
    if (!img) return null;
    const wrap = document.createElement("div");
    wrap.className = "reveal-cols";
    const count = Math.ceil(el.offsetWidth / COLUMN_WIDTH) || 1;
    for (let i = 0; i < count; i++) {
      const col = document.createElement("div");
      const bg = document.createElement("div");
      col.className = "col";
      bg.className = "col__bg";
      col.appendChild(bg);
      wrap.appendChild(col);
    }
    el.appendChild(wrap);
    gsap.set(img, { scale: 1.18 });
    return { el, img, wrap };
  }

  function play({ img, wrap }, delay = 0) {
    const bgs = wrap.querySelectorAll(".col__bg");
    gsap
      .timeline({ delay, onComplete: () => wrap.remove() })
      .to(bgs, { scaleX: 0, duration: 1, ease: easeOpen }, 0)
      .to(img, { scale: 1, duration: 1.4, ease: easeZoom }, 0);
  }

  // Ejecuta fn una sola vez cuando el elemento entra en pantalla
  function onceVisible(target, fn, threshold = 0.15) {
    if (!("IntersectionObserver" in window)) { fn(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { threshold });
    io.observe(target);
  }

  function init() {
    // Mapa curricular
    const mapMedia = document.querySelector(".mapa__media");
    if (mapMedia) {
      const c = cover(mapMedia);
      if (c) onceVisible(mapMedia, () => play(c));
    }

    // Imágenes de las tarjetas del riel (originales y copias del bucle)
    const rail = document.getElementById("rail");
    if (rail) {
      const covers = [...rail.querySelectorAll(".card__media")].map(cover).filter(Boolean);
      const perSet = Math.max(1, covers.length / 3);   // el riel tiene 3 copias del conjunto
      onceVisible(rail, () => covers.forEach((c, i) => play(c, (i % perSet) * 0.14)), 0.1);
    }
  }

  // Esperar a que rail.js haya creado las copias de las tarjetas
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();