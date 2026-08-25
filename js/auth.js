// ==========================================================================
// CampusLoop — auth.js
// Handles register/login form submission, JWT storage, and simple
// route-guarding helpers reused by every other page.
//
// BACKEND CONTRACT (confirmed against src/routes/users.js):
//   POST /api/users/register  body: { name, email, password }
//     -> 201 { message, user_id }                          (no token)
//     -> 4xx { error: "..." }
//   POST /api/users/login     body: { email, password }
//     -> 200 { message, token, user: { user_id, name, email } }
//     -> 401 { error: "Invalid email or password" }
// ==========================================================================

function saveSession(token, user) {
  localStorage.setItem("campusloop_token", token);
  localStorage.setItem("campusloop_user", JSON.stringify(user));
}

function getToken() {
  return localStorage.getItem("campusloop_token");
}

function getCurrentUser() {
  const raw = localStorage.getItem("campusloop_user");
  return raw ? JSON.parse(raw) : null;
}

function clearSession() {
  localStorage.removeItem("campusloop_token");
  localStorage.removeItem("campusloop_user");
}

function redirectIfLoggedIn() {
  const isLoginPage = document.getElementById("login-form");
  const isRegisterPage = document.getElementById("register-form");

  // Only redirect from login/register pages.
  // Do NOT redirect from browse.html or other authenticated pages.
  if ((isLoginPage || isRegisterPage) && getToken()) {
    window.location.href = "browse.html";
  }
}

function showBanner(el, message, type) {
  el.textContent = message;
  el.className = "banner show " + (type === "error" ? "banner-error" : "banner-success");
}

function hideBanner(el) {
  el.className = "banner";
  el.textContent = "";
}

function setLoading(button, isLoading, idleText, loadingText) {
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : idleText;
}

// ---------------------------------------------------------------------
// Login form
// ---------------------------------------------------------------------
function initLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;

  const banner = document.getElementById("login-banner");
  const submitBtn = document.getElementById("login-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideBanner(banner);

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    setLoading(submitBtn, true, "Log in", "Logging in…");

    try {
      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Couldn't log in. Check your email and password.");
      }

      saveSession(data.token, data.user);
      window.location.href = "browse.html";
    } catch (err) {
      showBanner(banner, err.message || "Something went wrong. Try again.", "error");
      setLoading(submitBtn, false, "Log in", "Logging in…");
    }
  });
}

// ---------------------------------------------------------------------
// Register form
// ---------------------------------------------------------------------
function initRegisterForm() {
  const form = document.getElementById("register-form");
  if (!form) return;

  const banner = document.getElementById("register-banner");
  const submitBtn = document.getElementById("register-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideBanner(banner);

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("register-confirm-password").value;

    if (password !== confirmPassword) {
      showBanner(banner, "Passwords don't match.", "error");
      return;
    }

    if (password.length < 6) {
      showBanner(banner, "Password should be at least 6 characters.", "error");
      return;
    }

    setLoading(submitBtn, true, "Create account", "Creating account…");

    try {
      const res = await fetch(`${API_BASE_URL}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Couldn't create your account. Check your details.");
      }

      // /api/users/register doesn't return a token — it only confirms
      // the account was created. Send the user to login to sign in.
      window.location.href = "login.html?registered=1";
    } catch (err) {
      showBanner(banner, err.message || "Something went wrong. Try again.", "error");
      setLoading(submitBtn, false, "Create account", "Creating account…");
    }
  });
}

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  redirectIfLoggedIn();
  initLoginForm();
  initRegisterForm();

  // Show a success banner on login page after redirect from register
  const params = new URLSearchParams(window.location.search);
  if (params.get("registered") === "1") {
    const banner = document.getElementById("login-banner");
    if (banner) showBanner(banner, "Account created. Log in to continue.", "success");
  }
});
