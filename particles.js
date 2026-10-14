/* ============ FONDO: PARTÍCULAS ANIMADAS ============
   Burbujas y líneas que cruzan la pantalla en direcciones y velocidades
   aleatorias. Al salir del canvas se genera otra en un punto aleatorio
   (aparece con fundido). Las líneas giran a velocidades distintas y en
   ambos sentidos.

   Ajustes para teléfono (el aspecto en escritorio no cambia):
   - La velocidad se calcula con el tiempo real entre fotogramas: en pantallas de
     90/120 Hz las partículas ya no van el doble de rápido.
   - Resolución del canvas limitada (devicePixelRatio máx. 2 en escritorio, 1.5 en teléfono).
   - Menos partículas en teléfono.
   - El canvas NO se redimensiona cuando solo cambia la altura un poco: en móvil la
     barra del navegador aparece y desaparece al hacer scroll y eso disparaba un
     resize (y un parpadeo) constantemente.
   - Se pausa cuando la pestaña no está visible (ahorra batería).
   - Con "reducir movimiento" o "ahorro de datos" se dibuja un solo fotograma.

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

  const phoneMQ = window.matchMedia("(max-width: 860px)");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const still = reduceMotion || saveData;     // fotograma estático
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
      this.alpha = still ? 0.6 : 0.1;   // fade-in al aparecer
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

    // k = fotogramas "de 60 Hz" transcurridos (1 a 60 fps, 0.5 a 120 fps)
    update(k) {
      if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + 0.01 * k);
      this.x += this.vx * k;
      this.y += this.vy * k;
      if (this.type === "line") {
        const step = (Math.PI / this.rotateSpeed) * k;
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
    const phone = phoneMQ.matches;
    const dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = Math.round(state.width * dpr);
    canvas.height = Math.round(state.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // densidad proporcional al área (≈70 en 1000×800), con límites (más bajos en teléfono)
    state.max = Math.max(30, Math.min(phone ? 40 : 120, Math.round((state.width * state.height) / 11500)));
  }

  // Resize "inteligente": ignora los cambios de altura pequeños (barra del navegador móvil)
  let rzTimer = 0;
  function onResize() {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const sameWidth = w === state.width;
      if (sameWidth && Math.abs(h - state.height) < 160) return;
      resize();
      fill();
      if (still) render();
    }, 150);
  }

  function fill() {
    while (state.particles.length < state.max) state.particles.push(new Particle());
  }

  function render() {
    ctx.clearRect(0, 0, state.width, state.height);
    for (const p of state.particles) p.draw();
  }

  let raf = 0;
  let last = 0;
  function tick(now) {
    const k = last ? Math.min(3, (now - last) / 16.667) : 1;   // máx. 3 para no "saltar" tras una pausa
    last = now;
    state.particles = state.particles.filter((p) => p.update(k));
    if (state.particles.length < state.max - 5) fill();
    render();
    raf = requestAnimationFrame(tick);
  }
  function start() { if (!raf && !still) { last = 0; raf = requestAnimationFrame(tick); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  resize();
  fill();
  window.addEventListener("resize", onResize);
  if (still) {
    render();                       // fotograma estático
  } else {
    start();
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  }

  window.MythOSParticles = {
    reload() {
      state.particles = [];
      ctx.clearRect(0, 0, state.width, state.height);
      fill();
      if (still) render();
    },
    log(type = null) {
      console.log(type ? state.particles.filter((p) => p.type === type) : state.particles);
    },
  };
})();
