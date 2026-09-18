/*
 * Retailer profile — own edit (90-day lock) or admin read-only view.
 */

import { api, getToken, avatarUrl, confirmAndLogout, sfAlert, setSession } from "./api.js";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const AMP = String.fromCharCode(38) + "amp;";
const LT = String.fromCharCode(38) + "lt;";
const GT = String.fromCharCode(38) + "gt;";
const QUOT = String.fromCharCode(38) + "quot;";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, AMP)
    .replace(/</g, LT)
    .replace(/>/g, GT)
    .replace(/"/g, QUOT);
}

function photoSrc(retailer) {
  return retailer?.logo || avatarUrl(retailer?.businessName || "SF");
}

function statusLabel(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}

function loginUrl(isAdmin) {
  const role = isAdmin ? "admin" : "retailer";
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

export function initProfile({ mode }) {
  const isAdmin = mode === "admin";
  const root = document.getElementById("profileRoot");
  if (!root) return;

  document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await confirmAndLogout(isAdmin ? "/nav/login.html?role=admin" : "/nav/login.html?role=retailer");
  });

  if (!getToken()) {
    window.location.replace(loginUrl(isAdmin));
    return;
  }

  let retailer = null;
  let meta = { canEdit: false };
  let pendingLogo = null;
  let logoDirty = false;

  function cooldownCopy() {
    if (meta.canEdit) {
      return "You can save profile changes once every 90 days. Use this edit carefully.";
    }
    return `Profile is locked until ${fmtDate(meta.nextEditAt)}. You can view it, but you cannot save changes yet.`;
  }

  function renderView() {
    const r = retailer || {};
    const id = r._id || r.id || "";
    const shopHref = `/nav/retailer.html?id=${encodeURIComponent(id)}`;
    const canEdit = !isAdmin && meta.canEdit;
    root.innerHTML = `
      <div class="profile_card">
        <div class="profile_hero">
          <img class="profile_avatar" src="${esc(photoSrc(r))}" alt="" />
          <div>
            <p class="profile_kicker">${isAdmin ? "Retailer profile" : "Your store profile"}</p>
            <h2>${esc(r.businessName || "Store")}</h2>
            <p class="profile_meta">${esc(r.location || "Location not set")} · <span class="badge ${esc(r.status || "")}">${esc(statusLabel(r.status))}</span></p>
          </div>
        </div>
        <dl class="profile_dl">
          <div><dt>Business name</dt><dd>${esc(r.businessName || "—")}</dd></div>
          <div><dt>Email</dt><dd>${esc(r.email || "—")}</dd></div>
          <div><dt>Phone</dt><dd>${esc(r.phone || "—")}</dd></div>
          <div><dt>Location</dt><dd>${esc(r.location || "—")}</dd></div>
          <div class="span2"><dt>About the store</dt><dd>${esc(r.bio || "No description yet.")}</dd></div>
          <div><dt>Joined</dt><dd>${esc(fmtDate(r.createdAt))}</dd></div>
          <div><dt>Last profile edit</dt><dd>${r.lastProfileEditAt ? esc(fmtDate(r.lastProfileEditAt)) : "Never"}</dd></div>
        </dl>
        ${isAdmin ? "" : `<p class="profile_note">${cooldownCopy()}</p>`}
        <div class="profile_actions">
          ${
            isAdmin
              ? `<a class="btn_sm outline" href="/admin/retailers.html">Back to retailers</a>
                 <a class="btn_sm outline" href="/admin/chat.html?retailer=${esc(id)}">Chat</a>
                 <a class="btn_sm dark" href="${shopHref}" target="_blank" rel="noopener">View shop</a>`
              : `${canEdit ? `<button type="button" class="btn_sm dark" id="profileEditBtn">Edit profile</button>` : `<button type="button" class="btn_sm outline" disabled>Edit locked until ${esc(fmtDate(meta.nextEditAt))}</button>`}
                 <a class="btn_sm outline" href="${shopHref}" target="_blank" rel="noopener">View shop</a>`
          }
        </div>
      </div>`;
    document.getElementById("profileEditBtn")?.addEventListener("click", renderEdit);
  }

  function renderEdit() {
    pendingLogo = null;
    logoDirty = false;
    const r = retailer || {};
    root.innerHTML = `
      <form class="profile_card" id="profileForm">
        <div class="profile_hero">
          <div>
            <p class="profile_kicker">Edit profile</p>
            <h2>Update your store</h2>
            <p class="profile_meta">Saving locks further edits for 90 days.</p>
          </div>
        </div>
        <div class="photo_drop" id="photoDrop" tabindex="0" role="button" aria-label="Upload profile photo">
          <img id="photoPreview" src="${esc(photoSrc(r))}" alt="Profile photo preview" />
          <div class="photo_drop_copy">
            <strong>Profile photo</strong>
            <span>Drag and drop a picture here, or click to choose from your device.</span>
            <em>Square crop · JPEG / PNG / WebP</em>
          </div>
          <input id="photoInput" type="file" accept="image/jpeg,image/png,image/webp,image/jpg" hidden />
        </div>
        <p class="form_error" id="photoError" hidden></p>
        <div class="form_group">
          <label for="pf_name">Business name</label>
          <input id="pf_name" name="businessName" maxlength="80" required value="${esc(r.businessName || "")}" />
        </div>
        <div class="form_group">
          <label for="pf_email">Email</label>
          <input id="pf_email" value="${esc(r.email || "")}" disabled />
        </div>
        <div class="form_row">
          <div class="form_group">
            <label for="pf_phone">Phone</label>
            <input id="pf_phone" name="phone" maxlength="30" value="${esc(r.phone || "")}" placeholder="0803 000 0000" />
          </div>
          <div class="form_group">
            <label for="pf_location">Location</label>
            <input id="pf_location" name="location" maxlength="80" value="${esc(r.location || "")}" placeholder="Ikeja, Lagos" />
          </div>
        </div>
        <div class="form_group">
          <label for="pf_bio">About the store</label>
          <textarea id="pf_bio" name="bio" maxlength="600" placeholder="Tell shoppers what you sell and where you ship.">${esc(r.bio || "")}</textarea>
        </div>
        <p class="profile_note">${cooldownCopy()}</p>
        <p class="form_error" id="profileError" hidden></p>
        <div class="profile_actions">
          <button type="button" class="btn_sm outline" id="profileCancelBtn">Cancel</button>
          <button type="submit" class="btn_sm dark" id="profileSaveBtn">Save profile</button>
        </div>
      </form>`;

    const drop = document.getElementById("photoDrop");
    const input = document.getElementById("photoInput");
    const preview = document.getElementById("photoPreview");
    const photoError = document.getElementById("photoError");

    async function applyFile(file) {
      photoError.hidden = true;
      try {
        const dataUrl = await fileToSquareJpeg(file);
        pendingLogo = dataUrl;
        logoDirty = true;
        preview.src = dataUrl;
      } catch (err) {
        photoError.textContent = err.message || "Could not use that photo.";
        photoError.hidden = false;
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

    document.getElementById("profileCancelBtn")?.addEventListener("click", renderView);
    document.getElementById("profileForm")?.addEventListener("submit", onSave);
  }

  async function onSave(e) {
    e.preventDefault();
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
    const payload = {
      businessName: document.getElementById("pf_name").value.trim(),
      phone: document.getElementById("pf_phone").value.trim(),
      location: document.getElementById("pf_location").value.trim(),
      bio: document.getElementById("pf_bio").value.trim(),
    };
    if (logoDirty && pendingLogo) payload.logo = pendingLogo;
    try {
      const json = await api("/retailers/me", { method: "PATCH", body: payload, timeoutMs: 45000 });
      retailer = json.data;
      meta = json.meta || editMetaFrom(retailer);
      setSession(getToken(), retailer, "retailer");
      await sfAlert({
        title: "Profile saved",
        message: "Your store profile is updated. You can edit again in 90 days.",
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

  function editMetaFrom(r) {
    return {
      canEdit: !r?.lastProfileEditAt,
      lastProfileEditAt: r?.lastProfileEditAt || null,
      nextEditAt: null,
    };
  }

  async function load() {
    try {
      if (isAdmin) {
        const id = new URLSearchParams(window.location.search).get("id");
        if (!id) {
          root.innerHTML = `<p class="profile_note">No retailer selected. <a href="/admin/retailers.html">Back to retailers</a></p>`;
          return;
        }
        const me = await api("/auth/me");
        if (me.data?.role !== "admin") {
          window.location.replace(loginUrl(true));
          return;
        }
        const json = await api("/retailers/" + encodeURIComponent(id));
        retailer = json.data;
        meta = { canEdit: false, ...(json.meta || {}) };
      } else {
        const json = await api("/retailers/me");
        retailer = json.data;
        meta = json.meta || editMetaFrom(retailer);
        setSession(getToken(), retailer, "retailer");
      }
      const title = document.getElementById("profilePageTitle");
      if (title) title.textContent = isAdmin ? retailer.businessName || "Retailer" : "Your profile";
      renderView();
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        window.location.replace(loginUrl(isAdmin));
        return;
      }
      root.innerHTML = `<p class="profile_note">${esc(err.message || "Could not load profile.")}</p>`;
    }
  }

  load();
}
