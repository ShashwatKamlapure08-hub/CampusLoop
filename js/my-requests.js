// ==========================================================================
// CampusLoop — my-requests.js
//
// CONFIRMED CONTRACT (src/routes/borrowRequests.js):
//   GET /api/borrow-requests/received  (protected, as owner)
//     -> 200 [ { request_id, item_id, borrower_id, owner_id, hours_requested,
//                total_price, status, request_date, return_date,
//                item_name, borrower_name }, ... ]
//   GET /api/borrow-requests/sent      (protected, as borrower)
//     -> 200 [ { ...same fields..., owner_name }, ... ]
//   PUT /api/borrow-requests/:id/status   body: { status: 'APPROVED' | 'REJECTED' }
//     -> 200 { message }   (owner only)
//   PUT /api/borrow-requests/:id/return   (no body)
//     -> 200 { message }   (borrower or owner)
//
//   status values: PENDING, APPROVED, REJECTED, RETURNED
// ==========================================================================

let currentTab = "received"; // "received" | "sent"
const cache = { received: null, sent: null };

async function loadTab(tab) {
  const loadingEl = document.getElementById("requests-loading");
  const emptyEl = document.getElementById("requests-empty");
  const bannerEl = document.getElementById("requests-banner");
  const listEl = document.getElementById("requests-list");

  listEl.innerHTML = "";
  emptyEl.style.display = "none";
  hideBanner(bannerEl);
  loadingEl.style.display = "block";

  try {
    if (!cache[tab]) {
      cache[tab] = await apiFetch(`/borrow-requests/${tab}`);
    }
    renderList(cache[tab], tab);
  } catch (err) {
    showBanner(bannerEl, err.message || "Couldn't load requests.", "error");
  } finally {
    loadingEl.style.display = "none";
  }
}

function renderList(requests, tab) {
  const listEl = document.getElementById("requests-list");
  const emptyEl = document.getElementById("requests-empty");

  if (!requests || requests.length === 0) {
    listEl.innerHTML = "";
    emptyEl.textContent =
      tab === "received"
        ? "No one has requested to borrow your items yet."
        : "You haven't requested to borrow anything yet.";
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  listEl.innerHTML = requests.map((r) => requestCardHtml(r, tab)).join("");

  listEl.querySelectorAll("[data-approve-id]").forEach((btn) => {
    btn.addEventListener("click", () => updateStatus(btn.getAttribute("data-approve-id"), "APPROVED"));
  });
  listEl.querySelectorAll("[data-reject-id]").forEach((btn) => {
    btn.addEventListener("click", () => updateStatus(btn.getAttribute("data-reject-id"), "REJECTED"));
  });
  listEl.querySelectorAll("[data-return-id]").forEach((btn) => {
    btn.addEventListener("click", () => markReturned(btn.getAttribute("data-return-id")));
  });
}

function requestCardHtml(r, tab) {
  const counterpartLabel = tab === "received" ? "Requested by" : "Owned by";
  const counterpartName = tab === "received" ? r.borrower_name : r.owner_name;
  const statusClass = `status-${r.status.toLowerCase()}`;
  const dateStr = formatDate(r.request_date);

  let actionsHtml = "";
  if (tab === "received" && r.status === "PENDING") {
    actionsHtml = `
      <button type="button" class="btn btn-ghost" data-reject-id="${r.request_id}">Reject</button>
      <button type="button" class="btn btn-primary" data-approve-id="${r.request_id}">Approve</button>
    `;
  } else if (r.status === "APPROVED") {
    actionsHtml = `<button type="button" class="btn btn-primary" data-return-id="${r.request_id}">Mark returned</button>`;
  }

  return `
    <div class="request-card">
      <div class="request-main">
        <div class="request-item-name">${escapeHtml(r.item_name)}</div>
        <div class="request-meta">
          <span>${counterpartLabel} ${escapeHtml(counterpartName)}</span>
          <span class="divider">·</span>
          <span>${r.hours_requested} hr${r.hours_requested == 1 ? "" : "s"}</span>
          <span class="divider">·</span>
          <span>${dateStr}</span>
        </div>
      </div>
      <div class="request-price">₹${Number(r.total_price).toFixed(2)}</div>
      <span class="status-badge ${statusClass}">${r.status}</span>
      <div class="request-actions">${actionsHtml}</div>
    </div>
  `;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

async function updateStatus(requestId, status) {
  const bannerEl = document.getElementById("requests-banner");
  try {
    await apiFetch(`/borrow-requests/${requestId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    cache.received = null; // force refetch — the list changed
    showBanner(bannerEl, `Request ${status === "APPROVED" ? "approved" : "rejected"}.`, "success");
    loadTab(currentTab);
  } catch (err) {
    showBanner(bannerEl, err.message || "Couldn't update the request.", "error");
  }
}

async function markReturned(requestId) {
  const bannerEl = document.getElementById("requests-banner");
  try {
    await apiFetch(`/borrow-requests/${requestId}/return`, { method: "PUT" });
    cache.received = null;
    cache.sent = null; // both lists may show this request — refetch both
    showBanner(bannerEl, "Marked as returned.", "success");
    loadTab(currentTab);
  } catch (err) {
    showBanner(bannerEl, err.message || "Couldn't mark as returned.", "error");
  }
}

function switchTab(tab) {
  currentTab = tab;
  document.getElementById("tab-received-btn").classList.toggle("active", tab === "received");
  document.getElementById("tab-sent-btn").classList.toggle("active", tab === "sent");
  loadTab(tab);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  if (!requireAuth()) return;

  document.getElementById("tab-received-btn").addEventListener("click", () => switchTab("received"));
  document.getElementById("tab-sent-btn").addEventListener("click", () => switchTab("sent"));

  loadTab("received");
});
