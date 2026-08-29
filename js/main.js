"use strict";

/*
 * ============================================================
 *  Sweet Feet — main.js  (Full-Stack Version)
 *  All JS for the entire project in one file.
 *  Link in every HTML file:
 *    <script src="/sweetfeet/js/main.js" defer></script>
 *
 *  What this file does by page:
 *    - ALL PAGES:   Mobile nav sidebar (hamburger menu)
 *    - index.html:  Scroll observer, product carousel, login popup
 *    - products.html: Fetch products from DB, filter, cart, Paystack
 *    - login.html:  Send credentials to PHP, handle session
 *    - signup.html: Send new account to PHP
 *    - feedback.html: Send form data to PHP
 * ============================================================
 */


/* ══════════════════════════════════════════════════════════
   SHARED — Scroll reveal (any page with <section> tags)
   ══════════════════════════════════════════════════════════ */

const sections = document.querySelectorAll("section");

if (sections.length > 0) {
  sections.forEach(s => s.classList.add("section--hidden"));

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove("section--hidden");
      sectionObserver.unobserve(entry.target);
    });
  }, { root: null, threshold: 0.15 });

  sections.forEach(s => sectionObserver.observe(s));
}


/* ══════════════════════════════════════════════════════════
   HOMEPAGE (index.html)
   Guard: .product must exist
   ══════════════════════════════════════════════════════════ */

const product       = document.querySelector(".product");
const aboutUs       = document.querySelector(".about_us");
const loginForm     = document.querySelector(".form__container");
const exitContainer = document.querySelector(".exit");
const checkOut      = document.querySelectorAll(".checkout");
const eachProduct   = document.querySelectorAll(".pd");

if (product) {

  // About Us smooth scroll
  if (aboutUs && sections.length > 0) {
    aboutUs.addEventListener("click", function (e) {
      e.preventDefault();
      sections[0].scrollIntoView({ behavior: "smooth" });
    });
  }

  // Product carousel auto-slide
  let count = 0;

  let oneTime = setInterval(() => {
    count++;
    if (count === 4) count = 0;
    if (count >= 3) {
      product.style.transform = `translateX(20rem)`;
    } else {
      product.style.transform = `translateX(-20rem)`;
    }
  }, 1000);

  product.addEventListener("mouseover", () => clearInterval(oneTime));
  product.addEventListener("mouseout", () => {
    oneTime = setInterval(() => {
      count++;
      if (count === 4) count = 0;
      if (count >= 3) {
        product.style.transform = `translateX(20rem)`;
      } else {
        product.style.transform = `translateX(-20rem)`;
      }
    }, 1000);
  });

  // Login popup (triggered by checkout / product click)
  function showSignUpForm(e) {
    e.preventDefault();
    if (loginForm)     loginForm.classList.remove("hidden");
    if (exitContainer) exitContainer.classList.remove("hidden");
  }

  function removeSignUpForm(e) {
    e.preventDefault();
    if (loginForm)     loginForm.classList.add("hidden");
    if (exitContainer) exitContainer.classList.add("hidden");
  }

  checkOut.forEach(btn => btn.addEventListener("click", showSignUpForm));
  eachProduct.forEach(pd => pd.addEventListener("click", showSignUpForm));
  if (exitContainer) exitContainer.addEventListener("click", removeSignUpForm);

} // end homepage guard


/* ══════════════════════════════════════════════════════════
   SHOP PAGE (products.html)
   Guard: #productGrid must exist
   ══════════════════════════════════════════════════════════ */

const productGrid = document.getElementById("productGrid");

if (productGrid) {

  // ── State ────────────────────────────────────────────────
  // products is now populated from the database via fetch()
  // instead of being hardcoded here
  let products = [];

  let state = {
    cat:      "all",
    search:   "",
    sort:     "default",
    maxPrice: 50,
    gender:   "all",
    color:    "all",
    rating:   "all",
    cart:     []
  };

  // ── Fetch products from PHP/MySQL ────────────────────────
  // Called once on page load.
  // replaces the old hardcoded products array.
  async function loadProducts() {
    try {
      const res  = await fetch('/sweetfeet/api/products.php');
      const data = await res.json();

      if (Array.isArray(data)) {
        products = data;
        renderGrid();
        updateCartUI();
      } else {
        showToast('Could not load products. Please refresh.');
      }
    } catch (err) {
      showToast('Network error loading products.');
      console.error(err);
    }
  }

  // ── Render helpers ───────────────────────────────────────
  function stars(r) {
    const full = Math.floor(r);
    const half = r - full >= 0.5 ? 1 : 0;
    return "★".repeat(full) + (half ? "☆" : "") + "☆".repeat(5 - full - half);
  }

  function formatPrice(p) { return `₦${p.toFixed(2)}`; }

  function renderCard(p) {
    return `
      <article class="product_card" data-id="${p.id}">
        ${p.badge ? `<span class="card_badge badge_${p.badge}">${p.badgeLabel}</span>` : ""}
        <button class="card_wishlist" title="Save for later">♡</button>
        <img class="card_img" src="${p.img}" alt="${p.name}" loading="lazy" />
        <div class="card_body">
          <span class="card_category">${p.category} · ${p.gender}</span>
          <h2 class="card_name">${p.name}</h2>
          <div class="card_rating">
            <span class="stars">${stars(p.rating)}</span>
            <span>${p.rating} (${p.ratingCount})</span>
          </div>
          <div class="card_sizes">
            ${p.sizes.map(s => `<span class="size_dot">${s}</span>`).join("")}
          </div>
          <div class="card_footer">
            <div class="card_price">
              ${formatPrice(p.price)}
              ${p.oldPrice ? `<span class="old_price">${formatPrice(p.oldPrice)}</span>` : ""}
            </div>
            <button class="btn_order" data-id="${p.id}">Add to cart</button>
          </div>
        </div>
      </article>`;
  }

  function getFiltered() {
    let list = [...products];
    if (state.cat    !== "all") list = list.filter(p => p.category === state.cat);
    if (state.gender !== "all") list = list.filter(p => p.gender === state.gender || p.gender === "unisex");
    if (state.color  !== "all") list = list.filter(p => p.color === state.color);
    if (state.rating !== "all") list = list.filter(p => p.rating >= parseFloat(state.rating));
    list = list.filter(p => p.price <= state.maxPrice);
    if (state.search) list = list.filter(p =>
      p.name.toLowerCase().includes(state.search.toLowerCase()) ||
      p.category.toLowerCase().includes(state.search.toLowerCase())
    );
    if      (state.sort === "price_asc")  list.sort((a, b) => a.price - b.price);
    else if (state.sort === "price_desc") list.sort((a, b) => b.price - a.price);
    else if (state.sort === "rating")     list.sort((a, b) => b.rating - a.rating);
    else if (state.sort === "name")       list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }

  function renderGrid() {
    const list  = getFiltered();
    const empty = document.getElementById("emptyState");
    const count = document.getElementById("resultCount");

    count.textContent = `${list.length} product${list.length !== 1 ? "s" : ""}`;

    if (list.length === 0) {
      productGrid.innerHTML = "";
      empty.classList.add("visible");
    } else {
      empty.classList.remove("visible");
      productGrid.innerHTML = list.map(renderCard).join("");
      productGrid.querySelectorAll(".btn_order").forEach(btn => {
        btn.addEventListener("click", () => addToCart(parseInt(btn.dataset.id)));
      });
    }
  }

  // ── Cart ─────────────────────────────────────────────────
  function addToCart(id) {
    const product  = products.find(p => p.id === id);
    const existing = state.cart.find(i => i.id === id);
    if (existing) { existing.qty += 1; }
    else          { state.cart.push({ ...product, qty: 1 }); }
    updateCartUI();
    showToast(`${product.name} added to cart`);
  }

  function removeFromCart(id) {
    state.cart = state.cart.filter(i => i.id !== id);
    updateCartUI();
  }

  function updateQty(id, delta) {
    const item = state.cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty < 1) { removeFromCart(id); return; }
    updateCartUI();
  }

  function updateCartUI() {
    const total    = state.cart.reduce((s, i) => s + i.qty, 0);
    const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);

    const countEl    = document.getElementById("cartCount");
    const subtotalEl = document.getElementById("subtotalAmount");
    const itemsEl    = document.getElementById("drawerItems");
    const emptyEl    = document.getElementById("drawerEmpty");

    countEl.textContent = total;
    countEl.classList.toggle("hidden", total === 0);
    subtotalEl.textContent = formatPrice(subtotal);

    if (state.cart.length === 0) {
      itemsEl.innerHTML = "";
      itemsEl.appendChild(emptyEl);
      emptyEl.style.display = "flex";
    } else {
      emptyEl.style.display = "none";
      itemsEl.innerHTML = state.cart.map(item => `
        <div class="cart_item">
          <img src="${item.img}" alt="${item.name}" />
          <div class="cart_item_info">
            <div class="cart_item_name">${item.name}</div>
            <div class="cart_item_meta">${item.category}</div>
            <div class="qty_control">
              <button class="qty_btn" data-id="${item.id}" data-delta="-1">−</button>
              <span class="qty_num">${item.qty}</span>
              <button class="qty_btn" data-id="${item.id}" data-delta="1">+</button>
            </div>
            <button class="cart_remove" data-id="${item.id}">Remove</button>
          </div>
          <div class="cart_item_price">${formatPrice(item.price * item.qty)}</div>
        </div>`).join("");

      itemsEl.querySelectorAll(".qty_btn").forEach(b => {
        b.addEventListener("click", () => updateQty(parseInt(b.dataset.id), parseInt(b.dataset.delta)));
      });
      itemsEl.querySelectorAll(".cart_remove").forEach(b => {
        b.addEventListener("click", () => removeFromCart(parseInt(b.dataset.id)));
      });
    }
  }

  // ── Toast ─────────────────────────────────────────────────
  function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("visible");
    setTimeout(() => t.classList.remove("visible"), 2200);
  }

  // ── Paystack Checkout ─────────────────────────────────────
  // Wires up the "Proceed to Checkout" button in the cart drawer.
  // Sends the cart to initiate_payment.php which:
  //  1. Saves the order in the database
  //  2. Calls the Paystack API
  //  3. Returns a Paystack payment URL
  // Then this function redirects the user to that URL.
  async function initiatePayment() {
    if (state.cart.length === 0) {
      showToast('Your cart is empty.');
      return;
    }

    // Ask for email if user is not logged in
    // In production, get this from the session or a proper checkout form
    const email = prompt('Please enter your email address for the receipt:');
    if (!email || !email.includes('@')) {
      showToast('A valid email is required to proceed.');
      return;
    }

    const checkoutBtn = document.querySelector('.btn_checkout');
    if (checkoutBtn) {
      checkoutBtn.textContent = 'Processing…';
      checkoutBtn.disabled = true;
    }

    try {
      const res  = await fetch('/sweetfeet/api/initiate_payment.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ cart: state.cart, email })
      });

      const data = await res.json();

      if (data.success && data.payment_url) {
        // Redirect the browser to the Paystack payment page
        window.location.href = data.payment_url;
      } else {
        showToast(data.error || 'Could not start payment. Try again.');
        if (checkoutBtn) {
          checkoutBtn.textContent = 'Proceed to Checkout →';
          checkoutBtn.disabled = false;
        }
      }
    } catch (err) {
      showToast('Network error. Please check your connection.');
      if (checkoutBtn) {
        checkoutBtn.textContent = 'Proceed to Checkout →';
        checkoutBtn.disabled = false;
      }
      console.error(err);
    }
  }

  // ── Event wiring ──────────────────────────────────────────
  document.getElementById("searchInput").addEventListener("input", e => {
    state.search = e.target.value;
    renderGrid();
  });

  document.getElementById("sortSelect").addEventListener("change", e => {
    state.sort = e.target.value;
    renderGrid();
  });

  document.querySelectorAll(".cat_tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".cat_tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      state.cat = tab.dataset.cat;
      renderGrid();
    });
  });

  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const filter = chip.dataset.filter;
      document.querySelectorAll(`.chip[data-filter="${filter}"]`).forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state[filter] = chip.dataset.value;
      renderGrid();
    });
  });

  const priceSlider = document.getElementById("priceSlider");
  if (priceSlider) {
    priceSlider.addEventListener("input", () => {
      state.maxPrice = parseFloat(priceSlider.value);
      document.getElementById("priceLabel").textContent = `Up to ₦${priceSlider.value}`;
      renderGrid();
    });
  }

  // Cart drawer open/close
  const cartFab      = document.getElementById("cartFab");
  const cartDrawer   = document.getElementById("cartDrawer");
  const drawerClose  = document.getElementById("drawerClose");
  const drawerOverlay = document.getElementById("drawerOverlay");

  function openDrawer()  {
    cartDrawer.classList.add("open");
    drawerOverlay.classList.add("visible");
  }
  function closeDrawer() {
    cartDrawer.classList.remove("open");
    drawerOverlay.classList.remove("visible");
  }

  if (cartFab)       cartFab.addEventListener("click", openDrawer);
  if (drawerClose)   drawerClose.addEventListener("click", closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener("click", closeDrawer);

  // Wire the checkout button to Paystack
  // Replace the old onclick="alert(...)" with the real function
  const checkoutBtn = document.querySelector('.btn_checkout');
  if (checkoutBtn) {
    checkoutBtn.removeAttribute('onclick');
    checkoutBtn.addEventListener('click', initiatePayment);
  }

  // ── Init: load products from database ────────────────────
  loadProducts();

} // end shop page guard


/* ══════════════════════════════════════════════════════════
   LOGIN PAGE (login.html)
   Guard: #loginForm must exist
   ══════════════════════════════════════════════════════════ */

const loginFormEl = document.getElementById('loginForm');

if (loginFormEl) {
  const loginError = document.getElementById('loginError');

  loginFormEl.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn      = loginFormEl.querySelector('button[type="submit"]');

    btn.textContent = 'Logging in…';
    btn.disabled    = true;

    try {
      const res  = await fetch('/sweetfeet/api/login.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.success) {
        // Store basic user info in localStorage so the nav
        // can show "Logged in as..." without a server request
        localStorage.setItem('sf_user_email', data.email);
        localStorage.setItem('sf_user_id',    data.user_id);

        // Redirect to homepage after successful login
        window.location.href = '/sweetfeet/index.html';
      } else {
        if (loginError) {
          loginError.textContent = data.error || 'Login failed.';
          loginError.style.display = 'block';
        }
        btn.textContent = 'Login';
        btn.disabled    = false;
      }
    } catch (err) {
      if (loginError) {
        loginError.textContent = 'Network error. Please try again.';
        loginError.style.display = 'block';
      }
      btn.textContent = 'Login';
      btn.disabled    = false;
    }
  });
}


/* ══════════════════════════════════════════════════════════
   SIGN UP PAGE (signup.html)
   Guard: #signupForm must exist
   ══════════════════════════════════════════════════════════ */

const signupFormEl = document.getElementById('signupForm');

if (signupFormEl) {
  const signupError = document.getElementById('signupError');

  signupFormEl.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email    = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const btn      = signupFormEl.querySelector('button[type="submit"]');

    btn.textContent = 'Creating account…';
    btn.disabled    = true;

    try {
      const res  = await fetch('/sweetfeet/api/signup.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.success) {
        // Redirect to login page after successful registration
        window.location.href = '/sweetfeet/nav/login.html?registered=1';
      } else {
        if (signupError) {
          signupError.textContent = data.error || 'Sign up failed.';
          signupError.style.display = 'block';
        }
        btn.textContent = 'Sign Up';
        btn.disabled    = false;
      }
    } catch (err) {
      if (signupError) {
        signupError.textContent = 'Network error. Please try again.';
        signupError.style.display = 'block';
      }
      btn.textContent = 'Sign Up';
      btn.disabled    = false;
    }
  });

  // Show "Account created! Please log in." message if redirected
  // from signup with ?registered=1
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('registered') === '1') {
    const loginSuccessMsg = document.getElementById('loginSuccess');
    if (loginSuccessMsg) {
      loginSuccessMsg.textContent = 'Account created successfully. Please log in.';
      loginSuccessMsg.style.display = 'block';
    }
  }
}


/* ══════════════════════════════════════════════════════════
   FEEDBACK PAGE (feedback.html)
   Guard: #feedbackForm must exist
   ══════════════════════════════════════════════════════════ */

const feedbackFormEl = document.getElementById('feedbackForm');

if (feedbackFormEl) {
  feedbackFormEl.addEventListener('submit', async function (e) {
    e.preventDefault();

    const payload = {
      name:     document.getElementById('fb_name').value.trim(),
      email:    document.getElementById('fb_email').value.trim(),
      category: document.getElementById('fb_category').value,
      rating:   document.querySelector('input[name="rating"]:checked')?.value || null,
      message:  document.getElementById('fb_message').value.trim()
    };

    const btn = feedbackFormEl.querySelector('.fb_submit');
    btn.textContent = 'Sending…';
    btn.disabled    = true;

    try {
      const res  = await fetch('/sweetfeet/api/feedback.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        feedbackFormEl.style.display = 'none';
        const successEl = document.getElementById('fbSuccess');
        if (successEl) successEl.classList.remove('hidden');
      } else {
        btn.textContent = 'Send Feedback →';
        btn.disabled    = false;
        alert(data.error || 'Could not send feedback. Please try again.');
      }
    } catch (err) {
      btn.textContent = 'Send Feedback →';
      btn.disabled    = false;
      alert('Network error. Please check your connection.');
    }
  });
}


/* ══════════════════════════════════════════════════════════
   MOBILE NAV SIDEBAR (all pages with .nav_bar)
   Injects hamburger button and sidebar into the DOM.
   No HTML file needs to be changed.
   ══════════════════════════════════════════════════════════ */

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
      <img src="/sweetfeet/assets/images (7).jpeg" alt="Sweet Feet logo" />
      <span>Sweet Feet</span>
    </a>
    <a href="/sweetfeet/nav/signup.html">Sign Up</a>
    <a href="/sweetfeet/nav/login.html">Login</a>
    <a href="/sweetfeet/nav/products.html">Shop</a>
    <a href="/sweetfeet/nav/feedback.html">Feedback</a>
  `;

  navBar.appendChild(menuToggle);
  document.body.appendChild(navOverlay);
  document.body.appendChild(navSidebar);

  const currentPath = window.location.pathname;
  navSidebar.querySelectorAll("a:not(.sidebar_logo)").forEach(function (link) {
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

  menuToggle.addEventListener("click", () => {
    navSidebar.classList.contains("open") ? closeSidebar() : openSidebar();
  });

  navOverlay.addEventListener("click", closeSidebar);
  navSidebar.querySelectorAll("a").forEach(link => link.addEventListener("click", closeSidebar));
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeSidebar(); });

} // end nav sidebar guard
