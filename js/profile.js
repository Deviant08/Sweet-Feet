/*
 * Store profile (retailer + admin view) and customer account profile.
 */

import { api, getToken, avatarUrl, confirmAndLogout, sfAlert, setSession, mapProduct } from "./api.js";

const AMP = String.fromCharCode(38) + "amp;";
const LT = String.fromCharCode(38) + "lt;";
const GT = String.fromCharCode(38) + "gt;";
const QUOT = String.fromCharCode(38) + "quot;";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, AMP)
    .replace(/</g, LT)
    .replace(/>/g, GT)
    .replace(/"/g, QUOT);
}

function statusLabel(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}

function loginUrl(role) {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  return `/nav/login.html?role=${role}&next=${next}`;
}

async function fileToSquareJpeg(file) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Choose a JPEG, PNG, or WebP photo.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Photo must be under 8 MB.");
  }
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    image.src = url;
  });
  const side = Math.min(img.width, img.height) || 1;
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f3ede8";
  ctx.fillRect(0, 0, 512, 512);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, 512, 512);
  return canvas.toDataURL("image/jpeg", 0.84);
}

function bindPhotoDrop({ drop, input, preview, errorEl, onChange }) {
  async function applyFile(file) {
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }
    try {
      const dataUrl = await fileToSquareJpeg(file);
      if (preview) preview.src = dataUrl;
      onChange(dataUrl);
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || "Could not use that photo.";
        errorEl.hidden = false;
      }
    }
  }
  drop.addEventListener("click", () => input.click());
  drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      input.click();
    }
  });
  input.addEventListener("click", (e) => e.stopPropagation());
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (file) applyFile(file);
    input.value = "";
  });
  ["dragenter", "dragover"].forEach((ev) => {
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add("is-drag");
    });
  });
  ["dragleave", "drop"].forEach((ev) => {
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove("is-drag");
    });
  });
  drop.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) applyFile(file);
  });
}

export function initProfile({ mode }) {
  const isAdmin = mode === "admin";
  const isCustomer = mode === "customer";
  const isRetailer = mode === "retailer";
  const root = document.getElementById("profileRoot");
  if (!root) return;

  const logoutRole = isAdmin ? "admin" : isRetailer ? "retailer" : "customer";
  if (!document.querySelector("[data-logout]")) {
    document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
      e.preventDefault();
      const dest =
        logoutRole === "admin"
          ? "/nav/login.html?role=admin"
          : logoutRole === "retailer"
            ? "/nav/login.html?role=retailer"
            : "/nav/login.html";
      await confirmAndLogout(dest);
    });
  }

  if (!getToken()) {
    window.location.replace(loginUrl(isAdmin ? "admin" : isRetailer ? "retailer" : "customer"));
    return;
  }

  if (isCustomer && localStorage.getItem("sf_retailer_id")) {
    window.location.replace("/retailer/profile.html");
    return;
  }

  let record = null;
  let meta = { canEdit: false, productCount: 0, listingCount: 0 };
  let listings = [];
  let pendingPhoto = null;
  let photoDirty = false;

  function storePhoto(r) {
    if (isCustomer) return r?.photo || avatarUrl(r?.fullName || r?.email || "SF");
    return r?.logo || avatarUrl(r?.businessName || "SF");
  }

  function cooldownCopy() {
    if (!isRetailer) return "";
    if (meta.canEdit) {
      return "You can save store profile changes once every 90 days. Use this edit carefully — shoppers and admin will see it.";
    }
    return `Profile is locked until ${fmtDate(meta.nextEditAt)}. You can view it, but you cannot save changes yet.`;
  }

  function listingGrid() {
    if (isCustomer) return "";
    if (!listings.length) {
      return `<section class="sf_listings">
        <h3>Listings</h3>
        <p class="sf_muted">${isAdmin ? "This store has no products yet." : "You have not listed any products yet."}</p>
      </section>`;
    }
    const cards = listings
      .slice(0, 8)
      .map((p) => {
        const img = esc(p.img || "");
        const name = esc(p.name || "Product");
        const price = Number(p.price || 0).toLocaleString("en-NG");
        return `<article class="sf_listing">
          <img src="${img}" alt="" />
          <div>
            <strong>${name}</strong>
            <span>₦${price}</span>
          </div>
        </article>`;
      })
      .join("");
    return `<section class="sf_listings">
      <div class="sf_listings_head">
        <h3>Listings</h3>
        ${isRetailer ? `<a href="/retailer/products.html">Manage products</a>` : ""}
      </div>
      <div class="sf_listing_grid">${cards}</div>
    </section>`;
  }

  function renderView() {
    if (isCustomer) return renderCustomerView();
    const r = record || {};
    const id = r._id || r.id || "";
    const shopHref = `/nav/retailer.html?id=${encodeURIComponent(id)}`;
    const canEdit = isRetailer && meta.canEdit;
    const count = meta.productCount ?? listings.length;
    root.innerHTML = `
      <div class="sf_profile">
        <section class="sf_profile_head">
          <img class="sf_profile_photo" src="${esc(storePhoto(r))}" alt="" />
          <div class="sf_profile_intro">
            <p class="sf_kicker">${isAdmin ? "Retailer profile" : "Your store"}</p>
            <h2>${esc(r.businessName || "Store")}</h2>
            <p class="sf_meta_line">
              ${esc(r.location || "Location not set")}
              <span class="badge ${esc(r.status || "")}">${esc(statusLabel(r.status))}</span>
            </p>
            <p class="sf_bio">${esc(r.bio || "No store description yet.")}</p>
            <div class="sf_actions">
              ${
                isAdmin
                  ? `<a class="btn_sm outline" href="/admin/retailers.html">Back to retailers</a>
                     <a class="btn_sm outline" href="/admin/chat.html?retailer=${esc(id)}">Chat</a>
                     <a class="btn_sm dark" href="${shopHref}" target="_blank" rel="noopener">View shop</a>`
                  : `${canEdit ? `<button type="button" class="btn_sm dark" id="profileEditBtn">Edit profile</button>` : `<button type="button" class="btn_sm outline" disabled>Edit locked until ${esc(fmtDate(meta.nextEditAt))}</button>`}
                     <a class="btn_sm outline" href="${shopHref}" target="_blank" rel="noopener">Preview shop</a>`
              }
            </div>
          </div>
        </section>
        <div class="sf_stats">
          <div class="sf_stat"><span>${count}</span><label>Active listings</label></div>
          <div class="sf_stat"><span>${esc(fmtDate(r.createdAt))}</span><label>Joined</label></div>
          <div class="sf_stat"><span>${r.lastProfileEditAt ? esc(fmtDate(r.lastProfileEditAt)) : "Never"}</span><label>Last profile edit</label></div>
        </div>
        <section class="sf_details">
          <h3>Store details</h3>
          <dl class="sf_dl">
            <div><dt>Business name</dt><dd>${esc(r.businessName || "—")}</dd></div>
            <div><dt>Email</dt><dd>${esc(r.email || "—")}</dd></div>
            <div><dt>Phone</dt><dd>${esc(r.phone || "—")}</dd></div>
            <div><dt>Location</dt><dd>${esc(r.location || "—")}</dd></div>
            <div class="span2"><dt>About the store</dt><dd>${esc(r.bio || "No description yet.")}</dd></div>
          </dl>
          ${isRetailer ? `<p class="sf_note">${cooldownCopy()}</p>` : `<p class="sf_note">Admin can view this store but cannot edit the retailer’s profile.</p>`}
        </section>
        ${listingGrid()}
      </div>`;
    document.getElementById("profileEditBtn")?.addEventListener("click", renderRetailerEdit);
  }

  function renderCustomerView() {
    const u = record || {};
    root.innerHTML = `
      <div class="sf_profile">
        <section class="sf_profile_head">
          <img class="sf_profile_photo" src="${esc(storePhoto(u))}" alt="" />
          <div class="sf_profile_intro">
            <p class="sf_kicker">Your account</p>
            <h2>${esc(u.fullName || "Customer")}</h2>
            <p class="sf_meta_line">${esc(u.email || "")}</p>
            <p class="sf_bio">${u.phone ? esc(u.phone) : "Add a phone number so orders are easier to reach you about."}</p>
            <div class="sf_actions">
              <button type="button" class="btn_sm dark" id="profileEditBtn">Edit profile</button>
              <a class="btn_sm outline" href="/nav/track.html">Track orders</a>
              <a class="btn_sm outline" href="/nav/chat.html">Messages</a>
            </div>
          </div>
        </section>
        <section class="sf_details">
          <h3>Account details</h3>
          <dl class="sf_dl">
            <div><dt>Full name</dt><dd>${esc(u.fullName || "—")}</dd></div>
            <div><dt>Email</dt><dd>${esc(u.email || "—")}</dd></div>
            <div><dt>Phone</dt><dd>${esc(u.phone || "—")}</dd></div>
            <div><dt>Member since</dt><dd>${esc(fmtDate(u.createdAt))}</dd></div>
          </dl>
          <p class="sf_note">Email cannot be changed. Your photo and name appear in messages and checkout.</p>
        </section>
      </div>`;
    document.getElementById("profileEditBtn")?.addEventListener("click", renderCustomerEdit);
  }

  function photoDropHtml(src, hint) {
    return `
      <div class="photo_drop" id="photoDrop" tabindex="0" role="button" aria-label="Upload profile photo">
        <img id="photoPreview" src="${esc(src)}" alt="Profile photo preview" />
        <div class="photo_drop_copy">
          <strong>Profile photo</strong>
          <span>Drag and drop a picture here, or click to choose from your device.</span>
          <em>${hint}</em>
        </div>
        <input id="photoInput" type="file" accept="image/jpeg,image/png,image/webp,image/jpg" hidden />
      </div>
      <p class="form_error" id="photoError" hidden></p>`;
  }

  function wirePhoto() {
    bindPhotoDrop({
      drop: document.getElementById("photoDrop"),
      input: document.getElementById("photoInput"),
      preview: document.getElementById("photoPreview"),
      errorEl: document.getElementById("photoError"),
      onChange: (dataUrl) => {
        pendingPhoto = dataUrl;
        photoDirty = true;
      },
    });
  }

  function renderRetailerEdit() {
    pendingPhoto = null;
    photoDirty = false;
    const r = record || {};
    root.innerHTML = `
      <form class="sf_profile" id="profileForm">
        <section class="sf_profile_head sf_profile_head--edit">
          <div>
            <p class="sf_kicker">Edit store profile</p>
            <h2>Update how shoppers see you</h2>
            <p class="sf_meta_line">Saving locks further edits for 90 days.</p>
          </div>
        </section>
        ${photoDropHtml(storePhoto(r), "Square crop · JPEG / PNG / WebP")}
        <div class="form_group">
          <label for="pf_name">Business name</label>
          <input id="pf_name" maxlength="80" required value="${esc(r.businessName || "")}" />
        </div>
        <div class="form_group">
          <label for="pf_email">Email</label>
          <input id="pf_email" value="${esc(r.email || "")}" disabled />
        </div>
        <div class="form_row">
          <div class="form_group">
            <label for="pf_phone">Phone</label>
            <input id="pf_phone" maxlength="30" value="${esc(r.phone || "")}" placeholder="0803 000 0000" />
          </div>
          <div class="form_group">
            <label for="pf_location">Location</label>
            <input id="pf_location" maxlength="80" value="${esc(r.location || "")}" placeholder="Ikeja, Lagos" />
          </div>
        </div>
        <div class="form_group">
          <label for="pf_bio">About the store</label>
          <textarea id="pf_bio" maxlength="600" placeholder="Tell shoppers what you sell and where you ship.">${esc(r.bio || "")}</textarea>
        </div>
        <p class="sf_note">${cooldownCopy()}</p>
        <p class="form_error" id="profileError" hidden></p>
        <div class="sf_actions">
          <button type="button" class="btn_sm outline" id="profileCancelBtn">Cancel</button>
          <button type="submit" class="btn_sm dark" id="profileSaveBtn">Save profile</button>
        </div>
      </form>`;
    wirePhoto();
    document.getElementById("profileCancelBtn")?.addEventListener("click", renderView);
    document.getElementById("profileForm")?.addEventListener("submit", onSaveRetailer);
  }

  function renderCustomerEdit() {
    pendingPhoto = null;
    photoDirty = false;
    const u = record || {};
    root.innerHTML = `
      <form class="sf_profile" id="profileForm">
        <section class="sf_profile_head sf_profile_head--edit">
          <div>
            <p class="sf_kicker">Edit profile</p>
            <h2>Your Sweet Feet account</h2>
          </div>
        </section>
        ${photoDropHtml(storePhoto(u), "Square crop · JPEG / PNG / WebP")}
        <div class="form_group">
          <label for="pf_name">Full name</label>
          <input id="pf_name" maxlength="80" required value="${esc(u.fullName || "")}" />
        </div>
        <div class="form_group">
          <label for="pf_email">Email</label>
          <input id="pf_email" value="${esc(u.email || "")}" disabled />
        </div>
        <div class="form_group">
          <label for="pf_phone">Phone</label>
          <input id="pf_phone" maxlength="30" value="${esc(u.phone || "")}" placeholder="0803 000 0000" />
        </div>
        <p class="form_error" id="profileError" hidden></p>
        <div class="sf_actions">
          <button type="button" class="btn_sm outline" id="profileCancelBtn">Cancel</button>
          <button type="submit" class="btn_sm dark" id="profileSaveBtn">Save profile</button>
        </div>
      </form>`;
    wirePhoto();
    document.getElementById("profileCancelBtn")?.addEventListener("click", renderView);
    document.getElementById("profileForm")?.addEventListener("submit", onSaveCustomer);
  }

  async function saveCommon(run) {
    const errEl = document.getElementById("profileError");
    const btn = document.getElementById("profileSaveBtn");
    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = "";
    }
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving…";
    }
    try {
      await run();
      await sfAlert({
        title: "Profile saved",
        message: isRetailer
          ? "Your store profile is updated. You can edit again in 90 days."
          : "Your account details are updated.",
        confirmText: "Done",
      });
      renderView();
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message || "Could not save profile.";
        errEl.hidden = false;
      } else {
        await sfAlert(err.message || "Could not save profile.");
      }
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Save profile";
      }
    }
  }

  function onSaveRetailer(e) {
    e.preventDefault();
    return saveCommon(async () => {
      const payload = {
        businessName: document.getElementById("pf_name").value.trim(),
        phone: document.getElementById("pf_phone").value.trim(),
        location: document.getElementById("pf_location").value.trim(),
        bio: document.getElementById("pf_bio").value.trim(),
      };
      if (photoDirty && pendingPhoto) payload.logo = pendingPhoto;
      const json = await api("/retailers/me", { method: "PATCH", body: payload, timeoutMs: 45000 });
      record = json.data;
      meta = json.meta || meta;
      setSession(getToken(), record, "retailer");
    });
  }

  function onSaveCustomer(e) {
    e.preventDefault();
    return saveCommon(async () => {
      const payload = {
        fullName: document.getElementById("pf_name").value.trim(),
        phone: document.getElementById("pf_phone").value.trim(),
      };
      if (photoDirty && pendingPhoto) payload.photo = pendingPhoto;
      const json = await api("/auth/me", { method: "PATCH", body: payload, timeoutMs: 45000 });
      record = json.data;
      setSession(getToken(), record, "user");
    });
  }

  async function loadListings(id) {
    try {
      if (isRetailer) {
        const json = await api("/products/mine");
        listings = (json.data || []).map(mapProduct).filter(Boolean);
        return;
      }
      const json = await api("/products");
      listings = (json.data || [])
        .map(mapProduct)
        .filter((p) => p && String(p.retailer_id) === String(id));
    } catch {
      listings = [];
    }
  }

  async function load() {
    try {
      if (isAdmin) {
        const id = new URLSearchParams(window.location.search).get("id");
        if (!id) {
          root.innerHTML = `<p class="sf_note">No retailer selected. <a href="/admin/retailers.html">Back to retailers</a></p>`;
          return;
        }
        const me = await api("/auth/me");
        if (me.data?.role !== "admin") {
          window.location.replace(loginUrl("admin"));
          return;
        }
        const json = await api("/retailers/" + encodeURIComponent(id));
        record = json.data;
        meta = { canEdit: false, ...(json.meta || {}) };
        await loadListings(record._id || record.id);
      } else if (isRetailer) {
        const json = await api("/retailers/me");
        record = json.data;
        meta = json.meta || meta;
        setSession(getToken(), record, "retailer");
        await loadListings(record._id || record.id);
      } else {
        const json = await api("/auth/me");
        record = json.data;
        if (record?.role === "admin") {
          /* admins can still keep an account profile */
        }
        setSession(getToken(), record, "user");
      }
      const title = document.getElementById("profilePageTitle");
      if (title) {
        title.textContent = isAdmin
          ? record.businessName || "Retailer"
          : isCustomer
            ? "Your profile"
            : "Your store profile";
      }
      renderView();
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        window.location.replace(loginUrl(isAdmin ? "admin" : isRetailer ? "retailer" : "customer"));
        return;
      }
      root.innerHTML = `<p class="sf_note">${esc(err.message || "Could not load profile.")}</p>`;
    }
  }

  load();
}
