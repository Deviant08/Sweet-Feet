/*
 * Sweet Feet — js/api.js
 * Live (default): https://sweet-feet-backend.onrender.com/api/v1
 *
 * Optional local API — does not change Vercel. In DevTools:
 *   localStorage.setItem("sf_api_base", "http://localhost:5000/api/v1")
 *   localStorage.removeItem("sf_api_base")  // back to Render
 */

export const LOGIN_URL = "/nav/login.html";

const LIVE_API = "https://sweet-feet-backend.onrender.com/api/v1";

function resolveApiBase() {
  if (typeof window !== "undefined" && window.SF_API_BASE) return window.SF_API_BASE;
  try {
    const stored = localStorage.getItem("sf_api_base");
    if (stored) return String(stored).replace(/\/$/, "");
  } catch {
    /* private mode */
  }
  return LIVE_API;
}

export const API_BASE = resolveApiBase();

export function getWsUrl() {
  if (typeof window !== "undefined" && window.SF_WS_URL) return window.SF_WS_URL;
  try {
    const u = new URL(API_BASE);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = "/ws/chat";
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return "wss://sweet-feet-backend.onrender.com/ws/chat";
  }
}

const TOKEN_KEY = "sf_token";
const USER_KEY = "sf_user";
const RETAILER_KEY = "sf_retailer";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function chatAppUrl(query = {}) {
  const configured =
    (typeof window !== "undefined" && window.SF_CHAT_URL) || "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v != null && String(v) !== "") params.set(k, String(v));
  }
  const token = getToken();
  const base = String(configured).replace(/\/$/, "");
  if (base && token) params.set("token", token);
  const qs = params.toString();
  if (base) return qs ? `${base}/?${qs}` : `${base}/`;
  return qs ? `/nav/chat.html?${qs}` : `/nav/chat.html`;
}

export function setSession(token, data, type = "user") {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (type === "retailer") {
    localStorage.setItem(RETAILER_KEY, JSON.stringify(data || {}));
    localStorage.setItem("sf_retailer_id", data?.id || data?._id || "");
    localStorage.setItem("sf_retailer_name", data?.businessName || "");
  } else {
    localStorage.setItem(USER_KEY, JSON.stringify(data || {}));
    localStorage.setItem("sf_user_id", data?.id || data?._id || "");
    localStorage.setItem("sf_user_email", data?.email || "");
    localStorage.setItem("sf_user_name", data?.fullName || data?.username || "");
  }
}

export function clearSession() {
  [
    TOKEN_KEY,
    USER_KEY,
    RETAILER_KEY,
    "sf_user_id",
    "sf_user_email",
    "sf_user_name",
    "sf_retailer_id",
    "sf_retailer_name",
  ].forEach((k) => localStorage.removeItem(k));
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function getRetailer() {
  try {
    return JSON.parse(localStorage.getItem(RETAILER_KEY) || "null");
  } catch {
    return null;
  }
}

/** Login page URL with the correct role tab. Call before clearSession(). */
export function logoutRedirectUrl() {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    if (user?.role === "admin") return `${LOGIN_URL}?role=admin`;
  } catch {
    /* ignore */
  }
  if (localStorage.getItem(RETAILER_KEY) || localStorage.getItem("sf_retailer_name")) {
    return `${LOGIN_URL}?role=retailer`;
  }
  return LOGIN_URL;
}

export function avatarUrl(name, existing) {
  if (existing) return existing;
  const label = encodeURIComponent((name || "SF").slice(0, 24));
  return `https://ui-avatars.com/api/?name=${label}&background=160c02&color=f7dfb8&size=128&bold=true`;
}

export async function api(path, opts = {}) {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const ms = opts.timeoutMs || 20000;
  const timer = setTimeout(() => controller.abort(), ms);

  const init = {
    ...opts,
    headers,
    credentials: "include",
    signal: controller.signal,
  };
  if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {
    init.body = JSON.stringify(opts.body);
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch (e) {
    clearTimeout(timer);
    if (e && e.name === "AbortError") {
      throw new Error("The server took too long. Check that the API is running and MongoDB is connected.");
    }
    throw new Error("Cannot reach the API. Is the backend live?");
  }
  clearTimeout(timer);

  let json = {};
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    const msg =
      json.message ||
      json.error ||
      (typeof json.status === "string" && json.status !== "Success"
        ? json.status
        : null) ||
      `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = json;
    throw err;
  }
  return json;
}

export function mapProduct(p) {
  if (!p) return null;
  const house = !!(p.isHouse || p.is_house);
  const retailer = p.retailer || {};
  const rName = house ? "Sweet Feet" : retailer.businessName || "Sweet Feet";
  const retailerId = house ? "" : retailer._id || retailer.id || p.retailer || "";
  return {
    id: p._id || p.id,
    name: p.name,
    category: p.category || "",
    gender: p.gender || "unisex",
    price: Number(p.price) || 0,
    oldPrice: p.oldPrice != null ? Number(p.oldPrice) : null,
    old_price: p.oldPrice != null ? Number(p.oldPrice) : null,
    rating: Number(p.rating) || 0,
    ratingCount: Number(p.ratingCount) || 0,
    color: p.color || "",
    badge: p.badge || (house ? "top" : ""),
    badgeLabel: p.badgeLabel || p.badge || (house ? "SWEET FEET" : ""),
    img: p.img,
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    is_active: p.isActive !== false,
    isActive: p.isActive !== false,
    isHouse: house,
    retailer_id: retailerId,
    retailerName: rName,
    retailerLocation: house ? "" : retailer.location || "",
    retailerLogo: house
      ? "/assets/images (7).jpeg"
      : avatarUrl(rName, retailer.logo),
  };
}

const SF_DIALOG_CSS = `
.sf_dialog{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px}
.sf_dialog[hidden]{display:none!important}
.sf_dialog_backdrop{position:absolute;inset:0;background:rgba(22,12,2,.55);backdrop-filter:blur(5px)}
.sf_dialog_card{position:relative;background:#fdfaf6;border:1px solid #e8ddd4;border-radius:16px;padding:28px 24px 20px;width:min(400px,100%);box-shadow:0 20px 50px rgba(22,12,2,.28);text-align:center;font-family:"Kumbh Sans",system-ui,sans-serif;color:#160c02}
.sf_dialog_logo{width:52px;height:52px;border-radius:50%;object-fit:cover;border:1px solid #d5b074;margin:0 auto 14px;display:block;background:#160c02}
.sf_dialog_card h3{font-family:"Work Sans",system-ui,sans-serif;font-size:20px;font-weight:800;margin:0 0 8px;color:#160c02;letter-spacing:-.02em}
.sf_dialog_card p{font-size:14px;line-height:1.5;color:#6d5f49;margin:0 0 22px;font-weight:500}
.sf_dialog_card p[hidden]{display:none}
.sf_dialog_actions{display:flex;gap:10px}
.sf_dialog_actions button{flex:1;padding:12px 16px;border-radius:10px;font-weight:700;cursor:pointer;font-size:14px;font-family:inherit;transition:background .15s,color .15s,filter .15s}
.sf_dialog_cancel{background:transparent;border:1.5px solid #160c02;color:#160c02}
.sf_dialog_cancel:hover{background:#160c02;color:#f7dfb8}
.sf_dialog_ok{background:#160c02;border:1.5px solid #160c02;color:#f7dfb8}
.sf_dialog_ok:hover{filter:brightness(1.12)}
.sf_dialog_ok.danger{background:#c8440c;border-color:#c8440c;color:#fff}
.sf_dialog_cancel[hidden]{display:none}
`;

function ensureSfDialog() {
  if (typeof document === "undefined") return null;
  if (!document.getElementById("sfDialogStyles")) {
    const s = document.createElement("style");
    s.id = "sfDialogStyles";
    s.textContent = SF_DIALOG_CSS;
    document.head.appendChild(s);
  }
  let el = document.getElementById("sfDialog");
  if (el) return el;
  el = document.createElement("div");
  el.id = "sfDialog";
  el.className = "sf_dialog";
  el.hidden = true;
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-labelledby", "sfDialogTitle");
  el.innerHTML = `
    <div class="sf_dialog_backdrop" data-sf-dialog-dismiss="1"></div>
    <div class="sf_dialog_card">
      <img class="sf_dialog_logo" src="/assets/Sweet-feet-logo.png" alt="" />
      <h3 id="sfDialogTitle"></h3>
      <p id="sfDialogMsg"></p>
      <div class="sf_dialog_actions">
        <button type="button" class="sf_dialog_cancel" id="sfDialogCancel">Cancel</button>
        <button type="button" class="sf_dialog_ok" id="sfDialogOk">OK</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  return el;
}

let sfDialogCloser = null;

function openSfDialog({ title, message, confirmText, cancelText, danger }) {
  return new Promise((resolve) => {
    const el = ensureSfDialog();
    if (!el) {
      resolve(cancelText ? window.confirm(message || title) : (window.alert(message || title), true));
      return;
    }
    if (sfDialogCloser) sfDialogCloser(false);

    const titleEl = el.querySelector("#sfDialogTitle");
    const msgEl = el.querySelector("#sfDialogMsg");
    const okBtn = el.querySelector("#sfDialogOk");
    const cancelBtn = el.querySelector("#sfDialogCancel");
    titleEl.textContent = title || "Sweet Feet";
    msgEl.textContent = message || "";
    msgEl.hidden = !message;
    okBtn.textContent = confirmText || "OK";
    okBtn.classList.toggle("danger", !!danger);
    const hasCancel = !!(cancelText != null && cancelText !== "");
    cancelBtn.hidden = !hasCancel;
    if (hasCancel) cancelBtn.textContent = cancelText;
    el.hidden = false;
    (hasCancel ? cancelBtn : okBtn).focus();

    const close = (value) => {
      el.hidden = true;
      el.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      if (sfDialogCloser === close) sfDialogCloser = null;
      resolve(value);
    };
    sfDialogCloser = close;
    const onClick = (e) => {
      if (e.target.closest("#sfDialogOk")) close(true);
      else if (e.target.closest("#sfDialogCancel") || e.target.getAttribute("data-sf-dialog-dismiss")) {
        close(hasCancel ? false : true);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") close(hasCancel ? false : true);
    };
    el.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
  });
}

export function sfAlert(message, opts = {}) {
  const isObj = message && typeof message === "object";
  return openSfDialog({
    title: isObj ? message.title || "Sweet Feet" : opts.title || "Sweet Feet",
    message: isObj ? message.message || "" : String(message ?? ""),
    confirmText: isObj ? message.confirmText || "OK" : opts.confirmText || "OK",
    cancelText: null,
    danger: false,
  }).then(() => undefined);
}

export function sfConfirm(message, opts = {}) {
  const isObj = message && typeof message === "object";
  return openSfDialog({
    title: isObj ? message.title || "Please confirm" : opts.title || "Please confirm",
    message: isObj ? message.message || "" : String(message ?? ""),
    confirmText: isObj ? message.confirmText || "OK" : opts.confirmText || "OK",
    cancelText: isObj ? message.cancelText ?? "Cancel" : opts.cancelText ?? "Cancel",
    danger: isObj ? !!message.danger : !!opts.danger,
  });
}

export async function confirmAndLogout(redirectUrl) {
  const ok = await sfConfirm({
    title: "Log out?",
    message: "You’ll need to sign in again to continue.",
    confirmText: "Log out",
    cancelText: "Stay signed in",
    danger: true,
  });
  if (!ok) return false;
  try {
    await api("/auth/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
  const dest = redirectUrl || logoutRedirectUrl();
  clearSession();
  window.location.href = dest;
  return true;
}

if (typeof window !== "undefined") {
  window.sfAlert = sfAlert;
  window.sfConfirm = sfConfirm;
  window.confirmAndLogout = confirmAndLogout;
}
