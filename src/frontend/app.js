// para evitar problemas de CSP/CORS cuando se sirve tras Nginx.
console.debug("[SPM] app.js loaded");
function showFatal(message, details = "") {
  try {
    console.error("[fatal]", message, details);
  } catch (_ignored) {}
  let banner = document.getElementById("fatal-overlay");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "fatal-overlay";
    Object.assign(banner.style, {
      position: "fixed",
      top: "16px",
      right: "16px",
      maxWidth: "360px",
      zIndex: 100000,
      background: "#ef4444",
      color: "#fff",
      padding: "12px 16px",
      borderRadius: "8px",
      boxShadow: "0 12px 32px rgba(0,0,0,.45)",
      font: "13px/1.4 sans-serif",
    });
    const title = document.createElement("div");
    title.className = "fatal-title";
    title.style.fontWeight = "600";
    banner.appendChild(title);
    const pre = document.createElement("pre");
    pre.className = "fatal-details";
    pre.style.marginTop = "8px";
    pre.style.whiteSpace = "pre-wrap";
    pre.style.font = "12px/1.4 monospace";
    pre.style.display = "none";
    banner.appendChild(pre);
    (document.body || document.documentElement).appendChild(banner);
  }
  const titleEl = banner.querySelector(".fatal-title");
  if (titleEl) {
    titleEl.textContent = message;
  }
  const detailsEl = banner.querySelector(".fatal-details");
  if (detailsEl) {
    detailsEl.textContent = details || "";
    detailsEl.style.display = details ? "block" : "none";
  }
}
window.addEventListener("error", (event) => {
  const detail = event?.error?.stack || event?.message || String(event);
  showFatal("JS error on startup", detail);
});
window.addEventListener("unhandledrejection", (event) => {
  showFatal("Promise rejection", String(event?.reason || event));
});
// Asegura que el contenido sea visible al cargar la pagina
window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('is-ready');
});
const API = (function () {
  if (location.protocol === "file:") {
    return "http://127.0.0.1:5000/api";
  }
  return `${location.origin}/api`;
})();
const $ = (sel) => document.querySelector(sel);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

function ensureToastsContainer() {
  let container = document.getElementById("toasts");
  if (!container) {
    container = document.createElement("div");
    container.id = "toasts";
    document.body.appendChild(container);
  }
  container.classList.add("toasts");
  container.setAttribute("aria-live", "polite");
  container.setAttribute("role", "status");
  return container;
}

const REFRESH_TOKEN_KEY = "spm.refreshToken";
let refreshPromise = null;

function getStoredRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (_err) {
    return null;
  }
}

function setStoredRefreshToken(token) {
  try {
    if (!token) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  } catch (_err) {
    // ignore storage failures
  }
}

function clearStoredAuthTokens() {
  refreshPromise = null;
  setStoredRefreshToken(null);
}

function getToken() {
  return getStoredRefreshToken();
}

function setToken(token) {
  if (!token) {
    clearStoredAuthTokens();
    return;
  }
  setStoredRefreshToken(token);
}

function clearToken() {
  clearStoredAuthTokens();
}

function renderLogin(root) {
  if (!root) {
    showFatal("No se encontró el contenedor principal", "#app missing");
    return;
  }
  document.body?.classList.add("auth-body");
  root.innerHTML = `
    <div class="auth-frame">
      <aside class="auth-showcase">
        <div class="auth-showcase__backdrop" aria-hidden="true"></div>
        <img src="/assets/spm-logo.png" alt="Logotipo de SPM" class="auth-showcase__logo"/>
        <p class="auth-showcase__tagline">Solicitudes Puntuales de Materiales</p>
      </aside>
      <section class="auth-main">
        <div class="auth-card">
          <header class="auth-card__header">
            <h1>Ingresa a SPM</h1>
            <p class="auth-card__lead">Utiliza tu mail o ID SPM para continuar.</p>
          </header>
          <form class="auth-card__form" id="auth" autocomplete="off" novalidate>
            <div class="field">
              <label for="id">Usuario (ID SPM o email)</label>
              <input id="id" placeholder="ej. mjimenez o juan@ejemplo.com" autocomplete="username"/>
            </div>
            <div class="field">
              <label for="pw">Contrasena</label>
              <input id="pw" type="password" placeholder="********" autocomplete="current-password"/>
            </div>
            <p class="auth-error hide" id="loginError" role="alert"></p>
            <div class="auth-card__actions">
              <div class="auth-card__links">
                <button class="btn sec" type="button" id="register">Registrar</button>
                <button class="btn sec" type="button" id="recover">Recuperar contrasena</button>
              </div>
              <button class="btn pri auth-card__submit" type="button" id="login">Ingresar</button>
            </div>
          </form>
        </div>
        <div class="auth-main__footer">
          <nav class="landing-footer__social" aria-label="Redes sociales">
            <a href="https://www.facebook.com/" target="_blank" rel="noreferrer noopener" aria-label="Facebook">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 9H15V6h-1.5C11.6 6 10 7.6 10 9.5V11H8v3h2v7h3v-7h2.1l.4-3H13v-1.5c0-.3.2-.5.5-.5Z"></path></svg>
            </a>
            <a href="https://www.youtube.com/" target="_blank" rel="noreferrer noopener" aria-label="YouTube">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2c-.2-.8-.8-1.4-1.6-1.6C18.2 5 12 5 12 5s-6.2 0-8 .6c-.8.2-1.4.8-1.6 1.6C2 9 2 12 2 12s0 3 .4 4.8c.2.8.8 1.4 1.6 1.6 1.8.6 8 .6 8 .6s6.2 0 8-.6c.8-.2 1.4-.8 1.6-1.6.4-1.8.4-4.8.4-4.8s0-3-.4-4.8ZM10 15V9l5 3-5 3Z"></path></svg>
            </a>
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer noopener" aria-label="Instagram">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7a5 5 0 1 0 5 5 5 5 0 0 0-5-5Zm0 8.2A3.2 3.2 0 1 1 15.2 12 3.2 3.2 0 0 1 12 15.2Zm6.4-8.7a1.2 1.2 0 1 1-1.2-1.2 1.2 1.2 0 0 1 1.2 1.2ZM22 7.5a5.5 5.5 0 0 0-1.5-3.9A5.5 5.5 0 0 0 16.6 2C14.8 1.9 9.2 1.9 7.4 2A5.5 5.5 0 0 0 3.5 3.5 5.5 5.5 0 0 0 2 7.4C1.9 9.2 1.9 14.8 2 16.6a5.5 5.5 0 0 0 1.5 3.9A5.5 5.5 0 0 0 7.4 22c1.8.1 7.4.1 9.2 0a5.5 5.5 0 0 0 3.9-1.5 5.5 5.5 0 0 0 1.5-3.9c.1-1.8.1-7.4 0-9.2Zm-2 11a3.2 3.2 0 0 1-1.8 1.8c-1.2.5-4.1.4-5.2.4s-4 .1-5.2-.4A3.2 3.2 0 0 1 6 18.5c-.5-1.2-.4-4.1-.4-5.2s-.1-4 .4-5.2A3.2 3.2 0 0 1 7.8 6c1.2-.5 4.1-.4 5.2-.4s4-.1 5.2.4A3.2 3.2 0 0 1 18 7.8c.5 1.2.4 4.1.4 5.2s.1 4-.4 5.2Z"></path></svg>
            </a>
            <a href="https://www.x.com/" target="_blank" rel="noreferrer noopener" aria-label="X">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 4H16l-4 5-3-5H3.8l6.1 10.3L3.5 20h4.3l4.1-5.1 3.1 5.1h5l-6.5-10.7L20.2 4Z"></path></svg>
            </a>
          </nav>
          <button class="btn sec auth-help" type="button" id="help">Ayuda</button>
        </div>
      </section>
    </div>
    <footer class="auth-footer-line">
      <span>&copy; 2025 SPM - Solicitudes Puntuales de Materiales - Version 1.0 - Neuquen, Patagonia, Argentina - <a href="mailto:manuelremon@live.com.ar">manuelremon@live.com.ar</a> - <a href="tel:+5492994673102">+54 9 299 467 3102</a></span>
    </footer>
    <div class="notification-popup hide" id="notificationPopup">
      <div class="notification-content">
        <span class="notification-icon">!!</span>
        <span class="notification-text" id="notificationText"></span>
        <button class="notification-close" id="notificationClose">&times;</button>
      </div>
    </div>
    <div class="modal-overlay hide" id="registerModal">
      <div class="register-modal">
        <div class="register-modal__header">
          <h2>Crear cuenta</h2>
          <p class="register-modal__lead">Complete sus datos para registrarse en SPM</p>
          <button class="modal-close" id="registerModalClose">&times;</button>
        </div>
        <form id="registerForm" class="register-modal__form">
          <div class="field">
            <label for="registerId">Usuario o Email</label>
            <input id="registerId" type="text" placeholder="ej. mjimenez o juan@empresa.com" required autocomplete="username"/>
            <small>ID SPM o direccion de correo electronico</small>
          </div>
          <div class="field">
            <label for="registerPassword">Contrasena</label>
            <input id="registerPassword" type="password" placeholder="Minimo 6 caracteres" required autocomplete="new-password"/>
            <small>Debe contener al menos 6 caracteres</small>
          </div>
          <div class="field">
            <label for="registerNombre">Nombre</label>
            <input id="registerNombre" type="text" placeholder="Su nombre completo" required autocomplete="given-name"/>
          </div>
          <div class="field">
            <label for="registerApellido">Apellido</label>
            <input id="registerApellido" type="text" placeholder="Su apellido" required autocomplete="family-name"/>
          </div>
          <div class="field">
            <label for="registerRol">Rol</label>
            <select id="registerRol" required>
              <option value="Solicitante">Solicitante</option>
              <option value="Aprobador">Aprobador</option>
              <option value="Administrador">Administrador</option>
            </select>
            <small>Seleccione su rol en la organizacion</small>
          </div>
          <div class="register-modal__actions">
            <button class="btn sec" type="button" id="registerModalCancel">Cancelar</button>
            <button class="btn pri register-modal__submit" type="submit" id="registerModalSubmit">Crear cuenta</button>
          </div>
        </form>
      </div>
    </div>
  `;
  initAuthPage(true);
  const idInput = document.getElementById("id");
  if (idInput) {
    requestAnimationFrame(() => idInput.focus());
  }
}

async function refreshSession() {
  const existing = getStoredRefreshToken();
  if (!existing) {
    return false;
  }
  if (refreshPromise) {
    return refreshPromise;
  }
  console.info("[auth] intentando renovar la sesion");
  refreshPromise = (async () => {
    try {
      const resp = await fetch(`${API}/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: existing })
      });
      if (!resp.ok) {
        const payload = await resp.json().catch(() => ({}));
        const message = payload?.error?.message || "No se pudo renovar la sesion";
        throw new Error(message);
      }
      const data = await resp.json();
      if (!data?.ok) {
        throw new Error(data?.error?.message || "No se pudo renovar la sesion");
      }
      if (data.refresh_token) {
        setStoredRefreshToken(data.refresh_token);
      }
      console.info("[auth] sesion renovada correctamente");
      return true;
    } catch (error) {
      console.error("[auth] fallo al renovar la sesion", error);
      clearStoredAuthTokens();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function toast(msg, typeOrOk = false) {
  const realtimeDisabled = typeof state !== "undefined" && state.preferences && state.preferences.realtimeToasts === false;
  if (typeOrOk === true && realtimeDisabled) {
    return;
  }
  const container = ensureToastsContainer();
  const node = document.createElement("div");
  let variant = "err";
  if (typeof typeOrOk === "string") {
    variant = typeOrOk;
  } else if (typeOrOk === true) {
    variant = "ok";
  }
  if (variant === "ok" && realtimeDisabled) {
    return;
  }
  node.className = `toast ${variant}`;
  node.setAttribute("role", "status");
  node.textContent = msg;
  node.classList.add("enter");
  container.appendChild(node);
  requestAnimationFrame(() => {
    node.classList.add("enter-active");
  });
  setTimeout(() => {
    node.classList.add("fade-out");
    node.addEventListener("transitionend", () => node.remove(), { once: true });
  }, 3400);
}

function shouldSkipRefreshRetry(path) {
  return /\/(login|logout|refresh)$/.test(path);
}

async function buildApiError(res, method = "", path = "") {
  let message = res.statusText || "Error de red";
  let payload;
  try {
    payload = await res.json();
    if (payload?.error?.message) {
      message = payload.error.message;
    } else if (typeof payload?.error === "string") {
      message = payload.error === "invalid_credentials" ? "Usuario o contrasena invalidos" : payload.error;
    }
  } catch (_ignored) {}
  const error = new Error(message);
  error.status = res.status;
  error.statusText = res.statusText;
  error.method = method || undefined;
  error.path = path || undefined;
  error.details = payload;
  if (payload?.error?.code) {
    error.code = payload.error.code;
  } else if (typeof payload?.error === "string") {
    error.code = payload.error;
  }
  return error;
}

async function api(path, opts = {}) {
  const originalBody = opts.body;
  const originalMethod = (opts.method || "GET").toUpperCase();
  const originalHeaders = { ...(opts.headers || {}) };
  const attempt = (method = originalMethod, overrideHeaders = {}) => {
    const headers = {
      "Content-Type": "application/json",
      ...originalHeaders,
      ...overrideHeaders,
    };
    if (typeof FormData !== "undefined" && originalBody instanceof FormData) {
      delete headers["Content-Type"];
    }
    const config = {
      ...opts,
      method,
      credentials: opts.credentials || "include",
      headers,
      body: originalBody,
    };
    if (config.body === undefined) {
      delete config.body;
    }
    return fetch(`${API}${path}`, config);
  };

  let res;
  try {
    res = await attempt();
  } catch (networkError) {
    const error = networkError instanceof Error ? networkError : new Error("Error de red");
    if (typeof error.status !== "number") {
      error.status = 0;
    }
    throw error;
  }

  const canRetry = res.status === 401 && !shouldSkipRefreshRetry(path);
  if (canRetry) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await attempt();
    }
  }

  if (!res.ok && res.status === 405 && (originalMethod === "PATCH" || originalMethod === "PUT")) {
    res = await attempt("POST", { "X-HTTP-Method-Override": originalMethod });
  }

  if (!res.ok) {
    if (res.status === 401 && canRetry) {
      clearStoredAuthTokens();
    }
    throw await buildApiError(res, originalMethod, path);
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  return isJson ? res.json() : res.text();
}
const show = (el) => el.classList.remove("hide");
const hide = (el) => el.classList.add("hide");

function isNotFoundError(err) {
  const msg = (err?.message || "").toLowerCase();
  return msg.includes("no encontrada") || msg.includes("no existe") || msg.includes("notfound");
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(value) {
  if (!value) return "ï¿½";
  const normalised = typeof value === "string" ? value.replace("T", " ") : value;
  const date = new Date(normalised);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "ï¿½";
  }
  return date.toLocaleString();
}

function formatDateOnly(value) {
  if (!value) return "ï¿½";
  const normalised = typeof value === "string" ? value.replace("T", " ") : value;
  const date = new Date(normalised);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "ï¿½";
  }
  return date.toLocaleDateString();
}

function formatPercentage(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "0%";
  }
  if (numeric >= 100) {
    return "100%";
  }
  const digits = numeric >= 10 ? 0 : 1;
  return `${numeric.toFixed(digits)}%`;
}

const ICONS = {
  pencil: `
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M3 17.25V21h3.75l11-11-3.75-3.75-11 11ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"></path>
    </svg>
  `,
  plus: `
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M13 11V5a1 1 0 0 0-2 0v6H5a1 1 0 0 0 0 2h6v6a1 1 0 0 0 2 0v-6h6a1 1 0 0 0 0-2Z"></path>
    </svg>
  `,
};

function handleGlobalActionClick(event) {
  const actionEl = event.target instanceof Element ? event.target.closest("[data-action]") : null;
  if (!actionEl) {
    return;
  }
  const action = actionEl.dataset.action;
  if (action === "logout") {
    event.preventDefault();
    console.info("[nav] accion logout disparada", { id: actionEl.id || null });
    logout();
    return;
  }
  if (action === "account") {
    console.info("[nav] navegando a Mi cuenta", { href: actionEl.getAttribute("href") });
  }
}

document.addEventListener("click", handleGlobalActionClick);

const centersRequestState = {
  modal: null,
  selected: new Set(),
  options: [],
  existing: new Set(),
  keyListenerBound: false,
};

const ANIMATED_SELECTORS = [
  ".pane",
  ".card",
  ".metric-card",
  ".notification-item",
  ".detail-section",
  ".content-section > *:not(.page-header)",
  ".admin-material-detail",
  ".admin-user-detail",
  ".archivos-adjuntos",
];
const REDUCED_MOTION_MEDIA = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
const dynamicFilterHandlers = new WeakMap();
let animationObserver = null;
let effectsEnabled = true;
let headerNavInitialized = false;
let authPageInitialized = false;
let authKeydownHandler = null;

function markAnimatedElements(scope = document) {
  if (!scope || (scope === document && !document.body)) {
    return [];
  }
  const nodes = new Set();
  ANIMATED_SELECTORS.forEach((selector) => {
    scope.querySelectorAll(selector).forEach((element) => {
      if (!element.dataset.animate) {
        element.dataset.animate = "fade-up";
      }
      nodes.add(element);
    });
  });
  scope.querySelectorAll("[data-animate]").forEach((element) => nodes.add(element));
  return Array.from(nodes);
}

function teardownAnimations() {
  if (animationObserver) {
    animationObserver.disconnect();
    animationObserver = null;
  }
}

function refreshAnimations(scope = document) {
  const elements = markAnimatedElements(scope);
  if (!elements.length) {
    return;
  }
  if (!effectsEnabled) {
    elements.forEach((el) => el.classList.add("is-visible"));
    teardownAnimations();
    return;
  }
  if (REDUCED_MOTION_MEDIA && REDUCED_MOTION_MEDIA.matches) {
    elements.forEach((el) => el.classList.add("is-visible"));
    teardownAnimations();
    return;
  }
  if (!animationObserver) {
    animationObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            animationObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -10%" },
    );
  }
  elements.forEach((el) => {
    if (animationObserver) {
      animationObserver.observe(el);
    }
  });
}

function applyEffectsPreference(enabled) {
  effectsEnabled = enabled;
  document.documentElement.dataset.effects = enabled ? "on" : "off";
  if (document.body) {
    document.body.dataset.effects = enabled ? "on" : "off";
  }
  if (enabled) {
    document.documentElement.style.removeProperty("--current-motion-scale");
    refreshAnimations();
  } else {
    teardownAnimations();
    document.querySelectorAll("[data-animate]").forEach((el) => {
      el.classList.add("is-visible");
    });
  }
}

const skeletonRegistry = new WeakMap();

function showTableSkeleton(target, { rows = 6, columns = null } = {}) {
  const table = typeof target === "string" ? document.querySelector(target) : target;
  if (!table) {
    return () => {};
  }
  const tbody = table.tBodies?.[0] || table.querySelector("tbody");
  if (!tbody) {
    return () => {};
  }
  const colCount = columns || table.tHead?.rows?.[0]?.cells?.length || 4;
  const skeletonRows = [];
  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const tr = document.createElement("tr");
    tr.className = "skeleton-row";
    for (let colIndex = 0; colIndex < colCount; colIndex += 1) {
      const td = document.createElement("td");
      const span = document.createElement("span");
      span.className = "skeleton skeleton-line";
      td.appendChild(span);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
    skeletonRows.push(tr);
  }
  skeletonRegistry.set(table, skeletonRows);
  return () => {
    (skeletonRegistry.get(table) || []).forEach((row) => row.remove());
    skeletonRegistry.delete(table);
  };
}

function setButtonLoading(button, isLoading) {
  if (!button) {
    return;
  }
  if (isLoading) {
    button.dataset.loading = "true";
    button.classList.add("is-loading");
    button.setAttribute("aria-busy", "true");
  } else {
    button.dataset.loading = "false";
    button.classList.remove("is-loading");
    button.removeAttribute("aria-busy");
  }
}

function initDynamicFilters(scope = document) {
  scope.querySelectorAll('[data-filter-target]').forEach((input) => {
    if (dynamicFilterHandlers.has(input)) {
      return;
    }
    const targetSelector = input.dataset.filterTarget;
    const itemsSelector = input.dataset.filterItems || "tr";
    const emptySelector = input.dataset.filterEmpty || "";
    const target = document.querySelector(targetSelector);
    if (!target) {
      return;
    }
    const handler = () => {
      const value = (input.value || "").trim().toLowerCase();
      const items = target.querySelectorAll(itemsSelector);
      let visibleCount = 0;
      items.forEach((item) => {
        const matches = !value || (item.textContent || "").toLowerCase().includes(value);
        item.style.display = matches ? "" : "none";
        if (matches) {
          visibleCount += 1;
        }
      });
      if (emptySelector) {
        const emptyNode = document.querySelector(emptySelector);
        if (emptyNode) {
          emptyNode.style.display = visibleCount === 0 ? "block" : "none";
        }
      }
    };
    input.addEventListener("input", handler);
    dynamicFilterHandlers.set(input, handler);
    handler();
  });
}

function setSubmenuTabState(submenu, enabled) {
  if (!submenu) {
    return;
  }
  const focusable = submenu.querySelectorAll("a,button");
  focusable.forEach((node) => {
    if (enabled) {
      node.removeAttribute("tabindex");
    } else {
      node.setAttribute("tabindex", "-1");
    }
  });
}

function closeSubmenu(item) {
  if (!item) {
    return;
  }
  const trigger = item.querySelector(":scope > .app-menu__trigger");
  const submenu = item.querySelector(":scope > .app-submenu");
  item.classList.remove("is-open");
  if (trigger) {
    trigger.setAttribute("aria-expanded", "false");
  }
  if (submenu) {
    submenu.hidden = true;
    submenu.setAttribute("aria-hidden", "true");
    setSubmenuTabState(submenu, false);
    submenu.querySelectorAll(".has-submenu").forEach((child) => {
      if (child !== item) {
        closeSubmenu(child);
      }
    });
  }
}

function openSubmenu(item) {
  if (!item) {
    return;
  }
  const trigger = item.querySelector(":scope > .app-menu__trigger");
  const submenu = item.querySelector(":scope > .app-submenu");
  item.classList.add("is-open");
  if (trigger) {
    trigger.setAttribute("aria-expanded", "true");
  }
  if (submenu) {
    submenu.hidden = false;
    submenu.removeAttribute("hidden");
    submenu.setAttribute("aria-hidden", "false");
    setSubmenuTabState(submenu, true);
  }
}

function closeAllSubmenus(except = null, scope = document) {
  scope.querySelectorAll(".has-submenu").forEach((item) => {
    if (item === except) {
      return;
    }
    closeSubmenu(item);
  });
}

function initializeHeaderSubmenus(root = document) {
  root.querySelectorAll(".has-submenu").forEach((item) => {
    closeSubmenu(item);
  });
}

function setupHeaderNav() {
  const nav = document.getElementById("primaryNav");
  if (!nav) return;

  const header = document.getElementById("globalNav");
  const toggle = header?.querySelector("#navToggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const isOpen = header.dataset.navOpen === "true";
      header.dataset.navOpen = isOpen ? "false" : "true";
      toggle.setAttribute("aria-expanded", !isOpen);
      if (!isOpen) {
        document.body.classList.add("header-nav-open");
      } else {
        document.body.classList.remove("header-nav-open");
      }
    });
  }

  initializeHeaderSubmenus(nav);

  nav.addEventListener("click", (event) => {
    const trigger = event.target instanceof Element ? event.target.closest(".app-menu__trigger") : null;
    if (trigger && nav.contains(trigger)) {
      event.preventDefault();
      const item = trigger.closest(".has-submenu");
      if (!item) return;
      const isOpen = item.classList.contains("is-open");
      closeAllSubmenus(item, nav);
      if (isOpen) {
        closeSubmenu(item);
      } else {
        openSubmenu(item);
      }
      return;
    }
    const link = event.target instanceof Element ? event.target.closest(".app-menu__link") : null;
    if (link && nav.contains(link)) {
      closeAllSubmenus(null, nav);
    }
  });

  nav.addEventListener("keydown", (event) => {
    const trigger = event.target instanceof Element ? event.target.closest(".app-menu__trigger") : null;
    if (!trigger || !nav.contains(trigger)) {
      return;
    }
    const item = trigger.closest(".has-submenu");
    if (!item) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeSubmenu(item);
      trigger.focus({ preventScroll: true });
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!item.classList.contains("is-open")) {
        closeAllSubmenus(item, nav);
        openSubmenu(item);
      }
      const submenu = item.querySelector(":scope > .app-submenu");
      if (submenu) {
        const firstFocusable = submenu.querySelector("a,button");
        firstFocusable?.focus({ preventScroll: true });
      }
    }
  });

  nav.addEventListener("focusout", (event) => {
    if (!nav.contains(event.relatedTarget)) {
      closeAllSubmenus(null, nav);
    }
  });

  document.addEventListener("click", (event) => {
    if (!nav.contains(event.target)) {
      closeAllSubmenus(null, nav);
    }
    if (header && !header.contains(event.target)) {
      header.dataset.navOpen = "false";
      toggle?.setAttribute("aria-expanded", "false");
      document.body.classList.remove("header-nav-open");
    }
  });
}

function setupGlobalNavActions() {
  const helpBtn = document.getElementById("menuAyuda");
  if (helpBtn && helpBtn.dataset.bound !== "1") {
    helpBtn.addEventListener("click", (event) => {
      event.preventDefault();
      help();
    });
    helpBtn.dataset.bound = "1";
  }

  const logoutBtn = document.getElementById("menuCerrarSesion");
  if (logoutBtn && logoutBtn.dataset.bound !== "1") {
    logoutBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      if (state.logoutInFlight) {
        return;
      }
      state.logoutInFlight = true;
      logoutBtn.classList.add("is-loading");
      try {
        await logout();
      } finally {
        state.logoutInFlight = false;
        logoutBtn.classList.remove("is-loading");
      }
    });
    logoutBtn.dataset.bound = "1";
  }
}

function finalizePage(scope = document) {
  document.body?.classList.add("is-ready");
  markAnimatedElements(scope);
  refreshAnimations(scope);
  initDynamicFilters(scope);
  setupHeaderNav();
  setupGlobalNavActions();

  // Welcome animation for home.html
  if (window.location.pathname === '/home.html') {
    const hero = document.querySelector('.home-hero');
    if (hero) {
      const freezeHeroAnimation = () => {
        hero.style.opacity = '1';
        hero.style.transform = 'translate(-50%, -50%)';
        hero.style.animation = 'none';
      };

      if (localStorage.getItem('welcomeShown')) {
        freezeHeroAnimation();
      } else {
        hero.addEventListener('animationend', () => {
          freezeHeroAnimation();
          localStorage.setItem('welcomeShown', 'true');
        }, { once: true });
      }
    }
  }
}

const tableSortStates = new WeakMap();

function refreshSortableTables(root = document) {
  const scope = root instanceof Element ? root : document;
  scope.querySelectorAll("table[data-sortable-table]").forEach((table) => {
    ensureTableSortable(table);
  });
}

function ensureTableSortable(target) {
  const table = typeof target === "string" ? document.querySelector(target) : target;
  if (!table) {
    return;
  }
  let state = tableSortStates.get(table);
  if (!state) {
    state = { column: null, direction: 1 };
    tableSortStates.set(table, state);
    initTableSortable(table, state);
  }
  updateSortIndicators(table, state);
  if (typeof state.column === "number") {
    sortTableRows(table, state.column, state.direction, { preserveState: true });
  }
}

function initTableSortable(table, state) {
  if (!table || table.dataset.sortableInit === "1") {
    return;
  }
  const thead = table.querySelector("thead");
  if (!thead) {
    return;
  }
  table.dataset.sortableInit = "1";
  const headers = Array.from(thead.querySelectorAll("th"));
  headers.forEach((th, index) => {
    const rawLabel = (th.textContent || "").trim() || `Columna ${index + 1}`;
    const safeLabel = escapeHtml(rawLabel);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sort-button";
    button.dataset.label = rawLabel;
    button.innerHTML = `<span class="sort-label">${safeLabel}</span><span class="sort-icon">A-Z</span>`;
    button.addEventListener("click", () => {
      let nextDirection = 1;
      if (state.column === index) {
        nextDirection = state.direction === 1 ? -1 : 1;
      }
      state.column = index;
      state.direction = nextDirection;
      sortTableRows(table, index, nextDirection);
      updateSortIndicators(table, state);
    });
    th.classList.add("sortable");
    th.setAttribute("data-sort", "none");
    th.replaceChildren(button);
  });
}

function sortTableRows(table, columnIndex, direction, options = {}) {
  if (!table || !table.tBodies || !table.tBodies.length) {
    return;
  }
  const tbody = table.tBodies[0];
  const rows = Array.from(tbody.querySelectorAll("tr"));
  if (!rows.length) {
    return;
  }
  const multiplier = direction === -1 ? -1 : 1;
  rows.sort((rowA, rowB) => {
    const aToken = getCellSortToken(rowA, columnIndex);
    const bToken = getCellSortToken(rowB, columnIndex);
    if (aToken.type === bToken.type) {
      if (aToken.type === "number" || aToken.type === "date") {
        return (aToken.value - bToken.value) * multiplier;
      }
      return aToken.value.localeCompare(bToken.value, "es", {
        sensitivity: "base",
        numeric: true,
      }) * multiplier;
    }
    return aToken.raw.localeCompare(bToken.raw, "es", {
      sensitivity: "base",
      numeric: true,
    }) * multiplier;
  });
  rows.forEach((row) => tbody.appendChild(row));
  if (!options.preserveState) {
    const state = tableSortStates.get(table);
    if (state) {
      state.column = columnIndex;
      state.direction = multiplier;
    }
  }

  refreshSortableTables();
}

function getCellSortToken(row, columnIndex) {
  const cell = row.cells?.[columnIndex];
  if (!cell) {
    return { type: "string", value: "", raw: "" };
  }
  const dataValue = cell.getAttribute("data-sort");
  const raw = (dataValue ?? cell.textContent ?? "").trim();
  const numeric = parseNumericValue(raw);
  if (numeric !== null) {
    return { type: "number", value: numeric, raw };
  }
  const parsedDate = Date.parse(raw);
  if (!Number.isNaN(parsedDate)) {
    return { type: "date", value: parsedDate, raw };
  }
  return { type: "string", value: raw.toLowerCase(), raw };
}

function parseNumericValue(raw) {
  if (!raw) {
    return null;
  }
  const normalized = raw
    .replace(/\s+/g, "")
    .replace(/[^0-9,.-]/g, "");
  if (!normalized) {
    return null;
  }
  let candidate = normalized;
  if (candidate.includes(",") && (!candidate.includes(".") || candidate.lastIndexOf(",") > candidate.lastIndexOf("."))) {
    candidate = candidate.replace(/\./g, "").replace(",", ".");
  } else {
    candidate = candidate.replace(/,/g, "");
  }
  if (!candidate || candidate === "-" || candidate === ".") {
    return null;
  }
  const numeric = Number(candidate);
  return Number.isFinite(numeric) ? numeric : null;
}

function updateSortIndicators(table, state) {
  if (!table) {
    return;
  }
  const thead = table.querySelector("thead");
  if (!thead) {
    return;
  }
  const headers = thead.querySelectorAll("th.sortable");
  headers.forEach((th, index) => {
    const button = th.querySelector("button.sort-button");
    const icon = button?.querySelector(".sort-icon");
    const baseLabel = button?.dataset.label || (th.textContent || "").trim() || `Columna ${index + 1}`;
    const isActive = state && state.column === index;
    if (icon) {
      if (isActive) {
        icon.textContent = state.direction === -1 ? "Z-A" : "A-Z";
        th.setAttribute("data-sort", state.direction === -1 ? "desc" : "asc");
      } else {
        icon.textContent = "A-Z";
        th.setAttribute("data-sort", "none");
      }
    }
    if (button) {
      const dirLabel = isActive ? (state.direction === -1 ? "Z-A" : "A-Z") : "A-Z";
      button.setAttribute("aria-label", `Ordenar por ${baseLabel}${isActive ? ` (${dirLabel})` : ""}`);
    }
  });
}

let simulatedRole = localStorage.getItem('simulatedRole');

function trimChatHistory() {
  const max = CHAT_HISTORY_LIMIT * 2;
  if (state.chat.messages.length > max) {
    state.chat.messages = state.chat.messages.slice(-max);
  }
}

function renderChatMessages() {
  const container = document.getElementById("chatbotMessages");
  if (!container) {
    return;
  }
  container.innerHTML = "";
  if (!state.chat.messages.length) {
    const empty = document.createElement("div");
    empty.className = "chatbot-empty";
    empty.textContent = "Todavia no iniciaste una conversacion. Escribi tu consulta.";
    container.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  state.chat.messages.forEach((msg) => {
    const wrapper = document.createElement("div");
    const role = msg.role === "assistant" ? "assistant" : "user";
    wrapper.className = `chatbot-message chatbot-message--${role}`;
    wrapper.innerHTML = `<p>${escapeHtml(msg.content)}</p>`;
    fragment.appendChild(wrapper);
  });
  container.appendChild(fragment);
  container.scrollTop = container.scrollHeight;
}

function updateChatbotControls() {
  const input = document.getElementById("chatbotInput");
  const sendBtn = document.getElementById("chatbotSend");
  const status = document.getElementById("chatbotStatus");
  if (input) {
    input.disabled = state.chat.isSending;
  }
  if (sendBtn) {
    sendBtn.disabled = state.chat.isSending;
    sendBtn.textContent = state.chat.isSending ? "Enviando..." : "Enviar";
  }
  if (status) {
    status.textContent = state.chat.isSending ? "Consultando modelo..." : "";
  }
}

function toggleChatbotPanel(forceState) {
  const panel = document.getElementById("chatbotPanel");
  const fab = document.getElementById("chatbotFab");
  if (!panel || !fab) {
    return;
  }
  const nextState = typeof forceState === "boolean" ? forceState : !state.chat.isOpen;
  state.chat.isOpen = nextState;
  panel.classList.toggle("chatbot-panel--open", nextState);
  panel.setAttribute("aria-hidden", nextState ? "false" : "true");
  fab.classList.toggle("chatbot-fab--hidden", nextState);
  if (nextState) {
    renderChatMessages();
    const input = document.getElementById("chatbotInput");
    if (input) {
      input.focus();
    }
  }
}

async function processChatbotPrompt(rawText) {
  const text = String(rawText || "").trim();
  if (!text || state.chat.isSending) {
    return;
  }
  const historyPayload = state.chat.messages.slice(-(CHAT_HISTORY_LIMIT - 1)).map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
  const userMessage = { role: "user", content: text };
  state.chat.messages.push(userMessage);
  trimChatHistory();
  renderChatMessages();

  state.chat.isSending = true;
  updateChatbotControls();

  try {
    const resp = await api("/chatbot", {
      method: "POST",
      body: JSON.stringify({ message: text, history: historyPayload }),
    });
    if (!resp?.ok) {
      throw new Error(resp?.error?.message || "No se obtuvo respuesta");
    }
    const reply = String(resp.message?.content || "No recibimos respuesta del asistente.").trim();
    state.chat.messages.push({ role: "assistant", content: reply });
  } catch (err) {
    const detail = err?.message || "No se pudo contactar al asistente";
    state.chat.messages.push({ role: "assistant", content: `Hubo un problema: ${detail}` });
    toast(detail);
  } finally {
    trimChatHistory();
    state.chat.isSending = false;
    renderChatMessages();
    updateChatbotControls();
  }
}

function ensureChatbotWidget() {
  if (document.getElementById("chatbotFab")) {
    return;
  }
  const fab = document.createElement("button");
  fab.id = "chatbotFab";
  fab.type = "button";
  fab.className = "chatbot-fab";
  fab.innerHTML = `
    <img src="assets/chatbot-icon.svg" alt="Abrir asistente" class="chatbot-fab__icon" aria-hidden="true"/>
    <span class="sr-only">Chat con asistente</span>
  `;
  document.body.appendChild(fab);

  const panel = document.createElement("section");
  panel.id = "chatbotPanel";
  panel.className = "chatbot-panel";
  panel.setAttribute("aria-hidden", "true");
  panel.innerHTML = `
    <header class="chatbot-panel__header">
      <span class="chatbot-panel__title">Asistente SPM</span>
      <button type="button" class="chatbot-panel__close" id="chatbotClose" aria-label="Cerrar asistente">X</button>
    </header>
    <div class="chatbot-panel__messages" id="chatbotMessages"></div>
    <p class="chatbot-panel__status" id="chatbotStatus"></p>
    <form class="chatbot-panel__form" id="chatbotForm">
      <label for="chatbotInput" class="sr-only">Mensaje para el asistente</label>
      <textarea id="chatbotInput" rows="3" placeholder="Escribi tu consulta..." required></textarea>
      <div class="chatbot-panel__actions">
        <button type="submit" id="chatbotSend" class="btn">Enviar</button>
      </div>
    </form>
  `;
  document.body.appendChild(panel);

  fab.addEventListener("click", () => {
    toggleChatbotPanel(true);
  });

  const closeBtn = document.getElementById("chatbotClose");
  if (closeBtn) {
    closeBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      toggleChatbotPanel(false);
    });
  }

  const form = document.getElementById("chatbotForm");
  const input = document.getElementById("chatbotInput");
  if (form) {
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (!input) {
        return;
      }
      const value = input.value;
      if (!value.trim() || state.chat.isSending) {
        return;
      }
      input.value = "";
      await processChatbotPrompt(value);
    });
  }
  if (input) {
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        form?.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });
  }

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && state.chat.isOpen) {
      toggleChatbotPanel(false);
    }
  });
}

function initChatbotWidget() {
  ensureChatbotWidget();
  if (!state.chat.messages.length) {
    state.chat.messages.push({
      role: "assistant",
      content: "Hola, soy el asistente de SPM. En que puedo ayudarte hoy?",
    });
  }
  renderChatMessages();
  updateChatbotControls();
}

function initHomeHero(userName) {
  const node = document.getElementById("homeTypewriter");
  if (!node || node.dataset.typewriterDone === "1") {
    return;
  }
  const template = node.dataset.typewriter || node.textContent || "";
  const message = template.replace(/\{\{\s*name\s*\}\}/gi, userName || "").replace(/\s{2,}/g, " ").trim();
  if (!message) {
    node.classList.add("is-finished");
    node.dataset.typewriterDone = "1";
    return;
  }
  node.textContent = "";
  node.dataset.typewriterDone = "1";
  node.classList.add("is-typing");
  let index = 0;
  const delay = Number(node.dataset.typewriterSpeed) || 48;
  const initialDelay = Number(node.dataset.typewriterDelay) || 260;

  const tick = () => {
    index += 1;
    node.textContent = message.slice(0, index);
    if (index < message.length) {
      window.setTimeout(tick, delay);
    } else {
      node.classList.remove("is-typing");
      node.classList.add("is-finished");
    }
  };

  window.setTimeout(tick, initialDelay);
}

const SYSTEM_STATUS_REFRESH_MS = 60000;
const SYSTEM_STATUS_MAX_BACKOFF_MS = 300000;
const systemStatusState = {
  timerId: null,
  retry: 0,
  openDetails: new Set(),
};

function normalizeHealthStatus(value) {
  const normalized = (value || "N/A").toString().toUpperCase();
  if (normalized === "WARNING") return "WARN";
  if (["OK", "WARN", "ERROR", "N/A"].includes(normalized)) {
    return normalized;
  }
  return "N/A";
}

function systemStatusClass(value) {
  switch (normalizeHealthStatus(value)) {
    case "OK":
      return "ok";
    case "WARN":
      return "warn";
    case "ERROR":
      return "error";
    default:
      return "idle";
  }
}

function formatStatusDetails(details) {
  if (details == null) {
    return "{}";
  }
  if (typeof details === "string") {
    return details;
  }
  try {
    return JSON.stringify(details, null, 2);
  } catch (error) {
    return _shortErrorMessage(error);
  }
}

function formatSystemTimestamp(value) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function renderSystemStatus(data, nodes) {
  const { listNode, summaryNode, messageNode, timestampNode } = nodes;
  if (!data || !Array.isArray(data.items)) {
    listNode.innerHTML = '<p class="system-status__empty">Sin datos disponibles.</p>';
    summaryNode.innerHTML = "";
    timestampNode.textContent = "Actualizado: --";
    return;
  }

  const idsPresent = new Set();
  const cards = data.items
    .map((item, index) => {
      const id = item.id || `item-${index}`;
      idsPresent.add(id);
      const status = normalizeHealthStatus(item.status);
      const statusClass = systemStatusClass(status);
      const latency = Number.isFinite(Number(item.latency_ms)) ? `${Math.round(Number(item.latency_ms))} ms` : null;
      const open = systemStatusState.openDetails.has(id);
      const details = formatStatusDetails(item.details);
      const metaParts = [];
      if (latency) {
        metaParts.push(`Latencia: ${latency}`);
      }
      if (item.details && typeof item.details.message === "string") {
        metaParts.push(item.details.message);
      }
      const metaText = metaParts.length ? `<span>${escapeHtml(metaParts.join(" | "))}</span>` : "";

      return `
        <article class="system-status__card system-status__card--${statusClass}${open ? " is-open" : ""}" data-id="${escapeHtml(id)}">
          <header class="system-status__card-header">
            <span class="system-status__name">${escapeHtml(item.name || id)}</span>
            <span class="system-status__badge system-status__badge--${statusClass}">${escapeHtml(status)}</span>
          </header>
          <div class="system-status__meta">
            ${metaText}
          </div>
          <button type="button" class="system-status__toggle" aria-expanded="${open ? "true" : "false"}">
            ${open ? "Ocultar detalles" : "Ver detalles"}
          </button>
          <pre class="system-status__details"${open ? "" : " hidden"}>${escapeHtml(details)}</pre>
        </article>
      `;
    })
    .join("");

  listNode.innerHTML = cards || '<p class="system-status__empty">Sin datos disponibles.</p>';

  for (const id of Array.from(systemStatusState.openDetails)) {
    if (!idsPresent.has(id)) {
      systemStatusState.openDetails.delete(id);
    }
  }

  const summaryStatus = normalizeHealthStatus(data.summary);
  const summaryClass = systemStatusClass(summaryStatus);
  const counters = { OK: 0, WARN: 0, ERROR: 0, "N/A": 0 };
  data.items.forEach((item) => {
    const status = normalizeHealthStatus(item.status);
    counters[status] = (counters[status] || 0) + 1;
  });
  const breakdown = Object.entries(counters)
    .filter(([, value]) => value > 0)
    .map(([label, value]) => `${label}: ${value}`)
    .join(" | ") || "Sin datos";

  summaryNode.innerHTML = `
    <div class="system-status__summary system-status__summary--${summaryClass}">
      <span class="system-status__summary-label">Resumen</span>
      <span class="system-status__summary-status">${escapeHtml(summaryStatus)}</span>
      <span class="system-status__summary-meta">${escapeHtml(breakdown)}</span>
    </div>
  `;

  messageNode.classList.add("hide");
  messageNode.textContent = "";
  messageNode.removeAttribute("data-tone");
  timestampNode.textContent = `Actualizado: ${formatSystemTimestamp(data.generated_at)}`;
}

function initSystemConsole() {
  const consoleNode = document.getElementById("systemConsole");
  const listNode = document.getElementById("systemConsoleList");
  const summaryNode = document.getElementById("systemConsoleSummary");
  const messageNode = document.getElementById("systemConsoleMessage");
  const timestampNode = document.getElementById("systemConsoleTimestamp");
  const toggleButton = document.getElementById("systemConsoleToggle");

  if (!consoleNode || !listNode || !summaryNode || !messageNode || !timestampNode || !toggleButton) {
    return;
  }

  const isAdmin =
    typeof state.me?.rol === "string" &&
    (state.me.rol.toLowerCase().includes("admin") || state.me.rol.toLowerCase().includes("administrador"));

  if (!isAdmin) {
    consoleNode.classList.add("hide");
    if (systemStatusState.timerId) {
      window.clearTimeout(systemStatusState.timerId);
      systemStatusState.timerId = null;
    }
    return;
  }

  consoleNode.classList.remove("hide");
  systemStatusState.openDetails.clear();

  if (!consoleNode.dataset.ready) {
    toggleButton.addEventListener("click", () => {
      const minimized = consoleNode.classList.toggle("is-minimized");
      toggleButton.setAttribute("aria-expanded", minimized ? "false" : "true");
      toggleButton.textContent = minimized ? "+" : "-";
      toggleButton.setAttribute(
        "aria-label",
        minimized ? "Restaurar consola Estado del Sistema" : "Minimizar consola Estado del Sistema"
      );
    });

    listNode.addEventListener("click", (event) => {
      const button = event.target.closest(".system-status__toggle");
      if (!button) {
        return;
      }
      const card = button.closest(".system-status__card");
      if (!card) {
        return;
      }
      const details = card.querySelector(".system-status__details");
      if (!details) {
        return;
      }
      const identifier = card.dataset.id;
      const isOpen = !details.hasAttribute("hidden");
      if (isOpen) {
        details.setAttribute("hidden", "hidden");
        button.setAttribute("aria-expanded", "false");
        button.textContent = "Ver detalles";
        card.classList.remove("is-open");
        if (identifier) {
          systemStatusState.openDetails.delete(identifier);
        }
      } else {
        details.removeAttribute("hidden");
        button.setAttribute("aria-expanded", "true");
        button.textContent = "Ocultar detalles";
        card.classList.add("is-open");
        if (identifier) {
          systemStatusState.openDetails.add(identifier);
        }
      }
    });

    consoleNode.dataset.ready = "1";
  }

  if (systemStatusState.timerId) {
    window.clearTimeout(systemStatusState.timerId);
    systemStatusState.timerId = null;
  }
  systemStatusState.retry = 0;

  const scheduleNext = (delay) => {
    if (systemStatusState.timerId) {
      window.clearTimeout(systemStatusState.timerId);
    }
    systemStatusState.timerId = window.setTimeout(loadStatus, delay);
    consoleNode.dataset.intervalId = String(systemStatusState.timerId);
  };

  async function loadStatus() {
    try {
      const response = await fetch("/api/admin/system-status", { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Error ${response.status} al obtener el estado del sistema`);
      }
      const payload = await response.json();
      systemStatusState.retry = 0;
      renderSystemStatus(payload, { listNode, summaryNode, messageNode, timestampNode });
      scheduleNext(SYSTEM_STATUS_REFRESH_MS);
    } catch (error) {
      systemStatusState.retry = Math.min(systemStatusState.retry + 1, 5);
      const delay = Math.min(
        SYSTEM_STATUS_REFRESH_MS * Math.pow(2, systemStatusState.retry),
        SYSTEM_STATUS_MAX_BACKOFF_MS
      );
      messageNode.textContent = error?.message || "No se pudo actualizar el estado del sistema.";
      messageNode.classList.remove("hide");
      messageNode.dataset.tone = "error";
      timestampNode.textContent = "Actualizado: --";
      scheduleNext(delay);
    }
  }

  loadStatus();
}const STATUS_LABELS = {
  draft: "Borrador",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
  pendiente_de_aprobacion: "pendiente de aprobaci?n",
  pendiente: "pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  cancelacion_pendiente: "Cancelaci?n pendiente",
  cancelacion_rechazada: "Cancelaci?n rechazada",
};

const PENDING_SOLICITUD_KEY = "pendingSolicitudId";
const PREFS_STORAGE_KEY = "spmPreferences";
const DEFAULT_PREFERENCES = {
  emailAlerts: true,
  realtimeToasts: true,
  approvalDigest: false,
  digestHour: "08:30",
  theme: "auto",
  density: "comfortable",
  rememberFilters: true,
  keyboardShortcuts: false,
  effectsEnabled: true,
};

const FILTER_STORAGE_PREFIX = "spmFilters:";
const KNOWN_FILTER_KEYS = ["adminUsers", "adminMateriales", "adminSolicitudes"];
const SYSTEM_THEME_MEDIA = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
let systemThemeListener = null;
let keyboardHandler = null;

function loadPreferencesFromStorage() {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PREFERENCES };
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFERENCES, ...(parsed || {}) };
  } catch (_err) {
    return { ...DEFAULT_PREFERENCES };
  }
}

function applyThemePreference(mode) {
  const body = document.body;
  if (!body) return;
  if (SYSTEM_THEME_MEDIA && systemThemeListener) {
    if (SYSTEM_THEME_MEDIA.removeEventListener) {
      SYSTEM_THEME_MEDIA.removeEventListener("change", systemThemeListener);
    } else if (SYSTEM_THEME_MEDIA.removeListener) {
      SYSTEM_THEME_MEDIA.removeListener(systemThemeListener);
    }
    systemThemeListener = null;
  }
  let resolved = mode;
  if (mode === "auto") {
    resolved = SYSTEM_THEME_MEDIA && SYSTEM_THEME_MEDIA.matches ? "dark" : "light";
    if (SYSTEM_THEME_MEDIA) {
      systemThemeListener = (event) => {
        body.dataset.theme = event.matches ? "dark" : "light";
      };
      if (SYSTEM_THEME_MEDIA.addEventListener) {
        SYSTEM_THEME_MEDIA.addEventListener("change", systemThemeListener);
      } else if (SYSTEM_THEME_MEDIA.addListener) {
        SYSTEM_THEME_MEDIA.addListener(systemThemeListener);
      }
    }
  }
  body.dataset.theme = resolved;
}

function applyDensityPreference(density) {
  if (!document.body) return;
  document.body.dataset.density = density || DEFAULT_PREFERENCES.density;
}

function updateKeyboardShortcutsPreference(enabled) {
  if (enabled && !keyboardHandler) {
    keyboardHandler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const searchInput = document.querySelector("input[type='search']");
        if (searchInput) {
          searchInput.focus();
        }
      }
    };
    document.addEventListener("keydown", keyboardHandler);
  } else if (!enabled && keyboardHandler) {
    document.removeEventListener("keydown", keyboardHandler);
    keyboardHandler = null;
  }
}

function applyPreferences(prefs) {
  applyThemePreference(prefs.theme);
  applyDensityPreference(prefs.density);
  applyEffectsPreference(prefs.effectsEnabled);
  updateKeyboardShortcutsPreference(prefs.keyboardShortcuts);
}

function savePreferences(next) {
  const merged = { ...DEFAULT_PREFERENCES, ...state.preferences, ...next };
  state.preferences = merged;
  localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(merged));
  applyPreferences(merged);
  return merged;
}

function ensurePreferencesLoaded() {
  if (!state.preferences) {
    state.preferences = loadPreferencesFromStorage();
    applyPreferences(state.preferences);
  }
  return state.preferences;
}

function initPreferencesPage() {
  const form = document.getElementById("preferencesForm");
  const status = document.getElementById("prefStatus");
  const saveBtn = document.getElementById("prefSave");
  const resetBtn = document.getElementById("prefReset");
  if (!form || !status || !saveBtn || !resetBtn) {
    return;
  }

  const controls = {
    emailAlerts: document.getElementById("prefEmailAlerts"),
    realtimeToasts: document.getElementById("prefRealtimeToasts"),
    approvalDigest: document.getElementById("prefApprovalDigest"),
    digestHour: document.getElementById("prefDigestHour"),
    theme: document.getElementById("prefTheme"),
    density: document.getElementById("prefDensity"),
    rememberFilters: document.getElementById("prefRememberFilters"),
    keyboardShortcuts: document.getElementById("prefKeyboardShortcuts"),
    effectsEnabled: document.getElementById("prefEffectsEnabled"),
  };

  const readForm = () => ({
    emailAlerts: controls.emailAlerts?.checked ?? DEFAULT_PREFERENCES.emailAlerts,
    realtimeToasts: controls.realtimeToasts?.checked ?? DEFAULT_PREFERENCES.realtimeToasts,
    approvalDigest: controls.approvalDigest?.checked ?? DEFAULT_PREFERENCES.approvalDigest,
    digestHour: controls.digestHour?.value || DEFAULT_PREFERENCES.digestHour,
    theme: controls.theme?.value || DEFAULT_PREFERENCES.theme,
    density: controls.density?.value || DEFAULT_PREFERENCES.density,
    rememberFilters: controls.rememberFilters?.checked ?? DEFAULT_PREFERENCES.rememberFilters,
    keyboardShortcuts: controls.keyboardShortcuts?.checked ?? DEFAULT_PREFERENCES.keyboardShortcuts,
    effectsEnabled: controls.effectsEnabled?.checked ?? DEFAULT_PREFERENCES.effectsEnabled,
  });

  const renderForm = (prefs) => {
    if (controls.emailAlerts) controls.emailAlerts.checked = !!prefs.emailAlerts;
    if (controls.realtimeToasts) controls.realtimeToasts.checked = !!prefs.realtimeToasts;
    if (controls.approvalDigest) controls.approvalDigest.checked = !!prefs.approvalDigest;
    if (controls.digestHour) controls.digestHour.value = prefs.digestHour || DEFAULT_PREFERENCES.digestHour;
    if (controls.digestHour) controls.digestHour.disabled = !prefs.approvalDigest;
    if (controls.theme) controls.theme.value = prefs.theme || DEFAULT_PREFERENCES.theme;
    if (controls.density) controls.density.value = prefs.density || DEFAULT_PREFERENCES.density;
    if (controls.rememberFilters) controls.rememberFilters.checked = !!prefs.rememberFilters;
    if (controls.keyboardShortcuts) controls.keyboardShortcuts.checked = !!prefs.keyboardShortcuts;
    if (controls.effectsEnabled) controls.effectsEnabled.checked = prefs.effectsEnabled !== false;
  };

  let baseline = { ...ensurePreferencesLoaded() };
  renderForm(baseline);

  const updateStatus = () => {
    const current = readForm();
    if (controls.digestHour) {
      controls.digestHour.disabled = !current.approvalDigest;
    }
    const dirty = JSON.stringify(current) !== JSON.stringify(baseline);
    status.textContent = dirty ? "Hay cambios sin guardar." : "No hay cambios pendientes.";
    saveBtn.disabled = !dirty;
    return { current, dirty };
  };

  form.addEventListener("input", updateStatus);
  form.addEventListener("change", updateStatus);

  saveBtn.addEventListener("click", (event) => {
    event.preventDefault();
    const { current, dirty } = updateStatus();
    if (!dirty) {
      toast("No hay cambios para guardar");
      return;
    }
    baseline = savePreferences(current);
    renderForm(baseline);
    updateStatus();
    toast("Preferencias guardadas", true);
  });

  resetBtn.addEventListener("click", (event) => {
    event.preventDefault();
    renderForm(DEFAULT_PREFERENCES);
    updateStatus();
    toast("Valores restablecidos, recuerda guardar los cambios", true);
  });

  updateStatus();
}

function storageKeyForFilters(key) {
  return `${FILTER_STORAGE_PREFIX}${key}`;
}

function loadStoredFilters(key, fallback = {}) {
  if (!state.preferences?.rememberFilters) {
    return { ...fallback };
  }
  try {
    const raw = localStorage.getItem(storageKeyForFilters(key));
    if (!raw) {
      return { ...fallback };
    }
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed };
  } catch (_err) {
    return { ...fallback };
  }
}

function saveStoredFilters(key, value) {
  if (!state.preferences?.rememberFilters) {
    localStorage.removeItem(storageKeyForFilters(key));
    return;
  }
  try {
    localStorage.setItem(storageKeyForFilters(key), JSON.stringify(value));
  } catch (_err) {
    console.warn("No se pudieron guardar filtros para", key);
  }
}

function clearStoredFilters(key) {
  localStorage.removeItem(storageKeyForFilters(key));
}

function clearAllStoredFilters() {
  KNOWN_FILTER_KEYS.forEach((key) => clearStoredFilters(key));
}

function statusBadge(status) {
  const normalized = (status || "").toLowerCase();
  const fallback = normalized ? normalized.replace(/_/g, " ") : "ï¿½";
  const label = STATUS_LABELS[normalized] || fallback;
  const pretty = STATUS_LABELS[normalized]
    ? label
    : label.charAt(0).toUpperCase() + label.slice(1);
  return `<span class="status-pill status-${normalized || "desconocido"}">${pretty}</span>`;
}

const DEFAULT_CENTROS = ["1008", "1050", "1064", "1500", "1501", "1502"];

const MATERIAL_SUGGESTION_LIMIT = 100000;

const ADMIN_CONFIG_FIELDS = {
  centros: ["codigo", "nombre", "descripcion", "notas", "activo"],
  almacenes: ["codigo", "nombre", "centro_codigo", "descripcion", "activo"],
  roles: ["nombre", "descripcion", "activo"],
  puestos: ["nombre", "descripcion", "activo"],
  sectores: ["nombre", "descripcion", "activo"],
};

const ADMIN_CONFIG_TABLE_FIELDS = {
  centros: ["codigo", "nombre", "descripcion", "notas", "activo"],
  almacenes: ["codigo", "nombre", "centro_codigo", "descripcion", "activo"],
  roles: ["nombre", "descripcion", "activo"],
  puestos: ["nombre", "descripcion", "activo"],
  sectores: ["nombre", "descripcion", "activo"],
};

const ADMIN_CONFIG_LABELS = {
  centros: "centro log?stico",
  almacenes: "almac?n virtual",
  roles: "rol",
  puestos: "puesto",
  sectores: "sector",
};

const CATALOG_KEYS = ["centros", "almacenes", "roles", "puestos", "sectores"];

function getCatalogItems(resource, { activeOnly = true } = {}) {
  if (!resource) {
    return [];
  }
  const items = Array.isArray(state.catalogs?.[resource]) ? state.catalogs[resource] : [];
  if (!activeOnly) {
    return [...items];
  }
  return items.filter((item) => item && item.activo !== false);
}

function setCatalogItems(resource, items) {
  if (!resource) {
    return;
  }
  state.catalogs[resource] = Array.isArray(items) ? items : [];
  refreshCatalogConsumers(resource);
}

function ensureCatalogDefaults(data = {}) {
  CATALOG_KEYS.forEach((key) => {
    if (!Array.isArray(data[key])) {
      data[key] = [];
    }
  });
  return data;
}

function updateDatalist(nodeId, values) {
  const node = document.getElementById(nodeId);
  if (!node) {
    return;
  }
  const unique = Array.from(new Set(values.filter(Boolean)));
  node.innerHTML = unique.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
}

function refreshCatalogConsumers(resource = null) {
  const targets = resource ? [resource] : CATALOG_KEYS;
  if (targets.includes("roles")) {
    updateDatalist("catalogRolesList", getCatalogItems("roles", { activeOnly: true }).map((item) => item.nombre));
  }
  if (targets.includes("puestos")) {
    updateDatalist("catalogPuestosList", getCatalogItems("puestos", { activeOnly: true }).map((item) => item.nombre));
  }
  if (targets.includes("sectores")) {
    updateDatalist("catalogSectoresList", getCatalogItems("sectores", { activeOnly: true }).map((item) => item.nombre));
  }
}

function logCatalogWarnings(resource, warnings) {
  if (!Array.isArray(warnings) || !warnings.length) {
    return;
  }
  warnings.forEach((warning) => {
    if (!warning) {
      return;
    }
    const target = warning.resource || resource || "catalogos";
    const message = warning.message || (typeof warning === "string" ? warning : JSON.stringify(warning));
    console.info("[catalogos] aviso", { resource: target, message });
  });
}


async function loadCatalogData(resource = null, { silent = false, includeInactive = false } = {}) {
  if (!state.me) {
    return null;
  }
  try {
    const params = new URLSearchParams();
    if (includeInactive) {
      params.set("include_inactive", "1");
    }
    if (resource) {
      const endpoint = params.size ? `/catalogos/${resource}?${params.toString()}` : `/catalogos/${resource}`;
      const resp = await api(endpoint);
      if (!resp?.ok) {
        throw new Error(resp?.error?.message || "No se pudo cargar el catalogo");
      }
      logCatalogWarnings(resource, resp.warnings);
      setCatalogItems(resource, resp.items || []);
      if (!silent) {
        toast(`Cat?logo de ${adminConfigLabel(resource)} actualizado`, true);
      }
      return resp.items || [];
    }
    const endpoint = params.size ? `/catalogos?${params.toString()}` : "/catalogos";
    const resp = await api(endpoint);
    if (!resp?.ok) {
      throw new Error(resp?.error?.message || "No se pudo cargar la configuracion");
    }
    logCatalogWarnings(null, resp.warnings);
    const normalized = ensureCatalogDefaults(resp.data || {});
    CATALOG_KEYS.forEach((key) => {
      setCatalogItems(key, normalized[key]);
    });
    if (!silent) {
      toast("Cat?logos sincronizados", true);
    }
    return normalized;
  } catch (err) {
    console.error(err);
    if (!silent) {
      toast(err.message || "No se pudieron cargar los catalogos");
    }
    return null;
  }
}

function catalogueOptionLabel(code, name, extra) {
  const parts = [code];
  const printableName = (name || "").trim();
  if (printableName && printableName.toUpperCase() !== String(code || "").toUpperCase()) {
    parts.push(printableName);
  }
  if (extra) {
    parts.push(extra);
  }
  return parts.join(" - ");
}

function buildCentroOptions() {
  const centrosUsuario = Array.isArray(state.me?.centros)
    ? state.me.centros
    : parseCentrosList(state.me?.centros);
  const catalogCentros = getCatalogItems("centros", { activeOnly: true });
  const seen = new Set();
  const options = [];
  const addCentro = (codigo) => {
    const value = (codigo || "").trim();
    if (!value) {
      return;
    }
    const key = value.toUpperCase();
    if (seen.has(key)) {
      return;
    }
    const match = catalogCentros.find((item) => String(item.codigo).toUpperCase() === key);
    const label = match ? catalogueOptionLabel(match.codigo, match.nombre, null) : value;
    options.push({ value, label });
    seen.add(key);
  };
  centrosUsuario.forEach(addCentro);
  catalogCentros.forEach((item) => addCentro(item.codigo));
  if (!options.length) {
    DEFAULT_CENTROS.forEach(addCentro);
  }
  return options;
}

function buildAlmacenOptions() {
  const catalogAlmacenes = getCatalogItems("almacenes", { activeOnly: true });
  const seen = new Set();
  const options = [];
  const addAlmacen = (item) => {
    if (!item) {
      return;
    }
    const codigo = (item.codigo || item.id || item.id_almacen || "").trim();
    if (!codigo) {
      return;
    }
    const key = codigo.toUpperCase();
    if (seen.has(key)) {
      return;
    }
    const centroLabel = item.centro_codigo ? `Centro ${item.centro_codigo}` : null;
    const label = catalogueOptionLabel(codigo, item.nombre, centroLabel);
    options.push({ value: codigo, label });
    seen.add(key);
  };
  catalogAlmacenes.forEach(addAlmacen);
  return options;
}

function getDefaultCentroValue() {
  const options = buildCentroOptions();
  return options[0]?.value || DEFAULT_CENTROS[0] || "";
}

function getDefaultAlmacenValue() {
  const options = buildAlmacenOptions();
  return options[0]?.value || "";
}

function populateCentroSelect() {
  const select = document.getElementById("centro");
  if (!select) return;
  const options = buildCentroOptions();
  renderSelectOptions(select, options, { placeholder: "Seleccione un centro" });
}

async function cargarAlmacenes(centro) {
  const url = centro ? `/api/almacenes?centro=${encodeURIComponent(centro)}` : "/api/almacenes";
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    console.error("Error cargando almacenes", error);
    return;
  }
  if (!response.ok) {
    console.error("Error cargando almacenes", response.status);
    return;
  }
  const payload = await response.json();
  const data = Array.isArray(payload) ? payload : payload?.items || [];
  const sel = document.getElementById("almacen");
  if (!sel) {
    return;
  }
  sel.innerHTML = '<option value="">Seleccione un almac&eacute;n</option>';
  data.forEach((a) => {
    if (!a) {
      return;
    }
    const id = `${a.codigo ?? a.id ?? a.id_almacen ?? ""}`.trim();
    if (!id) {
      return;
    }
    const nombre = `${a.nombre ?? ""}`.trim();
    const label = nombre ? `${id} - ${nombre}` : id;
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = label;
    sel.appendChild(opt);
  });
}
async function initCreateSolicitudPage() {
  await loadCatalogData();
  const centroEl = document.getElementById("centro");
  const almacenEl = document.getElementById("almacen");
  hydrateCreateSolicitudForm();
  if (almacenEl && !almacenEl.options.length) {
    almacenEl.innerHTML = '<option value="">Seleccione un almac&eacute;n</option>';
  }

  centroEl?.addEventListener("change", (event) => {
    const value = event.target?.value?.trim();
    cargarAlmacenes(value);
  });

  // Event listener for "Continuar" button
  const btnContinuar = document.getElementById("btnContinuar");
  if (btnContinuar) {
    btnContinuar.addEventListener("click", () => {
      // Collect form data
      const centro = document.getElementById("centro")?.value;
      const almacen = document.getElementById("almacen")?.value;
      const centroDeCostos = document.getElementById("centroDeCostos")?.value;
      const criticidad = document.getElementById("criticidad")?.value;
      const fechaInput = document.getElementById("fechaNecesidad");
      const fechaNecesidad = fechaInput?.value || new Date().toISOString().split("T")[0];
      if (fechaInput && !fechaInput.value) {
        fechaInput.value = fechaNecesidad;
      }
      const sectorInput = document.getElementById("sector");
      const sector = sectorInput?.value || state.me?.sector || "";
      const just = document.getElementById("just")?.value;

      const missing = [];
      if (!centro) missing.push("Centro");
      if (!almacen) missing.push("Almac\u00E9n");
      if (!centroDeCostos?.trim()) missing.push("Objeto de imputaci\u00F3n");
      if (!sector?.trim()) missing.push("Sector");
      if (!just?.trim()) missing.push("Justificaci\u00F3n");
      if (missing.length) {
        toast(`Complete los campos obligatorios: ${missing.join(", ")}`);
        return;
      }

      // Save to draft
      updateDraftHeader({
        centro,
        almacen_virtual: almacen,
        centro_costos: centroDeCostos,
        criticidad,
        fecha_necesidad: fechaNecesidad,
        sector,
        justificacion: just,
        attachments: cloneAttachments(state.formAttachments),
      });

      // Navigate to add materials page
      window.location.href = "agregar-materiales.html";
    });
  }
}
async function initAddMaterialsPage() {
  // Load draft
  const draft = getDraft();
  if (draft) {
    state.items = draft.items || [];
  } else {
    state.items = [];
  }

  // Display solicitud ID
  const idDisplay = $("#solicitudIdDisplay");
  if (idDisplay) {
    idDisplay.textContent = draft?.id ? `#${draft.id}` : "Borrador";
  }

  // Render cart
  renderCart(state.items);

  // Setup material search
  setupMaterialSearch();

  // Setup event listeners
  const btnAdd = $("#btnAdd");
  if (btnAdd) {
    btnAdd.addEventListener("click", addItem);
  }

  const btnSaveDraft = $("#btnSaveDraft");
  if (btnSaveDraft) {
    btnSaveDraft.addEventListener("click", () => saveDraft());
  }

  const btnSend = $("#btnSend");
  if (btnSend) {
    btnSend.addEventListener("click", () => sendSolicitud());
  }

  const btnShowMaterialDetail = $("#btnShowMaterialDetail");
  if (btnShowMaterialDetail) {
    btnShowMaterialDetail.addEventListener("click", openMaterialDetailModal);
  }

  // Event listener for modal close
  const materialDetailClose = $("#materialDetailClose");
  if (materialDetailClose) {
    materialDetailClose.addEventListener("click", () => {
      const modal = $("#materialDetailModal");
      if (modal) hide(modal);
    });
  }
}

function renderSelectOptions(select, options, { placeholder = "Seleccione una opcion", value = "" } = {}) {
  if (!select) {
    return;
  }
  const safeOptions = Array.isArray(options) ? options : [];
  const placeholderOption = placeholder
    ? `<option value="" disabled${value ? "" : " selected"}>${escapeHtml(placeholder)}</option>`
    : "";
  const optionsHtml = safeOptions
    .map((option) => `<option value="${escapeHtml(option.value || "")}">${escapeHtml(option.label || option.value || "")}</option>`)
    .join("");
  select.innerHTML = `${placeholderOption}${optionsHtml}`;
  if (value && safeOptions.some((option) => option.value === value)) {
    select.value = value;
  } else if (!value && placeholder) {
    select.selectedIndex = 0;
  }
  select.disabled = !safeOptions.length;
}


const CHAT_HISTORY_LIMIT = 12;
const ALLOWED_FILE_EXTENSIONS = new Set([
  "txt",
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
]);

function parseCentrosList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .replace(/;/g, ",")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeMaterial(raw) {
  if (!raw) return null;
  return {
    codigo: raw.codigo,
    descripcion: raw.descripcion,
    descripcion_larga: (raw.descripcion_larga || raw.textocompletomaterialespanol || "").trim(),
    unidad: raw.unidad || raw.unidad_medida || raw.uom || "",
    precio: Number(raw.precio_usd ?? raw.precio ?? raw.precio_unitario ?? 0),
  };
}

function cloneItems(items) {
  return (items || []).map((item) => ({ ...item }));
}

function renderCart(items) {
  const tbody = $("#tbl tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  let total = 0;
  items.forEach((item, index) => {
    const cantidad = Math.max(1, Number(item.cantidad) || 1);
    const precio = Number(item.precio ?? 0);
    const subtotal = cantidad * precio;
    total += subtotal;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.codigo}</td>
      <td>${item.descripcion || ""}</td>
      <td>${item.unidad || "ï¿½"}</td>
      <td>${formatCurrency(precio)}</td>
      <td><input type="number" min="1" value="${cantidad}" data-index="${index}" class="qty-input"></td>
      <td>${formatCurrency(subtotal)}</td>
      <td><button class="btn" data-index="${index}">Quitar</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".qty-input").forEach((input) => {
    input.addEventListener("change", (event) => {
      const idx = Number(event.target.dataset.index);
      const value = Math.max(1, Number(event.target.value) || 1);
      event.target.value = value;
      if (state.items[idx]) {
        state.items[idx].cantidad = value;
        renderCart(state.items);
      }
    });
  });

  tbody.querySelectorAll("button[data-index]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      const idx = Number(btn.dataset.index);
      state.items.splice(idx, 1);
      renderCart(state.items);
    });
  });

  const totalSpan = $("#cartTotal");
  if (totalSpan) {
    totalSpan.textContent = formatCurrency(total);
  }

  refreshSortableTables(tbody.closest("table"));
  persistDraftState();
}

function renderList(data) {
  const tbody = $("#list tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  data.items.forEach((solicitud) => {
    const tr = document.createElement("tr");
    const count = (solicitud.data_json?.items || []).length;
    const statusHtml = statusBadge(solicitud.status);
    tr.innerHTML = `
      <td>${solicitud.id}</td>
      <td>${solicitud.centro}</td>
      <td>${solicitud.sector}</td>
      <td>${new Date(solicitud.created_at).toLocaleString()}</td>
      <td>${statusHtml}</td>
      <td>${count}</td>
    `;
    tr.dataset.id = solicitud.id;
    tr.classList.add("clickable-row");
    tr.addEventListener("click", () => {
      openSolicitudDetail(solicitud.id);
    });
    tbody.appendChild(tr);
  });
  $("#meta").textContent = `Solicitudes (total: ${data.total})`;
  refreshSortableTables(tbody.closest("table"));
}

const state = {
  preferences: null,
  me: null,
  items: [],
  cache: new Map(),
  selected: null,
  selectedSolicitud: null,
  catalogs: {
    centros: [],
    almacenes: [],
    roles: [],
    puestos: [],
    sectores: [],
  },
  notifications: {
    items: [],
    pending: [],
    unread: 0,
    admin: null,
  },
  formAttachments: [],
  admin: {
    selectedMaterial: null,
    users: [],
    selectedUser: null,
    originalUser: null,
    config: {
      data: {},
      editing: null,
    },
  },
  budget: {
    data: null,
    lastLoadedAt: null,
    increases: null,
  },
  chat: {
    isOpen: false,
    isSending: false,
    messages: [],
  },
};

ensurePreferencesLoaded();

function updateNotificationBadge() {
  const badge = $("#navNotificationsBadge");
  if (!badge) return;
  const pendingCount = Array.isArray(state.notifications.pending)
    ? state.notifications.pending.length
    : 0;
  const unreadCount = Number(state.notifications.unread || 0);
  const total = unreadCount + pendingCount;
  if (total > 0) {
    badge.textContent = total > 99 ? "99+" : String(total);
    badge.classList.remove("hide");
    badge.classList.add("badge--pulse");
  } else {
    badge.textContent = "0";
    badge.classList.add("hide");
    badge.classList.remove("badge--pulse");
  }
}

async function markNotificationsRead(ids = [], markAll = false) {
  try {
    await api("/notificaciones/marcar", {
      method: "POST",
      body: JSON.stringify({ ids, mark_all: markAll }),
    });
  } catch (err) {
    console.error(err);
  }
}

async function loadNotificationsSummary(options = {}) {
  if (!state.me) return null;
  try {
    const resp = await api("/notificaciones");
    state.notifications.items = Array.isArray(resp.items) ? resp.items : [];
    state.notifications.pending = Array.isArray(resp.pending) ? resp.pending : [];
    state.notifications.unread = Number(resp.unread || 0);
    state.notifications.admin = resp.admin || null;
    updateNotificationBadge();

    // Show notification popup for unread notifications
    if (state.notifications.unread > 0 && !options.markAsRead) {
      const latestUnread = state.notifications.items.find(item => !item.leido);
      if (latestUnread) {
        showNotificationPopup(`Tienes ${state.notifications.unread} notificaci?n(es) pendiente(s)`);
      }
    }

    if (options.markAsRead) {
      const unreadIds = state.notifications.items
        .filter((item) => !item.leido)
        .map((item) => item.id);
      if (unreadIds.length) {
        await markNotificationsRead(unreadIds);
        state.notifications.items = state.notifications.items.map((item) => ({
          ...item,
          leido: true,
        }));
        state.notifications.unread = 0;
        updateNotificationBadge();
      }
    }

    return {
      items: state.notifications.items,
      pending: state.notifications.pending,
      unread: state.notifications.unread,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
}

function showNotificationPopup(message) {
  const popup = $("#notificationPopup");
  const textEl = $("#notificationText");
  const closeBtn = $("#notificationClose");
  
  if (!popup || !textEl) return;
  
  textEl.textContent = message;
  popup.classList.remove("hide");
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    hideNotificationPopup();
  }, 5000);
  
  // Close button handler
  if (closeBtn) {
    closeBtn.onclick = hideNotificationPopup;
  }
}

function hideNotificationPopup() {
  const popup = $("#notificationPopup");
  if (popup) {
    popup.classList.add("hide");
  }
}

function openSolicitudFromNotifications(id) {
  if (!id) {
    return;
  }
  sessionStorage.setItem(PENDING_SOLICITUD_KEY, String(id));
  window.location.href = "mis-solicitudes.html";
}

async function decideSolicitudDecision(id, action, triggerBtn) {
  if (!id || !action) {
    return;
  }

  if (action === "ver") {
    openSolicitudFromNotifications(id);
    return;
  }

  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return;
  }

  let comentario = null;
  if (action === "aprobar") {
    const confirmed = window.confirm(`?Confirm?s aprobar la solicitud #${numericId}?`);
    if (!confirmed) {
      return;
    }
  } else if (action === "rechazar") {
    const reason = window.prompt(`Motivo del rechazo para la solicitud #${numericId} (opcional):`, "");
    if (reason === null) {
      return;
    }
    comentario = reason.trim() || null;
    const confirmed = window.confirm(`?Confirm?s rechazar la solicitud #${numericId}?`);
    if (!confirmed) {
      return;
    }
  } else {
    return;
  }

  if (triggerBtn) {
    triggerBtn.disabled = true;
  }

  try {
    const body = { accion: action };
    if (comentario) {
      body.comentario = comentario;
    }
    const resp = await api(`/solicitudes/${numericId}/decidir`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!resp?.ok) {
      throw new Error(resp?.error?.message || "No se pudo registrar la decisi?n");
    }
    const status = (resp.status || "").toLowerCase();
    let okMsg = "Decisi?n registrada";
    if (status === "aprobada") {
      okMsg = "Solicitud aprobada";
    } else if (status === "rechazada") {
      okMsg = "Solicitud rechazada";
    }
    toast(okMsg, true);
    const updated = await loadNotificationsSummary({ markAsRead: true });
    renderNotificationsPage(updated);
    
    // Si hay una solicitud abierta en el modal de detalles, recargar sus detalles
    if (state.selectedSolicitud && state.selectedSolicitud.id === numericId && status === "en_tratamiento") {
      await openSolicitudDetail(numericId);
    }
  } catch (err) {
    toast(err.message || "No se pudo registrar la decisi?n");
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
    }
  }
}

async function decideCentroRequest(id, action, triggerBtn) {
  if (!id || !action) {
    return;
  }
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return;
  }

  let comentario = null;
  if (action === "aprobar") {
    const confirmed = window.confirm(`?Confirm?s aprobar la solicitud de centros #${numericId}?`);
    if (!confirmed) {
      return;
    }
  } else if (action === "rechazar") {
    const reason = window.prompt(
      `Motivo del rechazo para la solicitud de centros #${numericId} (opcional):`,
      ""
    );
    if (reason === null) {
      return;
    }
    comentario = reason.trim() || null;
    const confirmed = window.confirm(`?Confirm?s rechazar la solicitud de centros #${numericId}?`);
    if (!confirmed) {
      return;
    }
  } else {
    return;
  }

  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.setAttribute("aria-busy", "true");
  }

  try {
    const body = { accion: action };
    if (comentario) {
      body.comentario = comentario;
    }
    const resp = await api(`/notificaciones/centros/${numericId}/decision`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!resp?.ok) {
      throw new Error(resp?.error?.message || "No se pudo registrar la decisi?n");
    }
    const estado = (resp.estado || "").toLowerCase();
    let okMsg = "Decisi?n registrada";
    if (estado === "aprobado") {
      okMsg = "Solicitud de centros aprobada";
    } else if (estado === "rechazado") {
      okMsg = "Solicitud de centros rechazada";
    }
    toast(okMsg, true);
    const updated = await loadNotificationsSummary();
    renderNotificationsPage(updated);
  } catch (err) {
    toast(err.message || "No se pudo registrar la decisi?n");
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.removeAttribute("aria-busy");
    }
  }
}

function bindPendingApprovalActions() {
  const table = document.getElementById("pendingApprovalsTable");
  if (!table || table.dataset.actionsBound === "1") {
    return;
  }
  table.dataset.actionsBound = "1";
  table.addEventListener("click", async (event) => {
    const button = event.target?.closest("button[data-action]");
    if (!button) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.action;
    const id = button.dataset.id;
    await decideSolicitudDecision(id, action, button);
  });
}

function bindCentroRequestActions() {
  const container = document.getElementById("adminCentroRequestsContainer");
  if (!container || container.dataset.actionsBound === "1") {
    return;
  }
  container.dataset.actionsBound = "1";
  container.addEventListener("click", async (event) => {
    const button = event.target?.closest("button[data-center-request-id][data-action]");
    if (!button) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.action;
    const id = button.dataset.centerRequestId;
    await decideCentroRequest(id, action, button);
  });
}

function renderNotificationsPage(data) {
  const adminData = data?.admin ?? state.notifications.admin;
  const isAdmin = Boolean(adminData?.is_admin);
  const items = data?.items ?? state.notifications.items;
  const pending = data?.pending ?? state.notifications.pending;
  const container = document.getElementById("notificationsContainer");
  const empty = document.getElementById("notificationsEmpty");
  if (container) {
    container.innerHTML = "";
    if (items && items.length) {
      container.style.display = "grid";
      if (empty) empty.style.display = "none";
      items.forEach((notif) => {
        const node = document.createElement("article");
        node.className = `notification-item${notif.leido ? "" : " unread"}`;

        const header = document.createElement("div");
        header.className = "notification-item-header";
        const createdAt = formatDateTime(notif.created_at);
        header.innerHTML = `<span>${escapeHtml(notif.mensaje || "Notificaci?n")}</span><time>${createdAt}</time>`;
        node.appendChild(header);

        if (notif.solicitud_id) {
          const actions = document.createElement("div");
          actions.className = "notification-actions";
          const button = document.createElement("button");
          button.type = "button";
          button.className = "btn";
          button.textContent = "Ver solicitud";
          button.addEventListener("click", (ev) => {
            ev.preventDefault();
            openSolicitudFromNotifications(notif.solicitud_id);
          });
          actions.appendChild(button);
          node.appendChild(actions);
        }

        container.appendChild(node);
      });
    } else {
      container.style.display = "none";
      if (empty) empty.style.display = "block";
    }
  }

  const pendingSection = document.getElementById("pendingApprovalsSection");
  const pendingTable = document.querySelector("#pendingApprovalsTable tbody");
  const pendingEmpty = document.getElementById("pendingApprovalsEmpty");
  const pendingHelper = pendingSection?.querySelector(".helper");
  const isAprobador = typeof state.me?.rol === "string" && state.me.rol.toLowerCase().includes("aprobador");
  const shouldShowPending = (isAprobador || isAdmin) && pending && pending.length;

  if (pendingSection) {
    if (pendingHelper) {
      pendingHelper.textContent = isAdmin
        ? "Todas las solicitudes pendientes de aprobacion."
        : "Estas solicitudes requieren tu accion como aprobador.";
    }
    if (!shouldShowPending) {
      pendingSection.style.display = "none";
    } else {
      pendingSection.style.display = "block";
    }
  }
  if (pendingTable) {
    pendingTable.innerHTML = "";
  }

  if (shouldShowPending && pendingSection) {
    if (pendingTable) {
      pending.forEach((row) => {
        const tr = document.createElement("tr");
        const createdAt = formatDateTime(row.created_at);
        const monto = Number(row.total_monto || 0);
        tr.innerHTML = `
          <td>#${row.id}</td>
          <td>${escapeHtml(row.centro || "ï¿½")}</td>
          <td>${escapeHtml(row.sector || "ï¿½")}</td>
          <td>${escapeHtml(row.justificacion || "ï¿½")}</td>
          <td data-sort="${monto}">${formatCurrency(monto)}</td>
          <td data-sort="${row.created_at || ""}">${createdAt}</td>
          <td class="pending-actions">
            <div class="table-actions">
              <button type="button" class="btn pri btn-sm" data-action="aprobar" data-id="${row.id}">Aprobar</button>
              <button type="button" class="btn danger btn-sm" data-action="rechazar" data-id="${row.id}">Rechazar</button>
              <button type="button" class="btn sec btn-sm" data-action="ver" data-id="${row.id}">Ver</button>
            </div>
          </td>
        `;
        tr.classList.add("clickable-row");
        tr.addEventListener("click", () => openSolicitudFromNotifications(row.id));
        pendingTable.appendChild(tr);
      });
    }
    const tableWrapper = document.getElementById("pendingApprovalsTable");
    if (tableWrapper) tableWrapper.style.display = "block";
    if (pendingEmpty) pendingEmpty.style.display = "none";
  } else if (pendingSection) {
    const tableWrapper = document.getElementById("pendingApprovalsTable");
    if (tableWrapper) tableWrapper.style.display = "none";
    if (pendingEmpty) pendingEmpty.style.display = "block";
  }

  bindPendingApprovalActions();
  if (pendingSection) {
    refreshSortableTables(pendingSection);
  }

  const centroSection = document.getElementById("adminCentroRequestsSection");
  const centroContainer = document.getElementById("adminCentroRequestsContainer");
  const centroEmpty = document.getElementById("adminCentroRequestsEmpty");
  if (centroSection) {
    if (!isAdmin) {
      centroSection.style.display = "none";
    } else {
      const requests = Array.isArray(adminData?.centro_requests) ? adminData.centro_requests : [];
      if (centroContainer) {
        centroContainer.innerHTML = "";
      }
      if (requests.length && centroContainer) {
        requests.forEach((request) => {
          const card = document.createElement("article");
          card.className = "admin-request-card";
          const centers = Array.isArray(request.centros) ? request.centros : [];
          const centersMarkup = centers.length
            ? `<ul class="admin-request-card__centers">${centers
                .map((value) => `<li>${escapeHtml(String(value))}</li>`)
                .join("")}</ul>`
            : "";
          const motivoMarkup = request.motivo
            ? `<div class="admin-request-card__body"><p>${escapeHtml(String(request.motivo))}</p></div>`
            : `<div class="admin-request-card__body"><p class="muted">Sin motivo proporcionado.</p></div>`;
          const metaParts = [];
          if (request.mail) {
            metaParts.push(escapeHtml(String(request.mail)));
          }
          metaParts.push(formatDateTime(request.created_at));
          const actionsMarkup = `
            <div class="admin-request-card__actions">
              <button type="button" class="btn pri" data-center-request-id="${escapeHtml(
                String(request.id)
              )}" data-action="aprobar">Aprobar</button>
              <button type="button" class="btn danger" data-center-request-id="${escapeHtml(
                String(request.id)
              )}" data-action="rechazar">Rechazar</button>
            </div>
          `;
          card.innerHTML = `
            <div class="admin-request-card__header">
              <span class="admin-request-card__title">${escapeHtml(request.solicitante || request.usuario_id || "Usuario")}</span>
              <div class="admin-request-card__meta">
                <span>ID ${escapeHtml(String(request.id))}</span>
                ${metaParts.map((part) => `<span>${part}</span>`).join("")}
              </div>
            </div>
            ${centersMarkup}
            ${motivoMarkup}
            ${actionsMarkup}
          `;
          centroContainer.appendChild(card);
        });
        centroSection.style.display = "block";
        if (centroEmpty) centroEmpty.style.display = "none";
      } else {
        centroSection.style.display = "block";
        if (centroEmpty) centroEmpty.style.display = "block";
      }
    }
  }

  bindCentroRequestActions();
  const newUsersSection = document.getElementById("adminNewUsersSection");
  const newUsersContainer = document.getElementById("adminNewUsersContainer");
  const newUsersEmpty = document.getElementById("adminNewUsersEmpty");
  if (newUsersSection) {
    if (!isAdmin) {
      newUsersSection.style.display = "none";
    } else {
      const users = Array.isArray(adminData?.new_users) ? adminData.new_users : [];
      if (newUsersContainer) {
        newUsersContainer.innerHTML = "";
      }
      if (users.length && newUsersContainer) {
        users.forEach((user) => {
          const card = document.createElement("article");
          card.className = "admin-request-card";
          const status = (user.estado || "pendiente").trim();
          const metaParts = [];
          if (user.mail) {
            metaParts.push(escapeHtml(String(user.mail)));
          }
          metaParts.push(escapeHtml(String(user.rol || "")));
          card.innerHTML = `
            <div class="admin-request-card__header">
              <span class="admin-request-card__title">${escapeHtml(`${user.nombre || ""} ${user.apellido || ""}`.trim() || user.id || "Usuario")}</span>
              <div class="admin-request-card__meta">
                <span>ID ${escapeHtml(String(user.id || ""))}</span>
                ${metaParts.map((part) => `<span>${part}</span>`).join("")}
                <span class="admin-request-card__badge">${escapeHtml(status)}</span>
              </div>
            </div>
          `;
          newUsersContainer.appendChild(card);
        });
        newUsersSection.style.display = "block";
        if (newUsersEmpty) newUsersEmpty.style.display = "none";
      } else {
        newUsersSection.style.display = "block";
        if (newUsersEmpty) newUsersEmpty.style.display = "block";
      }
    }
  }
}

function updateMaterialDetailButton() {
  const btn = $("#btnShowMaterialDetail");
  if (!btn) return;
  const hasDetail = Boolean(state.selected?.descripcion_larga?.trim());
  btn.disabled = !hasDetail;
}

function currentUserId() {
  return state.me?.id || state.me?.id_spm || "";
}

function getDraft() {
  const raw = sessionStorage.getItem("solicitudDraft");
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (_ignored) {
    sessionStorage.removeItem("solicitudDraft");
    return null;
  }
}

function setDraft(draft) {
  if (!draft) {
    sessionStorage.removeItem("solicitudDraft");
    return;
  }
  sessionStorage.setItem("solicitudDraft", JSON.stringify(draft));
}

function updateDraftHeader(partial) {
  if (!partial || typeof partial !== "object") {
    return;
  }
  const current = getDraft();
  const nextDraft = current
    ? {
        ...current,
        header: { ...(current.header || {}), ...partial },
      }
    : {
        id: current?.id || null,
        header: { ...partial },
        items: cloneItems(state.items),
        user: currentUserId() || null,
      };
  if (!Array.isArray(nextDraft.items)) {
    nextDraft.items = cloneItems(state.items);
  }
  if (!nextDraft.user) {
    nextDraft.user = currentUserId() || nextDraft.user || null;
  }
  setDraft(nextDraft);
}

function persistDraftState() {
  const draft = getDraft();
  if (!draft) {
    return;
  }
  draft.items = cloneItems(state.items);
  setDraft(draft);
}

function cloneAttachments(list) {
  return Array.isArray(list) ? list.map((att) => ({ ...att })) : [];
}

function persistDraftAttachments() {
  const draft = getDraft() || {
    id: null,
    header: {},
    items: cloneItems(state.items),
    user: currentUserId() || null,
  };
  draft.header = {
    ...(draft.header || {}),
    attachments: cloneAttachments(state.formAttachments),
  };
  setDraft(draft);
}

function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) return "0 KB";
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function allowedAttachment(filename) {
  if (!filename || !filename.includes(".")) return false;
  const ext = filename.split(".").pop().toLowerCase();
  return ALLOWED_FILE_EXTENSIONS.has(ext);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function renderAttachmentList() {
  const wrapper = document.getElementById("archivosAdjuntos");
  const list = document.getElementById("listaArchivos");
  if (!wrapper || !list) return;
  const attachments = Array.isArray(state.formAttachments) ? state.formAttachments : [];
  if (!attachments.length) {
    wrapper.style.display = "none";
    list.innerHTML = "";
    return;
  }
  wrapper.style.display = "block";
  list.innerHTML = attachments
    .map(
      (att, index) => `
        <div class="archivo-item">
          <span class="archivo-nombre">${escapeHtml(att.name)}</span>
          <span class="archivo-peso">${formatFileSize(att.size)}</span>
          <button type="button" class="btn-icon" data-remove-attachment="${index}" aria-label="Eliminar archivo">
            ${ICONS.close}
          </button>
        </div>
      `
    )
    .join("");
  list.querySelectorAll("[data-remove-attachment]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      const idx = Number(btn.dataset.removeAttachment);
      if (Number.isFinite(idx)) {
        state.formAttachments.splice(idx, 1);
        persistDraftAttachments();
        renderAttachmentList();
      }
    });
  });
}

async function handleAttachmentSelection(event) {
  const files = Array.from(event.target?.files || []);
  if (!files.length) return;
  const newAttachments = [];
  for (const file of files) {
    if (!allowedAttachment(file.name)) {
      toast(`El archivo "${file.name}" no tiene una extensiÃ³n permitida`);
      continue;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      newAttachments.push({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size || 0,
        dataUrl,
        addedAt: Date.now(),
      });
    } catch (error) {
      console.error("Error leyendo archivo", error);
      toast(`No se pudo leer el archivo "${file.name}"`);
    }
  }
  if (!newAttachments.length) {
    event.target.value = "";
    return;
  }
  state.formAttachments = [...(state.formAttachments || []), ...newAttachments];
  persistDraftAttachments();
  renderAttachmentList();
  event.target.value = "";
}

function initAttachmentControls() {
  const trigger = document.getElementById("btnAdjuntar");
  const input = document.getElementById("fileInput");
  if (!trigger || !input) return;
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    input.click();
  });
  input.addEventListener("change", handleAttachmentSelection);
  renderAttachmentList();
}

function hydrateCreateSolicitudForm() {
  const draft = getDraft();
  const header = draft?.header || {};
  state.formAttachments = Array.isArray(header.attachments) ? header.attachments : [];

  const sectorInput = document.getElementById("sector");
  if (sectorInput) {
    sectorInput.value = header.sector || state.me?.sector || "";
  }

  const centroOptions = buildCentroOptions();
  const centroDefault = header.centro || centroOptions[0]?.value || DEFAULT_CENTROS[0] || "";
  const centroEl = document.getElementById("centro");
  if (centroEl) {
    renderSelectOptions(centroEl, centroOptions, {
      placeholder: "Seleccione un centro",
      value: centroDefault,
    });
  }

  const fechaEl = document.getElementById("fechaNecesidad");
  const fechaDefault = header.fecha_necesidad || new Date().toISOString().split("T")[0];
  if (fechaEl) {
    fechaEl.value = fechaDefault;
  }

  const criticidadEl = document.getElementById("criticidad");
  if (criticidadEl && header.criticidad) {
    criticidadEl.value = header.criticidad;
  }

  const costoInput = document.getElementById("centroDeCostos");
  if (costoInput) {
    costoInput.value = header.centro_costos || "";
  }

  const justInput = document.getElementById("just");
  if (justInput) {
    justInput.value = header.justificacion || "";
  }

  cargarAlmacenes(centroDefault).then(() => {
    const almacenEl = document.getElementById("almacen");
    const almacenValue = header.almacen_virtual || getDefaultAlmacenValue();
    if (almacenEl && almacenValue) {
      almacenEl.value = almacenValue;
    }
  });

  initAttachmentControls();
  renderAttachmentList();
}


async function bootstrapIndexPage() {
  const root = document.getElementById("app");
  if (!root) {
    showFatal("No se encontró el contenedor principal", "#app missing");
    return;
  }
  const token = getToken();
  if (!token) {
    console.info("[auth] sin token -> login");
    renderLogin(root);
    return;
  }
  console.info("[auth] token detectado, validando sesion");
  try {
    const response = await fetch("/api/usuarios/me", { credentials: "include" });
    if (response.ok) {
      console.info("[auth] token valido -> home");
      if (window.location.pathname === "/home.html") {
        return;
      }
      location.replace("/home.html");
      return;
    }
    console.info("[auth] token -> me fallo -> login", { status: response.status });
  } catch (error) {
    console.warn("[auth] verificacion de sesion fallo", error);
  }
  clearToken();
  renderLogin(root);
}


async function login() {
  const idInput = document.getElementById("id");
  const passwordInput = document.getElementById("pw");
  const submitBtn = document.getElementById("login");
  const errorBox = document.getElementById("loginError");
  if (!idInput || !passwordInput || !submitBtn) {
    return;
  }
  const form = submitBtn.closest("form") || document.getElementById("auth");
  const controls = form ? Array.from(form.querySelectorAll("input, button, select")) : [idInput, passwordInput, submitBtn];
  const username = idInput.value.trim();
  const password = passwordInput.value || "";
  if (errorBox) {
    errorBox.textContent = "";
    errorBox.classList.add("hide");
  }
  if (!username || !password) {
    if (errorBox) {
      errorBox.textContent = "Completa usuario y contrasena.";
      errorBox.classList.remove("hide");
      errorBox.setAttribute("role", "alert");
    }
    (!username ? idInput : passwordInput).focus();
    return;
  }
  controls.forEach((control) => {
    control.disabled = true;
  });
  submitBtn.setAttribute("aria-busy", "true");
  console.info("[auth] intentando login", { usuario: username });
  try {
    const data = await api("/login", {
      method: "POST",
      body: JSON.stringify({ id: username, password }),
    });
    setToken(data?.refresh_token || null);
    console.info("[auth] sesion iniciada", { usuario: data?.user?.id || username });
    location.replace("/home.html");
  } catch (err) {
    console.error("[auth] error durante login", err);
    if (errorBox) {
      errorBox.textContent = err?.message || "Error al iniciar sesion";
      errorBox.classList.remove("hide");
      errorBox.setAttribute("role", "alert");
    } else {
      toast(err?.message || "Error al iniciar sesion");
    }
  } finally {
    submitBtn.removeAttribute("aria-busy");
    if (document.body.contains(submitBtn)) {
      controls.forEach((control) => {
        control.disabled = false;
      });
    }
  }
}

async function register() {
  // Mostrar modal de registro
  $("#registerModal").classList.remove("hide");
  $("#registerId").focus();
}

async function submitRegister() {
  const id = $("#registerId").value.trim();
  const password = $("#registerPassword").value;
  const nombre = $("#registerNombre").value.trim();
  const apellido = $("#registerApellido").value.trim();
  const rol = $("#registerRol").value;

  if (!id || !password || !nombre || !apellido) {
    toast("Todos los campos son requeridos");
    return;
  }

  if (password.length < 6) {
    toast("La contrasena debe tener al menos 6 caracteres");
    return;
  }

  try {
    await api("/register", {
      method: "POST",
      body: JSON.stringify({ id, password, nombre, apellido, rol }),
    });
    toast("Usuario registrado. Ahora puede iniciar sesion.", true);
    closeRegisterModal();
  } catch (err) {
    toast(err.message);
  }
}

function closeRegisterModal() {
  $("#registerModal").classList.add("hide");
  $("#registerForm").reset();
}

function recover() {
  const id = $("#id").value.trim();
  if (!id) {
    toast("Ingrese su ID o email para recuperar la contrasena");
    return;
  }
  const mailto = `mailto:manuelremon@live.com.ar?subject=Recuperaci%C3%B3n%20de%20contrase%C3%B1a&body=Por%20favor%20asistir%20al%20usuario:%20${encodeURIComponent(id)}`;
  window.location.href = mailto;
}

function help() {
  const mailto = `mailto:manuelremon@live.com.ar?subject=Ayuda%20SPM&body=Hola%20Manuel,%20necesito%20ayuda.`;
  window.location.href = mailto;
}

async function me() {
  try {
    const resp = await api("/usuarios/me");
    state.me = resp.usuario;
    updateMenuVisibility();
    if (state.me) {
      state.me.centros = parseCentrosList(state.me.centros);
      if (typeof state.me.sector !== "string") {
        state.me.sector = state.me.sector ? String(state.me.sector) : "";
      }
      state.me.posicion = state.me.posicion ? String(state.me.posicion) : "";
      state.me.mail = state.me.mail ? String(state.me.mail) : "";
      state.me.telefono = state.me.telefono ? String(state.me.telefono) : "";
      state.me.id_red = state.me.id_red || state.me.id_ypf || "";
      state.me.jefe = state.me.jefe ? String(state.me.jefe) : "";
      state.me.gerente1 = state.me.gerente1 ? String(state.me.gerente1) : "";
      state.me.gerente2 = state.me.gerente2 ? String(state.me.gerente2) : "";
      if (!Array.isArray(state.me.centros)) {
        state.me.centros = parseCentrosList(state.me.centros);
      }
    }
    return { ok: true };
  } catch (error) {
    state.me = null;
    updateMenuVisibility();
    return { ok: false, error };
  }
}

async function logout() {
  try {
    await api("/logout", { method: "POST" });
  } catch (error) {
    console.error("[auth] fallo al cerrar sesion", error);
  } finally {
    clearStoredAuthTokens();
  }
  state.me = null;
  updateMenuVisibility();
  state.items = [];
  state.formAttachments = [];
  sessionStorage.removeItem("solicitudDraft");
  window.location.href = "index.html";
}

async function addItem() {
  const codeInput = $("#codeSearch");
  const descInput = $("#descSearch");
  const codeSuggest = $("#suggestCode");
  const descSuggest = $("#suggestDesc");
  const code = codeInput?.value.trim() || "";
  const desc = descInput?.value.trim() || "";

  let material = state.selected ? { ...state.selected } : null;

  if (!material) {
    if (!code && !desc) {
      toast("Busc? un material por c?digo o descripci?n");
      return;
    }
    try {
  const params = new URLSearchParams({ limit: String(MATERIAL_SUGGESTION_LIMIT) });
      if (code) params.set("codigo", code);
      if (desc) params.set("descripcion", desc);
      const results = await api(`/materiales?${params.toString()}`);
      if (!results.length) {
        toast("No se encontraron materiales con ese criterio");
        return;
      }
      if (results.length > 1) {
        toast("Seleccione un material de la lista sugerida");
        if (code) state.cache.set(`codigo:${code.toLowerCase()}`, results);
        if (desc) state.cache.set(`descripcion:${desc.toLowerCase()}`, results);
        showMaterialSuggestions(codeSuggest, results, codeSuggest, descSuggest);
        showMaterialSuggestions(descSuggest, results, codeSuggest, descSuggest);
        return;
      }
      material = normalizeMaterial(results[0]);
    } catch (err) {
      toast(err.message);
      return;
    }
  }

  if (!material) {
    toast("Seleccione un material válido");
    return;
  }

  const existing = state.items.findIndex((item) => item.codigo === material.codigo);
  if (existing >= 0) {
    state.items[existing].cantidad = Math.max(1, Number(state.items[existing].cantidad) || 1) + 1;
  } else {
    state.items.push({
      codigo: material.codigo,
      descripcion: material.descripcion,
      unidad: material.unidad || "",
      precio: Number(material.precio || 0),
      cantidad: 1,
    });
  }

  if (codeInput) codeInput.value = "";
  if (descInput) descInput.value = "";
  hide(codeSuggest);
  hide(descSuggest);
  state.selected = null;
  updateMaterialDetailButton();
  renderCart(state.items);
}

async function recreateDraft(latestDraft, latestUserId) {
  if (!latestDraft?.header || !latestUserId) {
    return null;
  }
  const almacenVirtual =
  latestDraft.header.almacen_virtual || getDefaultAlmacenValue() || "";
  if (!almacenVirtual) {
    toast("No se pudo determinar el almac?n virtual del borrador");
    return null;
  }
  const criticidad = latestDraft.header.criticidad || "Normal";
  const fechaNecesidad =
    latestDraft.header.fecha_necesidad || new Date().toISOString().split("T")[0];
  try {
    const payload = {
      id_usuario: latestUserId,
      centro: latestDraft.header.centro,
      sector: latestDraft.header.sector,
      justificacion: latestDraft.header.justificacion,
      centro_costos: latestDraft.header.centro_costos,
      almacen_virtual: almacenVirtual,
      criticidad,
      fecha_necesidad: fechaNecesidad,
    };
    const resp = await api("/solicitudes/drafts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const header = {
      ...latestDraft.header,
      almacen_virtual: almacenVirtual,
      criticidad,
      fecha_necesidad: fechaNecesidad,
    };
    const newDraft = {
      id: resp.id,
      header,
      items: cloneItems(state.items),
      user: latestUserId,
    };
    setDraft(newDraft);
    const idDisplay = $("#solicitudIdDisplay");
    if (idDisplay) {
      idDisplay.textContent = `#${resp.id}`;
    }
    toast("Solicitud recreada. Ahora puedes editarla.", true);
    return resp.id;
  } catch (err) {
    toast(err.message);
    return null;
  }
}

async function saveDraft(isRetry = false) {
  const latestDraft = getDraft();
  if (!latestDraft || !latestDraft.header) {
    toast("No se encontró el encabezado de la solicitud");
    return;
  }
  const latestUserId = currentUserId();
  if (!latestUserId) {
    toast("No se pudo identificar al usuario actual");
    return;
  }
  const almacenVirtual =
  latestDraft.header.almacen_virtual || getDefaultAlmacenValue() || "";
  if (!almacenVirtual) {
    toast("Seleccione un almacén virtual en el paso anterior");
    toast("Seleccione un almac\u00E9n virtual en el paso anterior");
  }
  const criticidad = latestDraft.header.criticidad || "Normal";
  const fechaNecesidad =
    latestDraft.header.fecha_necesidad || new Date().toISOString().split("T")[0];
  const payloadItems = state.items.map((item) => ({
    codigo: item.codigo,
    descripcion: item.descripcion,
    cantidad: Math.max(1, Number(item.cantidad) || 1),
    precio_unitario: Number(item.precio ?? 0),
    unidad: item.unidad || "",
  }));
  const body = {
    id_usuario: latestUserId,
    centro: latestDraft.header.centro,
    sector: latestDraft.header.sector,
    justificacion: latestDraft.header.justificacion,
    centro_costos: latestDraft.header.centro_costos,
    almacen_virtual: almacenVirtual,
    criticidad,
    fecha_necesidad: fechaNecesidad,
    items: payloadItems,
  };
  const btn = $("#btnSaveDraft");
  if (btn) btn.disabled = true;
  try {
    await api(`/solicitudes/${latestDraft.id}/draft`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    setDraft({
      ...latestDraft,
      header: {
        ...latestDraft.header,
        almacen_virtual: almacenVirtual,
        criticidad,
        fecha_necesidad: fechaNecesidad,
      },
      items: cloneItems(state.items),
    });
    toast("Borrador guardado", true);
  } catch (err) {
    if (!isRetry && isNotFoundError(err)) {
      const recreatedId = await recreateDraft(latestDraft, latestUserId);
      if (recreatedId) {
        await saveDraft(true);
        return;
      }
    }
    toast(err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function sendSolicitud() {
  const latestDraft = getDraft();
  if (!latestDraft || !latestDraft.header) {
    toast("No se encontró el encabezado de la solicitud");
    return;
  }
  if (!state.items || !state.items.length) {
    toast("Agregue al menos un material a la solicitud");
    return;
  }
  const latestUserId = currentUserId();
  if (!latestUserId) {
    toast("No se pudo identificar al usuario actual");
    return;
  }
  const almacenVirtual =
    latestDraft.header.almacen_virtual || getDefaultAlmacenValue() || "";
  if (!almacenVirtual) {
    toast("Seleccione un almacén virtual en el paso anterior");
    toast("Seleccione un almac\u00E9n virtual en el paso anterior");
  }
  const criticidad = latestDraft.header.criticidad || "Normal";
  const fechaNecesidad =
    latestDraft.header.fecha_necesidad || new Date().toISOString().split("T")[0];
  const payloadItems = state.items.map((item) => ({
    codigo: item.codigo,
    descripcion: item.descripcion,
    cantidad: Math.max(1, Number(item.cantidad) || 1),
    precio_unitario: Number(item.precio ?? 0),
    unidad: item.unidad || "",
  }));
  const body = {
    id_usuario: latestUserId,
    centro: latestDraft.header.centro,
    sector: latestDraft.header.sector,
    justificacion: latestDraft.header.justificacion,
    centro_costos: latestDraft.header.centro_costos,
    almacen_virtual: almacenVirtual,
    criticidad,
    fecha_necesidad: fechaNecesidad,
    items: payloadItems,
  };
  const btn = $("#btnSend");
  if (btn) btn.disabled = true;
  try {
    const resp = await api("/solicitudes", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const solicitudId = resp?.id;
    if (solicitudId && state.formAttachments?.length) {
      await uploadDraftAttachments(solicitudId);
    }
    // Clear draft
    sessionStorage.removeItem("solicitudDraft");
    state.items = [];
    state.formAttachments = [];
    toast("Solicitud enviada correctamente", true);
    // Redirect to home o mis-solicitudes
    window.location.href = "mis-solicitudes.html";
  } catch (err) {
    toast(err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function uploadDraftAttachments(solicitudId) {
  const attachments = Array.isArray(state.formAttachments) ? state.formAttachments : [];
  for (const attachment of attachments) {
    try {
      const blob = dataUrlToBlob(attachment.dataUrl);
      const file = new File([blob], attachment.name, {
        type: attachment.type || "application/octet-stream",
      });
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/archivos/upload/${solicitudId}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        console.warn("No se pudo adjuntar archivo", attachment.name, response.status);
      }
    } catch (error) {
      console.error("Error subiendo archivo", attachment.name, error);
    }
  }
}

function dataUrlToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") {
    return new Blob();
  }
  const parts = dataUrl.split(",");
  if (parts.length < 2) {
    return new Blob();
  }
  const meta = parts[0];
  const base64 = parts[1];
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  return new Blob([bytes], { type: mime });
}

function renderSolicitudDetail(detail) {
  const idEl = $("#detailId");
  const statusEl = $("#detailStatus");
  const centroEl = $("#detailCentro");
  const sectorEl = $("#detailSector");
  const centroCostosEl = $("#detailCentroCostos");
  const almacenEl = $("#detailAlmacen");
  const criticidadEl = $("#detailCriticidad");
  const fechaEl = $("#detailFechaNecesidad");
  const justEl = $("#detailJustificacion");
  const createdEl = $("#detailCreated");
  const updatedEl = $("#detailUpdated");
  const totalEl = $("#detailTotal");
  const aprobadorEl = $("#detailAprobador");
  const planificadorEl = $("#detailPlanificador");
  const cancelInfo = $("#detailCancelInfo");
  const itemsTbody = $("#detailItems tbody");
  if (!itemsTbody) return;

  idEl.textContent = `#${detail.id}`;
  statusEl.innerHTML = statusBadge(detail.status);
  centroEl.textContent = detail.centro || "ï¿½";
  sectorEl.textContent = detail.sector || "ï¿½";
  centroCostosEl.textContent = detail.centro_costos || "ï¿½";
  if (almacenEl) {
    almacenEl.textContent = detail.almacen_virtual || "ï¿½";
  }
  if (criticidadEl) {
    criticidadEl.textContent = detail.criticidad || "ï¿½";
  }
  if (fechaEl) {
    if (detail.fecha_necesidad) {
      const fecha = new Date(detail.fecha_necesidad);
      fechaEl.textContent = Number.isNaN(fecha.getTime())
        ? detail.fecha_necesidad
        : fecha.toLocaleDateString();
    } else {
      fechaEl.textContent = "ï¿½";
    }
  }
  justEl.textContent = detail.justificacion || "ï¿½";
  createdEl.textContent = detail.created_at ? new Date(detail.created_at).toLocaleString() : "ï¿½";
  updatedEl.textContent = detail.updated_at ? new Date(detail.updated_at).toLocaleString() : "ï¿½";
  totalEl.textContent = formatCurrency(detail.total_monto || 0);
  if (aprobadorEl) {
    aprobadorEl.textContent = detail.aprobador_nombre || "ï¿½";
  }
  if (planificadorEl) {
    planificadorEl.textContent = detail.planner_nombre || "ï¿½";
  }

  const cancelRequest = detail.cancel_request || null;
  cancelInfo.classList.add("hide");
  cancelInfo.textContent = "";
  if (detail.status === "cancelada") {
    const reason = detail.cancel_reason ? `Motivo: ${detail.cancel_reason}` : "Sin motivo indicado";
    const when = detail.cancelled_at ? ` ï¿½ ${formatDateTime(detail.cancelled_at)}` : "";
    cancelInfo.textContent = `${reason}${when}`;
    cancelInfo.classList.remove("hide");
  } else if (cancelRequest && cancelRequest.status === "pendiente") {
    const when = cancelRequest.requested_at ? formatDateTime(cancelRequest.requested_at) : "";
    const reason = cancelRequest.reason ? `Motivo: ${cancelRequest.reason}` : "Sin motivo indicado";
    cancelInfo.textContent = `Cancelaci?n solicitada${when ? ` el ${when}` : ""}. ${reason}. pendiente de planificador.`;
    cancelInfo.classList.remove("hide");
  } else if (cancelRequest && cancelRequest.status === "rechazada") {
    const when = cancelRequest.decision_at ? formatDateTime(cancelRequest.decision_at) : "";
    const comment = cancelRequest.decision_comment ? ` Motivo del rechazo: ${cancelRequest.decision_comment}.` : "";
    cancelInfo.textContent = `Se rechaz? la cancelaci?n${when ? ` el ${when}` : ""}.${comment}`;
    cancelInfo.classList.remove("hide");
  }

  itemsTbody.innerHTML = "";
  if (!detail.items || !detail.items.length) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = '<td colspan="6" class="muted">Sin ?tems registrados</td>';
    itemsTbody.appendChild(emptyRow);
  } else {
    detail.items.forEach((item) => {
      const tr = document.createElement("tr");
      const cantidad = Number(item.cantidad ?? 0);
      const cantidadFmt = Number.isFinite(cantidad)
        ? cantidad.toLocaleString("es-AR")
        : item.cantidad || "ï¿½";
      tr.innerHTML = `
        <td>${item.codigo || "ï¿½"}</td>
        <td>${item.descripcion || ""}</td>
        <td>${item.unidad || "ï¿½"}</td>
        <td>${formatCurrency(item.precio_unitario)}</td>
        <td>${cantidadFmt}</td>
        <td>${formatCurrency(item.subtotal)}</td>
      `;
      itemsTbody.appendChild(tr);
    });
  }

  refreshSortableTables(itemsTbody.closest("table"));

  const cancelBtn = $("#btnRequestCancel");
  if (cancelBtn) {
    if (detail.status === "cancelada") {
      cancelBtn.disabled = true;
      cancelBtn.textContent = "Solicitud cancelada";
    } else if (detail.status === "cancelacion_pendiente") {
      cancelBtn.disabled = true;
      cancelBtn.textContent = "Cancelaci?n pendiente";
    } else if (detail.status === "draft") {
      cancelBtn.disabled = true;
      cancelBtn.textContent = "Env?a la solicitud para cancelarla";
    } else {
      cancelBtn.disabled = false;
      cancelBtn.textContent = "Solicitar cancelaci?n";
    }
  }

  const editDraftBtn = $("#btnEditDraft");
  if (editDraftBtn) {
    const canEditDraft = detail.status === "draft";
    editDraftBtn.classList.toggle("hide", !canEditDraft);
    editDraftBtn.disabled = !canEditDraft;
  }
}

async function openSolicitudDetail(id) {
  const modal = $("#solicitudDetailModal");
  if (!modal) return;
  modal.classList.remove("hide");
  const itemsTbody = $("#detailItems tbody");
  if (itemsTbody) {
    itemsTbody.innerHTML = '<tr><td colspan="5" class="muted">Cargando...</td></tr>';
  }
  try {
    const response = await api(`/solicitudes/${id}`);
    const detail = response?.solicitud && typeof response.solicitud === "object"
      ? response.solicitud
      : response; // fallback for legacy/direct responses
    if (!detail || typeof detail !== "object") {
      throw new Error("No se pudo cargar la solicitud");
    }
    state.selectedSolicitud = detail;
    renderSolicitudDetail(detail);
  } catch (err) {
    toast(err.message);
    closeSolicitudDetailModal();
  }
}

function closeSolicitudDetailModal() {
  const modal = $("#solicitudDetailModal");
  if (!modal) return;
  modal.classList.add("hide");
  state.selectedSolicitud = null;
  const cancelBtn = $("#btnRequestCancel");
  if (cancelBtn) {
    cancelBtn.disabled = false;
    cancelBtn.textContent = "Solicitar cancelaci?n";
  }
  const editBtn = $("#btnEditDraft");
  if (editBtn) {
    editBtn.classList.add("hide");
    editBtn.disabled = false;
  }
  const itemsTbody = $("#detailItems tbody");
  if (itemsTbody) {
    itemsTbody.innerHTML = "";
  }
}

async function requestCancelSelectedSolicitud() {
  const detail = state.selectedSolicitud;
  if (!detail) return;
  if (detail.status === "cancelada") {
    toast("La solicitud ya est? cancelada");
    return;
  }
  const reason = prompt("Motivo de cancelaci?n (opcional):", detail.cancel_reason || "");
  if (reason === null) {
    return;
  }
  const cancelBtn = $("#btnRequestCancel");
  if (cancelBtn) cancelBtn.disabled = true;
  try {
    const response = await api(`/solicitudes/${detail.id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
    if (response?.status === "cancelacion_pendiente") {
      toast("Cancelaciï¿½n enviada. pendiente de aprobaciï¿½n del planificador.", true);
    } else {
      toast("Solicitud cancelada", true);
    }
    const updatedResponse = await api(`/solicitudes/${detail.id}`);
    const updated = updatedResponse?.solicitud && typeof updatedResponse.solicitud === "object"
      ? updatedResponse.solicitud
      : updatedResponse;
    state.selectedSolicitud = updated;
    renderSolicitudDetail(updated);
    refresh();
  } catch (err) {
    toast(err.message);
  } finally {
    if (cancelBtn) cancelBtn.disabled = false;
  }
}

function resumeDraftFromDetail() {
  const detail = state.selectedSolicitud;
  if (!detail || detail.status !== "draft") {
    toast("Solo podï¿½s editar solicitudes en borrador");
    return;
  }
  const userId = currentUserId();
  if (!userId) {
    toast("No se pudo identificar al usuario actual");
    return;
  }
  const header = {
    centro: detail.centro || "",
    sector: detail.sector || "",
    justificacion: detail.justificacion || "",
    centro_costos: detail.centro_costos || "",
    almacen_virtual: detail.almacen_virtual || "",
    criticidad: detail.criticidad || "Normal",
    fecha_necesidad: detail.fecha_necesidad || new Date().toISOString().split("T")[0],
  };
  const items = Array.isArray(detail.items)
    ? detail.items.map((item) => ({
        codigo: item.codigo,
        descripcion: item.descripcion,
        unidad: item.unidad || "",
        precio: Number(item.precio_unitario ?? item.precio ?? 0),
        cantidad: Math.max(1, Number(item.cantidad) || 1),
      }))
    : [];
  setDraft({ id: detail.id, header, items, user: userId });
  closeSolicitudDetailModal();
  toast(`Borrador ${detail.id} listo para editar`, true);
  window.location.href = "agregar-materiales.html";
}

function showMaterialSuggestions(container, items, codeSuggest, descSuggest) {
  if (!container) return;
  container.innerHTML = "";
  if (!items || !items.length) {
    hide(container);
    return;
  }
  const codeInput = $("#codeSearch");
  const descInput = $("#descSearch");
  if (items.length === 1) {
    const single = normalizeMaterial(items[0]);
    state.selected = single;
    if (codeInput) codeInput.value = single.codigo;
    if (descInput) descInput.value = single.descripcion;
    updateMaterialDetailButton();
  }
  items.forEach((material) => {
    const normalized = normalizeMaterial(material);
    const option = document.createElement("div");
    option.textContent = `${normalized.codigo} ï¿½ ${normalized.descripcion}`;
    option.onclick = () => {
      if (codeInput) codeInput.value = normalized.codigo;
      if (descInput) descInput.value = normalized.descripcion;
      state.selected = normalized;
      updateMaterialDetailButton();
      hide(container);
      if (container !== codeSuggest) hide(codeSuggest);
      if (container !== descSuggest) hide(descSuggest);
    };
    container.appendChild(option);
  });
  show(container);
}

function setupMaterialSearch() {
  const codeInput = $("#codeSearch");
  const descInput = $("#descSearch");
  const codeSuggest = $("#suggestCode");
  const descSuggest = $("#suggestDesc");

  const attach = (input, suggest, key) => {
    if (!input || !suggest) return;
    let debounceId = null;
    input.addEventListener("input", (event) => {
      const term = event.target.value.trim();
      state.selected = null;
      updateMaterialDetailButton();
  if (!term || term.length < 1) {
        hide(suggest);
        return;
      }
      clearTimeout(debounceId);
      debounceId = setTimeout(async () => {
        try {
          const cacheKey = `${key}:${term.toLowerCase()}`;
          if (state.cache.has(cacheKey)) {
            showMaterialSuggestions(suggest, state.cache.get(cacheKey), codeSuggest, descSuggest);
            return;
          }
          const params = new URLSearchParams({ limit: String(MATERIAL_SUGGESTION_LIMIT) });
          params.set(key, term);
          const items = await api(`/materiales?${params.toString()}`);
          state.cache.set(cacheKey, items);
          showMaterialSuggestions(suggest, items, codeSuggest, descSuggest);
        } catch (_ignored) {
          hide(suggest);
        }
      }, 220);
    });

    input.addEventListener("focus", () => {
      const term = input.value.trim();
      if (!term) return;
      const cacheKey = `${key}:${term.toLowerCase()}`;
      if (state.cache.has(cacheKey)) {
        showMaterialSuggestions(suggest, state.cache.get(cacheKey), codeSuggest, descSuggest);
      }
    });
  };

  attach(codeInput, codeSuggest, "codigo");
  attach(descInput, descSuggest, "descripcion");
}

function openMaterialDetailModal() {
  const material = state.selected;
  if (!material || !material.descripcion_larga?.trim()) {
    toast("Seleccione un material con detalle disponible");
    return;
  }
  const modal = $("#materialDetailModal");
  const title = $("#materialDetailTitle");
  const body = $("#materialDetailBody");
  if (!modal || !title || !body) {
    return;
  }
  title.textContent = `${material.codigo} ï¿½ ${material.descripcion}`;
  body.textContent = material.descripcion_larga;
  modal.classList.remove("hide");
}

function closeMaterialDetailModal() {
  const modal = $("#materialDetailModal");
  if (!modal) return;
  modal.classList.add("hide");
}

const ACCOUNT_FIELD_CONFIG = [
  { key: "rol", label: "Rol", policy: "approval" },
  { key: "posicion", label: "Posicion", policy: "approval" },
  { key: "sector", label: "Sector", policy: "approval" },
  { key: "telefono", label: "Telefono", policy: "user" },
  { key: "mail", label: "Mail", policy: "user" },
  { key: "jefe", label: "Jefe", policy: "approval" },
  { key: "gerente1", label: "Gerente 1", policy: "approval" },
  { key: "gerente2", label: "Gerente 2", policy: "approval" }
];

function profileFieldInputType(field) {
  if (field === "mail" || field === "email") return "email";
  if (field === "telefono" || field === "phone") return "tel";
  return "text";
}

function sanitizeProfileField(field, value) {
  const str = String(value ?? "").trim();
  if (!str) {
    return "";
  }
  if (field === "telefono" || field === "phone") {
    return str.replace(/[^0-9+()\- ]/g, "").trim();
  }
  return str;
}

function validateProfileField(field, value) {
  const clean = String(value ?? "").trim();
  if (!clean) {
    return { ok: false, error: "El valor no puede estar vacio." };
  }
  if (field === "mail" || field === "email") {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(clean)) {
      return { ok: false, error: "Formato de email invalido." };
    }
  }
  if (field === "telefono" || field === "phone") {
    const digits = clean.replace(/\D/g, "");
    if (!digits.length) {
      return { ok: false, error: "Ingresa un telefono valido." };
    }
  }
  return { ok: true };
}

const accountFieldEditor = (() => {
  let activeCard = null;

  function updateSaveState(input, saveBtn, originalValue, field) {
    if (!input || !saveBtn) return;
    const current = sanitizeProfileField(field, input.value);
    saveBtn.disabled = current === originalValue;
  }

  function setViewValue(card, value) {
    const valueEl = card.querySelector(".field-value");
    if (!valueEl) return;
    const clean = sanitizeProfileField(card.dataset.field, value);
    if (clean) {
      valueEl.textContent = clean;
      valueEl.classList.remove("is-empty");
    } else {
      valueEl.textContent = "Sin informacion";
      valueEl.classList.add("is-empty");
    }
    card.dataset.originalValue = clean;
  }

  function createEditor(card) {
    const field = card.dataset.field;
    if (!field) return null;
    const label = card.dataset.label || field;
    const original = card.dataset.originalValue ?? "";

    const editor = document.createElement("div");
    editor.className = "field-edit";

    const input = document.createElement("input");
    input.type = profileFieldInputType(field);
    input.value = original;
    input.className = "field-input";
    input.setAttribute("aria-label", `Editar ${label}`);
    input.setAttribute("autocomplete", field === "mail" ? "email" : "off");
    if (field === "telefono") {
      input.setAttribute("inputmode", "tel");
      input.setAttribute("pattern", "^[0-9+()\\- ]*$");
      input.setAttribute("maxlength", "25");
    }

    const actions = document.createElement("div");
    actions.className = "field-actions";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn pri field-save";
    saveBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span class="label">Guardar</span>';

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn ghost field-cancel";
    cancelBtn.textContent = "Cancelar";

    actions.append(saveBtn, cancelBtn);
    editor.append(input, actions);

    input.addEventListener("input", () => {
      updateSaveState(input, saveBtn, original, field);
    });
    updateSaveState(input, saveBtn, original, field);

    return editor;
  }

  function exitEdit(card, { focusTrigger = false } = {}) {
    const editor = card.querySelector(".field-edit");
    if (editor) {
      editor.remove();
    }
    card.classList.remove("editing", "saving");
    card.removeAttribute("aria-busy");
    if (focusTrigger) {
      card.querySelector(".edit-field")?.focus();
    }
    if (activeCard === card) {
      activeCard = null;
    }
  }

  function closeActiveCard(options) {
    if (!activeCard) return;
    exitEdit(activeCard, options);
  }

  async function persist(card) {
    const field = card.dataset.field;
    if (!field) return;
    const policy = card.dataset.editPolicy || "user";
    const editor = card.querySelector(".field-edit");
    const input = editor?.querySelector("input");
    const saveBtn = editor?.querySelector(".field-save");
    const cancelBtn = editor?.querySelector(".field-cancel");
    if (!input || !saveBtn || !cancelBtn) {
      return;
    }

    const originalValue = card.dataset.originalValue ?? "";
    const sanitizedValue = sanitizeProfileField(field, input.value);
    if (sanitizedValue === originalValue) {
      exitEdit(card, { focusTrigger: true });
      return;
    }

    const validation = validateProfileField(field, sanitizedValue);
    if (!validation.ok) {
      toast(validation.error);
      requestAnimationFrame(() => input.focus());
      return;
    }

    card.classList.add("saving");
    card.setAttribute("aria-busy", "true");
    input.disabled = true;
    saveBtn.disabled = true;
    cancelBtn.disabled = true;

    let shouldClose = false;
    let failed = false;

    try {
      const payload = { field, value: sanitizedValue };
      const userId = card.dataset.userId;
      if (userId) {
        payload.userId = userId;
      }
      const endpoint = policy === "user" ? "/me/fields" : "/me/change-requests";
      const method = policy === "user" ? "PATCH" : "POST";
      console.info("[account] guardando campo", { field, policy, value: sanitizedValue });
      const response = await api(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
      if (response?.ok === false) {
        throw new Error(response?.error || response?.message || "No se pudo guardar");
      }

      if (policy === "user") {
        console.info("[account] campo actualizado", { field, value: sanitizedValue });
        setViewValue(card, sanitizedValue);
        if (state.me) {
          if (field === "mail") {
            state.me.mail = sanitizedValue;
          } else if (field === "telefono") {
            state.me.telefono = sanitizedValue;
          } else {
            state.me[field] = sanitizedValue;
          }
        }
        toastOk("Cambios aplicados");
      } else {
        console.info("[account] solicitud enviada", { field, value: sanitizedValue });
        toastInfo("Cambios solicitados al Administrador, serï¿½ notificado cuando se aprueben");
      }
      shouldClose = true;
    } catch (error) {
      failed = true;
      console.error("[account] error al guardar", error);
      toastErr(error);
    } finally {
      card.classList.remove("saving");
      card.removeAttribute("aria-busy");
      if (failed) {
        input.disabled = false;
        cancelBtn.disabled = false;
        updateSaveState(input, saveBtn, originalValue, field);
        requestAnimationFrame(() => input.focus());
      }
    }

    if (shouldClose) {
      exitEdit(card, { focusTrigger: true });
    }
  }

  function enterEdit(card) {
    if (card === activeCard) {
      exitEdit(card, { focusTrigger: true });
      return;
    }
    if (activeCard && activeCard !== card) {
      closeActiveCard();
    }
    const editor = createEditor(card);
    if (!editor) {
      return;
    }
    console.info("[account] activar edicion", { field: card?.dataset?.field || null });
    card.append(editor);
    card.classList.add("editing");
    activeCard = card;
    const input = editor.querySelector("input");
    requestAnimationFrame(() => input?.focus({ preventScroll: true }));
  }

  function handleClick(event) {
    const editBtn = event.target.closest(".edit-field");
    if (editBtn) {
      const card = editBtn.closest(".field-card");
      if (card) {
        event.preventDefault();
        enterEdit(card);
      }
      return;
    }
    const saveBtn = event.target.closest(".field-save");
    if (saveBtn) {
      const card = saveBtn.closest(".field-card");
      if (card) {
        event.preventDefault();
        persist(card);
      }
      return;
    }
    const cancelBtn = event.target.closest(".field-cancel");
    if (cancelBtn) {
      const card = cancelBtn.closest(".field-card");
      if (card) {
        event.preventDefault();
        exitEdit(card, { focusTrigger: true });
      }
    }
  }

  function handleKeydown(event) {
    if (!event.target.closest(".field-edit")) {
      return;
    }
    const card = event.target.closest(".field-card");
    if (!card) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      exitEdit(card, { focusTrigger: true });
    } else if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      const saveBtn = card.querySelector(".field-save");
      if (saveBtn?.disabled) {
        return;
      }
      persist(card);
    }
  }

  function handleOutsideMouseDown(event) {
    if (!activeCard || activeCard.classList.contains("saving")) {
      return;
    }
    const withinActive = event.target.closest(".field-card");
    if (withinActive === activeCard) {
      return;
    }
    closeActiveCard();
  }

  document.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeydown, true);
  document.addEventListener("mousedown", handleOutsideMouseDown);

  return {
    reset() {
      closeActiveCard();
    }
  };
})();

const passwordModalState = {
  modal: null,
  form: null,
  inputs: {}
};

function renderAccountDetails() {
  const section = document.getElementById("accountDetails");
  if (!section || !state.me) {
    return;
  }

  accountFieldEditor.reset();
  const user = state.me;
  const fullName = `${user.nombre || ""} ${user.apellido || ""}`.trim() || (user.id || user.id_spm || "Mi cuenta");
  const baseUserId = user.id || user.id_spm || "";
  const accountFields = ACCOUNT_FIELD_CONFIG.map((field) => {
    const valueRaw = field.key === "mail" ? user.mail : field.key === "telefono" ? user.telefono : user[field.key];
    const cleaned = sanitizeProfileField(field.key, valueRaw);
    const display = cleaned || "Sin informacion";
    const isEmpty = !cleaned;
    return `
      <article
        class="field-card"
        data-field="${field.key}"
        data-label="${escapeHtml(field.label)}"
        data-edit-policy="${field.policy}"
        data-user-id="${escapeHtml(baseUserId)}"
        data-original-value="${escapeHtml(cleaned)}"
      >
        <header class="field-header">
          <span class="field-label">${escapeHtml(field.label)}</span>
        </header>
        <div class="field-view">
          <span class="field-value${isEmpty ? " is-empty" : ""}">${escapeHtml(display)}</span>
          <button type="button" class="btn-icon edit-field" aria-label="Editar ${escapeHtml(field.label)}">
            ${ICONS.pencil}
          </button>
        </div>
      </article>
    `;
  }).join("");

  const centersList = formatUserCentersList();
  const centersContent = centersList.length
    ? centersList.map((label) => `<span class="account-centers__chip">${escapeHtml(label)}</span>`).join("")
    : '<span class="field-empty">Sin centros asignados</span>';

  section.innerHTML = `
    <section class="account-card">
      <header class="account-card__header">
        <div>
          <h2>${escapeHtml(fullName)}</h2>
          <p class="account-card__meta">ID SPM: ${escapeHtml(user.id || user.id_spm || "")}</p>
        </div>
      </header>
      <div class="account-card__fields">
        ${accountFields}
      </div>
      <div class="account-card__centers">
        <div class="field-header">
          <span>Centros asignados</span>
        </div>
        <div class="account-centers__list">
          ${centersContent}
          <button type="button" class="account-field__plus" id="accountRequestCenters" title="Solicitar acceso a mas centros">
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>
      <div class="account-card__actions">
        <button type="button" class="btn ghost" id="btn-change-password">Cambiar Contrasena</button>
        <button type="button" class="btn danger" id="accountDeleteButton">Eliminar Cuenta</button>
      </div>
    </section>
  `;

  const changePasswordBtn = document.querySelector("#btn-change-password");
  if (changePasswordBtn) {
    changePasswordBtn.onclick = typeof openPasswordModal === "function"
      ? () => {
          openPasswordModal();
        }
      : () => console.warn("openPasswordModal not implemented");
  }

  const deleteBtn = document.getElementById("accountDeleteButton");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", handleDeleteAccount);
  }

  const centersBtn = document.getElementById("accountRequestCenters");
  if (centersBtn) {
    centersBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      ensureCentersRequestModal();
      await openCentersRequestModal();
    });
  }
}

function formatUserCentersList() {

  const centers = parseCentrosList(state.me?.centros);
  if (!centers.length) {
    return [];
  }
  const catalog = getCatalogItems("centros", { activeOnly: true });
  return centers.map((code) => {
    const normalized = normalizeCentroCode(code);
    const match = catalog.find((item) => normalizeCentroCode(item.codigo) === normalized);
    return match ? catalogueOptionLabel(match.codigo, match.nombre, null) : code;
  });
}

function normalizeCentroCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function buildCentersRequestOptions() {
  const ownedValues = parseCentrosList(state.me?.centros);
  const owned = new Set(ownedValues.map(normalizeCentroCode).filter(Boolean));
  centersRequestState.existing = owned;
  const seen = new Set();
  const options = [];
  const pushOption = (code, name, description) => {
    const normalized = normalizeCentroCode(code);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    const cleanName = name ? String(name).trim() : "";
    const cleanDescription = description ? String(description).trim() : "";
    const parts = [normalized];
    if (cleanName && cleanName.toUpperCase() !== normalized) {
      parts.push(cleanName);
    }
    const display = parts.join(" - ");
    options.push({
      code: normalized,
      name: cleanName,
      description: cleanDescription,
      label: display,
      disabled: owned.has(normalized),
    });
    seen.add(normalized);
  };
  const catalogCentros = getCatalogItems("centros", { activeOnly: true });
  catalogCentros.forEach((item) => pushOption(item?.codigo, item?.nombre, item?.descripcion));
  if (!options.length) {
    DEFAULT_CENTROS.forEach((code) => pushOption(code, null, null));
  }
  options.sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true, sensitivity: "base" }));
  return options;
}

function ensureCentersRequestModal() {
  if (centersRequestState.modal) {
    return centersRequestState.modal;
  }
  const modal = document.createElement("div");
  modal.id = "centersRequestModal";
  modal.className = "modal hide";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "centersModalTitle");
  modal.innerHTML = `
    <div class="modal-content centers-modal" role="document">
      <button type="button" class="modal-close" id="centersModalClose" aria-label="Cerrar">&times;</button>
      <h2 id="centersModalTitle">Solicitar acceso a centros</h2>
      <p class="centers-modal__intro">Seleccione uno o más centros disponibles y enviaremos la solicitud al equipo administrador.</p>
      <div class="centers-modal__controls">
        <label class="centers-modal__search" for="centersModalSearch">
          <span class="sr-only">Buscar centros</span>
          <input type="search" id="centersModalSearch" placeholder="Buscar por codigo o nombre" autocomplete="off"/>
        </label>
        <span class="centers-modal__summary"><span id="centersSelectedCount">0</span> seleccionados</span>
      </div>
      <div class="centers-cascade" id="centersCascadeList" role="listbox" aria-multiselectable="true"></div>
      <label class="centers-modal__reason-label" for="centersModalReason">Motivo (opcional)</label>
      <textarea id="centersModalReason" placeholder="Describe por que necesitas acceso a estos centros..." rows="3"></textarea>
      <div class="centers-modal__footer">
        <button type="button" class="btn sec" id="centersModalCancel">Cancelar</button>
        <button type="button" class="btn pri" id="centersModalSubmit" disabled>Solicitar</button>
      </div>
    </div>
  `;
  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) {
      closeCentersRequestModal();
    }
  });
  document.body.appendChild(modal);
  modal.querySelector("#centersModalClose")?.addEventListener("click", () => {
    closeCentersRequestModal();
  });
  modal.querySelector("#centersModalCancel")?.addEventListener("click", (ev) => {
    ev.preventDefault();
    closeCentersRequestModal();
  });
  modal.querySelector("#centersModalSubmit")?.addEventListener("click", (ev) => {
    ev.preventDefault();
    submitCentersRequest();
  });
  modal.querySelector("#centersModalSearch")?.addEventListener("input", (ev) => {
    renderCentersCascade(ev.target.value || "");
  });
  if (!centersRequestState.keyListenerBound) {
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && centersRequestState.modal && !centersRequestState.modal.classList.contains("hide")) {
        closeCentersRequestModal();
      }
    });
    centersRequestState.keyListenerBound = true;
  }
  centersRequestState.modal = modal;
  return modal;
}

function updateCentersSelectionSummary() {
  const count = centersRequestState.selected.size;
  const summary = document.getElementById("centersSelectedCount");
  if (summary) {
    summary.textContent = String(count);
  }
  const submitBtn = document.getElementById("centersModalSubmit");
  if (submitBtn && !submitBtn.dataset.loading) {
    submitBtn.disabled = count === 0;
    submitBtn.textContent = count > 0 ? `Solicitar (${count})` : "Solicitar";
  }
}

function renderCentersCascade(searchTerm = "") {
  const list = document.getElementById("centersCascadeList");
  if (!list) {
    return;
  }
  const query = String(searchTerm || "").trim().toLowerCase();
  const options = centersRequestState.options || [];
  const filtered = options.filter((opt) => {
    const haystack = `${opt.code} ${opt.name} ${opt.description}`.toLowerCase();
    return !query || haystack.includes(query);
  });
  if (!filtered.length) {
    list.innerHTML = '<div class="centers-cascade__empty">No encontramos centros que coincidan con la busqueda.</div>';
    updateCentersSelectionSummary();
    return;
  }
  const markup = filtered
    .map((opt) => {
      const isSelected = centersRequestState.selected.has(opt.code);
      const disabled = opt.disabled;
      const classes = ["centers-cascade__option"];
      if (disabled) classes.push("is-disabled");
      if (isSelected) classes.push("is-selected");
      const nameMarkup = opt.name
        ? `<span class="centers-cascade__name">${escapeHtml(opt.name)}</span>`
        : "";
      const descriptionMarkup =
        opt.description && opt.description !== opt.name
          ? `<span class="centers-cascade__description">${escapeHtml(opt.description)}</span>`
          : "";
      const statusMarkup = disabled ? '<span class="centers-cascade__badge">Ya asignado</span>' : "";
      return `
        <label class="${classes.join(" ")}">
          <div class="centers-cascade__content">
            <div class="centers-cascade__row">
              <span class="centers-cascade__code">${escapeHtml(opt.code)}</span>

              ${nameMarkup}
              ${statusMarkup}
            </div>
            ${descriptionMarkup}
          </div>
          <div class="centers-cascade__control">
            <input type="checkbox" value="${escapeHtml(opt.code)}" ${isSelected ? "checked" : ""} ${disabled ? "disabled" : ""}/>
            <span class="centers-cascade__indicator" aria-hidden="true"></span>
          </div>
        </label>
      `;
    })
    .join("");
  list.innerHTML = markup;
  list.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener("change", () => {
      const value = normalizeCentroCode(input.value);
      if (!value) {
        return;
      }
      if (input.checked) {
        centersRequestState.selected.add(value);
      } else {
        centersRequestState.selected.delete(value);
      }
      const option = input.closest(".centers-cascade__option");
      if (option) {
        option.classList.toggle("is-selected", input.checked);
      }
      updateCentersSelectionSummary();
    });
  });
  updateCentersSelectionSummary();
}

async function openCentersRequestModal() {
  try {
    await loadCatalogData("centros", { silent: true });
  } catch (err) {
    console.warn("No se pudo actualizar el catÃ¡logo de centros antes de abrir el modal", err);
  }
  const modal = ensureCentersRequestModal();
  centersRequestState.selected = new Set();
  centersRequestState.options = buildCentersRequestOptions();
  const searchInput = document.getElementById("centersModalSearch");
  if (searchInput) {
    searchInput.value = "";
  }
  const reasonInput = document.getElementById("centersModalReason");
  if (reasonInput) {
    reasonInput.value = "";
  }
  renderCentersCascade("");
  modal.classList.remove("hide");
  if (searchInput) {
    searchInput.focus({ preventScroll: true });
  }
}

function closeCentersRequestModal() {
  if (!centersRequestState.modal) {
    return;
  }
  centersRequestState.modal.classList.add("hide");
  centersRequestState.selected.clear();
  updateCentersSelectionSummary();
}

async function submitCentersRequest() {
  if (!state.me) {
    toast("Inicia sesion para solicitar centros");
    return;
  }
  const count = centersRequestState.selected.size;
  if (count === 0) {
    toast("Seleccione al menos un centro");
    return;
  }
  const centros = Array.from(centersRequestState.selected).join(", ");
  const reasonInput = document.getElementById("centersModalReason");
  const motivo = reasonInput ? reasonInput.value.trim() : "";
  const submitBtn = document.getElementById("centersModalSubmit");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.loading = "1";
    submitBtn.textContent = "Enviando...";
  }
  try {
    await api("/me/centros/solicitud", {
      method: "POST",
      body: JSON.stringify({ centros, motivo: motivo || null }),
    });
    toast("Solicitud enviada al equipo administrador", true);
    closeCentersRequestModal();
  } catch (err) {
    toast(err.message);
  } finally {
    if (submitBtn) {
      delete submitBtn.dataset.loading;
      updateCentersSelectionSummary();
    }
  }
}

// Funciones para gestiï¿½n de solicitudes de perfil por administradores

async function loadProfileRequests() {
  try {
    const response = await api("/admin/profile-requests");
    if (!response.ok) {
      throw new Error(response.error?.message || "Error al cargar solicitudes");
    }

    const requests = response.items || [];
    renderProfileRequests(requests);

    // Actualizar contador
    const totalElement = $("#profileRequestsTotal");
    if (totalElement) {
      totalElement.textContent = `${requests.length} solicitud${requests.length !== 1 ? 'es' : ''} pendiente${requests.length !== 1 ? 's' : ''}`;
    }
  } catch (error) {
    console.error(error);
    toast(error.message || "Error al cargar solicitudes de perfil");
  }
}

function renderProfileRequests(requests) {
  const container = $("#profile-requests-container");
  if (!container) return;

  if (requests.length === 0) {
    container.innerHTML = '<div class="no-data">No hay solicitudes pendientes</div>';
    return;
  }

  const html = requests.map(request => `
    <div class="request-card" data-id="${request.id}">
      <div class="request-header">
        <div class="request-info">
          <strong>${request.solicitante}</strong>
          <span class="request-mail">${request.mail || ''}</span>
        </div>
        <div class="request-date">${new Date(request.created_at).toLocaleDateString()}</div>
      </div>
      <div class="request-details">
        <div class="field-info">
          <span class="field-label">Campo:</span> ${request.field_label}
        </div>
        <div class="value-info">
          <div class="current-value">
            <span class="value-label">Valor actual:</span> ${request.current_value || 'No definido'}
          </div>
          <div class="new-value">
            <span class="value-label">Valor solicitado:</span> ${request.new_value}
          </div>
        </div>
        ${request.justification ? `
          <div class="justification">
            <span class="justification-label">Justificaciï¿½n:</span> ${request.justification}
          </div>
        ` : ''}
      </div>
      <div class="request-actions">
        <button class="btn btn-success btn-sm" onclick="processProfileRequest(${request.id}, 'approve')">
          <i class="fas fa-check"></i> Aprobar
        </button>
        <button class="btn btn-danger btn-sm" onclick="processProfileRequest(${request.id}, 'reject')">
          <i class="fas fa-times"></i> Rechazar
        </button>
        <button class="btn btn-secondary btn-sm" onclick="openSolicitudDetail(${request.id})">
          <i class="fas fa-eye"></i> Ver
        </button>
      </div>
    </div>
  `).join('');

  container.innerHTML = html;
}

async function processProfileRequest(requestId, action) {
  const confirmMessage = action === 'approve'
    ? '?Est?s seguro de aprobar esta solicitud?'
    : '?Est?s seguro de rechazar esta solicitud?';

  if (!confirm(confirmMessage)) return;

  try {
    const response = await api(`/admin/profile-requests/${requestId}`, {
      method: "POST",
      body: JSON.stringify({ action })
    });

    if (response.ok) {
      toast(response.message || `Solicitud ${action === 'approve' ? 'aprobada' : 'rechazada'} correctamente`);
      loadProfileRequests(); // Recargar la lista
    } else {
      throw new Error(response.error?.message || "Error al procesar la solicitud");
    }
  } catch (error) {
    console.error(error);
    toast(error.message || "Error al procesar la solicitud");
  }
}

// Inicializar carga de solicitudes cuando se carga la pagina de administraci?n
function initAuthPage(force = false) {
  if (authPageInitialized && !force) return;
  const authContainer = document.getElementById("auth");
  if (!authContainer) return;

  authPageInitialized = true;

  const handleLogin = (event) => {
    event.preventDefault();
    login();
  };

  const idInput = document.getElementById("id");
  const passwordInput = document.getElementById("pw");
  on(document.getElementById("login"), "click", handleLogin);
  [idInput, passwordInput].forEach((input) => {
    if (input) {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          login();
        }
      });
    }
  });

  on(document.getElementById("register"), "click", (event) => {
    event.preventDefault();
    register();
  });

  on(document.getElementById("recover"), "click", (event) => {
    event.preventDefault();
    recover();
  });

  on(document.getElementById("help"), "click", (event) => {
    event.preventDefault();
    help();
  });

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submitRegister();
    });
  }

  [document.getElementById("registerModalClose"), document.getElementById("registerModalCancel")]
    .filter(Boolean)
    .forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        closeRegisterModal();
      });
    });

  const registerModal = document.getElementById("registerModal");
  if (registerModal) {
    registerModal.addEventListener("click", (event) => {
      if (event.target === registerModal) {
        closeRegisterModal();
      }
    });
  }

  if (authKeydownHandler) {
    document.removeEventListener("keydown", authKeydownHandler);
  }
  authKeydownHandler = (event) => {
    if (event.key === "Escape") {
      const modal = document.getElementById("registerModal");
      if (modal && !modal.classList.contains("hide")) {
        event.preventDefault();
        closeRegisterModal();
      }
    }
  };
  document.addEventListener("keydown", authKeydownHandler);

  if (idInput) idInput.focus();
}

// Admin functions
let adminSelectedUser = null;
let adminOriginalUser = null;
let adminSelectedUserId = null;
let adminSelectedRow = null;
let adminUsuariosFormReady = false;
let adminUsuarioDirty = false;
let adminUsuarioSaving = false;

function initAdminUsuarios() {
  if (!adminUsuariosFormReady) {
    setupAdminUsuariosForm();
    adminUsuariosFormReady = true;
  }
  loadUsuarios();
}

function handleDeleteAccount(event) {
  event?.preventDefault?.();
  toast("La eliminaci\u00f3n de cuenta no est\u00e1 disponible en esta versi\u00f3n.");
}

function initAdminCentros() {
  loadCentros();
}

function initAdminMateriales() {
  loadMateriales();
}

function initAdminAlmacenes() {
  loadAlmacenes();
}

function initAdminConfiguracion() {
  loadConfiguracion();
}

async function loadUsuarios() {
  try {
    const data = await api('/admin/usuarios');
    renderUsuarioTable(data.items || []);
  } catch (error) {
    console.error('Error loading usuarios:', error);
    toast('Error al cargar usuarios');
  }
}

function renderUsuarioTable(usuarios) {
  const tableBody = document.querySelector('#adminUsersTable tbody');
  const emptyMsg = document.getElementById('adminUsersEmpty');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  if (emptyMsg) emptyMsg.style.display = usuarios.length ? 'none' : 'block';
  
  let pendingSelection = null;
  usuarios.forEach(usuario => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${usuario.id || ''}</td>
      <td>${usuario.nombre || ''} ${usuario.apellido || ''}</td>
      <td>${usuario.rol || ''}</td>
      <td>${usuario.posicion || ''}</td>
      <td>${usuario.sector || ''}</td>
      <td>${Array.isArray(usuario.centros) ? usuario.centros.join(', ') : usuario.centros || ''}</td>
      <td>${usuario.mail || ''}</td>
    `;
    row.addEventListener('click', () => selectUsuario(usuario, row));
    tableBody.appendChild(row);

    if (adminSelectedUserId && usuario.id === adminSelectedUserId) {
      pendingSelection = () => selectUsuario(usuario, row, { silent: true });
    }
  });

  if (pendingSelection) {
    pendingSelection();
  } else if (!usuarios.length) {
    selectUsuario(null);
  } else if (adminSelectedUserId) {
    // Previously selected user no longer in the list.
    selectUsuario(null);
  }
  
  // Update total count
  const totalEl = document.getElementById('adminUserTotal');
  if (totalEl) totalEl.textContent = `${usuarios.length} usuarios`;
}

function setupAdminUsuariosForm() {
  const form = document.getElementById('adminUserForm');
  if (!form) return;

  const fieldIds = [
    'adminUserMail',
    'adminUserNombre',
    'adminUserApellido',
    'adminUserRol',
    'adminUserPosicion',
    'adminUserSector',
    'adminUserCentros',
    'adminUserJefe',
    'adminUserGerente1',
    'adminUserGerente2',
    'adminUserPassword',
    'adminUserPasswordConfirm',
  ];

  const onFieldChange = () => markUsuarioDirty();
  fieldIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', onFieldChange);
      el.addEventListener('change', onFieldChange);
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    guardarUsuarioSeleccionado();
  });

  const resetBtn = document.getElementById('adminUserReset');
  if (resetBtn) {
    resetBtn.addEventListener('click', (event) => {
      event.preventDefault();
      restaurarUsuarioSeleccionado();
    });
  }

  updateUsuarioButtons();
  updateUsuarioHint();
}

function selectUsuario(usuario, row, options = {}) {
  if (!usuario) {
    adminSelectedUser = null;
    adminOriginalUser = null;
    adminSelectedUserId = null;
    if (adminSelectedRow) {
      adminSelectedRow.classList.remove('is-selected');
    }
    adminSelectedRow = null;
    limpiarUsuarioForm();
    adminUsuarioDirty = false;
    updateUsuarioButtons();
    updateUsuarioHint();
    return;
  }

  const normalizedCentros = Array.isArray(usuario.centros)
    ? usuario.centros.slice()
    : typeof usuario.centros === 'string'
      ? usuario.centros.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean)
      : [];

  adminSelectedUser = {
    ...usuario,
    centros: normalizedCentros,
  };
  adminOriginalUser = JSON.parse(JSON.stringify(adminSelectedUser));
  adminSelectedUserId = usuario.id || null;

  if (adminSelectedRow && adminSelectedRow !== row) {
    adminSelectedRow.classList.remove('is-selected');
  }
  if (row) {
    row.classList.add('is-selected');
    adminSelectedRow = row;
  }

  rellenarUsuarioForm(adminSelectedUser);
  adminUsuarioDirty = false;
  updateUsuarioButtons();
  if (!options.silent) {
    updateUsuarioHint();
  } else {
    updateUsuarioHint();
  }
}

function rellenarUsuarioForm(usuario) {
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
  };

  setValue('adminUserId', usuario.id || '');
  setValue('adminUserMail', usuario.mail || '');
  setValue('adminUserNombre', usuario.nombre || '');
  setValue('adminUserApellido', usuario.apellido || '');
  setValue('adminUserRol', usuario.rol || '');
  setValue('adminUserPosicion', usuario.posicion || '');
  setValue('adminUserSector', usuario.sector || '');
  setValue('adminUserCentros', (usuario.centros || []).join('\n'));
  setValue('adminUserJefe', usuario.jefe || '');
  setValue('adminUserGerente1', usuario.gerente1 || '');
  setValue('adminUserGerente2', usuario.gerente2 || '');
  setValue('adminUserPassword', '');
  setValue('adminUserPasswordConfirm', '');

  const titleEl = document.getElementById('adminUserTitle');
  if (titleEl) {
    const nameParts = [usuario.nombre, usuario.apellido].filter(Boolean);
    titleEl.textContent = nameParts.length ? nameParts.join(' ') : usuario.id || 'Perfil seleccionado';
  }

  const rolePill = document.getElementById('adminUserRolePill');
  if (rolePill) {
    if (usuario.rol) {
      rolePill.textContent = usuario.rol;
      rolePill.style.display = '';
    } else {
      rolePill.style.display = 'none';
    }
  }
}

function limpiarUsuarioForm() {
  const fieldIds = [
    'adminUserId',
    'adminUserMail',
    'adminUserNombre',
    'adminUserApellido',
    'adminUserRol',
    'adminUserPosicion',
    'adminUserSector',
    'adminUserCentros',
    'adminUserJefe',
    'adminUserGerente1',
    'adminUserGerente2',
    'adminUserPassword',
    'adminUserPasswordConfirm',
  ];
  fieldIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const titleEl = document.getElementById('adminUserTitle');
  if (titleEl) titleEl.textContent = 'Perfil sin selecciÃ³n';
  const rolePill = document.getElementById('adminUserRolePill');
  if (rolePill) rolePill.style.display = 'none';
}

function markUsuarioDirty() {
  if (!adminSelectedUser || adminUsuarioSaving) return;
  adminUsuarioDirty = true;
  updateUsuarioButtons();
  updateUsuarioHint();
}

function updateUsuarioButtons() {
  const guardarBtn = document.getElementById('adminUserGuardar');
  const resetBtn = document.getElementById('adminUserReset');
  const hasSelection = !!adminSelectedUser;
  const shouldDisable = !hasSelection || adminUsuarioSaving || !adminUsuarioDirty;
  if (guardarBtn) guardarBtn.disabled = shouldDisable;
  if (resetBtn) resetBtn.disabled = shouldDisable;
}

function updateUsuarioHint() {
  const hintEl = document.getElementById('adminUserHint');
  if (!hintEl) return;
  if (!adminSelectedUser) {
    hintEl.textContent = 'SeleccionÃ¡ un usuario para editarlo.';
  } else if (adminUsuarioSaving) {
    hintEl.textContent = 'Guardando cambios...';
  } else if (adminUsuarioDirty) {
    hintEl.textContent = 'Hay cambios sin guardar.';
  } else {
    hintEl.textContent = 'Sin cambios pendientes.';
  }
}

function restaurarUsuarioSeleccionado() {
  if (!adminOriginalUser || adminUsuarioSaving) return;
  rellenarUsuarioForm(adminOriginalUser);
  adminUsuarioDirty = false;
  updateUsuarioButtons();
  updateUsuarioHint();
}

function collectUsuarioFormValues() {
  const getValue = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };
  const centrosRaw = getValue('adminUserCentros');
  const centros = centrosRaw
    ? centrosRaw.split(/[\n,;]/).map((item) => item.trim()).filter(Boolean)
    : [];

  return {
    id: getValue('adminUserId'),
    mail: getValue('adminUserMail').toLowerCase(),
    nombre: getValue('adminUserNombre'),
    apellido: getValue('adminUserApellido'),
    rol: getValue('adminUserRol'),
    posicion: getValue('adminUserPosicion'),
    sector: getValue('adminUserSector'),
    centros,
    jefe: getValue('adminUserJefe'),
    gerente1: getValue('adminUserGerente1'),
    gerente2: getValue('adminUserGerente2'),
    password: getValue('adminUserPassword'),
    passwordConfirm: getValue('adminUserPasswordConfirm'),
  };
}

function buildUsuarioPayload(values) {
  if (!adminOriginalUser) return null;
  const payload = {};
  const normalize = (value) => (value || '').trim();
  const normalizeLower = (value) => normalize(value).toLowerCase();

  if (normalize(values.nombre) !== normalize(adminOriginalUser.nombre)) {
    payload.nombre = values.nombre || null;
  }
  if (normalize(values.apellido) !== normalize(adminOriginalUser.apellido)) {
    payload.apellido = values.apellido || null;
  }
  if (normalize(values.rol) !== normalize(adminOriginalUser.rol)) {
    payload.rol = values.rol || null;
  }
  if (normalize(values.posicion) !== normalize(adminOriginalUser.posicion)) {
    payload.posicion = values.posicion || null;
  }
  if (normalize(values.sector) !== normalize(adminOriginalUser.sector)) {
    payload.sector = values.sector || null;
  }
  if (normalizeLower(values.mail) !== normalizeLower(adminOriginalUser.mail)) {
    payload.mail = values.mail || null;
  }

  const originalCentros = Array.isArray(adminOriginalUser.centros)
    ? adminOriginalUser.centros.map((c) => c.trim()).filter(Boolean)
    : [];
  const currentCentros = values.centros;
  if (originalCentros.join(',') !== currentCentros.join(',')) {
    payload.centros = currentCentros;
  }

  if (normalizeLower(values.jefe) !== normalizeLower(adminOriginalUser.jefe)) {
    payload.jefe = values.jefe || null;
  }
  if (normalizeLower(values.gerente1) !== normalizeLower(adminOriginalUser.gerente1)) {
    payload.gerente1 = values.gerente1 || null;
  }
  if (normalizeLower(values.gerente2) !== normalizeLower(adminOriginalUser.gerente2)) {
    payload.gerente2 = values.gerente2 || null;
  }

  if (values.password) {
    payload.password = values.password;
  }

  return payload;
}

async function guardarUsuarioSeleccionado() {
  if (!adminSelectedUser || adminUsuarioSaving) return;

  const values = collectUsuarioFormValues();
  if (!values.id) {
    toast('ID de usuario no vÃ¡lido');
    return;
  }
  if (values.password && values.password !== values.passwordConfirm) {
    toast('Las contraseÃ±as no coinciden');
    return;
  }

  const payload = buildUsuarioPayload(values);
  if (!payload || Object.keys(payload).length === 0) {
    toast('No hay cambios para guardar');
    adminUsuarioDirty = false;
    updateUsuarioButtons();
    updateUsuarioHint();
    return;
  }

  setUsuarioSaving(true);
  try {
    const response = await api(`/admin/usuarios/${encodeURIComponent(values.id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!response?.ok) {
      throw response?.error || new Error('No se pudo guardar el usuario');
    }
    const updatedUser = response.usuario;
    toast('Usuario actualizado correctamente');
    adminSelectedUserId = updatedUser.id;
    selectUsuario(updatedUser, adminSelectedRow, { silent: true });
    adminUsuarioDirty = false;
    updateUsuarioButtons();
    updateUsuarioHint();
    await loadUsuarios();
  } catch (error) {
    console.error('Error al guardar usuario:', error);
    toast(error?.message || 'Error al guardar el usuario');
  } finally {
    setUsuarioSaving(false);
  }
}

function setUsuarioSaving(isSaving) {
  adminUsuarioSaving = !!isSaving;
  updateUsuarioButtons();
  updateUsuarioHint();
}

function deleteUsuario(id) {
  // TODO: Implement delete functionality
  toast('Funci?n de eliminar usuario no implementada a?n');
}

async function loadCentros() {
  try {
    const data = await api('/admin/centros');
    
    // Render solicitudes por centro
    renderCentrosSolicitudes(data.solicitudes || []);
    
    // Render presupuestos
    renderCentrosPresupuestos(data.presupuestos || []);
  } catch (error) {
    console.error('Error loading centros:', error);
    toast('Error al cargar centros');
  }
}

function renderCentrosSolicitudes(solicitudes) {
  const tableBody = document.querySelector('#adminCentrosSolicitudes tbody');
  const emptyMsg = document.getElementById('adminCentrosSolicitudesEmpty');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  if (solicitudes.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  
  if (emptyMsg) emptyMsg.style.display = 'none';
  
  solicitudes.forEach(solicitud => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${solicitud.centro || ''}</td>
      <td>${solicitud.total || 0}</td>
      <td>$${solicitud.monto ? solicitud.monto.toFixed(2) : '0.00'}</td>
    `;
    tableBody.appendChild(row);
  });
}



function renderCentrosPresupuestos(presupuestos) {
  const tableBody = document.querySelector('#adminCentrosPresupuestos tbody');
  const emptyMsg = document.getElementById('adminCentrosPresupuestosEmpty');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  if (presupuestos.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  
  if (emptyMsg) emptyMsg.style.display = 'none';
  
  presupuestos.forEach(presupuesto => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${presupuesto.centro || ''}</td>
      <td>${presupuesto.sector || ''}</td>
      <td>$${presupuesto.monto_usd ? presupuesto.monto_usd.toFixed(2) : '0.00'}</td>
      <td>$${presupuesto.saldo_usd ? presupuesto.saldo_usd.toFixed(2) : '0.00'}</td>
    `;
    tableBody.appendChild(row);
  });
}

async function loadMateriales() {
  try {
    const data = await api('/admin/materiales');
    renderMaterialesTable(data.items || []);
    
    // Update total count
    const totalEl = document.getElementById('adminMaterialTotal');
    if (totalEl) totalEl.textContent = `${data.total || 0} materiales`;
  } catch (error) {
    console.error('Error loading materiales:', error);
    toast('Error al cargar materiales');
  }
}

function renderMaterialesTable(materiales) {
  const tableBody = document.querySelector('#adminMaterialTable tbody');
  const emptyMsg = document.getElementById('adminMaterialEmpty');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  if (materiales.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  
  if (emptyMsg) emptyMsg.style.display = 'none';
  
  materiales.forEach(material => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${material.codigo || ''}</td>
      <td>${material.descripcion || ''}</td>
      <td>${material.unidad || ''}</td>
      <td>$${material.precio_usd ? material.precio_usd.toFixed(2) : '0.00'}</td>
      <td>${material.centro || ''}</td>
      <td>${material.sector || ''}</td>
    `;
    row.addEventListener('click', () => selectMaterial(material));
    tableBody.appendChild(row);
  });
}

function selectMaterial(material) {
  // TODO: Implement material selection and form population
  toast('Selecci?n de material no implementada a?n');
}

async function loadAlmacenes() {
  try {
    const data = await api('/admin/almacenes');
    renderAlmacenesTable(data.items || []);
  } catch (error) {
    console.error('Error loading almacenes:', error);
    toast('Error al cargar almacenes');
  }
}

function renderAlmacenesTable(almacenes) {
  const tableBody = document.querySelector('#adminAlmacenesTable tbody');
  const emptyMsg = document.getElementById('adminAlmacenesEmpty');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  if (almacenes.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  
  if (emptyMsg) emptyMsg.style.display = 'none';
  
  almacenes.forEach(almacen => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${almacen.almacen || ''}</td>
      <td>${almacen.total || 0}</td>
      <td>$${almacen.monto ? almacen.monto.toFixed(2) : '0.00'}</td>
    `;
    tableBody.appendChild(row);
  });
}

async function loadConfiguracion() {
  try {
    const data = await api('/admin/config');
    
    // Render each config section
    Object.keys(data.data || {}).forEach(resource => {
      renderConfigTable(resource, data.data[resource]);
    });
  } catch (error) {
    console.error('Error loading configuracion:', error);
    toast('Error al cargar configuracion');
  }
}

function renderConfigTable(resource, items) {
  const tableBody = document.querySelector(`table[data-config-table="${resource}"] tbody`);
  const emptyMsg = document.querySelector(`p[data-config-empty="${resource}"]`);
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  if (items.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  
  if (emptyMsg) emptyMsg.style.display = 'none';
  
  items.forEach(item => {
    const row = document.createElement('tr');
    // Different columns based on resource
    if (resource === 'centros') {
      row.innerHTML = `
        <td>${item.codigo || ''}</td>
        <td>${item.nombre || ''}</td>
        <td>${item.descripcion || ''}</td>
        <td>${item.notas || ''}</td>
        <td>${item.activo ? 'Activo' : 'Inactivo'}</td>
        <td>
          <button class="btn btn-sm btn-primary edit-btn" data-resource="${resource}" data-id="${item.id}">Editar</button>
          <button class="btn btn-sm btn-danger delete-btn" data-resource="${resource}" data-id="${item.id}">Eliminar</button>
        </td>
      `;
    } else if (resource === 'almacenes') {
      row.innerHTML = `
        <td>${item.codigo || ''}</td>
        <td>${item.nombre || ''}</td>
        <td>${item.centro_codigo || ''}</td>
        <td>${item.descripcion || ''}</td>
        <td>${item.activo ? 'Activo' : 'Inactivo'}</td>
        <td>
          <button class="btn btn-sm btn-primary edit-btn" data-resource="${resource}" data-id="${item.id}">Editar</button>
          <button class="btn btn-sm btn-danger delete-btn" data-resource="${resource}" data-id="${item.id}">Eliminar</button>
        </td>
      `;
    }
    // Add more resources as needed
    
    tableBody.appendChild(row);
  });
  
  // Bind events
  tableBody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editConfigItem(btn.dataset.resource, btn.dataset.id));
  });
  tableBody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteConfigItem(btn.dataset.resource, btn.dataset.id));
  });
}

function editConfigItem(resource, id) {
  // TODO: Implement edit functionality
  toast(`Funci?n de editar ${resource} no implementada a?n`);
}

function deleteConfigItem(resource, id) {
  // TODO: Implement delete functionality
  toast(`Funci?n de eliminar ${resource} no implementada a?n`);
}

document.addEventListener("DOMContentLoaded", async () => {
  const rawPage = window.location.pathname.split("/").pop() || "";
  const currentPage = rawPage.length ? rawPage : "index.html";

  if (!rawPage || currentPage === "index.html") {
    await bootstrapIndexPage();
    return;
  }

  document.body?.classList.remove("auth-body");

  const meResult = await me();
  if (!meResult?.ok) {
    const authError = meResult?.error;
    if (authError?.status === 401) {
      clearToken();
      window.location.href = "index.html";
      return;
    }
    if (authError) {
      console.error(authError);
      toast(authError.message || "No se pudo cargar tu sesion");
    }
  }

  if (!state.me) {
    return;
  }

  const preferences = ensurePreferencesLoaded();

  if (currentPage === "home.html") {
    const userName = `${state.me.nombre} ${state.me.apellido}`.trim();
    const userNameNode = document.getElementById("userName");
    if (userNameNode) userNameNode.textContent = userName;
    initHomeHero(userName);
    const isAdmin = typeof state.me?.rol === "string" && (state.me.rol.toLowerCase().includes("admin") || state.me.rol.toLowerCase().includes("administrador"));
    if (isAdmin) {
      initSystemConsole();
    }
  }

  if (currentPage === "admin-solicitudes.html") {
    loadProfileRequests();
  }

  if (currentPage === "admin-usuarios.html") {
    initAdminUsuarios();
  }

  if (currentPage === "admin-centros.html") {
    initAdminCentros();
  }

  if (currentPage === "admin-materiales.html") {
    initAdminMateriales();
  }

  if (currentPage === "admin-almacenes.html") {
    initAdminAlmacenes();
  }

  if (currentPage === "admin-configuracion.html") {
    initAdminConfiguracion();
  }

  if (currentPage === "mi-cuenta.html") {
    document.body.classList.add("page-mi-cuenta");
    try {
      await loadCatalogData();
      renderAccountDetails();
    } catch (error) {
      console.error(error);
      toast(error?.message || "No se pudieron cargar los datos de la cuenta");
    }
  }

  if (currentPage === "crear-solicitud.html") {
    try {
      await initCreateSolicitudPage();
    } catch (error) {
      console.error(error);
      toast(error?.message || "No se pudo inicializar el formulario de solicitud");
    }
  }

  if (currentPage === "agregar-materiales.html") {
    try {
      await initAddMaterialsPage();
    } catch (error) {
      console.error(error);
      toast(error?.message || "No se pudo inicializar la pagina de agregar materiales");
    }
  }

  if (currentPage === "preferencias.html") {
    initPreferencesPage();
  }

  if (currentPage === "notificaciones.html") {
    try {
      const summary = await loadNotificationsSummary({ markAsRead: true });
      renderNotificationsPage(summary);
    } catch (error) {
      console.error(error);
      toast(error?.message || "No se pudieron cargar las notificaciones");
    }
  }

  applyPreferences(preferences);
  finalizePage();
});

// Controlar visibilidad del men? seg?n el rol
function updateMenuVisibility() {
  // Asegurarse de que el DOM est? listo
  if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
    setTimeout(updateMenuVisibility, 100);
    return;
  }

  const adminMenuItem = document.getElementById("adminMenuItem");
  const plannerMenuItem = document.getElementById("plannerMenuItem");
  const approverMenuItem = document.getElementById("approverMenuItem");
  const navPresupuesto = document.getElementById("navPresupuesto");
  const systemConsole = document.getElementById("systemConsole");

  // Si ning?n elemento existe a?n, reintentar
  if (!adminMenuItem && !plannerMenuItem && !approverMenuItem && !navPresupuesto && !systemConsole) {
    setTimeout(updateMenuVisibility, 100);
    return;
  }

  const rawUserRole = state.me?.rol;
  const userRole = rawUserRole?.toLowerCase()?.trim();

  // L?gica espec?fica para rol "solicitante"
  if (userRole === "solicitante") {
    // Para solicitante: mostrar solo Inicio, Solicitudes, Notificaciones y Presupuesto
    // Ocultar Panel de control, Planificador y Aprobaciones
    if (adminMenuItem) adminMenuItem.classList.add("hide");
    if (plannerMenuItem) plannerMenuItem.classList.add("hide");
    if (approverMenuItem) approverMenuItem.classList.add("hide");
    // Mostrar presupuesto para solicitante
    if (navPresupuesto) navPresupuesto.classList.remove("hide");
    if (systemConsole) systemConsole.classList.add("hide");
    return;
  }

  // L?gica existente para otros roles
  // Admin - mostrar solo si incluye admin o administrador
  if (adminMenuItem) {
    const shouldShowAdmin = userRole && (userRole.includes("admin") || userRole.includes("administrador"));
    if (shouldShowAdmin) {
      adminMenuItem.classList.remove("hide");
    } else {
      adminMenuItem.classList.add("hide");
    }
  }

  // Planificador - mostrar solo si incluye planificador
  if (plannerMenuItem) {
    const shouldShowPlanner = userRole && userRole.includes("planificador");
    if (shouldShowPlanner) {
      plannerMenuItem.classList.remove("hide");
    } else {
      plannerMenuItem.classList.add("hide");
    }
  }

  // Aprobador - mostrar solo si incluye aprobador
  if (approverMenuItem) {
    const shouldShowApprover = userRole && userRole.includes("aprobador");
    if (shouldShowApprover) {
      approverMenuItem.classList.remove("hide");
    } else {
      approverMenuItem.classList.add("hide");
    }
  }

  // Presupuesto - mostrar para roles que no sean solicitante (ya que solicitante tiene l?gica espec?fica arriba)
  if (navPresupuesto) {
    // Mostrar presupuesto para admin, planificador, aprobador y otros roles
    // Solo ocultar para solicitante (que ya se maneja arriba)
    if (userRole && userRole !== "solicitante") {
      navPresupuesto.classList.remove("hide");
    }
  }

  if (systemConsole) {
    const shouldShowConsole = userRole && (userRole.includes("admin") || userRole.includes("administrador"));
    systemConsole.classList.toggle("hide", !shouldShowConsole);
  }
}

// Llamar a la funciï¿½n cuando se actualiza el estado de las notificaciones
const originalRenderNotificationsPage = renderNotificationsPage;
renderNotificationsPage = function(data) {
  originalRenderNotificationsPage(data);
  updateMenuVisibility();
};

// ====== SHIMS DE COMPATIBILIDAD (parche rï¿½pido) ======
var fmtMoney   = typeof fmtMoney   === "function" ? fmtMoney   : (v) => formatCurrency(v);
var fmtDateTime= typeof fmtDateTime=== "function" ? fmtDateTime: (v) => formatDateTime(v);
var fmtNumber  = typeof fmtNumber  === "function" ? fmtNumber  : (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("es-AR") : String(v ?? "");
};
var esc        = typeof esc        === "function" ? esc        : (s) => escapeHtml(s);

var toastOk    = typeof toastOk    === "function" ? toastOk    : (m) => toast(m, true);
var toastErr   = typeof toastErr   === "function" ? toastErr   : (e) => {
  const msg = e?.message || String(e || "Error");
  toast(msg);
  console.error(e);
};
var toastInfo  = typeof toastInfo  === "function" ? toastInfo  : (m) => toast(m, "info");

var skeletonize = typeof skeletonize === "function" ? skeletonize : (sel, opts) => showTableSkeleton(sel, opts);
// =====================================================

// M?dulo Planificador
(function initPlanificador() {
  if (!/planificador\.html$/.test(location.pathname)) return;

  // Adjust padding for planificador page
  const mainEl = document.querySelector("main");
  if (mainEl) {
    mainEl.style.paddingTop = "7rem"; // Increase by 50px (6.5rem + 0.5rem)
  }

  const state = {
    pageMias: 0, pagePend: 0, limit: 20,
    filtros: { centro:"", sector:"", almacen:"", criticidad:"", q:"" },
    detalle: null // { id, solicitud, tratamiento, dirty: Set(item_index) }
  };

  // UI refs
  const tblMias = $("#tblMias tbody");
  const tblPend = $("#tblPend tbody");
  const dlg = $("#dlgDetalle");
  const detMsg = $("#detMsg");
  const detId = $("#detId");
  const detMeta = $("#detMeta");
  const tblItems = $("#tblItems tbody");

  // Eventos de filtros y paginaciï¿½n
  $("#frmFilters").addEventListener("submit", (e)=>{ e.preventDefault(); state.pageMias=0; state.pagePend=0; loadQueues(); });
  $("#btnLimpiar").addEventListener("click", ()=>{ /* limpia inputs y reload */ loadQueues(); });
  $("#pgPrevMias").onclick = ()=>{ state.pageMias = Math.max(0, state.pageMias-1); loadQueues({only:"mias"}); };
  $("#pgNextMias").onclick = ()=>{ state.pageMias += 1; loadQueues({only:"mias"}); };
  $("#pgPrevPend").onclick = ()=>{ state.pagePend = Math.max(0, state.pagePend-1); loadQueues({only:"pend"}); };
  $("#pgNextPend").onclick = ()=>{ state.pagePend += 1; loadQueues({only:"pend"}); };

  async function loadQueues(opts={}) {
    skeletonize("#tblMias", {rows:8});
    skeletonize("#tblPend", {rows:8});
    const q = new URLSearchParams({
      limit: state.limit,
      offset_mias: state.pageMias*state.limit,
      offset_pend: state.pagePend*state.limit,
      centro: $("#fCentro").value.trim(),
      sector: $("#fSector").value.trim(),
      almacen_virtual: $("#fAlmacen").value.trim(),
      criticidad: $("#fCriticidad").value,
      q: $("#fQ").value.trim()
    });
    const data = await api(`/planificador/queue?${q.toString()}`);
    renderQueue(data, opts.only);
  }

  function renderQueue(data, only) {
    if (!only || only==="mias") {
      tblMias.innerHTML = data.mias.map(rowToHtml).join("");
      attachRowActions("#tblMias");
      $("#pgInfoMias").textContent = `${data.count.mias} total`;
    }
    if (!only || only==="pend") {
      tblPend.innerHTML = data.pendientes.map(rowToHtml).join("");
      attachRowActions("#tblPend", {pendientes:true});
      $("#pgInfoPend").textContent = `${data.count.pendientes} total`;
    }
    refreshSortableTables();
  }

  function rowToHtml(r) {
    const btn = r.planner_id ?
      `<button class="btn sm view" data-action="ver" data-id="${r.id}">Ver/Editar</button>
       <button class="btn sm ghost liberar" data-action="liberar" data-id="${r.id}">Liberar</button>` :
      `<button class="btn sm take" data-action="tomar" data-id="${r.id}">Tomar</button>`;
    return `
      <tr>
        <td>${r.id}</td>
        <td>${esc(r.centro)}</td>
        <td>${esc(r.sector)}</td>
        <td>${esc(r.criticidad || "-")}</td>
        <td class="num">${fmtMoney(r.total_monto)}</td>
        <td>${fmtDateTime(r.updated_at)}</td>
        <td class="end">${btn}</td>
      </tr>`;
  }

  function attachRowActions(sel, opts={}) {
    document.querySelectorAll(`${sel} [data-action]`).forEach((btn)=>{
      btn.addEventListener("click", async ()=>{
        const id = Number(btn.dataset.id);
        const action = btn.dataset.action;
        try {
          if (action==="tomar") {
            await api(`/planificador/solicitudes/${id}/tomar`, {method:"PATCH"});
            await loadQueues({only:"pend"});
            await openDetalle(id);
          } else if (action==="liberar") {
            await api(`/planificador/solicitudes/${id}/liberar`, {method:"PATCH"});
            await openDetalle(id);
          }
        } catch (err) { toastErr(err); }
      });
    });
  }

  async function openDetalle(id) {
    detMsg.textContent = "";
    const data = await api(`/planificador/solicitudes/${id}/tratamiento`);
    state.detalle = { id, data, dirty: new Set() };
    detId.textContent = `#${id}`;
    detMeta.innerHTML = renderMeta(data.solicitud);
    tblItems.innerHTML = data.solicitud.items.map((it, idx)=>itemRow(it, idx, data.tratamiento)).join("");
    dlg.classList.remove("hide");
    bindItemInputs();
  }

  function renderMeta(s) {
    return `
      <div><b>Centro:</b> ${esc(s.centro)} | <b>Sector:</b> ${esc(s.sector)} | <b>Criticidad:</b> ${esc(s.criticidad || "-")}</div>
      <div><b>Justificaciï¿½n:</b> ${esc(s.justificacion || "-")}</div>
      <div><b>Total estimado:</b> <span id="detTotal">${fmtMoney(s.total_monto || 0)}</span></div>
    `;
  }

  function itemRow(it, idx, trat=[]) {
    const tr = trat.find(x=>x.item_index===idx) || {};
    return `
      <tr data-index="${idx}">
        <td>${idx+1}</td>
        <td>${esc(it.codigo)}</td>
        <td>${esc(it.descripcion || "")}</td>
        <td>${esc(it.unidad || "")}</td>
        <td class="num">${fmtNumber(it.cantidad)}</td>
        <td class="num">${fmtMoney(it.precio_unitario || 0)}</td>
        <td>
          <select class="decision">
            ${opt("stock", tr.decision)}${opt("compra", tr.decision)}${opt("servicio", tr.decision)}${opt("equivalente", tr.decision)}
          </select>
        </td>
        <td><input class="cantAprob" type="number" min="0.0001" step="0.0001" value="${tr.cantidad_aprobada ?? it.cantidad}"/></td>
        <td><input class="eqvCodigo" value="${esc(tr.codigo_equivalente || "")}"/></td>
        <td><input class="proveedor" value="${esc(tr.proveedor_sugerido || "")}"/></td>
        <td><input class="precioEst" type="number" min="0" step="0.0001" value="${tr.precio_unitario_estimado ?? (it.precio_unitario || 0)}"/></td>
        <td><input class="comentario" value="${esc(tr.comentario || "")}"/></td>
      </tr>`;
  }
  const opt = (v, cur)=>`<option value="${v}" ${cur===v?"selected":""}>${v}</option>`;

  function bindItemInputs() {
    tblItems.querySelectorAll("input,select").forEach(inp=>{
      inp.addEventListener("change", ()=>{
        const tr = inp.closest("tr"); const idx = Number(tr.dataset.index);
        state.detalle.dirty.add(idx);
        recalcTotal();
      });
    });
    $("#btnGuardarItems").onclick = saveItems;
    $("#btnFinalizar").onclick = finalizar;
    $("#btnRechazar").onclick = rechazar;
    $("#btnLiberar").onclick = liberar;
    $("#btnCerrar").onclick = ()=> dlg.classList.add("hide");
    $("#btnAISuggestions").onclick = loadAISuggestions;
  }

  async function loadAISuggestions() {
    const id = state.detalle.id;
    try {
      const data = await api(`/ai/suggest/solicitud/${id}`);
      renderAISuggestions(data.suggestions);
      $("#aiPanel").classList.remove("hide");
    } catch (err) {
      toastErr(err);
    }
  }

  function renderAISuggestions(suggestions) {
    const container = $("#aiSuggestions");
    container.innerHTML = suggestions.map(s => `
      <div class="ai-suggestion ${getConfidenceClass(s.confidence)}">
        <div class="ai-suggestion__header">
          <div class="ai-suggestion__title">${esc(s.title)}</div>
          <div class="ai-suggestion__confidence">${Math.round(s.confidence * 100)}%</div>
        </div>
        <div class="ai-suggestion__reason">${esc(s.reason)}</div>
        <div class="ai-suggestion__sources">
          ${s.sources.map(src => `<span class="ai-suggestion__source">${esc(src)}</span>`).join("")}
        </div>
        <div class="ai-suggestion__actions">
          <button class="ai-suggestion__apply" data-type="${s.type}" data-payload='${JSON.stringify(s.payload)}' data-item-index="${s.item_index}">Aplicar</button>
          <button class="ai-suggestion__reject" data-type="${s.type}" data-item-index="${s.item_index}">Descartar</button>
        </div>
      </div>
    `).join("");

    // Bind events
    container.querySelectorAll(".ai-suggestion__apply").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyAISuggestion(
          btn.dataset.type,
          JSON.parse(btn.dataset.payload),
          Number(btn.dataset.itemIndex)
        );
      });
    });
    container.querySelectorAll(".ai-suggestion__reject").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        rejectAISuggestion(btn.dataset.type, Number(btn.dataset.itemIndex), ev);
      });
    });
  }

  function getConfidenceClass(conf) {
    if (conf >= 0.8) return "high-confidence";
    if (conf >= 0.6) return "medium-confidence";
    return "low-confidence";
  }

  async function applyAISuggestion(type, payload, itemIndex) {
    const id = state.detalle.id;
    try {
      await api("/ai/suggest/accept", {
        method: "POST",
        body: JSON.stringify({ solicitud_id: id, item_index: itemIndex, type, payload })
      });
      toastOk("Sugerencia aplicada");
      // Refresh detalle
      await openDetalle(id);
    } catch (err) {
      toastErr(err);
    }
  }

  async function rejectAISuggestion(type, itemIndex, ev) {
    const id = state.detalle.id;
    try {
      await api("/ai/suggest/reject", {
        method: "POST",
        body: JSON.stringify({ solicitud_id: id, item_index: itemIndex, type })
      });
      toastOk("Sugerencia descartada");
      // Remove from UI
      const suggestion = ev?.currentTarget?.closest(".ai-suggestion");
      if (suggestion) suggestion.remove();
    } catch (err) {
      toastErr(err);
    }
  }

  function recalcTotal() {
    let total = 0;
    tblItems.querySelectorAll("tr").forEach(tr=>{
      const dec = tr.querySelector(".decision").value;
      const cant = Number(tr.querySelector(".cantAprob").value || 0);
      const precio = Number(tr.querySelector(".precioEst").value || 0);
      if (dec==="compra" || dec==="equivalente") total += cant * precio;
    });
    $("#detTotal").textContent = fmtMoney(total);
  }

  async function saveItems() {
    const id = state.detalle?.id;
    if (!id) return;
    const items = [];
    state.detalle.dirty.forEach(idx=>{
      const tr = tblItems.querySelector(`tr[data-index="${idx}"]`);
      if (!tr) return;
      const cantidad = Number(tr.querySelector(".cantAprob")?.value);
      const precio = Number(tr.querySelector(".precioEst")?.value);
      items.push({
        item_index: idx,
        decision: tr.querySelector(".decision")?.value || "stock",
        cantidad_aprobada: Number.isFinite(cantidad) ? cantidad : 0,
        codigo_equivalente: tr.querySelector(".eqvCodigo")?.value?.trim() || null,
        proveedor_sugerido: tr.querySelector(".proveedor")?.value?.trim() || null,
        precio_unitario_estimado: Number.isFinite(precio) ? precio : null,
        comentario: tr.querySelector(".comentario")?.value?.trim() || "",
      });
    });
    if (!items.length) {
      toastInfo("No hay cambios para guardar");
      return;
    }
    try {
      await api(`/planificador/solicitudes/${id}/items`, {
        method: "PATCH",
        body: JSON.stringify({ items }),
      });
      state.detalle.dirty.clear();
      toastOk("Cambios guardados");
      await openDetalle(id);
    } catch (err) {
      toastErr(err);
      detMsg.textContent = err?.message || "No se pudo guardar";
    }
  }

  async function finalizar() {
    const id = state.detalle?.id;
    if (!id) return;
    try {
      await api(`/planificador/solicitudes/${id}/finalizar`, { method: "POST" });
      toastOk("Solicitud finalizada");
      dlg.classList.add("hide");
      state.detalle = null;
      await loadQueues();
      await loadStats();
    } catch (err) {
      toastErr(err);
      detMsg.textContent = err?.message || "No se pudo finalizar";
    }
  }

  async function rechazar() {
    const id = state.detalle?.id;
    if (!id) return;
    const motivo = window.prompt("Indicar motivo del rechazo");
    if (!motivo || motivo.trim().length < 3) {
      toastInfo("Motivo demasiado corto");
      return;
    }
    try {
      await api(`/planificador/solicitudes/${id}/rechazar`, {
        method: "POST",
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      toastOk("Solicitud rechazada");
      dlg.classList.add("hide");
      state.detalle = null;
      await loadQueues();
      await loadStats();
    } catch (err) {
      toastErr(err);
      detMsg.textContent = err?.message || "No se pudo rechazar";
    }
  }

  async function liberar() {
    const id = state.detalle?.id;
    if (!id) return;
    try {
      await api(`/planificador/solicitudes/${id}/liberar`, { method: "PATCH" });
      toastOk("Solicitud liberada");
      dlg.classList.add("hide");
      state.detalle = null;
      await loadQueues();
    } catch (err) {
      toastErr(err);
      detMsg.textContent = err?.message || "No se pudo liberar";
    }
  }

  const statsCards = $("#statsCards");
  const statsTableBody = document.querySelector("#tblTopCentros tbody");
  const statsForm = $("#frmStats");

  function renderStats(data) {
    const kpis = data?.kpis || {};
    if (statsCards) {
      statsCards.innerHTML = `
        <article class="card">
          <h4>En tratamiento</h4>
          <p>${kpis.en_tratamiento ?? 0}</p>
        </article>
        <article class="card">
          <h4>Finalizadas</h4>
          <p>${kpis.finalizadas ?? 0}</p>
        </article>
        <article class="card">
          <h4>Rechazadas</h4>
          <p>${kpis.rechazadas ?? 0}</p>
        </article>
      `;
    }
    if (statsTableBody) {
      const rows = Array.isArray(data?.top_centros) ? data.top_centros : [];
      statsTableBody.innerHTML = rows.length
        ? rows.map((row) => `
            <tr>
              <td>${esc(row.centro)}</td>
              <td>${row.count ?? 0}</td>
              <td class="num">${fmtMoney(row.monto ?? 0)}</td>
            </tr>
          `).join("")
        : `<tr><td colspan="3">Sin datos</td></tr>`;
    }
  }

  async function loadStats() {
    if (!statsCards && !statsTableBody) return;
    const desde = $("#sDesde")?.value || "";
    const hasta = $("#sHasta")?.value || "";
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    try {
      const data = await api(`/planificador/estadisticas?${params.toString()}`);
      if (data?.ok === false) {
        throw new Error(data?.error?.message || "No se pudieron cargar las estadisticas");
      }
      renderStats(data);
    } catch (err) {
      toastErr(err);
      if (statsCards) {
        statsCards.innerHTML = `<article class="card error">No se pudieron cargar las estadisticas</article>`;
      }
    }
  }

  if (statsForm) {
    statsForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      loadStats();
    });
  }

  loadQueues();
  loadStats();
  updateMenuVisibility();
})();




























