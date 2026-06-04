# Anúncios Implementation Quick Start

## Files Created
1. `ANUNCIOS_INTEGRATION_ANALYSIS.md` — Comprehensive analysis of current state, gaps, and requirements
2. `ANUNCIOS_ARCHITECTURE_DIAGRAMS.md` — Visual data flows and component trees
3. `ANUNCIOS_IMPLEMENTATION_QUICKSTART.md` — This file (step-by-step guide)

---

## Key Insight: "Bridge-ia-pro is 30% done"

- ✅ OAuth working
- ✅ Database schema ready
- ✅ Token management solid
- ❌ **Zero product API integration**
- ❌ **Zero user-facing forms**
- ❌ **Mock data only**

---

## Quick Implementation Path

### Step 1: Extend mercadolivre.server.ts (Utility Functions)

**Goal**: Add actual ML API methods beyond OAuth

```typescript
// src/lib/mercadolivre.server.ts (ADD THESE)

// Fetch all listings for user
export async function fetchUserListings(userId: string): Promise<any[]> {
  const { accessToken, mlUserId } = await getValidAccessToken(userId);
  return await mlFetch(userId, `/v1/users/${mlUserId}/listings`, {
    method: "GET",
  });
}

// Create listing
export async function createMLListing(userId: string, payload: any): Promise<any> {
  return await mlFetch(userId, "/v1/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Update listing
export async function updateMLListing(
  userId: string,
  itemId: string,
  payload: any
): Promise<any> {
  return await mlFetch(userId, `/v1/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// Delete listing
export async function deleteMLListing(userId: string, itemId: string): Promise<void> {
  return await mlFetch(userId, `/v1/items/${itemId}`, {
    method: "DELETE",
  });
}

// Update stock only (fast operation)
export async function updateMLStock(
  userId: string,
  itemId: string,
  quantity: number
): Promise<any> {
  return await updateMLListing(userId, itemId, {
    available_quantity: quantity,
  });
}
```

### Step 2: Create Server Functions (Cloudflare)

**Goal**: Create `/api` endpoints that call the functions above

```typescript
// src/routes/api/listings.get.ts
import { createServerFn } from "@tanstack/start";
import { fetchUserListings } from "@/lib/mercadolivre.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getListingsServerFn = createServerFn({
  method: "GET",
})
  .handler(async (event) => {
    const userId = event.user.id; // From auth context

    try {
      // Try cache first
      const { data: cached } = await supabaseAdmin
        .from("listings_cache")
        .select("*")
        .eq("user_id", userId)
        .order("synced_at", { ascending: false });

      // If cache is fresh (< 5 min old), return it
      if (cached?.length > 0 && isRecentlysynced(cached[0])) {
        return cached;
      }

      // Otherwise, sync from ML
      const listings = await fetchUserListings(userId);

      // Upsert to cache
      await supabaseAdmin.from("listings_cache").upsert(
        listings.map((l) => ({
          user_id: userId,
          provider: "mercadolivre",
          external_id: l.id,
          sku: l.sku || null,
          title: l.title,
          price: l.price,
          stock: l.available_quantity,
          status: l.status,
          thumbnail_url: l.thumbnail,
          permalink: l.permalink,
          raw: l,
          synced_at: new Date(),
        })),
        { onConflict: "provider,external_id,user_id" }
      );

      return listings;
    } catch (error) {
      console.error("[getListings]", error);
      throw new Error(error?.message || "Failed to fetch listings");
    }
  });
```

```typescript
// src/routes/api/listings.post.ts (Create)
import { createServerFn } from "@tanstack/start";
import { createMLListing } from "@/lib/mercadolivre.server";

export const createListingServerFn = createServerFn({
  method: "POST",
})
  .inputType<{
    title: string;
    categoryId: string;
    price: number;
    availableQuantity: number;
    condition: "new" | "used";
    listingTypeId: string;
    pictures: Array<{ source: string }>;
    attributes: Array<{ id: string; value_name: string }>;
  }>()
  .handler(async (data, event) => {
    const userId = event.user.id;

    const payload = {
      title: data.title,
      category_id: data.categoryId,
      price: data.price,
      currency_id: "BRL",
      available_quantity: data.availableQuantity,
      buying_mode: "buy_it_now",
      condition: data.condition,
      listing_type_id: data.listingTypeId,
      pictures: data.pictures,
      attributes: data.attributes,
    };

    try {
      const result = await createMLListing(userId, payload);

      // Cache it
      await supabaseAdmin.from("listings_cache").upsert({
        user_id: userId,
        provider: "mercadolivre",
        external_id: result.id,
        title: result.title,
        price: result.price,
        stock: result.available_quantity,
        status: result.status,
        raw: result,
        synced_at: new Date(),
      });

      return result;
    } catch (error) {
      console.error("[createListing]", error);
      throw error;
    }
  });
```

### Step 3: Create React Query Hooks

**Goal**: Wire server functions to UI

```typescript
// src/hooks/useListings.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getListingsServerFn, createListingServerFn } from "@/routes/api/listings.*";

export function useListings() {
  return useQuery({
    queryKey: ["listings"],
    queryFn: async () => {
      return await getListingsServerFn();
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      return await createListingServerFn(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}
```

### Step 4: Update UI Component

**Goal**: Replace mock data with real API calls

```typescript
// src/routes/_authenticated.listings.tsx (UPDATED)

import { useListings } from "@/hooks/useListings";
import { useState } from "react";
import { ListingCreateModal } from "@/components/listings/ListingCreateModal";

function Listings() {
  const { data: listings = [], isLoading, refetch } = useListings();
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (isLoading) {
    return <div>Loading listings...</div>; // Add skeleton
  }

  return (
    <AppShell title="Anúncios" subtitle="Gerencie seus anúncios">
      <div className="flex gap-3 items-center mb-4">
        <div className="flex-1">
          <input
            placeholder="Buscar por nome ou SKU..."
            className="w-full px-3 h-10 border rounded-lg"
          />
        </div>
        <button
          onClick={() => refetch()}
          className="h-10 px-3 border rounded-lg"
        >
          Sincronizar
        </button>
        <button
          onClick={() => setShowCreateModal(true)}
          className="h-10 px-4 bg-blue-500 text-white rounded-lg"
        >
          Novo Anúncio
        </button>
      </div>

      <table className="w-full">
        <thead>
          <tr>
            <th>Produto</th>
            <th>SKU</th>
            <th>Preço</th>
            <th>Estoque</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => (
            <tr key={l.id}>
              <td>{l.title}</td>
              <td>{l.sku}</td>
              <td>R$ {l.price}</td>
              <td>{l.available_quantity}</td>
              <td>{l.status}</td>
              <td>
                <button>Editar</button>
                <button>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showCreateModal && (
        <ListingCreateModal
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </AppShell>
  );
}
```

### Step 5: Add Form Component

**Goal**: Create UI for new listings

```typescript
// src/components/listings/ListingCreateModal.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateListing } from "@/hooks/useListings";
import { useToast } from "@/hooks/use-toast";

const listingSchema = z.object({
  title: z.string().min(5, "Título muito curto"),
  categoryId: z.string(),
  price: z.coerce.number().min(0.01),
  availableQuantity: z.coerce.number().min(1),
  condition: z.enum(["new", "used"]),
  listingTypeId: z.string(),
  pictures: z.array(z.object({ source: z.string().url() })),
});

export function ListingCreateModal({ onClose }) {
  const { toast } = useToast();
  const createMutation = useCreateListing();
  const form = useForm({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: "",
      condition: "new",
      listingTypeId: "gold_special",
      pictures: [],
      availableQuantity: 1,
    },
  });

  const onSubmit = async (data) => {
    try {
      await createMutation.mutateAsync(data);
      toast({ title: "Anúncio publicado!" });
      onClose();
    } catch (error) {
      toast({
        title: "Erro ao publicar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <dialog open className="modal">
      <div className="modal-box">
        <h2>Novo Anúncio</h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <input
            {...form.register("title")}
            placeholder="Título do produto"
            className="w-full border px-3 py-2"
          />
          <input
            {...form.register("price", { valueAsNumber: true })}
            type="number"
            placeholder="Preço"
            className="w-full border px-3 py-2"
          />
          <input
            {...form.register("availableQuantity", { valueAsNumber: true })}
            type="number"
            placeholder="Quantidade"
            className="w-full border px-3 py-2"
          />
          <select
            {...form.register("condition")}
            className="w-full border px-3 py-2"
          >
            <option value="new">Novo</option>
            <option value="used">Usado</option>
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 bg-blue-500 text-white py-2 rounded"
            >
              Publicar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border py-2 rounded"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
```

---

## Implementation Priority

### Must Have (Week 1)
1. ✅ `mercadolivre.server.ts` — Add API methods
2. ✅ `/api/listings.get.ts` — Fetch listings
3. ✅ `/api/listings.post.ts` — Create listing
4. ✅ `useListings()` hook
5. ✅ Update UI to use real data

### Should Have (Week 2)
6. ⚠️ ListingCreateModal component
7. ⚠️ `/api/listings.put.ts` — Update
8. ⚠️ `/api/listings.delete.ts` — Delete
9. ⚠️ ListingDetailModal component
10. ⚠️ DeleteListingDialog component

### Nice to Have (Week 3+)
11. 🔮 Image upload support
12. 🔮 Draft products (internal)
13. 🔮 Filters & search
14. 🔮 Analytics/insights

---

## Testing Checklist

```
[ ] Server function getListingsServerFn called
[ ] Real listings fetched from ML API
[ ] Listings cached in Supabase
[ ] Create listing form renders
[ ] Create form validates input
[ ] Create listing calls API
[ ] New listing appears in table
[ ] Edit button opens modal
[ ] Delete button removes listing
[ ] Sync button refetches from ML
[ ] Error handling shows toast
[ ] Loading states show skeleton/spinner
```

---

## Common Pitfalls

1. **Forgetting Bearer token** — `mlFetch()` adds it automatically, but double-check headers
2. **Category ID validation** — ML requires valid category IDs from their taxonomy
3. **Currency mismatch** — Price currency must be 'BRL' for Brazil
4. **Image URLs** — Must be publicly accessible or ML can't fetch them
5. **Stock quantity** — Must be > 0 to publish
6. **Token expiry** — `getValidAccessToken()` handles refresh, but errors may still occur
7. **RLS policies** — listings_cache queries will fail if user_id doesn't match auth.uid()

---

## References from Code Review

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/mercadolivre.server.ts` | OAuth + token mgmt | ✅ Working |
| `src/routes/_authenticated.listings.tsx` | Main UI | ⚠️ Mock only |
| `supabase/migrations/20260523031459_*.sql` | DB schema | ✅ Ready |
| `order-hive-marketplace/src/services/mercadolivre.service.ts` | Reference impl | 📖 Reference |
| `order-hive-marketplace/src/components/anuncios/` | Reference components | 📖 Reference |

---

## Commands to Run

```bash
# In bridge-ia-pro-main/

# Install deps (if needed)
npm install

# Dev server
npm run dev

# Watch for Cloudflare changes
wrangler dev

# Format/Lint
npm run format
npm run lint

# Build for production
npm run build
```

---

## Next Immediate Actions

1. **TODAY**: Review this guide + reference code (order-hive)
2. **TOMORROW**: Start Step 1 (extend mercadolivre.server.ts)
3. **This Week**: Complete Steps 1–4 (core API integration)
4. **Next Week**: Add form component (Step 5)

---

**Created**: 1 de junho de 2026  
**Target Audience**: Developers implementing Anúncios feature  
**Complexity**: Medium (requires Supabase + Cloudflare Workers knowledge)
