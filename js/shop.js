/*
 * ============================================================
 *  Sweet Feet v2 — js/shop.js
 *  Shop page logic (nav/products.html).
 * ============================================================
 */

import { api, mapProduct, getToken, getUser, chatAppUrl } from "./api.js";

export function formatPrice(p) {
  const n = Number(p) || 0;
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function initShop() {
  // Retailer portal has its own #productGrid (My Products). Never mix in other sellers.
  if (/\/retailer\//.test(window.location.pathname)) return;

  const productGrid = document.getElementById("productGrid");
  if (!productGrid) return;

  let products = [];
  const params = new URLSearchParams(window.location.search);
  const retailerFilter = params.get("id") || params.get("retailer") || params.get("retailer_id");
  const isSellerPage = /retailer\.html/i.test(window.location.pathname);

  const CART_KEY = "sf_cart";

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    } catch {
      /* quota / private mode */
    }
  }

  const state = {
    cat: "all",
    search: "",
    sort: "default",
    maxPrice: 150000,
    gender: "all",
    color: "all",
    rating: "all",
    cart: loadCart(),
  };

  async function loadProducts() {
    if (isSellerPage && !retailerFilter) {
      products = [];
      const title = document.getElementById("shopHeroTitle");
      const sub = document.getElementById("shopHeroSub");
      if (title) title.innerHTML = `Choose a <span>seller.</span>`;
      if (sub) sub.textContent = "Open a store from the shop to see that retailer’s products only.";
      renderGrid();
      return;
    }
    try {
      const json = await api("/products");
      const list = json.data || json.results || json || [];
      products = (Array.isArray(list) ? list : []).map(mapProduct).filter(Boolean);
      if (retailerFilter) {
        products = products.filter((p) => String(p.retailer_id) === String(retailerFilter));
        await applySellerChrome();
      }
      renderGrid();
      updateCartUI();
    } catch {
      showToast("Network error loading products.");
    }
  }

  async function applySellerChrome() {
    let seller = null;
    try {
      const rJson = await api("/retailers/" + encodeURIComponent(retailerFilter));
      seller = rJson.data || null;
    } catch {
      /* banner still works from product data */
    }
    const name = seller?.businessName || products[0]?.retailerName || "Seller";
    const title = document.getElementById("shopHeroTitle");
    const sub = document.getElementById("shopHeroSub");
    const count = document.querySelector(".hero_count");
    if (title) title.innerHTML = `${name}'s <span>shop.</span>`;
    if (sub) {
      const loc = seller?.location || "";
      const n = products.length;
      const countLabel = `${n} product${n === 1 ? "" : "s"} from this seller only.`;
      sub.textContent = loc ? `${loc} · ${countLabel}` : countLabel;
    }
    if (count) count.textContent = String(products.length);
    document.title = `${name} — Sweet Feet`;
    const chatBtn = document.getElementById("sellerChatBtn");
    if (chatBtn) {
      const href = chatAppUrl({
        retailer_id: retailerFilter,
        retailer_name: name,
      });
      chatBtn.href = href;
      chatBtn.hidden = false;
      chatBtn.addEventListener("click", (e) => {
        if (!getToken()) {
          e.preventDefault();
          window.location.href = "/nav/login.html?next=" + encodeURIComponent(href);
        }
      });
    }
  }

  function stars(r) {
    const full = Math.floor(r);
    const half = r - full >= 0.5 ? 1 : 0;
    return "★".repeat(full) + (half ? "☆" : "") + "☆".repeat(5 - full - half);
  }

  function renderCard(p) {
    const profileUrl = `/nav/retailer.html?id=${encodeURIComponent(p.retailer_id)}`;
    const chatUrl = chatAppUrl({
      retailer_id: p.retailer_id,
      retailer_name: p.retailerName || "",
      product_id: p.id,
      product_name: p.name,
    });

    return `
      <article class="product_card" data-id="${p.id}">
        ${p.badge ? `<span class="card_badge badge_${p.badge}">${p.badgeLabel}</span>` : ""}
        <button class="card_wishlist" title="Save for later" type="button">♡</button>
        <img class="card_img" src="${p.img}" alt="${p.name}" loading="lazy" />
        <div class="card_body">
          <span class="card_category">${p.category} · ${p.gender}</span>
          <h2 class="card_name">${p.name}</h2>
          <div class="card_rating">
            <span class="stars">${stars(p.rating)}</span>
            <span>${p.rating} (${p.ratingCount})</span>
          </div>
          <div class="card_sizes">
            ${(p.sizes || []).map((s) => `<span class="size_dot" data-size="${s}">${s}</span>`).join("")}
          </div>
          <div class="card_footer">
            <div class="card_price">
              ${formatPrice(p.price)}
              ${p.oldPrice ? `<span class="old_price">${formatPrice(p.oldPrice)}</span>` : ""}
            </div>
            <button class="btn_order" type="button" data-id="${p.id}">Add to cart</button>
          </div>
          <a class="card_seller" href="${profileUrl}" title="View ${p.retailerName || "seller"}">
            <img class="card_seller_avatar" src="${p.retailerLogo}" alt="" />
            <span class="card_seller_text">
              <span class="card_seller_by">Sold by</span>
              <span class="card_seller_name">${p.retailerName || "Sweet Feet"}</span>
            </span>
          </a>
          <a class="btn_chat_link" href="${chatUrl}">💬 Chat with seller</a>
        </div>
      </article>`;
  }

  function getFiltered() {
    let list = [...products];
    if (state.cat !== "all") list = list.filter((p) => p.category === state.cat);
    if (state.gender !== "all")
      list = list.filter((p) => p.gender === state.gender || p.gender === "unisex");
    if (state.color !== "all") list = list.filter((p) => p.color === state.color);
    if (state.rating !== "all") list = list.filter((p) => p.rating >= parseFloat(state.rating));
    list = list.filter((p) => p.price <= state.maxPrice);
    if (state.search) {
      const q = state.search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q)
      );
    }
    if (state.sort === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (state.sort === "price_desc") list.sort((a, b) => b.price - a.price);
    else if (state.sort === "rating") list.sort((a, b) => b.rating - a.rating);
    else if (state.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }

  function renderGrid() {
    const list = getFiltered();
    const emptyEl = document.getElementById("emptyState");
    const countEl = document.getElementById("resultCount");
    if (countEl) countEl.textContent = `${list.length} product${list.length !== 1 ? "s" : ""}`;
    if (list.length === 0) {
      productGrid.innerHTML = "";
      if (emptyEl) {
        emptyEl.classList.add("visible");
        if (retailerFilter) {
          const p = emptyEl.querySelector("p");
          if (p) p.textContent = "This seller has no products listed yet.";
        }
      }
      return;
    }
    if (emptyEl) emptyEl.classList.remove("visible");
    productGrid.innerHTML = list.map(renderCard).join("");

    productGrid.querySelectorAll(".size_dot").forEach((dot) => {
      dot.addEventListener("click", () => {
        dot.closest(".card_sizes").querySelectorAll(".size_dot").forEach((d) => d.classList.remove("selected"));
        dot.classList.add("selected");
      });
    });

    productGrid.querySelectorAll(".btn_order").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest(".product_card");
        const selectedDot = card.querySelector(".size_dot.selected");
        const size = selectedDot ? selectedDot.dataset.size : null;
        addToCart(btn.dataset.id, size);
      });
    });
  }

  function addToCart(id, size) {
    const p = products.find((x) => String(x.id) === String(id));
    if (!p) return;
    const sizeKey = cartSizeKey(size);
    const existing = state.cart.find((i) => sameCartLine(i, id, sizeKey));
    if (existing) existing.qty += 1;
    else state.cart.push({ ...p, qty: 1, selectedSize: sizeKey || null });
    updateCartUI();
    showToast(`${p.name} added to cart`);
  }

  function cartSizeKey(s) {
    if (s == null || s === "" || s === "null" || s === "undefined" || s === "—") return "";
    return String(s);
  }

  function sameCartLine(item, id, size) {
    return String(item.id) === String(id) && cartSizeKey(item.selectedSize) === cartSizeKey(size);
  }

  function removeFromCart(id, size) {
    const before = state.cart.length;
    state.cart = state.cart.filter((i) => !sameCartLine(i, id, size));
    if (state.cart.length === before) {
      const matches = state.cart.filter((i) => String(i.id) === String(id));
      if (matches.length === 1) {
        state.cart = state.cart.filter((i) => String(i.id) !== String(id));
      }
    }
    updateCartUI();
  }

  function updateQty(id, size, delta) {
    const item = state.cart.find((i) => sameCartLine(i, id, size));
    if (!item) return;
    item.qty += delta;
    if (item.qty < 1) {
      removeFromCart(id, size);
      return;
    }
    updateCartUI();
  }

  function updateCartUI() {
    saveCart();
    const total = state.cart.reduce((s, i) => s + i.qty, 0);
    const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
    const countEl = document.getElementById("cartCount");
    const subtotalEl = document.getElementById("subtotalAmount");
    const itemsEl = document.getElementById("drawerItems");
    const emptyEl = document.getElementById("drawerEmpty");

    if (countEl) {
      countEl.textContent = total;
      countEl.classList.toggle("hidden", total === 0);
    }
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (!itemsEl) return;

    if (state.cart.length === 0) {
      itemsEl.innerHTML = `
        <div class="drawer_empty" id="drawerEmpty" style="display:flex">
          <span class="empty_icon">🛒</span>
          <p>Your cart is empty.</p>
          <p style="font-size:.8rem;color:var(--clr-muted)">Add a pair to get started.</p>
        </div>`;
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    itemsEl.innerHTML = state.cart
      .map((item) => {
        const sizeAttr = cartSizeKey(item.selectedSize);
        return `
      <div class="cart_item">
        <img src="${item.img}" alt="${item.name}" />
        <div class="cart_item_info">
          <div class="cart_item_name">${item.name}</div>
          <div class="cart_item_meta">${item.retailerName || ""} · Size: ${sizeAttr || "—"}</div>
          <div class="qty_control">
            <button type="button" class="qty_btn" data-id="${item.id}" data-size="${sizeAttr}" data-delta="-1">−</button>
            <span class="qty_num">${item.qty}</span>
            <button type="button" class="qty_btn" data-id="${item.id}" data-size="${sizeAttr}" data-delta="1">+</button>
          </div>
          <button type="button" class="cart_remove" data-id="${item.id}" data-size="${sizeAttr}">Remove</button>
        </div>
        <div class="cart_item_price">${formatPrice(item.price * item.qty)}</div>
      </div>`;
      })
      .join("");

    bindCartControls();
  }

  function bindCartControls() {
    const itemsEl = document.getElementById("drawerItems");
    if (!itemsEl || itemsEl.dataset.bound === "1") return;
    itemsEl.dataset.bound = "1";
    itemsEl.addEventListener("click", (e) => {
      const qty = e.target.closest(".qty_btn");
      if (qty) {
        e.preventDefault();
        e.stopPropagation();
        updateQty(qty.dataset.id, qty.dataset.size, parseInt(qty.dataset.delta, 10));
        return;
      }
      const rm = e.target.closest(".cart_remove");
      if (rm) {
        e.preventDefault();
        e.stopPropagation();
        removeFromCart(rm.dataset.id, rm.dataset.size);
      }
    });
  }

  function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("visible");
    setTimeout(() => t.classList.remove("visible"), 2200);
  }

  function injectCheckoutModal() {
    if (document.getElementById("sfCheckoutModal")) return;
    const style = document.createElement("style");
    style.textContent = `
      .sf_checkout_modal{position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center}
      .sf_checkout_modal[hidden]{display:none!important}
      .sf_checkout_backdrop{position:absolute;inset:0;background:rgba(22,12,2,.55)}
      .sf_checkout_card{position:relative;background:#fff;border-radius:16px;padding:2.2rem;width:min(32rem,92vw);box-shadow:0 16px 40px rgba(22,12,2,.25)}
      .sf_checkout_card h3{font-size:1.4rem;margin:0 0 .4rem;color:#160c02}
      .sf_checkout_card p{font-size:.9rem;color:#6d5f49;margin:0 0 1.1rem;line-height:1.45}
      .sf_checkout_card label{display:block;font-size:.8rem;font-weight:700;margin-bottom:.4rem;color:#160c02}
      .sf_checkout_card input{width:100%;box-sizing:border-box;padding:.85rem 1rem;border:1.5px solid #e8dcc8;border-radius:10px;font-size:.95rem}
      .sf_checkout_actions{display:flex;gap:.6rem;margin-top:1.2rem}
      .sf_checkout_actions button{flex:1;padding:.75rem 1rem;border-radius:10px;font-weight:700;cursor:pointer;font-size:.9rem}
      .sf_checkout_cancel{background:transparent;border:1.5px solid #160c02;color:#160c02}
      .sf_checkout_go{background:#160c02;border:none;color:#f7dfb8}
      .sf_checkout_err{color:#b00020;font-size:.8rem;font-weight:600;margin-top:.5rem;min-height:1.1em}
    `;
    document.head.appendChild(style);
    const wrap = document.createElement("div");
    wrap.id = "sfCheckoutModal";
    wrap.className = "sf_checkout_modal";
    wrap.hidden = true;
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "sfCheckoutTitle");
    wrap.innerHTML = `
      <div class="sf_checkout_backdrop" data-close></div>
      <div class="sf_checkout_card">
        <h3 id="sfCheckoutTitle">Receipt email</h3>
        <p>Paystack will send the payment receipt to this address.</p>
        <label for="sfCheckoutEmail">Email address</label>
        <input id="sfCheckoutEmail" type="email" autocomplete="email" placeholder="you@example.com" />
        <div class="sf_checkout_err" id="sfCheckoutErr"></div>
        <div class="sf_checkout_actions">
          <button type="button" class="sf_checkout_cancel" data-close>Cancel</button>
          <button type="button" class="sf_checkout_go" id="sfCheckoutGo">Continue to payment</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
  }

  function askReceiptEmail() {
    injectCheckoutModal();
    const modal = document.getElementById("sfCheckoutModal");
    const input = document.getElementById("sfCheckoutEmail");
    const err = document.getElementById("sfCheckoutErr");
    const user = getUser();
    input.value = (user && user.email) || localStorage.getItem("sf_user_email") || "";
    err.textContent = "";
    modal.hidden = false;
    setTimeout(() => input.focus(), 40);

    return new Promise((resolve) => {
      const goBtn = document.getElementById("sfCheckoutGo");
      function close(value) {
        modal.hidden = true;
        modal.removeEventListener("click", onClick);
        goBtn.removeEventListener("click", onGo);
        input.removeEventListener("keydown", onKey);
        resolve(value);
      }
      function onClick(e) {
        if (e.target.closest("[data-close]")) close(null);
      }
      function onGo() {
        const email = String(input.value || "").trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          err.textContent = "Enter a valid email address.";
          input.focus();
          return;
        }
        try { localStorage.setItem("sf_user_email", email); } catch { /* ignore */ }
        close(email);
      }
      function onKey(e) {
        if (e.key === "Enter") { e.preventDefault(); onGo(); }
        if (e.key === "Escape") close(null);
      }
      modal.addEventListener("click", onClick);
      goBtn.addEventListener("click", onGo);
      input.addEventListener("keydown", onKey);
    });
  }

  async function initiatePayment() {
    if (state.cart.length === 0) {
      showToast("Your cart is empty.");
      return;
    }
    if (!getToken()) {
      showToast("Please log in to checkout.");
      window.location.href =
        "/nav/login.html?next=" + encodeURIComponent(window.location.pathname + window.location.search);
      return;
    }

    const email = await askReceiptEmail();
    if (!email) return;

    const btn = document.querySelector(".btn_checkout");
    if (btn) {
      btn.textContent = "Processing…";
      btn.disabled = true;
    }

    try {
      const items = state.cart.map((i) => ({
        productId: i.id,
        quantity: i.qty,
        size: i.selectedSize,
      }));
      const json = await api("/orders", {
        method: "POST",
        body: {
          items,
          email,
          callbackUrl: window.location.origin + "/nav/track.html",
        },
      });
      const authUrl = json.data?.authorization_url || json.authorization_url;
      const reference = json.data?.reference || json.reference;
      const order = json.data?.order;
      if (authUrl) {
        try {
          sessionStorage.setItem(
            "sf_pending_pay",
            JSON.stringify({
              reference,
              orderId: order?._id || order?.id || "",
              at: Date.now(),
            })
          );
        } catch { /* ignore */ }
        // Keep the cart until Paystack verifies on the track page.
        window.location.href = authUrl;
        return;
      }
      showToast("Payment could not be started. Paystack is not configured on the server.");
    } catch (e) {
      showToast(e.message || "Could not start payment.");
    } finally {
      if (btn) {
        btn.textContent = "Proceed to Checkout →";
        btn.disabled = false;
      }
    }
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.search = e.target.value;
      renderGrid();
    });
  }

  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      state.sort = e.target.value;
      renderGrid();
    });
  }

  document.querySelectorAll(".cat_tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".cat_tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.cat = tab.dataset.cat;
      renderGrid();
    });
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const filter = chip.dataset.filter;
      document.querySelectorAll(`.chip[data-filter="${filter}"]`).forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state[filter] = chip.dataset.value;
      renderGrid();
    });
  });

  const priceSlider = document.getElementById("priceSlider");
  if (priceSlider) {
    priceSlider.addEventListener("input", () => {
      state.maxPrice = parseFloat(priceSlider.value);
      const label = document.getElementById("priceLabel");
      if (label) label.textContent = `Up to ₦${Number(priceSlider.value).toLocaleString("en-NG")}`;
      renderGrid();
    });
  }

  const cartFab = document.getElementById("cartFab");
  const cartDrawer = document.getElementById("cartDrawer");
  const drawerClose = document.getElementById("drawerClose");
  const drawerOverlay = document.getElementById("drawerOverlay");

  function openDrawer() {
    cartDrawer?.classList.add("open");
    drawerOverlay?.classList.add("visible");
  }
  function closeDrawer() {
    cartDrawer?.classList.remove("open");
    drawerOverlay?.classList.remove("visible");
  }

  cartFab?.addEventListener("click", openDrawer);
  drawerClose?.addEventListener("click", closeDrawer);
  drawerOverlay?.addEventListener("click", closeDrawer);
  bindCartControls();

  const checkoutBtn = document.querySelector(".btn_checkout");
  if (checkoutBtn) {
    checkoutBtn.removeAttribute("onclick");
    checkoutBtn.addEventListener("click", initiatePayment);
  }

  loadProducts();
}
