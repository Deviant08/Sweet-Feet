/*
 * ============================================================
 *  Sweet Feet v2 — js/retailer.js
 *  Retailer and admin page logic.
 *  Guard: each section has its own guard element check.
 *  Exports: initRetailer() — called by main.js
 * ============================================================
 */

export function initRetailer() {

  function fmtDate(d) {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    });
  }

  function requireRetailer() {
    if (!localStorage.getItem("sf_retailer_name")) {
      window.location.href = "/sweetfeet/retailer/login.html";
      return false;
    }
    return true;
  }

  async function doLogout(redirectUrl) {
    await fetch("/sweetfeet/api/auth/retailer/logout", { method: "POST" });
    localStorage.removeItem("sf_retailer_id");
    localStorage.removeItem("sf_retailer_name");
    window.location.href = redirectUrl || "/sweetfeet/retailer/login.html";
  }

  // ── Retailer Signup ──────────────────────────────────────
  const signupForm = document.getElementById("retailerSignupForm");
  if (signupForm) {
    const errorEl   = document.getElementById("msgError");
    const successEl = document.getElementById("msgSuccess");
    const submitBtn = document.getElementById("submitBtn");

    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (errorEl)   errorEl.style.display   = "none";
      if (successEl) successEl.style.display = "none";
      submitBtn.textContent = "Submitting…";
      submitBtn.disabled    = true;

      const payload = {
        business_name: document.getElementById("business_name").value.trim(),
        email:         document.getElementById("email").value.trim(),
        password:      document.getElementById("password").value,
        phone:         document.getElementById("phone").value.trim(),
        location:      document.getElementById("location").value.trim(),
        bio:           document.getElementById("bio").value.trim()
      };

      try {
        const res  = await fetch("/sweetfeet/api/retailers/signup", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          signupForm.style.display = "none";
          if (successEl) { successEl.textContent = data.message; successEl.style.display = "block"; }
        } else {
          if (errorEl) { errorEl.textContent = data.error; errorEl.style.display = "block"; }
          submitBtn.textContent = "Submit Registration →"; submitBtn.disabled = false;
        }
      } catch {
        if (errorEl) { errorEl.textContent = "Network error."; errorEl.style.display = "block"; }
        submitBtn.textContent = "Submit Registration →"; submitBtn.disabled = false;
      }
    });
  }

  // ── Retailer Login ───────────────────────────────────────
  const loginForm = document.getElementById("retailerLoginForm");
  if (loginForm) {
    const errorEl   = document.getElementById("msgError");
    const submitBtn = document.getElementById("submitBtn");

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (errorEl) errorEl.style.display = "none";
      submitBtn.textContent = "Logging in…"; submitBtn.disabled = true;

      try {
        const res  = await fetch("/sweetfeet/api/retailers/login", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email:    document.getElementById("email").value.trim(),
            password: document.getElementById("password").value
          })
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem("sf_retailer_id",   data.retailer_id);
          localStorage.setItem("sf_retailer_name", data.business_name);
          window.location.href = "/sweetfeet/retailer/dashboard.html";
        } else {
          if (errorEl) { errorEl.textContent = data.error; errorEl.style.display = "block"; }
          submitBtn.textContent = "Log In →"; submitBtn.disabled = false;
        }
      } catch {
        if (errorEl) { errorEl.textContent = "Network error."; errorEl.style.display = "block"; }
        submitBtn.textContent = "Log In →"; submitBtn.disabled = false;
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
        const [oRes, pRes, mRes] = await Promise.all([
          fetch("/sweetfeet/api/tracking?retailer_orders=1"),
          fetch("/sweetfeet/api/products?retailer=1"),
          fetch("/sweetfeet/api/messages?inbox=1")
        ]);
        const orders = await oRes.json();
        const prods  = await pRes.json();
        const inbox  = await mRes.json();

        const pending = orders.filter(o => !["delivered","cancelled"].includes(o.status)).length;
        const unread  = Array.isArray(inbox)
          ? inbox.reduce((s, c) => s + (parseInt(c.unread_count) || 0), 0) : 0;

        const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
        el("statOrders",   orders.length);
        el("statPending",  pending);
        el("statProducts", Array.isArray(prods) ? prods.filter(p => p.is_active).length : 0);
        el("statMessages", unread);

        if (unread > 0) {
          const badge = document.getElementById("unreadBadge");
          if (badge) { badge.textContent = unread; badge.style.display = "inline-flex"; }
        }

        const tbody  = document.getElementById("recentOrdersBody");
        const recent = orders.slice(0, 5);
        if (tbody) {
          tbody.innerHTML = recent.length
            ? recent.map(o => `<tr>
                <td>${o.customer_name || "Guest"}</td>
                <td>${o.product_name}</td>
                <td>${o.quantity}</td>
                <td>₦${parseFloat(o.subtotal).toFixed(2)}</td>
                <td><span class="badge ${o.status}">${o.status}</span></td>
                <td>${fmtDate(o.ordered_at)}</td>
              </tr>`).join("")
            : `<tr><td colspan="6" style="text-align:center;padding:3rem;color:var(--clr-muted)">No orders yet.</td></tr>`;
        }
      } catch (err) { console.error("Dashboard load error:", err); }
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", async (e) => { e.preventDefault(); await doLogout(); });
    loadDashboard();
  }

  // ── Retailer Products ────────────────────────────────────
  const productManageGrid = document.getElementById("productGrid");
  const addProductBtn     = document.getElementById("addProductBtn");

  if (productManageGrid && addProductBtn) {
    if (!requireRetailer()) return;

    const modal      = document.getElementById("productModal");
    const modalError = document.getElementById("modalError");

    async function loadProducts() {
      try {
        const res  = await fetch("/sweetfeet/api/products?retailer=1");
        const data = await res.json();
        if (!Array.isArray(data) || !data.length) {
          productManageGrid.innerHTML = `<div class="empty_state"><div class="empty_icon">👟</div><p>No products listed yet.</p><small>Click "+ Add Product" to get started.</small></div>`;
          return;
        }
        productManageGrid.innerHTML = data.map(p => `
          <div class="product_manage_card">
            <img src="${p.img}" alt="${p.name}" />
            <div class="card_info">
              <h4>${p.name}</h4>
              <p class="card_meta">${p.category} · ${p.gender} · ₦${parseFloat(p.price).toFixed(2)}</p>
              <p class="card_meta">Sizes: ${p.sizes.join(", ")}</p>
              <p class="card_meta">Status: <span class="badge ${p.is_active ? "approved" : "cancelled"}">${p.is_active ? "Active" : "Hidden"}</span></p>
              <div class="card_actions">
                <button class="btn_sm outline edit_btn" data-product='${JSON.stringify(p)}'>Edit</button>
                <button class="btn_sm ${p.is_active ? "danger" : "success"} toggle_btn" data-id="${p.id}" data-active="${p.is_active}">${p.is_active ? "Hide" : "Show"}</button>
              </div>
            </div>
          </div>`).join("");

        productManageGrid.querySelectorAll(".edit_btn").forEach(btn => {
          btn.addEventListener("click", () => openEditModal(JSON.parse(btn.dataset.product)));
        });
        productManageGrid.querySelectorAll(".toggle_btn").forEach(btn => {
          btn.addEventListener("click", () => toggleActive(parseInt(btn.dataset.id), parseInt(btn.dataset.active)));
        });
      } catch { productManageGrid.innerHTML = `<div class="empty_state"><p>Could not load products.</p></div>`; }
    }

    addProductBtn.addEventListener("click", () => {
      document.getElementById("editProductId").value = "";
      document.getElementById("modalTitle").textContent = "Add New Product";
      ["pName","pPrice","pOldPrice","pSizes","pImg"].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = "";
      });
      if (modalError) modalError.style.display = "none";
      if (modal) modal.classList.add("open");
    });

    function openEditModal(p) {
      document.getElementById("editProductId").value = p.id;
      document.getElementById("modalTitle").textContent = "Edit Product";
      document.getElementById("pName").value     = p.name;
      document.getElementById("pCategory").value = p.category;
      document.getElementById("pGender").value   = p.gender;
      document.getElementById("pPrice").value    = p.price;
      document.getElementById("pOldPrice").value = p.old_price || "";
      document.getElementById("pColor").value    = p.color;
      document.getElementById("pSizes").value    = p.sizes.join(",");
      document.getElementById("pImg").value      = p.img;
      if (modalError) modalError.style.display = "none";
      if (modal) modal.classList.add("open");
    }

    const cancelBtn = document.getElementById("modalCancelBtn");
    if (cancelBtn) cancelBtn.addEventListener("click", () => modal.classList.remove("open"));
    if (modal) modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); });

    const saveBtn = document.getElementById("modalSaveBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        if (modalError) modalError.style.display = "none";
        saveBtn.textContent = "Saving…"; saveBtn.disabled = true;
        const editId  = document.getElementById("editProductId").value;
        const payload = {
          name:      document.getElementById("pName").value.trim(),
          category:  document.getElementById("pCategory").value,
          gender:    document.getElementById("pGender").value,
          price:     parseFloat(document.getElementById("pPrice").value),
          old_price: document.getElementById("pOldPrice").value ? parseFloat(document.getElementById("pOldPrice").value) : null,
          color:     document.getElementById("pColor").value,
          sizes:     document.getElementById("pSizes").value.split(",").map(s => s.trim()).filter(Boolean),
          img:       document.getElementById("pImg").value.trim()
        };
        if (editId) payload.id = parseInt(editId);
        try {
          const res  = await fetch("/sweetfeet/api/products", { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const data = await res.json();
          if (data.success) { modal.classList.remove("open"); loadProducts(); }
          else if (modalError) { modalError.textContent = data.error; modalError.style.display = "block"; }
        } catch { if (modalError) { modalError.textContent = "Network error."; modalError.style.display = "block"; } }
        saveBtn.textContent = "Save Product"; saveBtn.disabled = false;
      });
    }

    async function toggleActive(id, currentlyActive) {
      try {
        const res  = await fetch("/sweetfeet/api/products", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, is_active: currentlyActive ? 0 : 1 }) });
        const data = await res.json();
        if (data.success) loadProducts(); else alert(data.error);
      } catch { alert("Network error."); }
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", async (e) => { e.preventDefault(); await doLogout(); });
    loadProducts();
  }

  // ── Retailer Orders ──────────────────────────────────────
  const ordersBody = document.getElementById("ordersBody");
  if (ordersBody && !document.getElementById("statsGrid")) {
    if (!requireRetailer()) return;
    let allOrders = []; let activeFilter = "all"; let currentItemId = null;
    const statusFlow = { placed:"confirmed", confirmed:"packed", packed:"dispatched", dispatched:"delivered" };
    const statusModal = document.getElementById("statusModal");
    const statusError = document.getElementById("statusError");

    async function loadOrders() {
      try {
        const res = await fetch("/sweetfeet/api/tracking?retailer_orders=1");
        allOrders = await res.json();
        renderOrders();
      } catch { ordersBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--clr-muted)">Could not load orders.</td></tr>`; }
    }

    function renderOrders() {
      const filtered = activeFilter === "all" ? allOrders : allOrders.filter(o => o.status === activeFilter);
      if (!filtered.length) { ordersBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:3rem;color:var(--clr-muted)">No orders found.</td></tr>`; return; }
      ordersBody.innerHTML = filtered.map(o => {
        const canUpdate = !["delivered","cancelled"].includes(o.status);
        return `<tr>
          <td style="font-family:monospace;font-size:1.1rem">${o.paystack_ref || "—"}</td>
          <td><div style="font-weight:600">${o.customer_name || "Guest"}</div><div style="font-size:1.1rem;color:var(--clr-muted)">${o.customer_phone || ""}</div></td>
          <td>${o.product_name}</td>
          <td>${o.quantity} · ${o.size || "—"}</td>
          <td>₦${parseFloat(o.subtotal).toFixed(2)}</td>
          <td><span class="badge ${o.status}">${o.status}</span></td>
          <td>${fmtDate(o.ordered_at)}</td>
          <td>${canUpdate
            ? `<button class="btn_sm dark update_status_btn" data-id="${o.id}" data-status="${o.status}" data-name="${o.product_name}" data-customer="${o.customer_name || "Guest"}">Update →</button>`
            : `<span style="font-size:1.1rem;color:var(--clr-muted)">${o.status === "delivered" ? "✓ Done" : "Cancelled"}</span>`
          }</td></tr>`;
      }).join("");

      ordersBody.querySelectorAll(".update_status_btn").forEach(btn => {
        btn.addEventListener("click", () => {
          currentItemId = parseInt(btn.dataset.id);
          const select = document.getElementById("newStatusSelect");
          if (select) Array.from(select.options).forEach(opt => { opt.selected = opt.value === statusFlow[btn.dataset.status]; });
          const meta = document.getElementById("statusModalMeta");
          if (meta) meta.textContent = `${btn.dataset.name} — ordered by ${btn.dataset.customer}`;
          const noteEl = document.getElementById("statusNote");
          if (noteEl) noteEl.value = "";
          if (statusError) statusError.style.display = "none";
          if (statusModal) statusModal.classList.add("open");
        });
      });
    }

    document.querySelectorAll(".filter_tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".filter_tab").forEach(t => { t.classList.remove("active","dark"); t.classList.add("outline"); });
        tab.classList.add("active","dark"); tab.classList.remove("outline");
        activeFilter = tab.dataset.status; renderOrders();
      });
    });

    const statusCancelBtn = document.getElementById("statusCancelBtn");
    if (statusCancelBtn) statusCancelBtn.addEventListener("click", () => statusModal.classList.remove("open"));
    if (statusModal) statusModal.addEventListener("click", e => { if (e.target === statusModal) statusModal.classList.remove("open"); });

    const statusSaveBtn = document.getElementById("statusSaveBtn");
    if (statusSaveBtn) {
      statusSaveBtn.addEventListener("click", async () => {
        if (statusError) statusError.style.display = "none";
        statusSaveBtn.textContent = "Updating…"; statusSaveBtn.disabled = true;
        const newStatus = document.getElementById("newStatusSelect").value;
        const note      = document.getElementById("statusNote").value.trim();
        try {
          const res  = await fetch("/sweetfeet/api/tracking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_item_id: currentItemId, status: newStatus, note }) });
          const data = await res.json();
          if (data.success) { statusModal.classList.remove("open"); loadOrders(); }
          else if (statusError) { statusError.textContent = data.error; statusError.style.display = "block"; }
        } catch { if (statusError) { statusError.textContent = "Network error."; statusError.style.display = "block"; } }
        statusSaveBtn.textContent = "Update Status"; statusSaveBtn.disabled = false;
      });
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", async (e) => { e.preventDefault(); await doLogout(); });
    loadOrders();
  }

  // ── Admin Dashboard & Retailers ──────────────────────────
  const adminLoginBtn = document.getElementById("adminLoginBtn");
  if (adminLoginBtn) {
    const loginModal = document.getElementById("loginModal");

    async function adminLogin() {
      const errorEl = document.getElementById("loginError");
      adminLoginBtn.textContent = "Logging in…"; adminLoginBtn.disabled = true;
      if (errorEl) errorEl.style.display = "none";
      try {
        const res  = await fetch("/sweetfeet/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: document.getElementById("adminEmail").value.trim(), password: document.getElementById("adminPassword").value }) });
        const data = await res.json();
        if (data.success) { loginModal.classList.remove("open"); onAdminLoggedIn(); }
        else if (errorEl) { errorEl.textContent = data.error; errorEl.style.display = "block"; }
      } catch { if (errorEl) { errorEl.textContent = "Network error."; errorEl.style.display = "block"; } }
      adminLoginBtn.textContent = "Log In →"; adminLoginBtn.disabled = false;
    }

    adminLoginBtn.addEventListener("click", adminLogin);

    async function onAdminLoggedIn() {
      // Stats (admin/dashboard.html)
      const statsGrid = document.getElementById("statsGrid");
      if (statsGrid) {
        try {
          const sRes  = await fetch("/sweetfeet/api/admin/stats");
          const stats = await sRes.json();
          if (stats.error) { loginModal.classList.add("open"); return; }

          if (stats.pending_retailers > 0) {
            const badge = document.getElementById("pendingBadge");
            if (badge) { badge.textContent = stats.pending_retailers; badge.style.display = "inline-flex"; }
          }

          statsGrid.innerHTML = [
            ["🏪", stats.total_retailers,  "Approved Retailers"],
            ["⏳", stats.pending_retailers, "Pending Approvals"],
            ["👥", stats.total_customers,  "Customers"],
            ["📦", stats.total_orders,     "Total Orders"],
            ["💰", `₦${parseFloat(stats.total_revenue).toLocaleString("en-NG",{minimumFractionDigits:2})}`, "Total Revenue"],
            ["👟", stats.total_products,   "Active Listings"],
            ["💬", stats.total_messages,   "Messages Sent"]
          ].map(([icon, val, label]) => `
            <div class="stat_card">
              <div class="stat_icon">${icon}</div>
              <div class="stat_value">${val}</div>
              <div class="stat_label">${label}</div>
            </div>`).join("");

          const oRes   = await fetch("/sweetfeet/api/admin/orders");
          const orders = await oRes.json();
          const tbody  = document.getElementById("ordersBody");
          if (tbody) {
            tbody.innerHTML = orders.length
              ? orders.map(o => `<tr>
                  <td style="font-family:monospace;font-size:1.1rem">${o.paystack_ref || "—"}</td>
                  <td>${o.customer_name || "Guest"}<br><small style="color:var(--clr-muted)">${o.customer_email || ""}</small></td>
                  <td>₦${parseFloat(o.total).toFixed(2)}</td>
                  <td><span class="badge ${o.status}">${o.status}</span></td>
                  <td>${fmtDate(o.ordered_at)}</td>
                </tr>`).join("")
              : `<tr><td colspan="5" style="text-align:center;padding:3rem;color:var(--clr-muted)">No orders yet.</td></tr>`;
          }
        } catch (err) { console.error("Admin dashboard error:", err); }
      }

      // Retailers list (admin/retailers.html)
      const retailersBody = document.getElementById("retailersBody");
      if (retailersBody) {
        let allRetailers = []; let activeFilter = "all";

        async function loadRetailers() {
          try {
            const res  = await fetch("/sweetfeet/api/admin/retailers");
            const data = await res.json();
            if (data.error) { loginModal.classList.add("open"); return; }
            allRetailers = data; renderRetailers();
          } catch { console.error("Could not load retailers."); }
        }

        function renderRetailers() {
          const filtered = activeFilter === "all" ? allRetailers : allRetailers.filter(r => r.status === activeFilter);
          if (!filtered.length) { retailersBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--clr-muted)">No retailers found.</td></tr>`; return; }
          retailersBody.innerHTML = filtered.map(r => `
            <tr>
              <td><strong>${r.business_name}</strong></td>
              <td>${r.email}</td>
              <td>${r.location || "—"}</td>
              <td>${r.phone || "—"}</td>
              <td><span class="badge ${r.status}">${r.status}</span></td>
              <td>${fmtDate(r.created_at)}</td>
              <td>
                <div style="display:flex;gap:.5rem;flex-wrap:wrap">
                  ${r.status !== "approved" ? `<button class="btn_sm success action_btn" data-id="${r.id}" data-action="approve">Approve</button>` : ""}
                  ${r.status !== "suspended" ? `<button class="btn_sm danger action_btn" data-id="${r.id}" data-action="reject">Suspend</button>` : ""}
                </div>
              </td>
            </tr>`).join("");

          retailersBody.querySelectorAll(".action_btn").forEach(btn => {
            btn.addEventListener("click", async () => {
              if (!confirm(`${btn.dataset.action === "approve" ? "Approve" : "Suspend"} this retailer?`)) return;
              try {
                const res  = await fetch(`/sweetfeet/api/admin/${btn.dataset.action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ retailer_id: parseInt(btn.dataset.id) }) });
                const data = await res.json();
                if (data.success) loadRetailers(); else alert(data.error);
              } catch { alert("Network error."); }
            });
          });
        }

        document.querySelectorAll(".filter_tab").forEach(tab => {
          tab.addEventListener("click", () => {
            document.querySelectorAll(".filter_tab").forEach(t => { t.classList.remove("active","dark"); t.classList.add("outline"); });
            tab.classList.add("active","dark"); tab.classList.remove("outline");
            activeFilter = tab.dataset.status; renderRetailers();
          });
        });

        loadRetailers();
      }
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await fetch("/sweetfeet/api/auth/logout", { method: "POST" });
        window.location.reload();
      });
    }

    onAdminLoggedIn();
  }
}
