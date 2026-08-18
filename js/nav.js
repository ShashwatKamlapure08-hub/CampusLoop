// ==========================================================================
// CampusLoop — nav.js
// Renders the shared top navbar into <header id="app-nav"></header>.
// Every protected page includes an empty <header id="app-nav"></header> in
// its HTML; this script fills it in on load. Keeping one navbar definition
// here means adding/renaming a page only requires editing this one file.
//
// Depends on auth.js (getCurrentUser, clearSession) being loaded first.
// ==========================================================================

const NAV_LINKS = [
  { href: "browse.html", label: "Browse Items" },
  { href: "my-items.html", label: "My Listed Items" },
  { href: "my-requests.html", label: "My Requests" },
  { href: "notifications.html", label: "Notifications" },
];

function renderNav() {
  const mount = document.getElementById("app-nav");
  if (!mount) return;

  const user = getCurrentUser();
  const currentPage = window.location.pathname.split("/").pop();

  const linksHtml = NAV_LINKS.map((link) => {
    const isActive = link.href === currentPage;
    return `<a href="${link.href}" class="app-nav-link${isActive ? " active" : ""}">${link.label}</a>`;
  }).join("");

  mount.innerHTML = `
    <div class="app-nav-inner">
      <a href="browse.html" class="app-nav-brand">
        <span class="app-nav-brand-mark">CL</span>
        <span class="app-nav-brand-name">CampusLoop</span>
      </a>
      <nav class="app-nav-links">${linksHtml}</nav>
      <div class="app-nav-user">
        <span class="app-nav-user-name">${user ? escapeHtml(user.name) : ""}</span>
        <button type="button" id="app-nav-logout" class="btn-ghost app-nav-logout-btn">Log out</button>
      </div>
    </div>
  `;

  document.getElementById("app-nav-logout").addEventListener("click", () => {
    clearSession();
    window.location.href = "login.html";
  });
}

// Minimal escaping since user.name is rendered as raw HTML above.
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", renderNav);
