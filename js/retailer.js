/*
 * ============================================================
 *  Sweet Feet v2 — js/retailer.js
 *  Retailer + admin pages. Uses TypeScript API (not PHP /API).
 * ============================================================
 */

import { api, mapProduct, setSession, getToken, confirmAndLogout, sfAlert, escapeHtml } from "./api.js";

export function initRetailer() {
  const sidebar = document.querySelector(".sidebar_nav");
  const main = document.querySelector(".main_content");
  if (sidebar && main && !main.querySelector(".mobile_topbar")) {
    const bar = document.createElement("div");
    bar.className = "mobile_topbar";
    const links = [...sidebar.querySelectorAll(".sidebar_link")]
      .map((a) => {
        const href = a.getAttribute("href") || "#";
        const active = a.classList.contains("active") ? " active" : "";
        const label = (a.textContent || "").replace(/\s+/g, " ").trim();
        return `<a class="${active.trim()}" href="${href}">${label}</a>`;
      })
      .join("");
    bar.innerHTML = `
      <a class="sidebar_logo" href="/index.html">
        <img src="/assets/images (7).jpeg" alt="Sweet Feet" />
        <span>Sweet Feet</span>
      </a>
      <nav class="mobile_nav">${links}</nav>
    `;
    main.prepend(bar);
  }

  function fmtDate(d) {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function requireRetailer() {
    if (!localStorage.getItem("sf_retailer_name") || !getToken()) {
      window.location.href = "/nav/login.html?role=retailer";
      return false;
    }
    return true;
  }

  async function doLogout(redirectUrl) {
    await confirmAndLogout(redirectUrl || "/nav/login.html?role=retailer");
  }

  // ── Retailer Signup ──────────────────────────────────────
  const signupForm = document.getElementById("retailerSignupForm");
  if (signupForm) {
    const errorEl = document.getElementById("msgError");
    const successEl = document.getElementById("msgSuccess");
    const submitBtn = document.getElementById("submitBtn");

    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (errorEl) errorEl.style.display = "none";
      if (successEl) successEl.style.display = "none";
      submitBtn.textContent = "Submitting…";
      submitBtn.disabled = true;

      const payload = {
        businessName: document.getElementById("business_name").value.trim(),
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value,
        passwordConfirm: document.getElementById("password").value,
        phone: document.getElementById("phone").value.trim(),
        location: document.getElementById("location").value.trim(),
        bio: document.getElementById("bio").value.trim(),
      };

      try {
        const data = await api("/auth/retailer/register", { method: "POST", body: payload });
        setSession(data.token, data.data, "retailer");
        signupForm.style.display = "none";
        document.getElementById("signupFormWrap")?.style && (document.getElementById("signupFormWrap").style.display = "none");
        const pending = document.getElementById("pendingPanel");
        if (pending) pending.classList.add("visible");
        if (successEl) {
          successEl.textContent =
            "Registration submitted. You can log in once approved (or immediately if auto-approved).";
          successEl.style.display = "block";
        }
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message || "Registration failed";
          errorEl.style.display = "block";
        }
        submitBtn.textContent = "Submit Registration →";
        submitBtn.disabled = false;
      }
    });
  }

  // ── Retailer Login ───────────────────────────────────────
  const loginForm = document.getElementById("retailerLoginForm");
  if (loginForm) {
    const errorEl = document.getElementById("msgError");
    const submitBtn = document.getElementById("submitBtn");

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (errorEl) errorEl.style.display = "none";
      submitBtn.textContent = "Logging in…";
      submitBtn.disabled = true;

      try {
        const data = await api("/auth/retailer/login", {
          method: "POST",
          body: {
            email: document.getElementById("email").value.trim(),
            password: document.getElementById("password").value,
          },
        });
        setSession(data.token, data.data, "retailer");
        window.location.href = "/retailer/dashboard.html";
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message || "Login failed";
          errorEl.style.display = "block";
        }
        submitBtn.textContent = "Log In →";
        submitBtn.disabled = false;
      }
    });
  }

  // ── Retailer Dashboard ───────────────────────────────────
  const dashboardHeading = document.getElementById("welcomeHeading");
  if (dashboardHeading) {
    if (!requireRetailer()) return;
    dashboardHeading.textContent = `Welcome back, ${localStorage.getItem("sf_retailer_name")}`;

    function renderStatusBanner(statusRaw) {
      const banner = document.getElementById("statusBanner");
      if (!banner) return;
      const status = String(statusRaw || "").toLowerCase();
      const supportLink =
        ' <a href="/retailer/support.html" style="font-weight:700;color:#160c02">Message admin →</a>';
      const base =
        "display:block;padding:1.25rem 1.5rem;border-radius:12px;margin-bottom:1.5rem;font-size:1.2rem;line-height:1.5;";
      if (status === "pending") {
        banner.style.cssText = base + "background:#fff6e5;border:1px solid #e8c47a;";
        banner.innerHTML =
          "<strong>⏳ Pending approval.</strong> An admin still needs to approve your store. You cannot list products until then." +
          supportLink;
        return;
      }
      if (status === "declined") {
        banner.style.cssText = base + "background:#fdecea;border:1px solid #e8a0a0;";
        banner.innerHTML =
          "<strong>Application declined.</strong> An admin declined your retailer application." +
          supportLink;
        return;
      }
      if (status === "suspended") {
        banner.style.cssText = base + "background:#fdecea;border:1px solid #e8a0a0;";
        banner.innerHTML =
          "<strong>Account suspended.</strong> Your store is suspended." + supportLink;
        return;
      }
      banner.style.display = "none";
      banner.innerHTML = "";
    }

    async function loadDashboard() {
      try {
        const [oRes, pRes, uRes, meRes] = await Promise.all([
          api("/orders/retailer").catch(() => ({ data: [] })),
          api("/products/mine").catch(() => ({ data: [] })),
          api("/messages/unread").catch(() => ({ data: { unread: 0, shop: 0, staff: 0 } })),
          api("/retailers/me").catch(() => api("/auth/me").catch(() => null)),
        ]);
        if (meRes?.data) {
          setSession(getToken(), meRes.data, "retailer");
          renderStatusBanner(meRes.data.status);
          const name = meRes.data.businessName || localStorage.getItem("sf_retailer_name");
          if (name) dashboardHeading.textContent = `Welcome back, ${name}`;
        } else {
          renderStatusBanner("");
        }
        const orders = oRes.data || [];
        const prods = pRes.data || [];
        const unreadData = uRes.data || {};
        const shopUnread = Number(unreadData.shop ?? unreadData.unread ?? 0) || 0;
        const staffUnread = Number(unreadData.staff ?? 0) || 0;

        let pending = 0;
        orders.forEach((o) => {
          (o.items || []).forEach((it) => {
            if (!["delivered", "cancelled"].includes(it.status)) pending++;
          });
        });

        const el = (id, val) => {
          const e = document.getElementById(id);
          if (e) e.textContent = val;
        };
        el("statOrders", orders.length);
        el("statPending", pending);
        el("statProducts", prods.filter((p) => p.isActive !== false).length);
        el("statMessages", shopUnread);

        const msgBadge = document.getElementById("msgBadge");
        if (msgBadge) {
          if (shopUnread > 0) {
            msgBadge.textContent = String(shopUnread);
            msgBadge.style.display = "inline-block";
          } else {
            msgBadge.textContent = "";
            msgBadge.style.display = "none";
          }
        }
        const staffBadge = document.getElementById("staffBadge");
        if (staffBadge) {
          if (staffUnread > 0) {
            staffBadge.textContent = String(staffUnread);
            staffBadge.style.display = "inline-block";
          } else {
            staffBadge.textContent = "";
            staffBadge.style.display = "none";
          }
        }

        const tbody = document.getElementById("recentOrdersBody");
        if (tbody) {
          const rows = [];
          orders.slice(0, 5).forEach((o) => {
            (o.items || []).forEach((it) => {
              rows.push(`<tr>
                <td>${escapeHtml(o.user?.fullName || "Customer")}</td>
                <td>${escapeHtml(it.productName || "—")}</td>
                <td>${escapeHtml(it.quantity)}</td>
                <td>₦${Number(it.subtotal || 0).toFixed(2)}</td>
                <td><span class="badge ${escapeHtml(it.status)}">${escapeHtml(it.status)}</span></td>
                <td>${fmtDate(o.orderedAt || o.createdAt)}</td>
              </tr>`);
            });
          });
          tbody.innerHTML = rows.length
            ? rows.join("")
            : `<tr><td colspan="6" style="text-align:center;padding:3rem;color:var(--clr-muted)">No orders yet.</td></tr>`;
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      }
    }

    document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
      e.preventDefault();
      await doLogout();
    });
    loadDashboard();
  }

  // ── Retailer Products ────────────────────────────────────
  const productManageGrid = document.getElementById("productGrid");
  const addProductBtn = document.getElementById("addProductBtn");

  if (productManageGrid && addProductBtn) {
    if (!requireRetailer()) return;

    const modal = document.getElementById("productModal");
    const modalError = document.getElementById("modalError");
    let catalog = [];

    function formatPrice(p) {
      const n = Number(p) || 0;
      return "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });
    }
    function escapeHtml(s) {
      const d = document.createElement("div");
      d.textContent = String(s ?? "");
      return d.innerHTML;
    }
    function renderManageCard(p) {
      const sizes = (p.sizes || [])
        .map((s) => '<span class="size_dot">' + escapeHtml(s) + "</span>")
        .join("");
      const badge = p.badge
        ? '<span class="card_badge badge_' + escapeHtml(p.badge) + '">' + escapeHtml(p.badgeLabel || p.badge) + "</span>"
        : "";
      return (
        '<article class="product_card" data-id="' + escapeHtml(p.id) + '">' +
        badge +
        '<span class="card_badge card_status_badge ' + (p.isActive ? "badge_new" : "badge_hidden") + '">' +
        (p.isActive ? "Active" : "Hidden") + "</span>" +
        '<img class="card_img" src="' + escapeHtml(p.img) + '" alt="' + escapeHtml(p.name) + '" loading="lazy" />' +
        '<div class="card_body">' +
        '<span class="card_category">' + escapeHtml(p.category || "") + " · " + escapeHtml(p.gender || "") + "</span>" +
        '<h2 class="card_name">' + escapeHtml(p.name) + "</h2>" +
        '<div class="card_sizes">' + sizes + "</div>" +
        '<div class="card_footer"><div class="card_price">' + formatPrice(p.price) +
        (p.oldPrice ? '<span class="old_price">' + formatPrice(p.oldPrice) + "</span>" : "") +
        "</div></div>" +
        '<div class="card_actions">' +
        '<button class="btn_sm dark edit_btn" type="button" data-id="' + escapeHtml(p.id) + '">Edit</button>' +
        '<button class="btn_sm ' + (p.isActive ? "danger" : "success") + ' toggle_btn" type="button" data-id="' +
        escapeHtml(p.id) + '" data-active="' + (p.isActive ? 1 : 0) + '">' +
        (p.isActive ? "Hide" : "Show") + "</button>" +
        "</div></div></article>"
      );
    }

    async function loadProducts() {
      try {
        const json = await api("/products/mine");
        catalog = (json.data || []).map(mapProduct).filter(Boolean);
        if (!catalog.length) {
          productManageGrid.innerHTML = `<div class="empty_state"><div class="empty_icon">👟</div><p>No products listed yet.</p><small>Click "+ Add Product" to get started.</small></div>`;
          return;
        }
        productManageGrid.innerHTML = catalog.map(renderManageCard).join("");
        productManageGrid.querySelectorAll(".edit_btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const p = catalog.find((x) => String(x.id) === String(btn.dataset.id));
            if (p) openEditModal(p);
          });
        });
        productManageGrid.querySelectorAll(".toggle_btn").forEach((btn) => {
          btn.addEventListener("click", () =>
            toggleActive(btn.dataset.id, parseInt(btn.dataset.active, 10))
          );
        });
      } catch {
        productManageGrid.innerHTML = `<div class="empty_state"><p>Could not load products.</p></div>`;
      }
    }

    addProductBtn.addEventListener("click", () => {
      document.getElementById("editProductId").value = "";
      document.getElementById("modalTitle").textContent = "Add New Product";
      ["pName", "pPrice", "pOldPrice", "pSizes", "pImg"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      if (modalError) modalError.style.display = "none";
      modal?.classList.add("open");
    });

    function openEditModal(p) {
      document.getElementById("editProductId").value = p.id;
      document.getElementById("modalTitle").textContent = "Edit Product";
      document.getElementById("pName").value = p.name;
      document.getElementById("pCategory").value = p.category || "";
      document.getElementById("pGender").value = p.gender || "unisex";
      document.getElementById("pPrice").value = p.price;
      document.getElementById("pOldPrice").value = p.oldPrice || "";
      document.getElementById("pColor").value = p.color || "";
      document.getElementById("pSizes").value = (p.sizes || []).join(",");
      document.getElementById("pImg").value = p.img || "";
      if (modalError) modalError.style.display = "none";
      modal?.classList.add("open");
    }

    document.getElementById("modalCancelBtn")?.addEventListener("click", () => modal?.classList.remove("open"));
    modal?.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); });

    const saveBtn = document.getElementById("modalSaveBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        if (modalError) modalError.style.display = "none";
        saveBtn.textContent = "Saving…";
        saveBtn.disabled = true;
        const editId = document.getElementById("editProductId").value;
        const payload = {
          name: document.getElementById("pName").value.trim(),
          category: document.getElementById("pCategory").value,
          gender: document.getElementById("pGender").value,
          price: parseFloat(document.getElementById("pPrice").value),
          oldPrice: document.getElementById("pOldPrice").value
            ? parseFloat(document.getElementById("pOldPrice").value)
            : null,
          color: document.getElementById("pColor").value,
          sizes: document.getElementById("pSizes").value.split(",").map((s) => s.trim()).filter(Boolean),
          img: document.getElementById("pImg").value.trim(),
        };
        try {
          if (editId) await api(`/products/${editId}`, { method: "PATCH", body: payload });
          else await api("/products", { method: "POST", body: payload });
          modal?.classList.remove("open");
          loadProducts();
        } catch (err) {
          if (modalError) {
            modalError.textContent = err.message || "Save failed";
            modalError.style.display = "block";
          }
        }
        saveBtn.textContent = "Save Product";
        saveBtn.disabled = false;
      });
    }

    async function toggleActive(id, currentlyActive) {
      try {
        await api(`/products/${id}`, { method: "PATCH", body: { isActive: !currentlyActive } });
        loadProducts();
      } catch (err) {
        await sfAlert(err.message || "Update failed");
      }
    }

    document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
      e.preventDefault();
      await doLogout();
    });
    loadProducts();
  }

  // ── Retailer Orders ──────────────────────────────────────
  const ordersBody = document.getElementById("ordersBody");
  if (ordersBody && !document.getElementById("statsGrid")) {
    if (!requireRetailer()) return;
    let allItems = [];
    let activeFilter = "all";
    let currentOrderId = null;
    let currentItemId = null;
    const statusFlow = { placed: "confirmed", confirmed: "packed", packed: "dispatched", dispatched: "delivered" };
    const statusModal = document.getElementById("statusModal");
    const statusError = document.getElementById("statusError");

    async function loadOrders() {
      try {
        const json = await api("/orders/retailer");
        const orders = json.data || [];
        allItems = [];
        orders.forEach((o) => {
          (o.items || []).forEach((it) => {
            allItems.push({
              orderId: o._id || o.id,
              itemId: it._id || it.id,
              paystack_ref: o.paystackRef,
              customer_name: o.user?.fullName || "Customer",
              product_name: it.productName,
              quantity: it.quantity,
              size: it.size,
              subtotal: it.subtotal,
              status: it.status,
              ordered_at: o.orderedAt || o.createdAt,
            });
          });
        });
        renderOrders();
      } catch {
        ordersBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--clr-muted)">Could not load orders.</td></tr>`;
      }
    }

    function renderOrders() {
      const filtered = activeFilter === "all" ? allItems : allItems.filter((o) => o.status === activeFilter);
      if (!filtered.length) {
        ordersBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:3rem;color:var(--clr-muted)">No orders found.</td></tr>`;
        return;
      }
      ordersBody.innerHTML = filtered
        .map((o) => {
          const canUpdate = !["delivered", "cancelled"].includes(o.status);
          return `<tr>
          <td style="font-family:monospace;font-size:1.1rem">${escapeHtml(o.paystack_ref || "—")}</td>
          <td>${escapeHtml(o.customer_name)}</td>
          <td>${escapeHtml(o.product_name)}</td>
          <td>${escapeHtml(o.quantity)} · ${escapeHtml(o.size || "—")}</td>
          <td>₦${Number(o.subtotal || 0).toFixed(2)}</td>
          <td><span class="badge ${escapeHtml(o.status)}">${escapeHtml(o.status)}</span></td>
          <td>${fmtDate(o.ordered_at)}</td>
          <td>${
            canUpdate
              ? `<button class="btn_sm dark update_status_btn" data-order="${escapeHtml(o.orderId)}" data-id="${escapeHtml(o.itemId)}" data-status="${escapeHtml(o.status)}" data-name="${escapeHtml(o.product_name)}" data-customer="${escapeHtml(o.customer_name)}">Update →</button>`
              : `<span style="font-size:1.1rem;color:var(--clr-muted)">${o.status === "delivered" ? "✓ Done" : "Cancelled"}</span>`
          }</td></tr>`;
        })
        .join("");

      ordersBody.querySelectorAll(".update_status_btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          currentOrderId = btn.dataset.order;
          currentItemId = btn.dataset.id;
          const select = document.getElementById("newStatusSelect");
          if (select) {
            Array.from(select.options).forEach((opt) => {
              opt.selected = opt.value === statusFlow[btn.dataset.status];
            });
          }
          const meta = document.getElementById("statusModalMeta");
          if (meta) meta.textContent = `${btn.dataset.name} — ordered by ${btn.dataset.customer}`;
          const noteEl = document.getElementById("statusNote");
          if (noteEl) noteEl.value = "";
          if (statusError) statusError.style.display = "none";
          statusModal?.classList.add("open");
        });
      });
    }

    document.querySelectorAll(".filter_tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".filter_tab").forEach((t) => {
          t.classList.remove("active", "dark");
          t.classList.add("outline");
        });
        tab.classList.add("active", "dark");
        tab.classList.remove("outline");
        activeFilter = tab.dataset.status;
        renderOrders();
      });
    });

    document.getElementById("statusCancelBtn")?.addEventListener("click", () => statusModal?.classList.remove("open"));
    statusModal?.addEventListener("click", (e) => { if (e.target === statusModal) statusModal.classList.remove("open"); });

    const statusSaveBtn = document.getElementById("statusSaveBtn");
    if (statusSaveBtn) {
      statusSaveBtn.addEventListener("click", async () => {
        if (statusError) statusError.style.display = "none";
        statusSaveBtn.textContent = "Updating…";
        statusSaveBtn.disabled = true;
        const newStatus = document.getElementById("newStatusSelect").value;
        const note = document.getElementById("statusNote")?.value.trim();
        try {
          await api("/orders/item-status", {
            method: "PATCH",
            body: { orderId: currentOrderId, itemId: currentItemId, status: newStatus, note },
          });
          statusModal?.classList.remove("open");
          loadOrders();
        } catch (err) {
          if (statusError) {
            statusError.textContent = err.message || "Update failed";
            statusError.style.display = "block";
          }
        }
        statusSaveBtn.textContent = "Update Status";
        statusSaveBtn.disabled = false;
      });
    }

    document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
      e.preventDefault();
      await doLogout();
    });
    loadOrders();
  }
}
