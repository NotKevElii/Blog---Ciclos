/* ============ PÁGINA DE COMENTARIOS (versión FormSubmit) ============
   - Gmail obligatorio para comentar.
   - El comentario SIEMPRE se publica en la página (se guarda en este navegador).
   - Además se envía por correo a mythos.isw@gmail.com mediante FormSubmit
     (sin servidor ni cuenta). Solo se reenvía a mythos; la persona no recibe correo.
   - Solo el autor (mismo Gmail) puede eliminar su comentario.
   - Textos en español/inglés sincronizados con translate.js.

   IMPORTANTE:
   * La primera vez, FormSubmit manda un correo de ACTIVACIÓN a mythos.isw@gmail.com:
     hay que abrirlo y pulsar el botón de confirmar. Los mensajes enviados antes de
     activar quedan retenidos y se entregan al activar.
   * Debe abrirse desde un sitio web (hosting o servidor local), no con doble clic.
   * Los comentarios visibles son los de cada navegador (localStorage).
*/

const MAIL_TO = "mythos.isw@gmail.com";
const MAIL_ENDPOINT = "https://formsubmit.co/ajax/" + MAIL_TO;

(() => {
  const KEY = "mythos-comments";
  const SESSION_KEY = "mythos-email";
  const LANG_KEY = "mythos-lang";
  const MAX = 500;
  const COOLDOWN_MS = 15000;      // espera mínima entre envíos (anti-spam)
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EASE = "cubic-bezier(.17, .17, .34, 1)";

  const $ = (id) => document.getElementById(id);
  const form = $("commentForm");
  const nameInput = $("cName");
  const emailInput = $("cEmail");
  const textInput = $("cText");
  const sendBtn = $("sendBtn");
  const charCount = $("charCount");
  const ring = $("ring");
  const ringFg = $("ringFg");
  const status = $("formStatus");
  const list = $("commentList");
  const empty = $("commentEmpty");
  const count = $("commentCount");

  // Campo trampa anti-bots (invisible para personas)
  const hp = document.createElement("input");
  hp.type = "text";
  hp.name = "_honey";
  hp.tabIndex = -1;
  hp.autocomplete = "off";
  hp.setAttribute("aria-hidden", "true");
  hp.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0";
  form.append(hp);

  /* ---------- Textos (es / en) ---------- */
  const I18N = {
    es: {
      locale: "es-MX",
      phText: "Escribe tu comentario…",
      phName: "Tu nombre (opcional)",
      phEmail: "tucorreo@gmail.com",
      send: "Publicar comentario",
      anon: "Anónimo",
      del: "Eliminar",
      sure: "¿Seguro?",
      now: "justo ahora",
      min: (n) => `hace ${n} min`,
      hour: (n) => `hace ${n} h`,
      day: (n) => `hace ${n} d`,
      needText: "Escribe un comentario antes de publicar.",
      needEmail: "Escribe tu correo de Gmail para comentar.",
      badEmail: "Usa una dirección de Gmail válida (ejemplo@gmail.com).",
      wait: "Espera unos segundos antes de enviar otro comentario.",
      sending: "Comentario publicado. Enviando por correo…",
      postedMail: "Comentario publicado y enviado al equipo.",
      needActivation: "Comentario publicado. El correo quedó pendiente: falta confirmar la activación de FormSubmit en mythos.isw@gmail.com.",
      mailFail: "Comentario publicado, pero no se pudo enviar el aviso por correo.",
      notSaved: "Se publicó, pero no se pudo guardar en este navegador.",
      notYours: "Solo puedes eliminar tus propios comentarios.",
    },
    en: {
      locale: "en-US",
      phText: "Write your comment…",
      phName: "Your name (optional)",
      phEmail: "youremail@gmail.com",
      send: "Post comment",
      anon: "Anonymous",
      del: "Delete",
      sure: "Sure?",
      now: "just now",
      min: (n) => `${n} min ago`,
      hour: (n) => `${n} h ago`,
      day: (n) => `${n} d ago`,
      needText: "Write a comment before posting.",
      needEmail: "Enter your Gmail address to comment.",
      badEmail: "Use a valid Gmail address (example@gmail.com).",
      wait: "Wait a few seconds before sending another comment.",
      sending: "Comment posted. Sending by email…",
      postedMail: "Comment posted and sent to the team.",
      needActivation: "Comment posted. The email is pending: FormSubmit activation still has to be confirmed at mythos.isw@gmail.com.",
      mailFail: "Comment posted, but the email notice could not be sent.",
      notSaved: "Posted, but it could not be saved in this browser.",
      notYours: "You can only delete your own comments.",
    },
  };
  const getLang = () => {
    try { return localStorage.getItem(LANG_KEY) === "en" ? "en" : "es"; }
    catch (e) { return "es"; }
  };
  const T = () => I18N[getLang()];
  let fullFmt = new Intl.DateTimeFormat(T().locale, { dateStyle: "medium", timeStyle: "short" });

  /* ---------- Utilidad de animación ---------- */
  function animate(el, frames, opts) {
    if (reduce || !el.animate) return Promise.resolve();
    return el.animate(frames, { easing: EASE, fill: "both", ...opts }).finished.catch(() => {});
  }

  /* ---------- Navbar ---------- */
  const nav = $("nav");
  const toggle = $("navToggle");
  const panel = $("navPanel");
  if (toggle && panel) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
    });
  }
  const onScroll = () => nav && nav.classList.toggle("is-scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Entrada de la página ---------- */
  function playIntro() {
    const items = document.querySelectorAll("[data-in]");
    items.forEach((el, i) => {
      const done = () => { el.style.opacity = "1"; };
      if (reduce || !el.animate) { done(); return; }
      el.animate(
        [
          { opacity: 0, transform: "translateY(22px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 800, delay: 120 + i * 110, easing: EASE, fill: "both" }
      ).finished.then(() => { done(); }).catch(done);
    });
  }

  /* ---------- Almacenamiento local ---------- */
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(data) ? data.sort((a, b) => a.date - b.date) : [];
    } catch (e) {
      return [];
    }
  }
  function save(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); return true; }
    catch (e) { return false; }
  }

  let comments = load();

  /* ---------- Gmail: validación y normalización ---------- */
  function canon(raw) {
    const m = String(raw || "").trim().toLowerCase()
      .match(/^([a-z0-9._+-]+)@(gmail|googlemail)\.com$/);
    if (!m) return null;
    const base = m[1].split("+")[0];
    if (base.includes("..")) return null;
    if (!/^[a-z0-9][a-z0-9.]{4,28}[a-z0-9]$/.test(base)) return null;
    return base.replace(/\./g, "") + "@gmail.com";
  }

  let sessionRaw = "";
  try { sessionRaw = localStorage.getItem(SESSION_KEY) || ""; } catch (e) {}
  let me = canon(sessionRaw);
  if (me) emailInput.value = sessionRaw;

  function setSession(raw, owner) {
    me = owner;
    try { localStorage.setItem(SESSION_KEY, raw); } catch (e) {}
  }

  const isMine = (id) => {
    const c = comments.find((x) => x.id === id);
    return !!(me && c && c.owner === me);
  };

  function updateOwnership() {
    list.querySelectorAll(".comment").forEach((li) => {
      const mine = isMine(li.dataset.id);
      li.classList.toggle("is-mine", mine);
      const del = li.querySelector(".comment__del");
      if (del) del.hidden = !mine;
    });
  }

  /* ---------- Colores de avatar ---------- */
  const PALETTE = [
    ["rgba(255, 122, 61, .18)", "#b84a14"],
    ["rgba(163, 154, 28, .22)", "#6b6411"],
    ["rgba(232, 169, 12, .22)", "#8a6200"],
    ["rgba(43, 37, 35, .12)", "#2b2523"],
    ["rgba(150, 75, 40, .16)", "#7a3a1e"],
  ];
  function paletteFor(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  /* ---------- Fechas ---------- */
  function relative(ts) {
    const t = T();
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 45) return t.now;
    if (s < 3600) return t.min(Math.round(s / 60));
    if (s < 86400) return t.hour(Math.round(s / 3600));
    if (s < 86400 * 7) return t.day(Math.round(s / 86400));
    return fullFmt.format(new Date(ts));
  }
  function refreshTimes() {
    list.querySelectorAll(".comment__time").forEach((el) => {
      const ts = Number(el.dataset.ts);
      el.textContent = relative(ts);
      el.title = fullFmt.format(new Date(ts));
    });
  }
  setInterval(refreshTimes, 30000);

  /* ---------- Construcción de un comentario ---------- */
  function buildItem(c) {
    const li = document.createElement("li");
    li.className = "comment";
    li.dataset.id = c.id;

    const display = c.name || T().anon;
    const [bg, fg] = paletteFor(display);

    const avatar = document.createElement("span");
    avatar.className = "comment__avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.setAttribute("translate", "no");
    avatar.style.setProperty("--av-bg", bg);
    avatar.style.setProperty("--av-fg", fg);
    avatar.textContent = display.charAt(0).toUpperCase();

    const body = document.createElement("div");
    body.className = "comment__body";

    const head = document.createElement("div");
    head.className = "comment__head";

    const name = document.createElement("strong");
    name.className = "comment__name";
    name.setAttribute("translate", "no");
    if (!c.name) name.dataset.anon = "";
    name.textContent = display;

    const time = document.createElement("time");
    time.className = "comment__time";
    time.setAttribute("translate", "no");
    time.dateTime = new Date(c.date).toISOString();
    time.dataset.ts = String(c.date);
    time.title = fullFmt.format(new Date(c.date));
    time.textContent = relative(c.date);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "comment__del";
    del.setAttribute("translate", "no");
    del.textContent = T().del;
    del.hidden = true;
    let timer;
    del.addEventListener("click", () => {
      if (!isMine(c.id)) { say("notYours"); return; }
      if (!del.classList.contains("is-confirm")) {
        del.classList.add("is-confirm");
        del.textContent = T().sure;
        timer = setTimeout(() => {
          del.classList.remove("is-confirm");
          del.textContent = T().del;
        }, 3000);
        return;
      }
      clearTimeout(timer);
      removeItem(c.id, li);
    });

    head.append(name, time, del);

    const text = document.createElement("p");
    text.className = "comment__text";
    text.textContent = c.text;

    body.append(head, text);
    li.append(avatar, body);
    return li;
  }

  function updateMeta() {
    count.textContent = String(comments.length);
    empty.hidden = comments.length > 0;
  }

  /* ---------- Mensajes de estado ---------- */
  let statusKey = "";
  function say(key) {
    statusKey = key;
    status.textContent = key ? T()[key] : "";
  }

  /* ---------- Render inicial ---------- */
  function renderAll() {
    list.replaceChildren(...comments.map(buildItem));
    updateMeta();
    updateOwnership();
    list.querySelectorAll(".comment").forEach((li, i) => {
      animate(li, [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }],
        { duration: 600, delay: 500 + i * 70 });
    });
  }

  /* ---------- Agregar ---------- */
  function addItem(c) {
    comments.push(c);
    const ok = save(comments);
    const li = buildItem(c);
    list.append(li);
    updateMeta();
    updateOwnership();

    animate(li, [
      { opacity: 0, transform: "translateY(24px) scale(.98)" },
      { opacity: 1, transform: "none" },
    ], { duration: 650 });

    animate(li, [
      { backgroundColor: "rgba(255, 122, 61, .18)" },
      { backgroundColor: "rgba(255, 122, 61, 0)" },
    ], { duration: 2400, easing: "ease-out" });

    li.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    return ok;
  }

  /* ---------- Eliminar (solo el autor) ---------- */
  async function removeItem(id, li) {
    if (!isMine(id)) { say("notYours"); return; }
    comments = comments.filter((x) => x.id !== id);
    save(comments);
    const h = li.getBoundingClientRect().height;
    await animate(li, [
      { opacity: 1, height: `${h}px` },
      { opacity: 0, height: "0px", paddingTop: "0px", paddingBottom: "0px", borderBottomWidth: "0px" },
    ], { duration: 380, easing: "ease-in-out" });
    li.remove();
    updateMeta();
  }

  /* ---------- Envío por correo (FormSubmit) ---------- */
  // Devuelve "ok", "activation" o "fail"
  async function sendMail({ name, email, text }) {
    const res = await fetch(MAIL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: name || "Anónimo",
        email,                                   // para poder responderle directamente
        message: text,
        _subject: "Nuevo comentario en el Blog Ciclos",
        _template: "table",
        _captcha: "false",
        _honey: hp.value,
      }),
    });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    console.log("Respuesta de FormSubmit:", res.status, data);
    if (/activ/i.test(String(data.message || ""))) return "activation";
    if (res.ok && String(data.success) === "true") return "ok";
    return "fail";
  }

  /* ---------- Compositor ---------- */
  let busy = false;
  let lastSent = 0;
  const C = 2 * Math.PI * 10;
  function syncComposer() {
    const len = textInput.value.length;
    const has = textInput.value.trim().length > 0;
    sendBtn.disabled = busy || !has;

    ringFg.style.strokeDashoffset = String(C * (1 - len / MAX));
    ring.classList.toggle("is-warn", len > MAX * 0.9);
    charCount.textContent = len > MAX * 0.8 ? String(MAX - len) : "";

    textInput.style.height = "auto";
    textInput.style.height = Math.min(textInput.scrollHeight, 420) + "px";
  }
  textInput.addEventListener("input", () => { say(""); syncComposer(); });
  nameInput.addEventListener("input", () => say(""));
  emailInput.addEventListener("input", () => {
    say("");
    emailInput.removeAttribute("aria-invalid");
  });

  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  function invalidEmail(key) {
    say(key);
    emailInput.setAttribute("aria-invalid", "true");
    emailInput.focus();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;

    const text = textInput.value.trim();
    if (!text) {
      say("needText");
      textInput.focus();
      return;
    }

    const raw = emailInput.value.trim();
    if (!raw) return invalidEmail("needEmail");
    const owner = canon(raw);
    if (!owner) return invalidEmail("badEmail");

    if (hp.value) return;                                   // bot
    if (Date.now() - lastSent < COOLDOWN_MS) { say("wait"); return; }

    const name = nameInput.value.trim().slice(0, 40);
    const email = raw.toLowerCase();

    // 1) Publicar siempre en la página
    comments.forEach((c) => { if (!c.owner) c.owner = owner; });
    setSession(email, owner);
    const saved = addItem({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name,
      text: text.slice(0, MAX),
      date: Date.now(),
      owner,
    });
    animate(sendBtn, [{ transform: "scale(1)" }, { transform: "scale(.88)" }, { transform: "scale(1)" }],
      { duration: 350 });
    textInput.value = "";

    // 2) Enviar el correo
    busy = true;
    lastSent = Date.now();
    syncComposer();
    say("sending");
    try {
      const r = await sendMail({ name, email, text: text.slice(0, MAX) });
      say(r === "ok" ? "postedMail" : r === "activation" ? "needActivation" : "mailFail");
    } catch (err) {
      console.error("Error al enviar el correo:", err);
      say("mailFail");
    } finally {
      busy = false;
      syncComposer();
    }
    if (!saved) say("notSaved");
  });

  /* ---------- Idioma (sincronizado con translate.js) ---------- */
  function applyLang() {
    const t = T();
    fullFmt = new Intl.DateTimeFormat(t.locale, { dateStyle: "medium", timeStyle: "short" });
    textInput.placeholder = t.phText;
    nameInput.placeholder = t.phName;
    emailInput.placeholder = t.phEmail;
    sendBtn.setAttribute("aria-label", t.send);
    refreshTimes();
    list.querySelectorAll(".comment__name[data-anon]").forEach((n) => { n.textContent = t.anon; });
    list.querySelectorAll(".comment__del").forEach((b) => {
      b.textContent = b.classList.contains("is-confirm") ? t.sure : t.del;
    });
    if (statusKey) say(statusKey);
  }
  window.addEventListener("mythos:lang", applyLang);

  /* ---------- Inicio ---------- */
  renderAll();
  applyLang();
  syncComposer();
  playIntro();
})();