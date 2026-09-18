import { api, mapProduct, getToken, clearSession, confirmAndLogout, sfAlert } from "./api.js";

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = String(s ?? "");
  return d.innerHTML;
}

function formatPrice(p) {
  const n = Number(p) || 0;
  return "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function requireAdmin() {
  if (!getToken()) {
    window.location.replace("/nav/login.html?role=admin");
    return false;
  }
  try {
    const me = await api("/auth/me");
    if (me.data?.role !== "admin") {
      clearSession();
      window.location.replace("/nav/login.html?role=admin");
      return false;
    }
    return true;
  } catch {
    clearSession();
    window.location.replace("/nav/login.html?role=admin");
    return false;
  }
}

const ok = await requireAdmin();
if (!ok) throw new Error("admin required");

document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
  e.preventDefault();
  await confirmAndLogout("/nav/login.html?role=admin");
});

const productGrid = document.getElementById("productGrid");
const addProductBtn = document.getElementById("addProductBtn");
const modal = document.getElementById("productModal");
const modalError = document.getElementById("modalError");
let catalog = [];

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
    const json = await api("/products/house");
    catalog = (json.data || []).map(mapProduct).filter(Boolean);
    if (!catalog.length) {
      productGrid.innerHTML =
        '<div class="empty_state"><div class="empty_icon">👟</div><p>No official products yet.</p><small>They appear on the shop as sold by Sweet Feet.</small></div>';
      return;
    }
    productGrid.innerHTML = catalog.map(renderManageCard).join("");
    productGrid.querySelectorAll(".edit_btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = catalog.find((x) => String(x.id) === String(btn.dataset.id));
        if (p) openEditModal(p);
      });
    });
    productGrid.querySelectorAll(".toggle_btn").forEach((btn) => {
      btn.addEventListener("click", () => toggleActive(btn.dataset.id, parseInt(btn.dataset.active, 10)));
    });
  } catch (err) {
    productGrid.innerHTML =
      '<div class="empty_state"><p>' + escapeHtml(err.message || "Could not load products.") + "</p></div>";
  }
}

function openAddModal() {
  document.getElementById("editProductId").value = "";
  document.getElementById("modalTitle").textContent = "Add Official Product";
  ["pName", "pPrice", "pOldPrice", "pSizes", "pImg"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  if (modalError) modalError.style.display = "none";
  modal?.classList.add("open");
}

function openEditModal(p) {
  document.getElementById("editProductId").value = p.id;
  document.getElementById("modalTitle").textContent = "Edit Official Product";
  document.getElementById("pName").value = p.name;
  document.getElementById("pCategory").value = p.category || "trainers";
  document.getElementById("pGender").value = p.gender || "unisex";
  document.getElementById("pPrice").value = p.price;
  document.getElementById("pOldPrice").value = p.oldPrice || "";
  document.getElementById("pColor").value = p.color || "black";
  document.getElementById("pSizes").value = (p.sizes || []).join(",");
  document.getElementById("pImg").value = p.img || "";
  if (modalError) modalError.style.display = "none";
  modal?.classList.add("open");
}

addProductBtn?.addEventListener("click", openAddModal);
document.getElementById("modalCancelBtn")?.addEventListener("click", () => modal?.classList.remove("open"));
modal?.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.remove("open");
});

document.getElementById("modalSaveBtn")?.addEventListener("click", async () => {
  const saveBtn = document.getElementById("modalSaveBtn");
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
    badge: "top",
    badgeLabel: "SWEET FEET",
  };
  try {
    if (editId) await api(`/products/house/${editId}`, { method: "PATCH", body: payload });
    else await api("/products/house", { method: "POST", body: payload });
    modal?.classList.remove("open");
    await loadProducts();
  } catch (err) {
    if (modalError) {
      modalError.textContent = err.message || "Save failed";
      modalError.style.display = "block";
    }
  }
  saveBtn.textContent = "Save Product";
  saveBtn.disabled = false;
});

async function toggleActive(id, currentlyActive) {
  try {
    await api(`/products/house/${id}`, { method: "PATCH", body: { isActive: !currentlyActive } });
    await loadProducts();
  } catch (err) {
    await sfAlert(err.message || "Update failed");
  }
}

const ordersBody = document.getElementById("ordersBody");
const statusModal = document.getElementById("statusModal");
const statusError = document.getElementById("statusError");
const statusFlow = { placed: "confirmed", confirmed: "packed", packed: "dispatched", dispatched: "delivered" };
let currentOrderId = null;
let currentItemId = null;

async function loadOrders() {
  try {
    const json = await api("/orders/house");
    const orders = json.data || [];
    const rows = [];
    orders.forEach((o) => {
      (o.items || []).forEach((it) => {
        rows.push({
          orderId: o._id || o.id,
          itemId: it._id || it.id,
          paystack_ref: o.paystackRef,
          customer_name: o.user?.fullName || o.user?.email || "Customer",
          product_name: it.productName,
          quantity: it.quantity,
          size: it.size,
          subtotal: it.subtotal,
          status: it.status,
          ordered_at: o.orderedAt || o.createdAt,
        });
      });
    });
    if (!rows.length) {
      ordersBody.innerHTML =
        '<tr><td colspan="8" style="text-align:center;padding:3rem;color:var(--clr-muted)">No orders for official products yet.</td></tr>';
      return;
    }
    ordersBody.innerHTML = rows
      .map((o) => {
        const canUpdate = !["delivered", "cancelled"].includes(o.status);
        return `<tr>
          <td style="font-family:monospace;font-size:1.1rem">${escapeHtml(o.paystack_ref || "—")}</td>
          <td>${escapeHtml(o.customer_name)}</td>
          <td>${escapeHtml(o.product_name)}</td>
          <td>${escapeHtml(o.quantity)} · ${escapeHtml(o.size || "—")}</td>
          <td>₦${Number(o.subtotal || 0).toLocaleString("en-NG")}</td>
          <td><span class="badge ${escapeHtml(o.status)}">${escapeHtml(o.status)}</span></td>
          <td>${fmtDate(o.ordered_at)}</td>
          <td>${
            canUpdate
              ? `<button class="btn_sm dark update_status_btn" type="button" data-order="${escapeHtml(o.orderId)}" data-id="${escapeHtml(o.itemId)}" data-status="${escapeHtml(o.status)}" data-name="${escapeHtml(o.product_name)}" data-customer="${escapeHtml(o.customer_name)}">Update →</button>`
              : `<span style="font-size:1.1rem;color:var(--clr-muted)">${o.status === "delivered" ? "Done" : "Cancelled"}</span>`
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
  } catch (err) {
    ordersBody.innerHTML =
      `<tr><td colspan="8" style="text-align:center;padding:2rem">${escapeHtml(err.message || "Could not load orders.")}</td></tr>`;
  }
}

document.getElementById("statusCancelBtn")?.addEventListener("click", () => statusModal?.classList.remove("open"));
statusModal?.addEventListener("click", (e) => {
  if (e.target === statusModal) statusModal.classList.remove("open");
});
document.getElementById("statusSaveBtn")?.addEventListener("click", async () => {
  const saveBtn = document.getElementById("statusSaveBtn");
  if (statusError) statusError.style.display = "none";
  saveBtn.disabled = true;
  try {
    await api("/orders/house-item-status", {
      method: "PATCH",
      body: {
        orderId: currentOrderId,
        itemId: currentItemId,
        status: document.getElementById("newStatusSelect").value,
        note: document.getElementById("statusNote").value,
      },
    });
    statusModal?.classList.remove("open");
    await loadOrders();
  } catch (err) {
    if (statusError) {
      statusError.textContent = err.message || "Update failed";
      statusError.style.display = "block";
    }
  }
  saveBtn.disabled = false;
});

await loadProducts();
await loadOrders();
