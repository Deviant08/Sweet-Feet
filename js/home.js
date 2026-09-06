/*
 * ============================================================
 *  Sweet Feet v2 — js/home.js
 *  Homepage logic only.
 *  Handles: product carousel, login popup, about scroll,
 *           customer login form, customer signup form,
 *           feedback form.
 *  Guard: returns early if .product is not on the page,
 *         except for the form handlers which have their
 *         own individual guards.
 * ============================================================
 */

export function initHome() {

  // ── Product carousel (index.html) ───────────────────────
  const product       = document.querySelector(".product");
  const aboutUs       = document.querySelector(".about_us");
  const loginForm     = document.querySelector(".form__container");
  const exitContainer = document.querySelector(".exit");
  const checkOut      = document.querySelectorAll(".checkout");
  const eachProduct   = document.querySelectorAll(".pd");

  if (product) {
    const sections = document.querySelectorAll("section");

    // About Us smooth scroll
    if (aboutUs && sections.length > 0) {
      aboutUs.addEventListener("click", function (e) {
        e.preventDefault();
        sections[0].scrollIntoView({ behavior: "smooth" });
      });
    }

    // Carousel auto-slide
    let count = 0;
    let oneTime = setInterval(() => {
      count++;
      if (count === 4) count = 0;
      product.style.transform = count >= 3
        ? "translateX(20rem)"
        : "translateX(-20rem)";
    }, 1000);

    product.addEventListener("mouseover", () => clearInterval(oneTime));
    product.addEventListener("mouseout", () => {
      oneTime = setInterval(() => {
        count++;
        if (count === 4) count = 0;
        product.style.transform = count >= 3
          ? "translateX(20rem)"
          : "translateX(-20rem)";
      }, 1000);
    });

    // Login popup
    function showSignUpForm(e) {
      e.preventDefault();
      if (loginForm)     loginForm.classList.remove("hidden");
      if (exitContainer) exitContainer.classList.remove("hidden");
    }
    function removeSignUpForm(e) {
      e.preventDefault();
      if (loginForm)     loginForm.classList.add("hidden");
      if (exitContainer) exitContainer.classList.add("hidden");
    }

    checkOut.forEach(btn => btn.addEventListener("click", showSignUpForm));
    eachProduct.forEach(pd => pd.addEventListener("click", showSignUpForm));
    if (exitContainer) exitContainer.addEventListener("click", removeSignUpForm);
  }

  // ── Customer login form (nav/login.html) ─────────────────
  const loginFormEl = document.getElementById("loginForm");

  if (loginFormEl) {
    const loginError = document.getElementById("loginError");

    loginFormEl.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email    = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;
      const btn      = loginFormEl.querySelector("button[type='submit']");

      btn.textContent = "Logging in…";
      btn.disabled    = true;
      if (loginError) loginError.style.display = "none";

      try {
        const res  = await fetch("/sweetfeet/api/auth/login", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
          localStorage.setItem("sf_user_email", data.email);
          localStorage.setItem("sf_user_id",    data.user_id);
          localStorage.setItem("sf_user_name",  data.name || "");

          // Redirect back to page they came from, or homepage
          const next = new URLSearchParams(window.location.search).get("next");
          window.location.href = next || "/sweetfeet/index.html";
        } else {
          if (loginError) {
            loginError.textContent = data.error;
            loginError.style.display = "block";
          }
          btn.textContent = "Login";
          btn.disabled    = false;
        }
      } catch {
        if (loginError) {
          loginError.textContent = "Network error. Please try again.";
          loginError.style.display = "block";
        }
        btn.textContent = "Login";
        btn.disabled    = false;
      }
    });
  }

  // ── Customer signup form (nav/signup.html) ───────────────
  const signupFormEl = document.getElementById("signupForm");

  if (signupFormEl) {
    const signupError = document.getElementById("signupError");

    signupFormEl.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email    = document.getElementById("signupEmail").value.trim();
      const password = document.getElementById("signupPassword").value;
      const btn      = signupFormEl.querySelector("button[type='submit']");

      btn.textContent = "Creating account…";
      btn.disabled    = true;
      if (signupError) signupError.style.display = "none";

      try {
        const res  = await fetch("/sweetfeet/api/auth/signup", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
          window.location.href = "/sweetfeet/nav/login.html?registered=1";
        } else {
          if (signupError) {
            signupError.textContent = data.error;
            signupError.style.display = "block";
          }
          btn.textContent = "Sign Up";
          btn.disabled    = false;
        }
      } catch {
        if (signupError) {
          signupError.textContent = "Network error. Please try again.";
          signupError.style.display = "block";
        }
        btn.textContent = "Sign Up";
        btn.disabled    = false;
      }
    });

    // Show "registered" message if redirected from signup
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("registered") === "1") {
      const msg = document.getElementById("loginSuccess");
      if (msg) {
        msg.textContent   = "Account created successfully. Please log in.";
        msg.style.display = "block";
      }
    }
  }

  // ── Feedback form (nav/feedback.html) ────────────────────
  const feedbackFormEl = document.getElementById("feedbackForm");

  if (feedbackFormEl) {
    feedbackFormEl.addEventListener("submit", async function (e) {
      e.preventDefault();
      const btn = feedbackFormEl.querySelector(".fb_submit");
      btn.textContent = "Sending…";
      btn.disabled    = true;

      const payload = {
        name:     document.getElementById("fb_name").value.trim(),
        email:    document.getElementById("fb_email").value.trim(),
        category: document.getElementById("fb_category").value,
        rating:   document.querySelector("input[name='rating']:checked")?.value || null,
        message:  document.getElementById("fb_message").value.trim()
      };

      try {
        const res  = await fetch("/sweetfeet/api/feedback", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
          feedbackFormEl.style.display = "none";
          const successEl = document.getElementById("fbSuccess");
          if (successEl) successEl.classList.remove("hidden");
        } else {
          btn.textContent = "Send Feedback →";
          btn.disabled    = false;
          alert(data.error || "Could not send feedback. Please try again.");
        }
      } catch {
        btn.textContent = "Send Feedback →";
        btn.disabled    = false;
        alert("Network error. Please check your connection.");
      }
    });
  }
}
