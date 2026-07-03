// Server function: GET /api/listings
// Fetches user's listings live from Mercado Livre (no local cache — see migration
// decision to "degrade" listings_cache; data is always read live from the ML API).

import { createServerFn } from "@tanstack/react-start/server";
import { listUserItems } from "@/lib/mercadolivre.items";

// Define return type for client-side
export interface ListingData {
  id: string;
  title: string;
  price: number;
  status: string;
  available_quantity: number;
  sold_quantity: number;
  currency_id: string;
  condition: string;
  pictures: Array<{ id: string; secure_url: string }>;
  category_id: string;
  permalink: string;
  start_time: string;
  last_updated: string;
}

export const getListings = createServerFn({ method: "GET" })(async function (opts) {
  try {
    // Get user from context (TanStack Start provides this)
    // @ts-ignore - context comes from middleware
    const userId = opts?.context?.user?.id || this?.context?.user?.id;

    if (!userId) {
      throw new Error("Unauthorized: No user in context");
    }

    console.log(`[Listings] Fetching for user ${userId}`);

    // Fetch from ML API
    const items = await listUserItems(userId, { limit: 100 });

    if (!items || items.length === 0) {
      console.log(`[Listings] No items found for user ${userId}`);
      return [];
    }

    console.log(`[Listings] Got ${items.length} items from ML API`);

    // Return formatted data for client (live — no cache write)
    return items.map((item: any): ListingData => ({
      id: item.id,
      title: item.title,
      price: item.price,
      status: item.status,
      available_quantity: item.available_quantity || 0,
      sold_quantity: item.sold_quantity || 0,
      currency_id: item.currency_id,
      condition: item.condition,
      pictures: item.pictures || [],
      category_id: item.category_id,
      permalink: item.permalink,
      start_time: item.start_time,
      last_updated: item.last_updated,
    }));
  } catch (error) {
    console.error("[Listings] Error:", error);
    throw error;
  }
});

// Export type for client-side typing
export type GetListingsResponse = ListingData[];
