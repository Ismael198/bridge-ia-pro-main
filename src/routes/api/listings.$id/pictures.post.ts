// Server function: POST /api/listings/$id/pictures
// Uploads pictures to an existing product listing

import { createServerFn } from "@tanstack/react-start/server";
import { uploadItemPictures } from "@/lib/mercadolivre.items";

export interface UploadPicturesRequest {
  pictures: Array<{ source: string }>;
}

export interface UploadPicturesResponse {
  pictures: Array<{
    id: string;
    url: string;
    secure_url: string;
    size: string;
  }>;
}

export const uploadListingPictures = createServerFn({ method: "POST" })(async function (
  payload: UploadPicturesRequest,
  opts?: { itemId: string }
) {
  try {
    // @ts-ignore
    const userId = this?.context?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const itemId = opts?.itemId;
    if (!itemId) throw new Error("Missing itemId");

    if (!payload.pictures || payload.pictures.length === 0) {
      throw new Error("No pictures provided");
    }

    console.log(`[UploadPictures] Uploading ${payload.pictures.length} pictures to ${itemId}`);

    // Validate image count (ML limit is usually 12 per item)
    if (payload.pictures.length > 12) {
      throw new Error("Maximum 12 pictures per item");
    }

    // Validate URLs
    for (const pic of payload.pictures) {
      if (!pic.source) {
        throw new Error("Each picture must have a 'source' URL");
      }
      try {
        new URL(pic.source); // Validate URL format
      } catch {
        throw new Error(`Invalid URL: ${pic.source}`);
      }
    }

    // Upload to ML
    const result = await uploadItemPictures(userId, itemId, payload.pictures);

    console.log(`[UploadPictures] Uploaded ${result.length} pictures to ${itemId}`);

    return {
      pictures: result.map((pic: any) => ({
        id: pic.id,
        url: pic.url,
        secure_url: pic.secure_url,
        size: pic.size,
      })),
    };
  } catch (error) {
    console.error("[UploadPictures] Error:", error);
    throw error;
  }
});

export type UploadPicturesRequest_Type = UploadPicturesRequest;
export type UploadPicturesResponse_Type = UploadPicturesResponse;
