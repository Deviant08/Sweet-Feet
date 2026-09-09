/*
 * ============================================================
 *  Sweet Feet — js/api.js
 *  Single client for the standalone backend:
 *  https://github.com/Deviant08/sweet-feet-backend
 *  Live: https://sweet-feet-backend.onrender.com/api/v1
 *  All requests go to /api/v1 (never the legacy PHP /API folder).
 * ============================================================
 */

/**
 * Backend base URL.
 * Default: production Render API.
 * Local override (optional):
 *   <script>window.SF_API_BASE = "http://localhost:5000/api/v1";</script>
 * Optional WebSocket: window.SF_WS_URL = "wss://sweet-feet-backend.onrender.com/ws/chat"
 */
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
    localStorage.setItem("sf_user_name", data?.fullName || "");
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

/**
 * @param {string} path - path after /api/v1 (e.g. "/products")
 * @param {object} opts - fetch options; body may be a plain object
 */
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

  const init = {
    ...opts,
    headers,
    credentials: "include",
  };
  if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {
    init.body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, init);
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

/** Normalize product from TS API → shape the UI expects */
export function mapProduct(p) {
  if (!p) return null;
  const retailer = p.retailer || {};
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
    retailer_id: retailer._id || retailer.id || p.retailer || "",
    retailerName: retailer.businessName || "Sweet Feet",
    retailerLocation: retailer.location || "",
  };
}
