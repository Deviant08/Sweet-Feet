/*
 * ============================================================
 *  Sweet Feet v2 — js/retailer.js
 *  Retailer + admin pages. Uses TypeScript API (not PHP /API).
 * ============================================================
 */

import { api, mapProduct, setSession, clearSession, getToken } from "./api.js";

export function initRetailer() {
  function fmtDate(d) {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function requireRetailer() {
    if (!localStorage.getItem("sf_retailer_name") || !getToken()) {
      window.location.href = "/retailer/login.html";
      return false;
    }
    return true;
  }

  async function doLogout(redirectUrl) {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    clearSession();
    window.location.href = redirectUrl || "/retailer/login.html";
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

    async function loadDashboard() {
      try {
        const [oRes, pRes] = await Promise.all([
          api("/orders/retailer").catch(() => ({ data: [] })),
          api("/products/mine").catch(() => ({ data: [] })),
        ]);
        const orders = oRes.data || [];
        const prods = pRes.data || [];

        let itemCount = 0;
        let pending = 0;
        orders.forEach((o) => {
          (o.items || []).forEach((it) => {
            itemCount++;
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
        el("statMessages", "—");

        const tbody = document.getElementById("recentOrdersBody");
        if (tbody) {
          const rows = [];
          orders.slice(0, 5).forEach((o) => {
            (o.items || []).forEach((it) => {
              rows.push(`<tr>
                <td>${o.user?.fullName || "Customer"}</td>
                <td>${it.productName || "—"}</td>
                <td>${it.quantity}</td>
                <td>₦${Number(it.subtotal || 0).toFixed(2)}</td>
                <td><span class="badge ${it.status}">${it.status}</span></td>
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

    async function loadProducts() {
      try {
        const json = await api("/products/mine");
        const data = (json.data || []).map(mapProduct);
        if (!data.length) {
          productManageGrid.innerHTML = `<div class="empty_state"><div class="empty_icon">👟</div><p>No products listed yet.</p><small>Click "+ Add Product" to get started.</small></div>`;
          return;
        }
        productManageGrid.innerHTML = data
          .map(
            (p) => `
          <div class="product_manage_card">
            <img src="${p.img}" alt="${p.name}" />
            <div class="card_info">
              <h4>${p.name}</h4>
              <p class="card_meta">${p.category} · ${p.gender} · ₦${Number(p.price).toFixed(2)}</p>
              <p class="card_meta">Sizes: ${(p.sizes || []).join(", ")}</p>
              <p class="card_meta">Status: <span class="badge ${p.isActive ? "approved" : "cancelled"}">${p.isActive ? "Active" : "Hidden"}</span></p>
              <div class="card_actions">
                <button class="btn_sm outline edit_btn" data-product='${JSON.stringify(p).replace(/'/g, "&#39;")}'>Edit</button>
                <button class="btn_sm ${p.isActive ? "danger" : "success"} toggle_btn" data-id="${p.id}" data-active="${p.isActive ? 1 : 0}">${p.isActive ? "Hide" : "Show"}</button>
              </div>
            </div>
          </div>`
          )
          .join("");

        productManageGrid.querySelectorAll(".edit_btn").forEach((btn) => {
          btn.addEventListener("click", () => openEditModal(JSON.parse(btn.dataset.product)));
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

    document.getElementById("modalCancelBtn")?.addEventListener("click", () =>
      modal?.classList.remove("open")
    );
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("open");
    });

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
          sizes: document
            .getElementById("pSizes")
            .value.split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          img: document.getElementById("pImg").value.trim(),
        };
        try {
          if (editId) {
            await api(`/products/${editId}`, { method: "PATCH", body: payload });
          } else {
            await api("/products", { method: "POST", body: payload });
          }
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
        await api(`/products/${id}`, {
          method: "PATCH",
          body: { isActive: !currentlyActive },
        });
        loadProducts();
      } catch (err) {
        alert(err.message || "Update failed");
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
    const statusFlow = {
      placed: "confirmed",
      confirmed: "packed",
      packed: "dispatched",
      dispatched: "delivered",
    };
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
      const filtered =
        activeFilter === "all" ? allItems : allItems.filter((o) => o.status === activeFilter);
      if (!filtered.length) {
        ordersBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:3rem;color:var(--clr-muted)">No orders found.</td></tr>`;
        return;
      }
      ordersBody.innerHTML = filtered
        .map((o) => {
          const canUpdate = !["delivered", "cancelled"].includes(o.status);
          return `<tr>
          <td style="font-family:monospace;font-size:1.1rem">${o.paystack_ref || "—"}</td>
          <td>${o.customer_name}</td>
          <td>${o.product_name}</td>
          <td>${o.quantity} · ${o.size || "—"}</td>
          <td>₦${Number(o.subtotal || 0).toFixed(2)}</td>
          <td><span class="badge ${o.status}">${o.status}</span></td>
          <td>${fmtDate(o.ordered_at)}</td>
          <td>${
            canUpdate
              ? `<button class="btn_sm dark update_status_btn" data-order="${o.orderId}" data-id="${o.itemId}" data-status="${o.status}" data-name="${o.product_name}" data-customer="${o.customer_name}">Update →</button>`
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

    document.getElementById("statusCancelBtn")?.addEventListener("click", () =>
      statusModal?.classList.remove("open")
    );
    statusModal?.addEventListener("click", (e) => {
      if (e.target === statusModal) statusModal.classList.remove("open");
    });

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
            body: {
              orderId: currentOrderId,
              itemId: currentItemId,
              status: newStatus,
              note,
            },
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
