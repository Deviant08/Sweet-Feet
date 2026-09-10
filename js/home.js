/*
 * ============================================================
 *  Sweet Feet v2 — js/home.js
 *  Homepage + customer auth + feedback.
 *  Featured products are PUBLIC (no login required).
 * ============================================================
 */

import { api, setSession, mapProduct, avatarUrl } from "./api.js";

function formatPrice(p) {
  return "₦" + Number(p || 0).toLocaleString("en-NG");
}

export function initHome() {
  const productStrip = document.querySelector(".sweet_product .product");
  const aboutUs = document.querySelector(".about_us");

  if (productStrip) {
    const sections = document.querySelectorAll("section");
    if (aboutUs && sections.length > 0) {
      aboutUs.addEventListener("click", function (e) {
        e.preventDefault();
        sections[0].scrollIntoView({ behavior: "smooth" });
      });
    }

    // Stop old carousel shove
    productStrip.style.transform = "none";

    // Public catalogue — guests can browse seller + prices without logging in
    (async () => {
      try {
        const json = await api("/products");
        const list = (json.data || []).map(mapProduct).filter(Boolean).slice(0, 8);
        if (!list.length) return;

        productStrip.innerHTML = list
          .map((p) => {
            const profileUrl = `/nav/retailer.html?id=${encodeURIComponent(p.retailer_id)}`;
            const shopUrl = `/nav/products.html`;
            return `
            <div class="pd">
              <a href="${shopUrl}" style="text-decoration:none;color:inherit">
                <img src="${p.img}" alt="${p.name}" />
              </a>
              <div class="order" style="opacity:1">
                <span>
                  <p>${p.name}</p>
                  <h5>${formatPrice(p.price)}</h5>
                </span>
                <div><a class="btn checkout" href="${shopUrl}">Order</a></div>
                <a class="card_seller" href="${profileUrl}" style="margin-top:.6rem" title="View seller (no login needed)">
                  <img class="card_seller_avatar" src="${p.retailerLogo || avatarUrl(p.retailerName)}" alt="" />
                  <span class="card_seller_text">
                    <span class="card_seller_by">Sold by</span>
                    <span class="card_seller_name">${p.retailerName || "Sweet Feet"}</span>
                  </span>
                </a>
              </div>
            </div>`;
          })
          .join("");
      } catch (err) {
        console.warn("Could not load public featured products", err);
      }
    })();
  }

  // ── Customer login (nav/login.html) ───────────────────────
  const loginFormEl = document.getElementById("loginForm");
  if (loginFormEl) {
    const loginError = document.getElementById("loginError");

    loginFormEl.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;
      const btn = loginFormEl.querySelector("button[type='submit']");

      btn.textContent = "Logging in…";
      btn.disabled = true;
      if (loginError) loginError.style.display = "none";

      try {
        const data = await api("/auth/login", {
          method: "POST",
          body: { email, password },
        });
        setSession(data.token, data.data, "user");
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.href = next || "/index.html";
      } catch (err) {
        if (loginError) {
          loginError.textContent = err.message || "Login failed";
          loginError.style.display = "block";
        }
        btn.textContent = "Login";
        btn.disabled = false;
      }
    });
  }

  // ── Customer signup (nav/signup.html) ─────────────────────
  const signupFormEl = document.getElementById("signupForm");
  if (signupFormEl) {
    const signupError = document.getElementById("signupError");

    signupFormEl.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.getElementById("signupEmail").value.trim();
      const password = document.getElementById("signupPassword").value;
      const fullNameEl = document.getElementById("signupName");
      const fullName = fullNameEl ? fullNameEl.value.trim() : email.split("@")[0];
      const btn = signupFormEl.querySelector("button[type='submit']");

      btn.textContent = "Creating account…";
      btn.disabled = true;
      if (signupError) signupError.style.display = "none";

      try {
        await api("/auth/register", {
          method: "POST",
          body: { fullName, email, password, passwordConfirm: password },
        });
        window.location.href = "/nav/login.html?registered=1";
      } catch (err) {
        if (signupError) {
          signupError.textContent = err.message || "Signup failed";
          signupError.style.display = "block";
        }
        btn.textContent = "Sign Up";
        btn.disabled = false;
      }
    });

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("registered") === "1") {
      const msg = document.getElementById("loginSuccess");
      if (msg) {
        msg.textContent = "Account created successfully. Please log in.";
        msg.style.display = "block";
      }
    }
  }

  // ── Feedback (nav/feedback.html) ──────────────────────────
  const feedbackFormEl = document.getElementById("feedbackForm");
  if (feedbackFormEl) {
    feedbackFormEl.addEventListener("submit", async function (e) {
      e.preventDefault();
      const btn = feedbackFormEl.querySelector(".fb_submit");
      btn.textContent = "Sending…";
      btn.disabled = true;

      const payload = {
        name: document.getElementById("fb_name").value.trim(),
        email: document.getElementById("fb_email").value.trim(),
        category: document.getElementById("fb_category").value,
        rating: document.querySelector("input[name='rating']:checked")?.value || null,
        message: document.getElementById("fb_message").value.trim(),
      };

      try {
        await api("/feedback", { method: "POST", body: payload });
        feedbackFormEl.style.display = "none";
        document.getElementById("fbSuccess")?.classList.remove("hidden");
      } catch (err) {
        btn.textContent = "Send Feedback →";
        btn.disabled = false;
        alert(err.message || "Could not send feedback.");
      }
    });
  }
}
