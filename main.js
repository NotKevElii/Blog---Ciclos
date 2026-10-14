/* ============ ANIMACIONES (GSAP) ============
   - Imágenes con clase .reveal-img: se revelan por columnas (tipo persiana)
     mientras la foto se desliza hacia arriba.
       · la del hero, al cargar la página
       · las demás, al entrar en pantalla con scroll
   - Texto del hero y encabezado de entradas: sube línea por línea.
   - Tarjetas del blog: aparecen con scroll (y revelan su imagen).

   Requiere GSAP 3.13+ (CustomEase, SplitText y ScrollTrigger, ya gratuitos).
   Si no cargan, el usuario prefiere menos movimiento o es un teléfono (≤ 860px),
   la página se ve normal, sin estas animaciones.

   NOTA: este archivo antes incluía además copias del fondo de partículas y del
   traductor. Ya existen como particles.js y translate.js (que index.html también
   carga), así que corrían dos veces; se quitaron de aquí.
*/
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = window.matchMedia("(max-width: 860px)").matches;
  const ready = window.gsap && window.CustomEase && window.SplitText && window.ScrollTrigger;

  if (reduce || phone || !ready) {
    root.classList.remove("will-animate");
    return;
  }

  gsap.registerPlugin(CustomEase, SplitText, ScrollTrigger);
  const easeIn = CustomEase.create("mythos-in", "0.47, 0.00, 0.49, 1.00");
  const easeIn2 = CustomEase.create("mythos-in-2", "0.17, 0.17, 0.34, 1.00");

  const COLUMN_WIDTH = 30;

  // Crea las columnas que tapan la imagen (cada una con su fondo)
  function createColumns(el) {
    const wrap = document.createElement("div");
    wrap.className = "reveal-cols";
    const count = Math.ceil(el.offsetWidth / COLUMN_WIDTH);
    for (let i = 0; i < count; i++) {
      const col = document.createElement("div");
      const bg = document.createElement("div");
      col.className = "col";
      bg.className = "col__bg";
      col.appendChild(bg);
      wrap.appendChild(col);
    }
    el.appendChild(wrap);
    return wrap;
  }

  // Devuelve un timeline: las columnas se abren y la foto sube
  function revealImage(el) {
    const img = el.querySelector("img");
    const wrap = createColumns(el);
    const bgs = wrap.querySelectorAll(".col__bg");
    return gsap
      .timeline({ onComplete: () => wrap.remove() })
      .to(bgs, { scaleX: 0, duration: 1, ease: easeIn }, 0)
      .to(img, { top: "-20%", duration: 1.333, ease: easeIn2 }, 0.1);
  }

  function init() {
    /* ---------- HERO (al cargar) ---------- */
    const heroArt = document.querySelector(".hero__art");
    const h1 = SplitText.create(".hero h1", { type: "lines", mask: "lines" });
    const p = SplitText.create(".hero__copy p", { type: "lines", mask: "lines" });

    gsap.set([...h1.lines, ...p.lines], { yPercent: 110 });
    gsap.set(".hero__cta", { autoAlpha: 0, y: 30 });

    gsap
      .timeline({ delay: 0.15 })
      .add(revealImage(heroArt), 0)
      .to(h1.lines, { yPercent: 0, duration: 0.833, ease: easeIn2, stagger: 0.0666 }, 0.2)
      .to(p.lines, { yPercent: 0, duration: 0.833, ease: easeIn2, stagger: 0.0666 }, 0.4)
      .to(".hero__cta", { autoAlpha: 1, y: 0, duration: 0.833, ease: easeIn2, clearProps: "transform" }, 0.7)
      .call(() => { h1.revert(); p.revert(); });   // devuelve el texto a su estado normal (responsive)

    /* ---------- ENCABEZADO DE ENTRADAS (scroll) ---------- */
    const h2 = SplitText.create(".posts h2", { type: "lines", mask: "lines" });
    gsap.set(h2.lines, { yPercent: 110 });
    ScrollTrigger.create({
      trigger: ".posts h2",
      start: "top 90%",
      once: true,
      onEnter: () =>
        gsap.to(h2.lines, {
          yPercent: 0, duration: 0.833, ease: easeIn2, stagger: 0.0666,
          onComplete: () => h2.revert(),
        }),
    });

    /* ---------- TARJETAS (scroll) ---------- */
    document.querySelectorAll(".card").forEach((card) => {
      gsap.set(card, { autoAlpha: 0, y: 40 });
      card.classList.add("is-reveal");           // desactiva su transición CSS mientras anima

      ScrollTrigger.create({
        trigger: card,
        start: "top 88%",
        once: true,
        onEnter: () => {
          const tl = gsap.timeline({
            onComplete: () => {
              card.classList.remove("is-reveal");
              gsap.set(card, { clearProps: "transform,opacity,visibility" });
            },
          });
          tl.to(card, { autoAlpha: 1, y: 0, duration: 0.833, ease: easeIn2 }, 0);
          const media = card.querySelector(".reveal-img");
          if (media) tl.add(revealImage(media), 0.15);
        },
      });
    });

    /* ---------- CUALQUIER OTRA IMAGEN .reveal-img (scroll) ---------- */
    document.querySelectorAll(".reveal-img").forEach((el) => {
      if (el.closest(".hero") || el.closest(".card")) return;
      const tl = revealImage(el).pause();
      ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        once: true,
        onEnter: () => tl.play(),
      });
    });

    // Todo está en su estado inicial: ya se puede mostrar la página
    root.classList.remove("will-animate");
    ScrollTrigger.refresh();
  }

  // Esperar a las tipografías para que SplitText mida bien las líneas
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(init);
})();
