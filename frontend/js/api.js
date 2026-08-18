// ==========================================================================
// CampusLoop — api.js
// Every protected page (browse, my-items, my-requests, notifications) should
// use apiFetch() instead of raw fetch(). It automatically:
//   - Prefixes API_BASE_URL
//   - Attaches the JWT as an Authorization header
//   - Redirects to login.html if the token is missing/expired (401)
//   - Normalizes error responses to a single thrown Error with a clean message
//
// Depends on auth.js being loaded first (getToken, clearSession).
// ==========================================================================

async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (networkErr) {
    // Backend unreachable — MySQL/Node down, wrong port, CORS block, etc.
    throw new Error("Can't reach the server. Is the backend running?");
  }

  // Token missing/expired/invalid — bounce back to login.
  if (res.status === 401) {
    clearSession();
    window.location.href = "login.html";
    throw new Error("Session expired. Please log in again.");
  }

  // Some endpoints (e.g. DELETE with no body) may return no content.
  let data = {};
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON response (e.g. an HTML error page from a wrong route).
      throw new Error(`Unexpected response from server (status ${res.status}).`);
    }
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }

  return data;
}

// Call at the top of any protected page's init script.
// Redirects unauthenticated visitors straight to login.
function requireAuth() {
  if (!getToken()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}
