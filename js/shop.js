/*
 * ============================================================
 *  Sweet Feet v2 — js/shop.js
 *  Shop page logic only (nav/products.html).
 *
 *  Handles:
 *    - Fetching products from the TypeScript API
 *    - Comfort-based filtering and sorting
 *    - Product card rendering with retailer info + chat button
 *    - Size dot selection
 *    - Cart management (add, remove, update quantity)
 *    - Cart drawer open/close
 *    - Paystack checkout initiation
 *    - Toast notifications
 *
 *  Guard: exits immediately if #productGrid is not on the page.
 *
 *  Exports:
 *    initShop()     — called by main.js
 *    formatPrice()  — shared utility used by chat.js
 * ============================================================
 */

// ── Shared utility — exported so other modules can use it ───
export function formatPrice(p) {
  return `₦${parseFloat(p).toFixed(2)}`;
}

export function initShop() {

  const productGrid = document.getElementById("productGrid");
  if (!productGrid) return; // guard — not on shop page

  // ── State ───────────────────────────────────────────────
  let products = [];

  const state = {
    cat:      "all",
    search:   "",
    sort:     "default",
    maxPrice: 50,
    gender:   "all",
    color:    "all",
    rating:   "all",
    cart:     []
  };

  // ── Fetch products from API ──────────────────────────────
  async function loadProducts() {
    try {
      const res  = await fetch("/sweetfeet/api/products");
      const data = await res.json();

      if (Array.isArray(data)) {
        products = data;
        renderGrid();
        updateCartUI();
      } else {
        showToast("Could not load products. Please refresh.");
      }
    } catch {
      showToast("Network error loading products.");
    }
  }

  // ── Star display helper ──────────────────────────────────
  function stars(r) {
    const full = Math.floor(r);
    const half = r - full >= 0.5 ? 1 : 0;
    return "★".repeat(full) + (half ? "☆" : "") + "☆".repeat(5 - full - half);
  }

  // ── Render a single product card ─────────────────────────
  // Includes retailer strip and chat button — new in v2
  function renderCard(p) {
    const chatUrl = `/sweetfeet/nav/chat.html`
      + `?retailer_id=${p.retailer_id}`
      + `&retailer_name=${encodeURIComponent(p.retailerName || "")}`
      + `&product_id=${p.id}`;

    return `
      <article class="product_card" data-id="${p.id}">
        ${p.badge
          ? `<span class="card_badge badge_${p.badge}">${p.badgeLabel}</span>`
          : ""}
        <button class="card_wishlist" title="Save for later">♡</button>
        <img class="card_img" src="${p.img}" alt="${p.name}" loading="lazy" />

        <div class="card_body">

          <!-- Retailer info strip -->
          <div class="card_retailer">
            <div>
              <div class="card_retailer_name">
                ${p.retailerName || "Sweet Feet"}
              </div>
              <div class="card_retailer_loc">
                ${p.retailerLocation || ""}
              </div>
            </div>
            <a class="btn_chat" href="${chatUrl}">💬 Chat</a>
          </div>

          <span class="card_category">${p.category} · ${p.gender}</span>
          <h2 class="card_name">${p.name}</h2>

          <div class="card_rating">
            <span class="stars">${stars(p.rating)}</span>
            <span>${p.rating} (${p.ratingCount})</span>
          </div>

          <div class="card_sizes">
            ${p.sizes.map(s =>
              `<span class="size_dot" data-size="${s}">${s}</span>`
            ).join("")}
          </div>

          <div class="card_footer">
            <div class="card_price">
              ${formatPrice(p.price)}
              ${p.oldPrice
                ? `<span class="old_price">${formatPrice(p.oldPrice)}</span>`
                : ""}
            </div>
            <button class="btn_order" data-id="${p.id}">
              Add to cart
            </button>
          </div>

        </div>
      </article>`;
  }

  // ── Filter + sort ────────────────────────────────────────
  function getFiltered() {
    let list = [...products];

    if (state.cat    !== "all") list = list.filter(p => p.category === state.cat);
    if (state.gender !== "all") list = list.filter(p => p.gender === state.gender || p.gender === "unisex");
    if (state.color  !== "all") list = list.filter(p => p.color   === state.color);
    if (state.rating !== "all") list = list.filter(p => p.rating  >= parseFloat(state.rating));

    list = list.filter(p => p.price <= state.maxPrice);

    if (state.search) {
      const q = state.search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    if      (state.sort === "price_asc")  list.sort((a, b) => a.price - b.price);
    else if (state.sort === "price_desc") list.sort((a, b) => b.price - a.price);
    else if (state.sort === "rating")     list.sort((a, b) => b.rating - a.rating);
    else if (state.sort === "name")       list.sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }

  // ── Render product grid ──────────────────────────────────
  function renderGrid() {
    const list    = getFiltered();
    const emptyEl = document.getElementById("emptyState");
    const countEl = document.getElementById("resultCount");

    if (countEl) {
      countEl.textContent = `${list.length} product${list.length !== 1 ? "s" : ""}`;
    }

    if (list.length === 0) {
      productGrid.innerHTML = "";
      if (emptyEl) emptyEl.classList.add("visible");
      return;
    }

    if (emptyEl) emptyEl.classList.remove("visible");
    productGrid.innerHTML = list.map(renderCard).join("");

    // Size dot selection
    productGrid.querySelectorAll(".size_dot").forEach(dot => {
      dot.addEventListener("click", () => {
        dot.closest(".card_sizes")
           .querySelectorAll(".size_dot")
           .forEach(d => d.classList.remove("selected"));
        dot.classList.add("selected");
      });
    });

    // Add to cart buttons
    productGrid.querySelectorAll(".btn_order").forEach(btn => {
      btn.addEventListener("click", () => {
        const card        = btn.closest(".product_card");
        const selectedDot = card.querySelector(".size_dot.selected");
        const size        = selectedDot ? selectedDot.dataset.size : null;
        addToCart(parseInt(btn.dataset.id), size);
      });
    });
  }

  // ── Cart — add ───────────────────────────────────────────
  function addToCart(id, size) {
    const p        = products.find(p => p.id === id);
    if (!p) return;

    const existing = state.cart.find(
      i => i.id === id && i.selectedSize === size
    );

    if (existing) {
      existing.qty += 1;
    } else {
      state.cart.push({ ...p, qty: 1, selectedSize: size });
    }

    updateCartUI();
    showToast(`${p.name} added to cart`);
  }

  // ── Cart — remove ────────────────────────────────────────
  function removeFromCart(id, size) {
    state.cart = state.cart.filter(
      i => !(i.id === id && i.selectedSize === size)
    );
    updateCartUI();
  }

  // ── Cart — update quantity ───────────────────────────────
  function updateQty(id, size, delta) {
    const item = state.cart.find(
      i => i.id === id && i.selectedSize === size
    );
    if (!item) return;

    item.qty += delta;
    if (item.qty < 1) { removeFromCart(id, size); return; }
    updateCartUI();
  }

  // ── Cart — update drawer UI ──────────────────────────────
  function updateCartUI() {
    const total    = state.cart.reduce((s, i) => s + i.qty, 0);
    const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);

    const countEl    = document.getElementById("cartCount");
    const subtotalEl = document.getElementById("subtotalAmount");
    const itemsEl    = document.getElementById("drawerItems");
    const emptyEl    = document.getElementById("drawerEmpty");

    if (countEl) {
      countEl.textContent = total;
      countEl.classList.toggle("hidden", total === 0);
    }
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (!itemsEl)   return;

    if (state.cart.length === 0) {
      itemsEl.innerHTML = "";
      if (emptyEl) { itemsEl.appendChild(emptyEl); emptyEl.style.display = "flex"; }
      return;
    }

    if (emptyEl) emptyEl.style.display = "none";

    itemsEl.innerHTML = state.cart.map(item => `
      <div class="cart_item">
        <img src="${item.img}" alt="${item.name}" />
        <div class="cart_item_info">
          <div class="cart_item_name">${item.name}</div>
          <div class="cart_item_meta">
            ${item.retailerName || ""} · Size: ${item.selectedSize || "—"}
          </div>
          <div class="qty_control">
            <button class="qty_btn"
              data-id="${item.id}"
              data-size="${item.selectedSize}"
              data-delta="-1">−</button>
            <span class="qty_num">${item.qty}</span>
            <button class="qty_btn"
              data-id="${item.id}"
              data-size="${item.selectedSize}"
              data-delta="1">+</button>
          </div>
          <button class="cart_remove"
            data-id="${item.id}"
            data-size="${item.selectedSize}">Remove</button>
        </div>
        <div class="cart_item_price">
          ${formatPrice(item.price * item.qty)}
        </div>
      </div>`).join("");

    itemsEl.querySelectorAll(".qty_btn").forEach(b => {
      b.addEventListener("click", () =>
        updateQty(
          parseInt(b.dataset.id),
          b.dataset.size,
          parseInt(b.dataset.delta)
        )
      );
    });

    itemsEl.querySelectorAll(".cart_remove").forEach(b => {
      b.addEventListener("click", () =>
        removeFromCart(parseInt(b.dataset.id), b.dataset.size)
      );
    });
  }

  // ── Toast notification ───────────────────────────────────
  function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("visible");
    setTimeout(() => t.classList.remove("visible"), 2200);
  }

  // ── Paystack checkout ────────────────────────────────────
  async function initiatePayment() {
    if (state.cart.length === 0) {
      showToast("Your cart is empty.");
      return;
    }

    const email = prompt("Enter your email address for the receipt:");
    if (!email || !email.includes("@")) {
      showToast("A valid email is required to proceed.");
      return;
    }

    const btn = document.querySelector(".btn_checkout");
    if (btn) { btn.textContent = "Processing…"; btn.disabled = true; }

    try {
      const res  = await fetch("/sweetfeet/api/orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ cart: state.cart, email })
      });
      const data = await res.json();

      if (data.success && data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        showToast(data.error || "Could not start payment. Try again.");
        if (btn) { btn.textContent = "Proceed to Checkout →"; btn.disabled = false; }
      }
    } catch {
      showToast("Network error. Please check your connection.");
      if (btn) { btn.textContent = "Proceed to Checkout →"; btn.disabled = false; }
    }
  }

  // ── Event wiring ─────────────────────────────────────────

  // Search
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      state.search = e.target.value;
      renderGrid();
    });
  }

  // Sort
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", e => {
      state.sort = e.target.value;
      renderGrid();
    });
  }

  // Category tabs
  document.querySelectorAll(".cat_tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".cat_tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      state.cat = tab.dataset.cat;
      renderGrid();
    });
  });

  // Filter chips
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const filter = chip.dataset.filter;
      document.querySelectorAll(`.chip[data-filter="${filter}"]`)
        .forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state[filter] = chip.dataset.value;
      renderGrid();
    });
  });

  // Price slider
  const priceSlider = document.getElementById("priceSlider");
  if (priceSlider) {
    priceSlider.addEventListener("input", () => {
      state.maxPrice = parseFloat(priceSlider.value);
      const label = document.getElementById("priceLabel");
      if (label) label.textContent = `Up to ₦${priceSlider.value}`;
      renderGrid();
    });
  }

  // Cart drawer
  const cartFab       = document.getElementById("cartFab");
  const cartDrawer    = document.getElementById("cartDrawer");
  const drawerClose   = document.getElementById("drawerClose");
  const drawerOverlay = document.getElementById("drawerOverlay");

  function openDrawer() {
    if (cartDrawer)    cartDrawer.classList.add("open");
    if (drawerOverlay) drawerOverlay.classList.add("visible");
  }
  function closeDrawer() {
    if (cartDrawer)    cartDrawer.classList.remove("open");
    if (drawerOverlay) drawerOverlay.classList.remove("visible");
  }

  if (cartFab)       cartFab.addEventListener("click", openDrawer);
  if (drawerClose)   drawerClose.addEventListener("click", closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener("click", closeDrawer);

  // Checkout button
  const checkoutBtn = document.querySelector(".btn_checkout");
  if (checkoutBtn) {
    checkoutBtn.removeAttribute("onclick");
    checkoutBtn.addEventListener("click", initiatePayment);
  }

  // ── Init ─────────────────────────────────────────────────
  loadProducts();
}
