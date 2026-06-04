// Custom hooks for Listings (Products) management
// Wraps server functions and provides React Query integration

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface ListingData {
  id: string;
  title: string;
  price: number;
  status: "active" | "paused" | "closed" | "under_review";
  available_quantity: number;
  sold_quantity: number;
  currency_id: string;
  condition: "new" | "used";
  pictures: Array<{ id: string; url: string; secure_url: string }>;
  category_id: string;
  permalink: string;
  start_time: string;
  last_updated: string;
}

interface CreateListingRequest {
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

interface UpdateListingRequest {
  title?: string;
  description?: string;
  price?: number;
  available_quantity?: number;
  status?: "active" | "paused" | "closed";
  pictures?: Array<{ source: string }>;
  attributes?: Array<{
    id: string;
    value_id?: string;
    value_name?: string;
  }>;
}

interface UploadPicturesRequest {
  pictures: Array<{ source: string }>;
}

/**
 * Hook: Fetch all user's listings
 * Usage: const { data: listings, isLoading } = useListings()
 */
export function useListings() {
  return useQuery({
    queryKey: ["listings"],
    queryFn: async () => {
      const res = await fetch("/api/listings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new Error(`Erro ao buscar anúncios: ${res.statusText}`);
      }
      return res.json() as Promise<ListingData[]>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook: Create new listing
 * Usage:
 * const createMutation = useCreateListing()
 * createMutation.mutate({ title, price, ... })
 */
export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateListingRequest) => {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro ao criar anúncio");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate listings cache to refetch
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}

/**
 * Hook: Update existing listing
 * Usage:
 * const updateMutation = useUpdateListing()
 * updateMutation.mutate({ itemId: "...", title: "New Title", ... })
 */
export function useUpdateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateListingRequest & { itemId: string }) => {
      const { itemId, ...data } = payload;
      const res = await fetch(`/api/listings/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro ao atualizar anúncio");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}

/**
 * Hook: Delete listing
 * Usage:
 * const deleteMutation = useDeleteListing()
 * deleteMutation.mutate("MLM123456")
 */
export function useDeleteListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/listings/${itemId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro ao deletar anúncio");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}

/**
 * Hook: Upload pictures to listing
 * Usage:
 * const uploadMutation = useUploadListingPictures()
 * uploadMutation.mutate({
 *   itemId: "MLM123",
 *   pictures: [{ source: "https://..." }, ...]
 * })
 */
export function useUploadListingPictures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UploadPicturesRequest & { itemId: string }) => {
      const { itemId, ...data } = payload;
      const res = await fetch(`/api/listings/${itemId}/pictures`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro ao fazer upload de imagens");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}

/**
 * Helper: Pause listing (set status to "paused")
 */
export function usePauseListing() {
  const updateMutation = useUpdateListing();

  return useMutation({
    mutationFn: (itemId: string) =>
      updateMutation.mutateAsync({
        itemId,
        status: "paused",
      }),
  });
}

/**
 * Helper: Reactivate paused listing (set status to "active")
 */
export function useReactivateListing() {
  const updateMutation = useUpdateListing();

  return useMutation({
    mutationFn: (itemId: string) =>
      updateMutation.mutateAsync({
        itemId,
        status: "active",
      }),
  });
}
