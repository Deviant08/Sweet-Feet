/*
 * ============================================================
 *  Sweet Feet v2 — js/main.js
 *  Entry point for the entire project.
 *
 *  Link this ONE file in every HTML page:
 *    <script type="module" src="/sweetfeet/js/main.js" defer></script>
 *
 *  It imports each module and calls its init function.
 *  Each init function has its own guard — if the element
 *  it needs is not on the current page, it exits silently.
 * ============================================================
 */

import { initHome }      from './home.js';
import { initShop }      from './shop.js';
import { initRetailer }  from './retailer.js';
import { initChat }      from './chat.js';

// ── Scroll reveal (runs on any page with <section> tags) ────
const sections = document.querySelectorAll("section");

if (sections.length > 0) {
  sections.forEach(s => s.classList.add("section--hidden"));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove("section--hidden");
      observer.unobserve(entry.target);
    });
  }, { root: null, threshold: 0.15 });

  sections.forEach(s => observer.observe(s));
}

// ── Mobile nav sidebar (runs on any page with .nav_bar) ─────
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
  navSidebar.innerHTML = `
    <a class="sidebar_logo" href="/sweetfeet/index.html">
      <img src="/sweetfeet/assets/images (7).jpeg" alt="Sweet Feet" />
      <span>Sweet Feet</span>
    </a>
    <a href="/sweetfeet/nav/signup.html">Sign Up</a>
    <a href="/sweetfeet/nav/login.html">Login</a>
    <a href="/sweetfeet/nav/products.html">Shop</a>
    <a href="/sweetfeet/nav/track.html">Track Order</a>
    <a href="/sweetfeet/nav/chat.html">Messages</a>
    <a href="/sweetfeet/nav/feedback.html">Feedback</a>
  `;

  navBar.appendChild(menuToggle);
  document.body.appendChild(navOverlay);
  document.body.appendChild(navSidebar);

  // Highlight current page link
  const currentPath = window.location.pathname;
  navSidebar.querySelectorAll("a:not(.sidebar_logo)").forEach(link => {
    if (link.getAttribute("href") === currentPath) link.classList.add("active");
  });

  function openSidebar() {
    navSidebar.classList.add("open");
    navOverlay.classList.add("visible");
    menuToggle.classList.add("open");
    menuToggle.setAttribute("aria-label", "Close menu");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    navSidebar.classList.remove("open");
    navOverlay.classList.remove("visible");
    menuToggle.classList.remove("open");
    menuToggle.setAttribute("aria-label", "Open menu");
    document.body.style.overflow = "";
  }

  menuToggle.addEventListener("click", () =>
    navSidebar.classList.contains("open") ? closeSidebar() : openSidebar()
  );
  navOverlay.addEventListener("click", closeSidebar);
  navSidebar.querySelectorAll("a").forEach(link =>
    link.addEventListener("click", closeSidebar)
  );
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeSidebar();
  });
}

// ── Run all page modules ─────────────────────────────────────
initHome();
initShop();
initRetailer();
initChat();
