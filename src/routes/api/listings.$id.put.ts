// Server function: PUT /api/listings/$id
// Updates an existing product listing on Mercado Livre

import { createServerFn } from "@tanstack/react-start/server";
import { updateItem, getItem, setItemStatus } from "@/lib/mercadolivre.items";

export interface UpdateListingRequest {
  title?: string;
  description?: string;
  price?: number;
  available_quantity?: number;
  pictures?: Array<{ source: string }>;
  status?: "active" | "paused" | "closed";
  attributes?: Array<{
    id: string;
    value_id?: string;
    value_name?: string;
  }>;
}

export interface UpdateListingResponse {
  id: string;
  title: string;
  price: number;
  status: string;
  available_quantity: number;
}

export const updateListing = createServerFn({ method: "PUT" })(async function (
  payload: UpdateListingRequest,
  opts?: { itemId: string }
) {
  try {
    // @ts-ignore
    const userId = this?.context?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const itemId = opts?.itemId;
    if (!itemId) throw new Error("Missing itemId");

    console.log(`[UpdateListing] Updating ${itemId} for user ${userId}`);

    // Fetch current item to check restrictions
    const current = await getItem(userId, itemId);

    // Validation: Check what can be edited based on sold_quantity
    if (payload.title && current.sold_quantity > 0) {
      throw new Error(
        "Cannot update title on items with sales. Only price, quantity, pictures, and description can be updated."
      );
    }

    if (payload.status) {
      // Status change (pause/unpause/close)
      await setItemStatus(userId, itemId, payload.status);
    } else {
      // Regular update
      const updateData: any = {};

      if (payload.title !== undefined) updateData.title = payload.title;
      if (payload.description !== undefined) updateData.description = payload.description;
      if (payload.price !== undefined) updateData.price = payload.price;
      if (payload.available_quantity !== undefined) updateData.available_quantity = payload.available_quantity;
      if (payload.pictures !== undefined) updateData.pictures = payload.pictures;
      if (payload.attributes !== undefined) updateData.attributes = payload.attributes;

      await updateItem(userId, itemId, updateData);
    }

    // Fetch updated item
    const updated = await getItem(userId, itemId);

    console.log(`[UpdateListing] Updated ${itemId}`);

    return {
      id: updated.id,
      title: updated.title,
      price: updated.price,
      status: updated.status,
      available_quantity: updated.available_quantity,
    };
  } catch (error) {
    console.error("[UpdateListing] Error:", error);
    throw error;
  }
});

export type UpdateListingRequest_Type = UpdateListingRequest;
export type UpdateListingResponse_Type = UpdateListingResponse;
