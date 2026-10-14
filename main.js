/* ============ ANIMACIONES (GSAP) ============
   - Imágenes con clase .reveal-img: se revelan por columnas (tipo persiana)
     mientras la foto se desliza hacia arriba.
       · la del hero, al cargar la página
       · las demás, al entrar en pantalla con scroll
   - Texto del hero y encabezado de entradas: sube línea por línea.
   - Tarjetas del blog: aparecen con scroll (y revelan su imagen).

   Requiere GSAP 3.13+ (CustomEase, SplitText y ScrollTrigger, ya gratuitos).
   Si no cargan o el usuario prefiere menos movimiento, la página se ve normal.
*/
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ready = window.gsap && window.CustomEase && window.SplitText && window.ScrollTrigger;

  if (reduce || !ready) {
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

/* ============ FONDO: PARTÍCULAS ANIMADAS ============
   Burbujas y líneas que cruzan la pantalla en direcciones y velocidades
   aleatorias. Al salir del canvas se genera otra en un punto aleatorio
   (aparece con fundido). Las líneas giran a velocidades distintas y en
   ambos sentidos.
 
   Depuración desde la consola:
     MythOSParticles.reload()
     MythOSParticles.log()          // todas
     MythOSParticles.log('bubble')  // solo burbujas
     MythOSParticles.log('line')    // solo líneas
*/
(() => {
  const canvas = document.getElementById("particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
 
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const OPACITY = 1;
 
  const state = {
    max: 70,
    particles: [],
    width: 0,
    height: 0,
    // más peso al negro, un toque de naranja
    colors: ["#FF5507", "#070E14", "#070E14", "#070E14", "#070E14", "#070E14"],
  };
 
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const sign = () => (Math.random() < 0.5 ? -1 : 1);
 
  function hexToRGBA(hex, alpha) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
 
  let nextId = 0;
 
  class Particle {
    constructor() {
      this.id = nextId++;
      // 4 de cada 5 son burbujas
      this.type = pick(["bubble", "bubble", "bubble", "bubble", "line"]);
      this.x = rand(0, state.width);
      this.y = rand(0, state.height);
      this.vx = sign() * rand(0, 0.4);
      this.vy = sign() * rand(0, 0.4);
      this.alpha = reduceMotion ? 0.6 : 0.1;   // fade-in al aparecer
      this.hex = pick(state.colors);
      this.strokeWidth = Math.max(0.5, rand(0, Math.random() > 0.5 ? 1.5 : 2.5));
 
      if (this.type === "bubble") {
        this.radius = rand(1.5, 7);
      } else {
        this.angle = rand(0, Math.PI * 2);
        this.length = pick([6, 8, 10, 14]);
        this.rotateSpeed = pick([10, 30, 60, 120]);   // menor = gira más rápido
        this.clockwise = Math.random() < 0.5;
      }
    }
 
    update() {
      if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + 0.01);
      this.x += this.vx;
      this.y += this.vy;
      if (this.type === "line") {
        const step = Math.PI / this.rotateSpeed;
        this.angle += this.clockwise ? -step : step;
      }
      return this.inBounds();
    }
 
    inBounds() {
      const m = 10;
      return this.x > -m && this.x < state.width + m && this.y > -m && this.y < state.height + m;
    }
 
    draw() {
      ctx.lineWidth = this.strokeWidth;
      ctx.strokeStyle = hexToRGBA(this.hex, this.alpha * OPACITY); // 1 = opacidad del original; bájalo para más sutileza
      ctx.save();
      ctx.beginPath();
      if (this.type === "bubble") {
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      } else {
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.moveTo(-this.length / 2, 0);
        ctx.lineTo(this.length / 2, 0);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
 
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = state.width * dpr;
    canvas.height = state.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // densidad proporcional al área (≈70 en 1000×800), con límites
    state.max = Math.max(30, Math.min(120, Math.round((state.width * state.height) / 11500)));
  }
 
  function fill() {
    while (state.particles.length < state.max) state.particles.push(new Particle());
  }
 
  function render() {
    ctx.clearRect(0, 0, state.width, state.height);
    for (const p of state.particles) p.draw();
  }
 
  function tick() {
    state.particles = state.particles.filter((p) => p.update());
    if (state.particles.length < state.max - 5) fill();
    render();
    requestAnimationFrame(tick);
  }
 
  resize();
  fill();
  if (reduceMotion) {
    render();                       // fotograma estático
    window.addEventListener("resize", () => { resize(); fill(); render(); });
  } else {
    tick();
    window.addEventListener("resize", resize);
  }
 
  window.MythOSParticles = {
    reload() {
      state.particles = [];
      ctx.clearRect(0, 0, state.width, state.height);
      fill();
    },
    log(type = null) {
      console.log(type ? state.particles.filter((p) => p.type === type) : state.particles);
    },
  };
})();

/* ============ TRADUCIR (español ⇄ inglés) ============
   Usa el widget gratuito de Google Translate, oculto, y lo controlamos
   desde nuestro propio botón (.js-translate).
   - Recuerda el idioma elegido en localStorage.
   - El botón muestra el idioma al que se cambiará ("English" / "Español").
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
 