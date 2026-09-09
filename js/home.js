/*
 * ============================================================
 *  Sweet Feet v2 — js/home.js
 *  Homepage + customer auth + feedback.
 *  Network calls use js/api.js → TypeScript backend (not PHP /API).
 * ============================================================
 */

import { api, setSession } from "./api.js";

export function initHome() {
  const product = document.querySelector(".product");
  const aboutUs = document.querySelector(".about_us");
  const loginForm = document.querySelector(".form__container");
  const exitContainer = document.querySelector(".exit");
  const checkOut = document.querySelectorAll(".checkout");
  const eachProduct = document.querySelectorAll(".pd");

  if (product) {
    const sections = document.querySelectorAll("section");

    if (aboutUs && sections.length > 0) {
      aboutUs.addEventListener("click", function (e) {
        e.preventDefault();
        sections[0].scrollIntoView({ behavior: "smooth" });
      });
    }

    let count = 0;
    let oneTime = setInterval(() => {
      count++;
      if (count === 4) count = 0;
      product.style.transform = count >= 3 ? "translateX(20rem)" : "translateX(-20rem)";
    }, 1000);

    product.addEventListener("mouseover", () => clearInterval(oneTime));
    product.addEventListener("mouseout", () => {
      oneTime = setInterval(() => {
        count++;
        if (count === 4) count = 0;
        product.style.transform = count >= 3 ? "translateX(20rem)" : "translateX(-20rem)";
      }, 1000);
    });

    function showSignUpForm(e) {
      e.preventDefault();
      loginForm?.classList.remove("hidden");
      exitContainer?.classList.remove("hidden");
    }
    function removeSignUpForm(e) {
      e.preventDefault();
      loginForm?.classList.add("hidden");
      exitContainer?.classList.add("hidden");
    }

    checkOut.forEach((btn) => btn.addEventListener("click", showSignUpForm));
    eachProduct.forEach((pd) => pd.addEventListener("click", showSignUpForm));
    exitContainer?.addEventListener("click", removeSignUpForm);
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
