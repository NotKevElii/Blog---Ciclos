/* ============ RIEL VERTICAL DE TARJETAS ============
   - Las tarjetas se mueven de forma continua hacia abajo, en bucle infinito.
   - Con la rueda del mouse sobre el riel puedes "transportarte" entre ellas
     (rueda hacia abajo = las tarjetas suben; hacia arriba = bajan). Al soltar,
     el movimiento continuo se retoma solo.
   - Al pasar el mouse (o enfocar un enlace) el movimiento se frena para poder hacer clic.
   - Las tarjetas se desvanecen en los extremos del riel, que sobresale del section.
   - Con "reducir movimiento" activado no se anima: queda una columna con scroll normal.
*/
(() => {
  const rail = document.getElementById("rail");
  const track = document.getElementById("railTrack");
  if (!rail || !track) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    rail.classList.add("rail--static");
    return;
  }

  const SPEED = 32;          // px/s hacia abajo
  const HOVER_FACTOR = 0.15; // velocidad relativa al pasar el mouse
  const FADE = 200;          // px de desvanecido en cada extremo (el centro de la tarjeta llega a -80px antes de desaparecer)

  // Duplicamos el conjunto antes y después para que el bucle sea continuo
  const originals = [...track.children];
  const clones = () =>
    originals.map((n) => {
      const c = n.cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      c.querySelectorAll("a").forEach((a) => (a.tabIndex = -1));
      return c;
    });
  const before = clones();
  const after = clones();
  track.prepend(...before);
  track.append(...after);
  const items = [...track.children];

  let H = 0;                 // alto de un conjunto completo de tarjetas
  let railH = 0;
  let tops = [];
  let heights = [];
  let y = 0;                 // desplazamiento actual del track (entre -H y 0)
  let vel = 0;               // impulso de la rueda (px/s)
  let factor = 1;            // factor de velocidad automática (se suaviza)
  let targetFactor = 1;
  let visible = true;
  let last = performance.now();

  function measure() {
    const prevRatio = H ? (y + H) / H : 0;
    H = after[0].offsetTop - originals[0].offsetTop;
    railH = rail.clientHeight;
    tops = items.map((i) => i.offsetTop);
    heights = items.map((i) => i.offsetHeight);
    y = -H + prevRatio * H;   // conserva la posición relativa tras un resize
    if (!H) y = 0;
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (visible && H) {
      factor += (targetFactor - factor) * Math.min(1, dt * 6);
      y += (SPEED * factor + vel) * dt;
      vel *= Math.exp(-dt * 4);
      if (Math.abs(vel) < 0.5) vel = 0;

      while (y > 0) y -= H;
      while (y < -H) y += H;

      track.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;

      // Desvanecido en los extremos del riel
      for (let i = 0; i < items.length; i++) {
        const center = tops[i] + y + heights[i] / 2;
        const edge = Math.min(center, railH - center);
        const o = Math.max(0, Math.min(1, (edge + 80) / FADE));
        items[i].style.opacity = o >= 1 ? "" : o.toFixed(3);
      }
    }
    requestAnimationFrame(frame);
  }

  // Rueda: moverse entre tarjetas sin que se desplace la página
  rail.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? railH : 1;
      vel -= e.deltaY * unit * 4;
      vel = Math.max(-4000, Math.min(4000, vel));
    },
    { passive: false }
  );

  // Frenar al pasar el mouse o al enfocar un enlace (accesibilidad con teclado)
  rail.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") targetFactor = HOVER_FACTOR; });
  rail.addEventListener("pointerleave", () => { targetFactor = 1; });
  rail.addEventListener("focusin", () => { targetFactor = 0; });
  rail.addEventListener("focusout", () => { targetFactor = 1; });

  // No gastar CPU cuando el riel no se ve
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }).observe(rail);
  }

  window.addEventListener("resize", measure);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
    measure();
    y = -H;                   // arranca mostrando el conjunto original arriba
  });
  window.addEventListener("load", measure);

  measure();
  y = -H;
  requestAnimationFrame(frame);
})();