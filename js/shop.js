/*
 * ============================================================
 *  Sweet Feet v2 — js/shop.js
 *  Shop page logic (nav/products.html).
 * ============================================================
 */

import { api, mapProduct, getToken, chatAppUrl, extractList } from "./api.js";

const FALLBACK_PRODUCTS = [
  { id: "sf-pro-grip", name: "Pro Grip Trainers", category: "trainers", gender: "unisex", price: 45000, oldPrice: 52000, rating: 4.3, ratingCount: 128, color: "black", badge: "top", badgeLabel: "TOP PICK", img: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800&q=80", sizes: [40, 41, 42, 43, 44], retailer_id: "lagos-kicks", retailerName: "Lagos Kicks Hub", retailerLocation: "Ikeja, Lagos", retailerLogo: "https://ui-avatars.com/api/?name=Lagos+Kicks&background=160c02&color=f7dfb8&size=128&bold=true" },
  { id: "sf-urban-runners", name: "Urban Street Runners", category: "runners", gender: "men", price: 38500, oldPrice: 42000, rating: 4.5, ratingCount: 86, color: "white", badge: "new", badgeLabel: "NEW", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80", sizes: [41, 42, 43, 44, 45], retailer_id: "lagos-kicks", retailerName: "Lagos Kicks Hub", retailerLocation: "Ikeja, Lagos", retailerLogo: "https://ui-avatars.com/api/?name=Lagos+Kicks&background=160c02&color=f7dfb8&size=128&bold=true" },
  { id: "sf-court-sneakers", name: "Classic Court Sneakers", category: "casual", gender: "unisex", price: 32000, oldPrice: 36000, rating: 4.1, ratingCount: 64, color: "white", badge: "top", badgeLabel: "TOP PICK", img: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80", sizes: [39, 40, 41, 42, 43], retailer_id: "lagos-kicks", retailerName: "Lagos Kicks Hub", retailerLocation: "Ikeja, Lagos", retailerLogo: "https://ui-avatars.com/api/?name=Lagos+Kicks&background=160c02&color=f7dfb8&size=128&bold=true" },
  { id: "sf-foam-runner", name: "Foam Runner Lite", category: "runners", gender: "unisex", price: 28000, oldPrice: 33000, rating: 4.2, ratingCount: 190, color: "multi", badge: "sale", badgeLabel: "SALE", img: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80", sizes: [39, 40, 41, 42, 43, 44], retailer_id: "lagos-kicks", retailerName: "Lagos Kicks Hub", retailerLocation: "Ikeja, Lagos", retailerLogo: "https://ui-avatars.com/api/?name=Lagos+Kicks&background=160c02&color=f7dfb8&size=128&bold=true" },
  { id: "sf-canvas-low", name: "Canvas Low-Top", category: "casual", gender: "unisex", price: 24500, oldPrice: null, rating: 4.0, ratingCount: 112, color: "white", badge: "", badgeLabel: "", img: "https://images.unsplash.com/photo-1463100099107-aa0980c362e6?w=800&q=80", sizes: [39, 40, 41, 42, 43], retailer_id: "lagos-kicks", retailerName: "Lagos Kicks Hub", retailerLocation: "Ikeja, Lagos", retailerLogo: "https://ui-avatars.com/api/?name=Lagos+Kicks&background=160c02&color=f7dfb8&size=128&bold=true" },
  { id: "sf-slide-sandals", name: "Slide Comfort Sandals", category: "sandals", gender: "women", price: 18500, oldPrice: null, rating: 4.4, ratingCount: 94, color: "brown", badge: "new", badgeLabel: "NEW", img: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&q=80", sizes: [36, 37, 38, 39, 40], retailer_id: "lagos-kicks", retailerName: "Lagos Kicks Hub", retailerLocation: "Ikeja, Lagos", retailerLogo: "https://ui-avatars.com/api/?name=Lagos+Kicks&background=160c02&color=f7dfb8&size=128&bold=true" },
  { id: "sf-oxford", name: "Classic Oxford", category: "corporate", gender: "men", price: 55000, oldPrice: null, rating: 4.8, ratingCount: 87, color: "brown", badge: "top", badgeLabel: "TOP PICK", img: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800&q=80", sizes: [40, 41, 42, 43, 44, 45], retailer_id: "abuja-style", retailerName: "Abuja Style Co", retailerLocation: "Wuse 2, Abuja", retailerLogo: "https://ui-avatars.com/api/?name=Abuja+Style&background=c8440c&color=fff&size=128&bold=true" },
  { id: "sf-everyday-loafers", name: "EverDay Loafers", category: "loafers", gender: "unisex", price: 38500, oldPrice: null, rating: 4.7, ratingCount: 302, color: "black", badge: "top", badgeLabel: "BEST SELLER", img: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&q=80", sizes: [38, 39, 40, 41, 42, 43], retailer_id: "abuja-style", retailerName: "Abuja Style Co", retailerLocation: "Wuse 2, Abuja", retailerLogo: "https://ui-avatars.com/api/?name=Abuja+Style&background=c8440c&color=fff&size=128&bold=true" },
  { id: "sf-derby-brogue", name: "Derby Brogue", category: "corporate", gender: "men", price: 62000, oldPrice: null, rating: 4.6, ratingCount: 43, color: "brown", badge: "new", badgeLabel: "NEW", img: "https://images.unsplash.com/photo-1582897085656-c636d006a246?w=800&q=80", sizes: [40, 41, 42, 43, 44], retailer_id: "abuja-style", retailerName: "Abuja Style Co", retailerLocation: "Wuse 2, Abuja", retailerLogo: "https://ui-avatars.com/api/?name=Abuja+Style&background=c8440c&color=fff&size=128&bold=true" },
  { id: "sf-chelsea-tan", name: "Chelsea Boot Tan", category: "boots", gender: "men", price: 72000, oldPrice: null, rating: 4.8, ratingCount: 31, color: "brown", badge: "new", badgeLabel: "NEW", img: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&q=80", sizes: [40, 41, 42, 43, 44, 45], retailer_id: "abuja-style", retailerName: "Abuja Style Co", retailerLocation: "Wuse 2, Abuja", retailerLogo: "https://ui-avatars.com/api/?name=Abuja+Style&background=c8440c&color=fff&size=128&bold=true" },
  { id: "sf-ankle-midnight", name: "Ankle Boot Midnight", category: "boots", gender: "women", price: 68000, oldPrice: 78000, rating: 4.9, ratingCount: 59, color: "black", badge: "sale", badgeLabel: "SALE", img: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80", sizes: [36, 37, 38, 39, 40, 41], retailer_id: "abuja-style", retailerName: "Abuja Style Co", retailerLocation: "Wuse 2, Abuja", retailerLogo: "https://ui-avatars.com/api/?name=Abuja+Style&background=c8440c&color=fff&size=128&bold=true" },
  { id: "sf-espadrille", name: "Espadrille Mule", category: "sandals", gender: "women", price: 22000, oldPrice: 28000, rating: 4.0, ratingCount: 77, color: "brown", badge: "sale", badgeLabel: "SALE", img: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80", sizes: [36, 37, 38, 39, 40], retailer_id: "abuja-style", retailerName: "Abuja Style Co", retailerLocation: "Wuse 2, Abuja", retailerLogo: "https://ui-avatars.com/api/?name=Abuja+Style&background=c8440c&color=fff&size=128&bold=true" },
];

export function formatPrice(p) {
  const n = Number(p) || 0;
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function initShop() {
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
      /* ignore */
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

  function featuredStock() {
    let list = FALLBACK_PRODUCTS.map((p) => ({ ...p, is_active: true, isActive: true }));
    if (retailerFilter) {
      list = list.filter((p) => String(p.retailer_id) === String(retailerFilter));
    }
    return list;
  }

  async function fetchLiveProducts() {
    const json = await api("/products", { timeoutMs: 8000, retries: 2 });
    const list = extractList(json);
    return (Array.isArray(list) ? list : []).map(mapProduct).filter(Boolean);
  }

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

    products = featuredStock();
    renderGrid();
    updateCartUI();

    try {
      const live = await fetchLiveProducts();
      if (live.length) {
        products = retailerFilter
          ? live.filter((p) => String(p.retailer_id) === String(retailerFilter))
          : live;
        if (retailerFilter) await applySellerChrome();
        renderGrid();
        updateCartUI();
      }
    } catch {
      /* featured stock already on screen */
    }
  }

  async function applySellerChrome() {
    let seller = null;
    try {
      const rJson = await api("/retailers/" + encodeURIComponent(retailerFilter), {
        timeoutMs: 8000,
        retries: 1,
      });
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
    return "★".repeat(full) + (half ? "☆" : "") + "☆".repeat(Math.max(0, 5 - full - half));
  }

  function escapeAttr(s) {
    return String(s ?? "")
      .replace(/&/g, "&")
      .replace(/"/g, """)
      .replace(/</g, "<");
  }

  function renderCard(p) {
    const profileUrl = `/nav/retailer.html?id=${encodeURIComponent(p.retailer_id || "")}`;
    const chatUrl = chatAppUrl({
      retailer_id: p.retailer_id,
      retailer_name: p.retailerName || "",
      product_id: p.id,
      product_name: p.name,
    });

    return `
      <article class="product_card" data-id="${escapeAttr(p.id)}">
        ${p.badge ? `<span class="card_badge badge_${escapeAttr(p.badge)}">${escapeAttr(p.badgeLabel)}</span>` : ""}
        <button class="card_wishlist" title="Save for later" type="button">♡</button>
        <img class="card_img" src="${escapeAttr(p.img)}" alt="${escapeAttr(p.name)}" loading="lazy" />
        <div class="card_body">
          <span class="card_category">${escapeAttr(p.category)} · ${escapeAttr(p.gender)}</span>
          <h2 class="card_name">${escapeAttr(p.name)}</h2>
          <div class="card_rating">
            <span class="stars">${stars(p.rating)}</span>
            <span>${p.rating} (${p.ratingCount})</span>
          </div>
          <div class="card_sizes">
            ${(p.sizes || []).map((s) => `<span class="size_dot" data-size="${escapeAttr(s)}">${escapeAttr(s)}</span>`).join("")}
          </div>
          <div class="card_footer">
            <div class="card_price">
              ${formatPrice(p.price)}
              ${p.oldPrice ? `<span class="old_price">${formatPrice(p.oldPrice)}</span>` : ""}
            </div>
            <button class="btn_order" type="button" data-id="${escapeAttr(p.id)}">Add to cart</button>
          </div>
          <a class="card_seller" href="${profileUrl}" title="View ${escapeAttr(p.retailerName || "seller")}">
            <img class="card_seller_avatar" src="${escapeAttr(p.retailerLogo)}" alt="" />
            <span class="card_seller_text">
              <span class="card_seller_by">Sold by</span>
              <span class="card_seller_name">${escapeAttr(p.retailerName || "Sweet Feet")}</span>
            </span>
          </a>
          <a class="btn_chat_link" href="${chatUrl}">Chat with seller</a>
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
    const existing = state.cart.find((i) => String(i.id) === String(id) && i.selectedSize === size);
    if (existing) existing.qty += 1;
    else state.cart.push({ ...p, qty: 1, selectedSize: size });
    updateCartUI();
    showToast(`${p.name} added to cart`);
  }

  function removeFromCart(id, size) {
    state.cart = state.cart.filter((i) => !(String(i.id) === String(id) && i.selectedSize === size));
    updateCartUI();
  }

  function updateQty(id, size, delta) {
    const item = state.cart.find((i) => String(i.id) === String(id) && i.selectedSize === size);
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
      itemsEl.innerHTML = "";
      if (emptyEl) {
        itemsEl.appendChild(emptyEl);
        emptyEl.style.display = "flex";
      }
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    itemsEl.innerHTML = state.cart
      .map(
        (item) => `
      <div class="cart_item">
        <img src="${item.img}" alt="${item.name}" />
        <div class="cart_item_info">
          <div class="cart_item_name">${item.name}</div>
          <div class="cart_item_meta">${item.retailerName || ""} · Size: ${item.selectedSize || "—"}</div>
          <div class="qty_control">
            <button class="qty_btn" data-id="${item.id}" data-size="${item.selectedSize}" data-delta="-1">−</button>
            <span class="qty_num">${item.qty}</span>
            <button class="qty_btn" data-id="${item.id}" data-size="${item.selectedSize}" data-delta="1">+</button>
          </div>
          <button class="cart_remove" data-id="${item.id}" data-size="${item.selectedSize}">Remove</button>
        </div>
        <div class="cart_item_price">${formatPrice(item.price * item.qty)}</div>
      </div>`
      )
      .join("");

    itemsEl.querySelectorAll(".qty_btn").forEach((b) => {
      b.addEventListener("click", () =>
        updateQty(b.dataset.id, b.dataset.size, parseInt(b.dataset.delta, 10))
      );
    });
    itemsEl.querySelectorAll(".cart_remove").forEach((b) => {
      b.addEventListener("click", () => removeFromCart(b.dataset.id, b.dataset.size));
    });
  }

  function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("visible");
    setTimeout(() => t.classList.remove("visible"), 2200);
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

    const email =
      prompt("Enter your email address for the receipt:") ||
      localStorage.getItem("sf_user_email") ||
      "";
    if (!email || !email.includes("@")) {
      showToast("A valid email is required to proceed.");
      return;
    }

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
      if (authUrl) {
        try {
          state.cart = [];
          saveCart();
        } catch { /* ignore */ }
        window.location.href = authUrl;
      } else {
        showToast("Order created. Complete payment when prompted.");
        if (btn) {
          btn.textContent = "Proceed to Checkout →";
          btn.disabled = false;
        }
      }
    } catch (e) {
      showToast(e.message || "Could not start payment.");
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

  const checkoutBtn = document.querySelector(".btn_checkout");
  if (checkoutBtn) {
    checkoutBtn.removeAttribute("onclick");
    checkoutBtn.addEventListener("click", initiatePayment);
  }

  loadProducts();
}
