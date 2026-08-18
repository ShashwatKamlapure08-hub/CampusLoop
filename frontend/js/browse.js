// ==========================================================================
// CampusLoop — browse.js
//
// CONFIRMED CONTRACT (src/routes/items.js):
//   GET /api/items  (no auth required, but we send the token anyway via
//                    apiFetch — harmless, and keeps every request consistent)
//     -> 200 [ { item_id, owner_id, name, description, category, image_url,
//                price_per_hour, availability, created_at, owner_name }, ... ]
//
// CONFIRMED CONTRACT (src/routes/borrowRequests.js):
//   POST /api/borrow-requests   (protected)
//     body: { item_id, hours_requested }
//     -> 201 { message, request_id, total_price }
//     -> 400 { error: "..." }  (missing fields, item unavailable, own item)
//     -> 404 { error: "Item not found" }
//   Server computes total_price itself from price_per_hour * hours_requested
//   — the client-side estimate below is just a preview, not authoritative.
// ==========================================================================

let allItems = [];
let selectedItem = null;

async function loadItems() {
  const loadingEl = document.getElementById("browse-loading");
  const emptyEl = document.getElementById("browse-empty");
  const bannerEl = document.getElementById("browse-banner");

  loadingEl.style.display = "block";
  emptyEl.style.display = "none";
  hideBanner(bannerEl);

  try {
    const items = await apiFetch("/items");
    allItems = Array.isArray(items) ? items : [];
    renderItems(allItems);
  } catch (err) {
    showBanner(bannerEl, err.message || "Couldn't load items.", "error");
  } finally {
    loadingEl.style.display = "none";
  }
}

function renderItems(items) {
  const grid = document.getElementById("browse-grid");
  const emptyEl = document.getElementById("browse-empty");
  const currentUser = getCurrentUser();

  if (items.length === 0) {
    grid.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  grid.innerHTML = items.map((item) => itemCardHtml(item, currentUser)).join("");

  // Wire up borrow buttons (event delegation would also work, but the
  // grid re-renders wholesale on every search/filter, so direct binding
  // after render is simplest here).
  grid.querySelectorAll("[data-borrow-item-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const itemId = btn.getAttribute("data-borrow-item-id");
      const item = allItems.find((i) => String(i.item_id) === String(itemId));
      if (item) openBorrowModal(item);
    });
  });
}

function itemCardHtml(item, currentUser) {
  const isOwnItem = currentUser && String(item.owner_id) === String(currentUser.user_id);
  const initial = (item.name || "?").trim().charAt(0).toUpperCase();

  const imageHtml = item.image_url
    ? `<img src="${escapeAttr(item.image_url)}" alt="${escapeAttr(item.name)}" />`
    : `<div class="item-image-placeholder">${initial}</div>`;

  return `
    <div class="item-card">
      <div class="item-image">${imageHtml}</div>
      <div class="item-body">
        <div class="item-top-row">
          <span class="item-name">${escapeHtml(item.name)}</span>
          ${item.category ? `<span class="item-category">${escapeHtml(item.category)}</span>` : ""}
        </div>
        ${item.description ? `<p class="item-description">${escapeHtml(item.description)}</p>` : ""}
        <span class="item-owner">Listed by ${escapeHtml(item.owner_name)}</span>
        <div class="item-bottom-row">
          <div class="item-price">₹${formatPrice(item.price_per_hour)} <span>/ hr</span></div>
          ${
            isOwnItem
              ? `<span class="item-owned-badge">Your listing</span>`
              : `<button type="button" class="btn btn-primary item-borrow-btn" data-borrow-item-id="${item.item_id}">Borrow</button>`
          }
        </div>
      </div>
    </div>
  `;
}

function formatPrice(price) {
  const num = Number(price);
  return Number.isInteger(num) ? num : num.toFixed(2);
}

// ---------------------------------------------------------------------
// Search filter (client-side, over already-loaded items)
// ---------------------------------------------------------------------
function initSearch() {
  const input = document.getElementById("browse-search-input");
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      renderItems(allItems);
      return;
    }
    const filtered = allItems.filter((item) => {
      return (
        (item.name || "").toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q)
      );
    });
    renderItems(filtered);
  });
}

// ---------------------------------------------------------------------
// Borrow modal
// ---------------------------------------------------------------------
function openBorrowModal(item) {
  selectedItem = item;

  document.getElementById("borrow-modal-title").textContent = item.name;
  document.getElementById("borrow-modal-owner").textContent = `Listed by ${item.owner_name} · ₹${formatPrice(item.price_per_hour)}/hr`;

  const hoursInput = document.getElementById("borrow-hours-input");
  hoursInput.value = 1;
  updateEstimatedPrice();

  hideBanner(document.getElementById("borrow-modal-banner"));
  document.getElementById("borrow-modal-overlay").style.display = "flex";
}

function closeBorrowModal() {
  selectedItem = null;
  document.getElementById("borrow-modal-overlay").style.display = "none";
}

function updateEstimatedPrice() {
  if (!selectedItem) return;
  const hours = Number(document.getElementById("borrow-hours-input").value) || 0;
  const total = hours * Number(selectedItem.price_per_hour);
  document.getElementById("borrow-price-value").textContent = `₹${formatPrice(total)}`;
}

async function submitBorrowRequest() {
  if (!selectedItem) return;

  const hours = Number(document.getElementById("borrow-hours-input").value);
  const banner = document.getElementById("borrow-modal-banner");
  const confirmBtn = document.getElementById("borrow-confirm-btn");

  if (!hours || hours < 1) {
    showBanner(banner, "Enter a valid number of hours.", "error");
    return;
  }

  confirmBtn.disabled = true;
  confirmBtn.textContent = "Sending…";

  try {
    const result = await apiFetch("/borrow-requests", {
      method: "POST",
      body: JSON.stringify({ item_id: selectedItem.item_id, hours_requested: hours }),
    });

    closeBorrowModal();
    showBanner(
      document.getElementById("browse-banner"),
      `Borrow request sent — total ₹${result.total_price}.`,
      "success"
    );
  } catch (err) {
    showBanner(banner, err.message || "Couldn't send the request.", "error");
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Send request";
  }
}

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

document.addEventListener("DOMContentLoaded", () => {
  if (!requireAuth()) return;

  loadItems();
  initSearch();

  document.getElementById("borrow-hours-input").addEventListener("input", updateEstimatedPrice);
  document.getElementById("borrow-cancel-btn").addEventListener("click", closeBorrowModal);
  document.getElementById("borrow-confirm-btn").addEventListener("click", submitBorrowRequest);
  document.getElementById("borrow-modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "borrow-modal-overlay") closeBorrowModal();
  });
});
