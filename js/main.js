"use strict";

const sections = document.querySelectorAll("section");
const aboutUs = document.querySelector(".about_us");
const product = document.querySelector(".product");
const checkOut = document.querySelectorAll(".checkout");
const loginForm = document.querySelector(".form__container");
const exitContainer = document.querySelector(".exit");
const eachProduct = document.querySelectorAll(".pd");

sections.forEach((section) => {
  section.classList.add("section--hidden");
});

// for the observer

function sectionCallBack(entries, observe) {
  const [entry] = entries;
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    entry.target.classList.remove("section--hidden");
    sectionObserver.unobserve(entry.target);
    console.log(entry.target);
  });
}

const sectionObserver = new IntersectionObserver(sectionCallBack, {
  root: null,
  threshold: 0.15,
});

sections.forEach(function (section) {
  sectionObserver.observe(section);
});

aboutUs.addEventListener("click", function (e) {
  e.preventDefault();

  sections[0].scrollIntoView({
    behavior: "smooth",
  });
});

let count = 0;

let oneTime = setInterval(() => {
  count++;

  if (count === 4) {
    count = 0;
  } else if (count >= 3) {
    product.style.transform = `translateX(20rem)`;
  } else if (count <= 3) {
    product.style.transform = `translateX(-20rem)`;
  }
}, 1000);

product.addEventListener("mouseover", function () {
  clearInterval(oneTime);
});

product.addEventListener("mouseout", function () {
  oneTime = setInterval(() => {
    count++;

    if (count === 4) {
      count = 0;
    } else if (count >= 3) {
      product.style.transform = `translateX(20rem)`;
    } else if (count <= 3) {
      product.style.transform = `translateX(-20rem)`;
    }
  }, 1000);
});

function showSignUpForm(e) {
  e.preventDefault();

  loginForm.classList.remove("hidden");
  exitContainer.classList.remove("hidden");
}

function removeSignUpForm(e) {
  e.preventDefault();

  loginForm.classList.add("hidden");
  exitContainer.classList.add("hidden");
}

checkOut.forEach((bnt) => {
  bnt.addEventListener("click", showSignUpForm);
});

exitContainer.addEventListener("click", removeSignUpForm);

eachProduct.forEach((pd) => {
  pd.addEventListener("click", showSignUpForm);
});


/* ── MOBILE NAV SIDEBAR (all pages that have .nav_bar) ─────
   Injects the hamburger button and sidebar panel into the
   DOM so no HTML file needs to be changed.
   Only runs when .nav_bar exists on the page.             */

const navBar = document.querySelector(".nav_bar");

if (navBar) {

  /* ── 1. Create the hamburger button ── */
  const menuToggle = document.createElement("button");
  menuToggle.className = "menu_toggle";
  menuToggle.setAttribute("aria-label", "Open menu");
  menuToggle.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;

  /* ── 2. Create the dark overlay ── */
  const navOverlay = document.createElement("div");
  navOverlay.className = "nav_overlay";

  /* ── 3. Create the sidebar panel ── */
  const navSidebar = document.createElement("nav");
  navSidebar.className = "nav_sidebar";
  navSidebar.innerHTML = `
    <a class="sidebar_logo" href="/index.html">
      <img src="/assets/images (7).jpeg" alt="Sweet Feet logo" />
      <span>Sweet Feet</span>
    </a>
    <a href="/nav/signup.html">Sign Up</a>
    <a href="/nav/login.html">Login</a>
    <a href="/nav/products.html">Shop</a>
    <a href="/nav/feedback.html">Feedback</a>
  `;

  /* ── 4. Inject into the page ── */
  navBar.appendChild(menuToggle);
  document.body.appendChild(navOverlay);
  document.body.appendChild(navSidebar);

  /* ── 5. Highlight the active link ── */
  const currentPath = window.location.pathname;
  navSidebar.querySelectorAll("a:not(.sidebar_logo)").forEach(function (link) {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active");
    }
  });

  /* ── 6. Open / close logic ── */
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

  menuToggle.addEventListener("click", function () {
    if (navSidebar.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  /* Close when overlay is tapped */
  navOverlay.addEventListener("click", closeSidebar);

  /* Close when a sidebar link is tapped */
  navSidebar.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeSidebar);
  });

  /* Close on Escape key */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSidebar();
  });

} // end nav sidebar guard


/* ── FEEDBACK PAGE ──────────────────────────────────────────
   Guard: #feedbackForm must exist (only on feedback.html)  */

const feedbackForm = document.getElementById("feedbackForm");

if (feedbackForm) {
  feedbackForm.addEventListener("submit", function (e) {
    e.preventDefault();
    feedbackForm.classList.add("hidden");
    document.getElementById("fbSuccess").classList.remove("hidden");
  });
}


/* ── FEEDBACK PAGE (feedback.html) ──────────────────────────
   Guard: #feedbackForm must exist                           */

const feedbackForm = document.getElementById("feedbackForm");

if (feedbackForm) {
  feedbackForm.addEventListener("submit", function (e) {
    e.preventDefault();

    feedbackForm.style.display = "none";

    const successEl = document.getElementById("fbSuccess");
    if (successEl) {
      successEl.classList.remove("hidden");
    }
  });
}
