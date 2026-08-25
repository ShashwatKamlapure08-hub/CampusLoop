// ==========================================================================
// CampusLoop — my-items.js
//
// CONFIRMED CONTRACT (src/routes/items.js):
//   GET /api/items/mine   (protected)
//     -> 200 [ { item_id, owner_id, name, description, category, image_url,
//                price_per_hour, availability, created_at }, ... ]
//     Returns ALL of the logged-in user's items regardless of availability
//     (unlike GET /api/items, which only shows available items to browsers).
//
//   POST /api/items   (protected)
//     body: { name, description, category, image_url, price_per_hour }
//     -> 201 { message, item_id }
//     -> 400 { error: "Name and price_per_hour are required" }
// ==========================================================================

async function loadMyItems() {
  const loadingEl = document.getElementById("items-loading");
  const emptyEl = document.getElementById("items-empty");
  const bannerEl = document.getElementById("items-banner");
  const grid = document.getElementById("items-grid");

  loadingEl.style.display = "block";
  emptyEl.style.display = "none";
  hideBanner(bannerEl);

  try {
    const items = await apiFetch("/items/mine");
    renderMyItems(Array.isArray(items) ? items : []);
  } catch (err) {
    showBanner(bannerEl, err.message || "Couldn't load your items.", "error");
    grid.innerHTML = "";
  } finally {
    loadingEl.style.display = "none";
  }
}

function renderMyItems(items) {
  const grid = document.getElementById("items-grid");
  const emptyEl = document.getElementById("items-empty");

  if (items.length === 0) {
    grid.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  grid.innerHTML = items.map(myItemCardHtml).join("");
}

function myItemCardHtml(item) {
  const initial = (item.name || "?").trim().charAt(0).toUpperCase();
  const isAvailable = Number(item.availability) === 1;

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
        <div class="item-bottom-row">
          <div class="item-price">₹${formatPrice(item.price_per_hour)} <span>/ hr</span></div>
          <span class="item-status-badge ${isAvailable ? "status-available" : "status-borrowed"}">
            ${isAvailable ? "Available" : "Currently borrowed"}
          </span>
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
// List new item modal
// ---------------------------------------------------------------------
function openListItemModal() {
  document.getElementById("list-item-form").reset();
  hideBanner(document.getElementById("list-item-banner"));
  document.getElementById("list-item-modal-overlay").style.display = "flex";
}

function closeListItemModal() {
  document.getElementById("list-item-modal-overlay").style.display = "none";
}

async function submitListItem(e) {
  e.preventDefault();

  const name = document.getElementById("item-name-input").value.trim();
  const category = document.getElementById("item-category-input").value.trim();
  const price = document.getElementById("item-price-input").value;
  const description = document.getElementById("item-description-input").value.trim();
  const imageUrl = document.getElementById("item-image-input").value.trim();

  const banner = document.getElementById("list-item-banner");
  const submitBtn = document.getElementById("list-item-submit-btn");

  if (!name) {
    showBanner(banner, "Item name is required.", "error");
    return;
  }
  const priceNum = Number(price);
  if (price === "" || isNaN(priceNum) || priceNum < 0) {
    showBanner(banner, "Enter a valid price per hour.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Listing…";

  try {
    await apiFetch("/items", {
      method: "POST",
      body: JSON.stringify({
        name,
        description: description || undefined,
        category: category || undefined,
        image_url: imageUrl || undefined,
        price_per_hour: priceNum,
      }),
    });

    closeListItemModal();
    showBanner(document.getElementById("items-banner"), "Item listed successfully.", "success");
    loadMyItems();
  } catch (err) {
    showBanner(banner, err.message || "Couldn't list the item.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "List item";
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

  loadMyItems();

  document.getElementById("open-list-item-btn").addEventListener("click", openListItemModal);
  document.getElementById("list-item-cancel-btn").addEventListener("click", closeListItemModal);
  document.getElementById("list-item-form").addEventListener("submit", submitListItem);
  document.getElementById("list-item-modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "list-item-modal-overlay") closeListItemModal();
  });
});
