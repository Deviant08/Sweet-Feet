/*
 * Sweet Feet — js/api.js
 * Live: https://sweet-feet-backend.onrender.com/api/v1
 */

export const LOGIN_URL = "/nav/login.html";

export const API_BASE =
  (typeof window !== "undefined" && window.SF_API_BASE) ||
  "https://sweet-feet-backend.onrender.com/api/v1";

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractList(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.products)) return json.products;
  if (json.data && Array.isArray(json.data.products)) return json.data.products;
  if (json.data && Array.isArray(json.data.items)) return json.data.items;
  return [];
}

export async function api(path, opts = {}) {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;
  const token = getToken();
  const method = String(opts.method || "GET").toUpperCase();
  const attempts = Math.max(1, opts.retries ?? (method === "GET" ? 3 : 1));
  const ms = opts.timeoutMs || (method === "GET" ? 45000 : 20000);

  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const useCreds =
    opts.credentials === "include" || Boolean(token) || method !== "GET";

  let lastErr;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    const init = {
      method,
      headers,
      credentials: useCreds ? "include" : "omit",
      signal: controller.signal,
    };
    if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {
      init.body = JSON.stringify(opts.body);
    } else if (opts.body) {
      init.body = opts.body;
    }

    try {
      const res = await fetch(url, init);
      clearTimeout(timer);

      if (res.status >= 500 && i < attempts - 1) {
        await sleep(1600 * (i + 1));
        continue;
      }

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
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      const retryable =
        !e.status || e.status >= 500 || e.name === "AbortError" || e.name === "TypeError";
      if (retryable && i < attempts - 1) {
        await sleep(1600 * (i + 1));
        continue;
      }
      if (e && e.name === "AbortError") {
        throw new Error(
          "The server took too long. Check that the API is running and MongoDB is connected."
        );
      }
      if (!e.status) {
        throw new Error("Cannot reach the API. Is the backend live?");
      }
      throw e;
    }
  }
  throw lastErr || new Error("Cannot reach the API. Is the backend live?");
}

export function mapProduct(p) {
  if (!p) return null;
  const retailer = p.retailer && typeof p.retailer === "object" ? p.retailer : {};
  const rName = retailer.businessName || p.retailerName || "Sweet Feet";
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
    badge: p.badge || "",
    badgeLabel: p.badgeLabel || p.badge || "",
    img: p.img,
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    is_active: p.isActive !== false,
    isActive: p.isActive !== false,
    retailer_id: retailer._id || retailer.id || p.retailer_id || p.retailer || "",
    retailerName: rName,
    retailerLocation: retailer.location || p.retailerLocation || "",
    retailerLogo: avatarUrl(rName, retailer.logo || p.retailerLogo),
  };
}
