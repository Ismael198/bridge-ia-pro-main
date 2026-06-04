// Server-only API methods for Mercado Livre Items (Products/Listings)
// All calls signed with user's access token, never exposed to client

import { mlFetch } from "./mercadolivre.server";

// ============ ITEMS / PRODUCTS API ============

/**
 * List all active items (listings) for authenticated user
 * GET /users/me/items
 */
export async function listUserItems(userId: string, opts?: { limit?: number; offset?: number }) {
  const url = new URL("https://api.mercadolibre.com/users/me/items");
  if (opts?.limit) url.searchParams.set("limit", String(opts.limit));
  if (opts?.offset) url.searchParams.set("offset", String(opts.offset));

  const items = await mlFetch(userId, url.pathname + url.search);
  return Array.isArray(items) ? items : items.results || [];
}

/**
 * Get detailed info about a specific item
 * GET /items/{ITEM_ID}
 */
export async function getItem(userId: string, itemId: string): Promise<any> {
  return mlFetch(userId, `/items/${itemId}`);
}

/**
 * Create a new product listing
 * POST /items
 *
 * Required fields:
 * - site_id: "MLA" (Brazil)
 * - title: string
 * - category_id: string (from category search)
 * - price: number
 * - currency_id: "BRL"
 * - available_quantity: number
 * - buying_mode: "buy_it_now"
 * - listing_type_id: "gold" | "gold_special" | etc
 * - condition: "new" | "used"
 * - pictures: [{ source: "https://..." }]
 *
 * Optional:
 * - description: string
 * - attributes: [{ id, value_id }]
 * - shipping: { mode: "me1" | "me2" }
 */
export async function createItem(userId: string, itemData: any): Promise<any> {
  return mlFetch(userId, "/items", {
    method: "POST",
    body: JSON.stringify(itemData),
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Update a product listing
 * PUT /items/{ITEM_ID}
 *
 * Restrictions depend on item state:
 * - If sold_quantity > 0: Cannot change title, buying_mode, payment methods
 * - If has sales: Can change price, available_quantity, pictures, description
 * - If sold_quantity = 0: Can change title
 *
 * ⚠️ CRITICAL (March 2026): If item has price_automation enabled,
 * requests that ONLY update 'price' will be rejected (400 Bad Request).
 * Always include another field (e.g., description).
 */
export async function updateItem(userId: string, itemId: string, updateData: any): Promise<any> {
  return mlFetch(userId, `/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(updateData),
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Change item status
 * PUT /items/{ITEM_ID}
 *
 * Possible values (case-sensitive, lowercase):
 * - "active" - Item is published and visible
 * - "paused" - Item is hidden but not ended
 * - "closed" - Item is ended (archive)
 */
export async function setItemStatus(userId: string, itemId: string, status: "active" | "paused" | "closed"): Promise<any> {
  return updateItem(userId, itemId, { status });
}

/**
 * Delete a product listing
 * Step 1: Change status to "closed"
 * Step 2: Set deleted: true
 *
 * Note: If you get 409 (conflict status), wait a few seconds and retry.
 */
export async function deleteItem(userId: string, itemId: string): Promise<void> {
  // Step 1: Close
  await updateItem(userId, itemId, { status: "closed" });

  // Step 2: Delete (usually requires a second request)
  await updateItem(userId, itemId, { deleted: true });
}

/**
 * Upload pictures to an existing item
 * POST /items/{ITEM_ID}/pictures
 *
 * Payload:
 * [
 *   { "source": "https://example.com/image.jpg" },
 *   { "source": "https://example.com/image2.jpg" }
 * ]
 *
 * Returns array of pictures with secure_url, id, etc.
 */
export async function uploadItemPictures(
  userId: string,
  itemId: string,
  pictures: Array<{ source: string }>
): Promise<any[]> {
  return mlFetch(userId, `/items/${itemId}/pictures`, {
    method: "POST",
    body: JSON.stringify(pictures),
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Get category metadata (attributes, required fields, etc)
 * GET /categories/{CATEGORY_ID}
 * Public endpoint - no auth required
 */
export async function getCategoryMetadata(categoryId: string): Promise<any> {
  const res = await fetch(`https://api.mercadolibre.com/categories/${categoryId}`);
  if (!res.ok) throw new Error(`Failed to fetch category ${categoryId}: ${res.status}`);
  return res.json();
}

/**
 * Get category attributes (brand, model, color, etc)
 * GET /categories/{CATEGORY_ID}/attributes
 * Public endpoint - no auth required
 */
export async function getCategoryAttributes(categoryId: string): Promise<any[]> {
  const res = await fetch(`https://api.mercadolibre.com/categories/${categoryId}/attributes`);
  if (!res.ok) throw new Error(`Failed to fetch attributes for ${categoryId}: ${res.status}`);
  return res.json();
}

/**
 * Search category by name
 * GET /sites/MLA/category_predictor/predict
 * Public endpoint
 */
export async function predictCategory(query: string): Promise<any[]> {
  const url = new URL("https://api.mercadolibre.com/sites/MLA/category_predictor/predict");
  url.searchParams.set("title", query);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Category prediction failed: ${res.status}`);
  const json = await res.json();
  return json.categories || [];
}

/**
 * Search products in marketplace (for checking duplicates, finding similar items)
 * GET /sites/{SITE_ID}/search?q=...&limit=50
 * Public endpoint
 */
export async function searchProducts(query: string, opts?: { limit?: number; category?: string }): Promise<any> {
  const url = new URL("https://api.mercadolibre.com/sites/MLA/search");
  url.searchParams.set("q", query);
  if (opts?.limit) url.searchParams.set("limit", String(opts.limit));
  if (opts?.category) url.searchParams.set("category", opts.category);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

/**
 * Update item quantity/stock
 * PUT /items/{ITEM_ID}
 *
 * ⚠️ Important:
 * - Setting available_quantity = 0 changes status to "paused" with substatus "out_of_stock"
 * - Setting available_quantity > 0 when out_of_stock changes status back to "active"
 * - Cannot pause with available_quantity = 0 if condition = "used"
 */
export async function updateItemQuantity(userId: string, itemId: string, quantity: number): Promise<any> {
  return updateItem(userId, itemId, { available_quantity: quantity });
}

/**
 * Update item price
 * PUT /items/{ITEM_ID}
 *
 * ⚠️ CRITICAL: From March 18, 2026 onwards:
 * If item has price automation enabled, requests that ONLY update 'price'
 * will be rejected with 400 Bad Request.
 * Solution: Always include another field in the update, or check automation first.
 */
export async function updateItemPrice(userId: string, itemId: string, price: number, opts?: { description?: string }): Promise<any> {
  const updateData: any = { price };

  // Always include at least one other field to avoid March 2026 rejection
  if (opts?.description) {
    updateData.description = opts.description;
  } else {
    // Default: include current description or a dummy change
    // To be safe, fetch current item and include description
    const current = await getItem(userId, itemId);
    updateData.description = current.description || "Anúncio atualizado";
  }

  return updateItem(userId, itemId, updateData);
}

/**
 * Update item description
 * PUT /items/{ITEM_ID}
 */
export async function updateItemDescription(userId: string, itemId: string, description: string): Promise<any> {
  return updateItem(userId, itemId, { description });
}
