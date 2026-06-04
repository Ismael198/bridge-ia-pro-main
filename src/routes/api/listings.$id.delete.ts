// Server function: DELETE /api/listings/$id
// Deletes (closes) a product listing on Mercado Livre

import { createServerFn } from "@tanstack/react-start/server";
import { deleteItem } from "@/lib/mercadolivre.items";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const deleteListing = createServerFn({ method: "DELETE" })(async function (opts?: { itemId: string }) {
  try {
    // @ts-ignore
    const userId = this?.context?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const itemId = opts?.itemId;
    if (!itemId) throw new Error("Missing itemId");

    console.log(`[DeleteListing] Deleting ${itemId} for user ${userId}`);

    // Delete on ML API (steps: close → delete)
    await deleteItem(userId, itemId);

    console.log(`[DeleteListing] Deleted ${itemId}`);

    // Remove from cache
    await supabaseAdmin.from("listings_cache").delete().eq("item_id", itemId);

    return { success: true, itemId };
  } catch (error) {
    console.error("[DeleteListing] Error:", error);
    throw error;
  }
});
