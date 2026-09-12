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
import { getUser, getToken, clearSession, avatarUrl, api, chatAppUrl } from "./api.js";

(function injectCoreStyles() {
  if (document.getElementById("sf-core-styles")) return;
  const s = document.createElement("style");
  s.id = "sf-core-styles";
  s.textContent = `
    .menu_toggle {
      display: none;
      flex-direction: column;
      justify-content: center;
      gap: 5px;
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      cursor: pointer;
      z-index: 1002;
      padding: 8px;
    }
    .menu_toggle span {
      display: block;
      height: 2px;
      width: 22px;
      background: currentColor;
      border-radius: 2px;
      transition: transform .2s, opacity .2s;
    }
    .nav_bar { color: #f7dfb8; }
    .nav a:link,
    .nav a:visited,
    .cust_nav_links a:link,
    .cust_nav_links a:visited,
    .auth_nav_slot a:link,
    .auth_nav_slot a:visited,
    .nav_sidebar a:link,
    .nav_sidebar a:visited {
      text-decoration: none;
    }
    .cust_nav_links a:link,
    .cust_nav_links a:visited {
      color: #ece3bd;
    }
    .nav_sidebar a:link,
    .nav_sidebar a:visited {
      color: #f7dfb8;
    }
    .menu_toggle.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
    .menu_toggle.open span:nth-child(2) { opacity: 0; }
    .menu_toggle.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

    .nav_overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.45);
      opacity: 0;
      visibility: hidden;
      transition: opacity .25s, visibility .25s;
      z-index: 1000;
    }
    .nav_overlay.visible {
      opacity: 1;
      visibility: visible;
    }
    .nav_sidebar {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      width: min(300px, 85vw);
      background: #160c02;
      color: #f7dfb8;
      z-index: 1001;
      padding: 1.5rem 1.25rem 2rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      transform: translateX(-105%);
      transition: transform .28s ease;
      box-shadow: 8px 0 24px rgba(0,0,0,.25);
      overflow-y: auto;
    }
    .nav_sidebar.open { transform: translateX(0); }
    .nav_sidebar a {
      color: #f7dfb8;
      text-decoration: none;
      font-weight: 600;
      font-size: 1.05rem;
      padding: 0.35rem 0;
    }
    .nav_sidebar a:hover,
    .nav_sidebar a.active { color: #efbc8a; }
    .nav_sidebar .sidebar_logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      font-weight: 800;
    }
    .nav_sidebar .sidebar_logo img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }
    .nav_sidebar .nav_logout_btn {
      margin-top: auto;
      align-self: flex-start;
      cursor: pointer;
      border: 1px solid #f7dfb8;
      background: transparent;
      color: #f7dfb8;
      padding: 0.45rem 0.9rem;
      border-radius: 8px;
      font: inherit;
    }

    @media (max-width: 900px) {
      .menu_toggle { display: flex; color: #f7dfb8; }
      .nav_bar .nav { display: none; }
    }
    @media (min-width: 901px) {
      .menu_toggle { display: none !important; }
      .nav_sidebar, .nav_overlay { display: none !important; }
    }

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
        <a href="${chatAppUrl()}">Messages</a>
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
      <a href="${chatAppUrl()}">Messages</a>
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

function applyAuthToPageNav() {
  const auth = buildAuthLinks();

  document.querySelectorAll(".auth_nav_slot").forEach((slot) => {
    slot.innerHTML = auth.html;
    wireLogout(slot);
  });

  if (!auth.loggedIn) return;

  document.querySelectorAll(".action.sign_up, a.sign_up, .action.log_in, a.log_in").forEach((el) => {
    el.style.display = "none";
  });

  document.querySelectorAll(".nav_bar .nav").forEach((nav) => {
    [...nav.querySelectorAll("a")].forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (/login\.html|signup\.html/i.test(href)) a.remove();
    });
    if (!nav.querySelector(".nav_user_chip")) {
      const user = getUser();
      const name = user?.fullName || user?.email || "Customer";
      const wrap = document.createElement("span");
      wrap.className = "auth_nav_injected";
      wrap.style.cssText = "display:inline-flex;align-items:center;gap:.75rem;margin-left:.5rem;";
      wrap.innerHTML = `
        <span class="nav_user_chip">
          <img class="nav_user_avatar" src="${avatarUrl(name)}" alt="" />
          <strong class="nav_user_name">${name}</strong>
        </span>
        <button type="button" class="nav_logout_btn" data-logout>Log out</button>
      `;
      nav.appendChild(wrap);
      wireLogout(wrap);
    }
  });
}

const navBar = document.querySelector(".nav_bar");
if (navBar) {
  const menuToggle = document.createElement("button");
  menuToggle.type = "button";
  menuToggle.className = "menu_toggle";
  menuToggle.setAttribute("aria-label", "Open menu");
  menuToggle.innerHTML = `<span></span><span></span><span></span>`;

  const navOverlay = document.createElement("div");
  navOverlay.className = "nav_overlay";
  navOverlay.setAttribute("aria-hidden", "true");

  const navSidebar = document.createElement("nav");
  navSidebar.className = "nav_sidebar";
  navSidebar.setAttribute("aria-label", "Mobile menu");
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

const productStrip = document.querySelector(".sweet_product .product");
if (productStrip) {
  productStrip.style.transform = "none";
}

initHome();
initShop();
initRetailer();
initChat();
