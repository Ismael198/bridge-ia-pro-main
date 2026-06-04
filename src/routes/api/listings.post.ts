// Server function: POST /api/listings
// Creates a new product listing on Mercado Livre

import { createServerFn } from "@tanstack/react-start/server";
import { createItem, predictCategory } from "@/lib/mercadolivre.items";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface CreateListingRequest {
  title: string;
  description?: string;
  price: number;
  available_quantity: number;
  condition: "new" | "used";
  category_id?: string;
  pictures?: Array<{ source: string }>;
  attributes?: Array<{
    id: string;
    value_id?: string;
    value_name?: string;
  }>;
  shipping?: {
    mode?: "me1" | "me2" | "not_specified";
    free_shipping?: boolean;
  };
}

export interface CreateListingResponse {
  id: string;
  title: string;
  price: number;
  status: string;
  permalink: string;
}

export const createListing = createServerFn({ method: "POST" })(async function (payload: CreateListingRequest) {
  try {
    // @ts-ignore
    const userId = this?.context?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    console.log(`[CreateListing] Creating for user ${userId}`);

    // Predict category if not provided
    let categoryId = payload.category_id;
    if (!categoryId) {
      console.log(`[CreateListing] Predicting category for: ${payload.title}`);
      const predictions = await predictCategory(payload.title);
      if (predictions.length === 0) {
        throw new Error("Could not predict category for this product");
      }
      categoryId = predictions[0].id;
      console.log(`[CreateListing] Auto-predicted category: ${categoryId}`);
    }

    // Build item payload
    const itemData = {
      site_id: "MLA", // Brazil - adjust for other countries
      title: payload.title,
      category_id: categoryId,
      price: payload.price,
      currency_id: "BRL", // Brazil - adjust for other countries
      available_quantity: payload.available_quantity,
      condition: payload.condition,
      buying_mode: "buy_it_now",
      listing_type_id: "gold_special", // Can be: gold, gold_special, etc
      pictures: payload.pictures || [],
      ...(payload.description && { description: payload.description }),
      ...(payload.attributes && { attributes: payload.attributes }),
      ...(payload.shipping && { shipping: payload.shipping }),
    };

    console.log(`[CreateListing] Payload:`, JSON.stringify(itemData, null, 2));

    // Create on ML API
    const created = await createItem(userId, itemData);

    console.log(`[CreateListing] Created item: ${created.id}`);

    // Optionally cache it
    await supabaseAdmin.from("listings_cache").insert({
      user_id: userId,
      item_id: created.id,
      title: created.title,
      price: created.price,
      status: created.status,
      sold_quantity: created.sold_quantity || 0,
      available_quantity: created.available_quantity || 0,
      category_id: created.category_id,
      condition: created.condition,
      currency_id: created.currency_id,
      permalink: created.permalink,
      data: created,
      synced_at: new Date().toISOString(),
    });

    return {
      id: created.id,
      title: created.title,
      price: created.price,
      status: created.status,
      permalink: created.permalink,
    };
  } catch (error) {
    console.error("[CreateListing] Error:", error);
    throw error;
  }
});

export type CreateListingRequest_Type = CreateListingRequest;
export type CreateListingResponse_Type = CreateListingResponse;
