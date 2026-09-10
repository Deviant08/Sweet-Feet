/*
 * ============================================================
 *  Sweet Feet v2 — js/main.js
 *  Entry point: modules + mobile nav + auth-aware header
 * ============================================================
 */

import { initHome } from "./home.js";
import { initShop } from "./shop.js";
import { initRetailer } from "./retailer.js";
import { initChat } from "./chat.js";
import { getUser, getToken, clearSession, avatarUrl, api } from "./api.js";

// ── Scroll reveal ───────────────────────────────────────────
const sections = document.querySelectorAll("section");
if (sections.length > 0) {
  sections.forEach((s) => s.classList.add("section--hidden"));
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove("section--hidden");
        observer.unobserve(entry.target);
      });
    },
    { root: null, threshold: 0.15 }
  );
  sections.forEach((s) => observer.observe(s));
}

function confirmLogout() {
  if (!window.confirm("Log out of Sweet Feet?")) return;
  (async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    clearSession();
    window.location.href = "/index.html";
  })();
}

function buildAuthLinks() {
  const user = getUser();
  const loggedIn = !!(getToken() && user && (user.fullName || user.email));

  if (!loggedIn) {
    return {
      html: `
        <a href="/nav/signup.html">Sign Up</a>
        <a href="/nav/login.html">Login</a>
        <a href="/nav/products.html">Shop</a>
        <a href="/nav/track.html">Track Order</a>
        <a href="/nav/chat.html">Messages</a>
        <a href="/nav/feedback.html">Feedback</a>
      `,
      loggedIn: false,
    };
  }

  const name = user.fullName || user.email || "Customer";
  const photo = avatarUrl(name, user.photo || user.avatar);
  return {
    loggedIn: true,
    html: `
      <div class="nav_user_chip">
        <img class="nav_user_avatar" src="${photo}" alt="" />
        <span class="nav_user_name">${name}</span>
      </div>
      <a href="/nav/products.html">Shop</a>
      <a href="/nav/track.html">Track Order</a>
      <a href="/nav/chat.html">Messages</a>
      <a href="/nav/feedback.html">Feedback</a>
      <button type="button" class="nav_logout_btn" data-logout>Log out</button>
    `,
  };
}

function wireLogout(root) {
  root?.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      confirmLogout();
    });
  });
}

/** Update desktop/header links that point to login/signup */
function applyAuthToPageNav() {
  const auth = buildAuthLinks();

  // Explicit slots
  document.querySelectorAll(".auth_nav_slot").forEach((slot) => {
    slot.innerHTML = auth.html;
    wireLogout(slot);
  });

  // Common header action areas on homepage
  document.querySelectorAll(".action.sign_up, a.sign_up").forEach((el) => {
    if (!auth.loggedIn) return;
    el.style.display = "none";
  });
  document.querySelectorAll(".action.log_in, a.log_in").forEach((el) => {
    if (!auth.loggedIn) return;
    el.style.display = "none";
  });

  // Top nav links on index-style nav
  const navContainers = document.querySelectorAll(".nav_bar, .header_nav, nav");
  navContainers.forEach((nav) => {
    const loginA = [...nav.querySelectorAll("a")].filter((a) =>
      /login\.html/i.test(a.getAttribute("href") || "")
    );
    const signupA = [...nav.querySelectorAll("a")].filter((a) =>
      /signup\.html/i.test(a.getAttribute("href") || "")
    );
    if (!auth.loggedIn) return;

    loginA.forEach((a) => a.remove());
    signupA.forEach((a) => a.remove());

    if (!nav.querySelector(".nav_user_chip") && !nav.querySelector("[data-logout]")) {
      const wrap = document.createElement("div");
      wrap.className = "auth_nav_injected";
      wrap.style.cssText = "display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;";
      const user = getUser();
      const name = user?.fullName || user?.email || "Customer";
      wrap.innerHTML = `
        <span class="nav_user_chip" style="display:inline-flex;align-items:center;gap:.5rem;color:inherit;">
          <img src="${avatarUrl(name)}" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" />
          <strong>${name}</strong>
        </span>
        <button type="button" data-logout style="cursor:pointer;border:1px solid currentColor;background:transparent;color:inherit;padding:.35rem .7rem;border-radius:8px;">Log out</button>
      `;
      nav.appendChild(wrap);
      wireLogout(wrap);
    }
  });
}

// ── Mobile nav sidebar ──────────────────────────────────────
const navBar = document.querySelector(".nav_bar");
if (navBar) {
  const menuToggle = document.createElement("button");
  menuToggle.className = "menu_toggle";
  menuToggle.setAttribute("aria-label", "Open menu");
  menuToggle.innerHTML = `<span></span><span></span><span></span>`;

  const navOverlay = document.createElement("div");
  navOverlay.className = "nav_overlay";

  const navSidebar = document.createElement("nav");
  navSidebar.className = "nav_sidebar";
  const auth = buildAuthLinks();
  navSidebar.innerHTML = `
    <a class="sidebar_logo" href="/index.html">
      <img src="/assets/images (7).jpeg" alt="Sweet Feet" />
      <span>Sweet Feet</span>
    </a>
    ${auth.html}
  `;

  navBar.appendChild(menuToggle);
  document.body.appendChild(navOverlay);
  document.body.appendChild(navSidebar);
  wireLogout(navSidebar);

  const currentPath = window.location.pathname;
  navSidebar.querySelectorAll("a:not(.sidebar_logo)").forEach((link) => {
    if (link.getAttribute("href") === currentPath) link.classList.add("active");
  });

  function openSidebar() {
    navSidebar.classList.add("open");
    navOverlay.classList.add("visible");
    menuToggle.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeSidebar() {
    navSidebar.classList.remove("open");
    navOverlay.classList.remove("visible");
    menuToggle.classList.remove("open");
    document.body.style.overflow = "";
  }

  menuToggle.addEventListener("click", () =>
    navSidebar.classList.contains("open") ? closeSidebar() : openSidebar()
  );
  navOverlay.addEventListener("click", closeSidebar);
  navSidebar.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeSidebar));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSidebar();
  });
}

applyAuthToPageNav();

// Inject minimal styles for seller + auth chips if stylesheet missing rules
(function injectAuthStyles() {
  if (document.getElementById("sf-auth-styles")) return;
  const s = document.createElement("style");
  s.id = "sf-auth-styles";
  s.textContent = `
    .card_seller{display:flex;align-items:center;gap:.55rem;margin-top:.75rem;text-decoration:none;color:inherit;}
    .card_seller_avatar{width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;}
    .card_seller_text{display:flex;flex-direction:column;line-height:1.2;}
    .card_seller_by{font-size:.7rem;color:#8a7b6c;text-transform:uppercase;letter-spacing:.04em;}
    .card_seller_name{font-size:.9rem;font-weight:700;}
    .btn_chat_link{display:inline-block;margin-top:.5rem;font-size:.85rem;font-weight:600;color:#c8440c;text-decoration:none;}
    .nav_user_chip{display:inline-flex;align-items:center;gap:.5rem;}
    .nav_user_avatar{width:28px;height:28px;border-radius:50%;object-fit:cover;}
    .nav_logout_btn{cursor:pointer;border:1px solid currentColor;background:transparent;color:inherit;padding:.35rem .75rem;border-radius:8px;font:inherit;}
  `;
  document.head.appendChild(s);
})();

initHome();
initShop();
initRetailer();
initChat();
