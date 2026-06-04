# Anúncios (Listings) Integration Analysis — bridge-ia-pro

**Current Date**: 1 de junho de 2026  
**Status**: ⚠️ INCOMPLETE — Minimal implementation with mock data; production-ready features missing

---

## Executive Summary

The **bridge-ia-pro** codebase has a **skeletal Anúncios (listings) feature** that displays mock data in a table. The supporting infrastructure exists (OAuth, token refresh, database tables), but **product creation, update, sync, and image upload are NOT implemented**. 

The **order-hive-marketplace** repo provides a reference implementation with full CRUD operations and image handling.

---

## 1. Component Structure

### bridge-ia-pro: Current State
```
src/routes/
  └─ _authenticated.listings.tsx  (ONLY FILE — UI table with mock data)
```

**Key Points**:
- ✅ Route defined: `/_authenticated/listings`
- ✅ Displays table with mock data from `src/lib/mock-data.ts`
- ❌ **NO components for listing details, creation, editing, deletion**
- ❌ **NO image gallery, product form, or modals**
- ❌ **Buttons do nothing** (Edit, Pause, Play buttons have no handlers)

### What's Missing (Reference from order-hive-marketplace)
```
order-hive-marketplace/src/components/anuncios/
  ├─ AnunciosList.tsx                          # Lists products with cards
  ├─ AnuncioForm.tsx                           # Create/edit form
  ├─ AnuncioDetailModal.tsx                    # Product detail view
  ├─ DeleteAnuncioDialog.tsx                   # Delete confirmation
  ├─ AnuncioProductCard.tsx                    # Individual card UI
  ├─ AnuncioAnalytics.tsx                      # Stats & charts
  ├─ components/
  │   ├─ BasicInfoFields.tsx                   # Form fields for title, price, etc.
  │   ├─ SelectionFields.tsx                   # Category, condition, listing type
  │   ├─ PriceStatusFields.tsx                 # Price & warranty
  │   ├─ FormActions.tsx                       # Submit/Cancel buttons
  │   ├─ ImageUploader.tsx                     # Image upload UI
  │   ├─ InternalProductForm.tsx               # Form for internal products
  │   ├─ DraftProductsList.tsx                 # Products awaiting ML publish
  │   └─ AnunciosHeader.tsx                    # Top bar with "New" button
  └─ hooks/
      └─ useAnuncioForm.ts                     # Form logic & ML API calls
```

---

## 2. Services & API Integration

### Authentication Flow ✅ (Implemented in bridge-ia-pro)

**File**: `src/lib/mercadolivre.server.ts`

```typescript
// OAuth2 flow:
1. buildAuthorizationUrl()      → Redirects user to ML auth page
2. exchangeCodeForToken()       → Exchanges code for access_token + refresh_token
3. refreshTokenCall()           → Refreshes token when expires in <120s
4. getValidAccessToken()        → Returns valid token; refreshes if needed
5. mlFetch()                    → Makes API calls with Bearer token
```

**Storage**: Tokens stored in `marketplace_connections` table (Supabase)
- ✅ Access token automatically refreshed before expiry
- ✅ Audit logs track all token operations
- ✅ RLS policies restrict access to own tokens

### API Integration ❌ (Missing)

**Current State**:
- ✅ `mercadolivre.server.ts` has token management & `mlFetch()` helper
- ❌ **NO product API calls implemented** (getProducts, createProduct, updateProduct, deleteProduct)
- ❌ **NO server functions** to fetch/sync listings with ML
- ❌ **NO route handlers** (`/api/*`) for product operations

**What order-hive-marketplace Does**:
```typescript
// src/services/mercadolivre.service.ts
class MercadoLivreService {
  async getProducts(sellerId: string): Promise<MercadoLivreProduct[]>
  async createProduct(payload: any): Promise<any>
  async updateProductStock(id: string, qty: number): Promise<MercadoLivreProduct>
  async deleteProduct(id: string): Promise<void>
  async getMeliUser(): Promise<MeliUserData>
  async getOrders(): Promise<MercadoLivreOrder[]>
  // ... more methods
}
```

**Required Implementation in bridge-ia-pro**:
1. Create `src/routes/api/products/*.ts` server functions for:
   - Fetching listings from ML
   - Creating listings
   - Updating listings
   - Deleting listings
   - Syncing stock
2. Implement caching in `listings_cache` table
3. Add React Query hooks for client-side calls

---

## 3. Database/Supabase Integration

### Schema ✅ (Defined)

**Migration**: `supabase/migrations/20260523031459_*.sql`

```sql
CREATE TABLE public.listings_cache (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  provider marketplace_provider ('mercadolivre', 'shopee'),
  external_id TEXT NOT NULL,     -- ML product ID
  sku TEXT,
  title TEXT NOT NULL,
  price NUMERIC(12,2),
  stock INTEGER,
  status TEXT,
  thumbnail_url TEXT,
  permalink TEXT,
  raw JSONB,                     -- Full ML API response
  synced_at TIMESTAMPTZ,
  UNIQUE (provider, external_id, user_id)
);

CREATE TABLE public.orders_cache (
  -- Similar structure for orders
);
```

**RLS Policy**: 
```sql
CREATE POLICY "lc_select_own" ON public.listings_cache
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
```

### Current Usage ❌ (Not Used)

- ✅ Tables exist in Supabase
- ❌ **NO code reads from `listings_cache`** (mock data used instead)
- ❌ **NO code writes to `listings_cache`** (sync not implemented)
- ❌ **NO sync mechanism** between ML API and local DB

### What Should Happen

```
[ML API] 
   ↓ (sync via server function)
[listings_cache table] 
   ↓ (query + transform)
[React component] 
   ↓ (display + allow edit)
[Form submission] 
   ↓ (via mlFetch)
[ML API] 
   ↓ (update)
[listings_cache] (invalidate/refetch)
```

---

## 4. Image Upload & Storage

### Current State ❌ (NOT IMPLEMENTED)

- ❌ **No image upload UI** (`ImageUploader.tsx` from order-hive-marketplace not present)
- ❌ **No S3 integration** (see order-hive-marketplace: `IMAGE-UPLOAD-SIGV4-SOLUTION.md`)
- ❌ **No image handling in form** (AnuncioForm.tsx expects `pictureUrl` but no upload flow)

### Reference Implementation (order-hive-marketplace)

**Image Upload Flow**:
1. User selects image → `ImageUploader.tsx`
2. Frontend calls `/upload-url` (Lambda SigV4 endpoint) to get presigned S3 URL
3. Frontend uploads directly to S3 with presigned URL
4. S3 returns image URL
5. Form includes image URL in product creation payload
6. ML API receives image URL, downloads & caches it

**Files to Reference**:
- `IMAGE-UPLOAD-SIGV4-SOLUTION.md` — Complete SigV4 proxy architecture
- `backend/lambda-upload-url.js` — Lambda handler for S3 presigned URLs
- `src/components/anuncios/components/ImageUploader.tsx` — React component

---

## 5. Product Creation/Update/Sync Flow

### Current State ❌ (NOT IMPLEMENTED)

**bridge-ia-pro**:
- Mock table only
- No form submission handlers
- No API calls

### Required Flow (Based on order-hive-marketplace)

#### 5.1 Create New Listing

```
User clicks "Criar anúncio"
    ↓
AnuncioForm opens (new)
    ↓
User fills form:
  - Title, Category, Price
  - Condition (new/used)
  - Listing type (Premium, Gold, etc.)
  - Stock quantity
  - Warranty info
  - Brand, EAN
  - Images (upload to S3 first)
    ↓
User clicks "Publicar"
    ↓
useAnuncioForm.onSubmit():
  1. Validates with Zod schema
  2. Calls mercadoLivreService.createProduct({
       title,
       category_id,
       price,
       currency_id: 'BRL',
       available_quantity,
       buying_mode: 'buy_it_now',
       condition: 'new' | 'used',
       listing_type_id: 'gold_special',
       pictures: [{ source: 'image_url' }],
       attributes: [{id: 'BRAND', value_name: 'Brand'}],
       ...
     })
  3. ML API returns: { id: 'MLB123456', ... }
  4. Store in listings_cache via server function
  5. Mark internal product as published (if from draft)
  6. Show success toast
    ↓
Listing now visible in "Anúncios" tab
```

#### 5.2 Update Existing Listing

```
User clicks "Editar" on listing
    ↓
AnuncioForm opens (edit mode)
    ↓
Form prefilled with current data
    ↓
User modifies fields
    ↓
User clicks "Atualizar"
    ↓
Calls mercadoLivreService.updateProduct(id, {...})
    ↓
ML API validates & updates
    ↓
listings_cache invalidated/refreshed
```

**Missing**: `updateProduct()` method in service

#### 5.3 Delete Listing

```
User clicks delete icon
    ↓
DeleteAnuncioDialog confirms
    ↓
Calls mercadoLivreService.deleteProduct(id)
    ↓
ML API deletes
    ↓
listings_cache entry removed
```

#### 5.4 Sync (Fetch from ML)

```
User clicks "Refresh" button
    ↓
Calls server function: fetchMercadoLivreProducts(userId)
    ↓
Server:
  1. Gets valid access token for userId
  2. Calls: GET /v1/users/:user_id/listings (ML API)
  3. For each listing, upsert into listings_cache
  4. Return formatted array
    ↓
React Query refetch updates UI
```

---

## 6. Current Issues & Gaps

### Critical Issues

| Issue | Severity | Impact | Fix |
|-------|----------|--------|-----|
| **No product API calls** | CRITICAL | Can't read/write listings to ML | Implement CRUD server functions |
| **Mock data only** | CRITICAL | UI shows fake data; buttons do nothing | Query listings_cache from DB |
| **No image upload** | HIGH | Can't add images to listings | Implement S3 SigV4 proxy or ML upload |
| **Form not wired** | HIGH | Edit/Create buttons don't work | Connect AnuncioForm + service calls |
| **No sync mechanism** | HIGH | Local DB never updated from ML | Implement periodic or manual sync |
| **No draft products** | MEDIUM | Can't save incomplete listings | Add internal products table (see order-hive) |
| **Missing form validation** | MEDIUM | No error feedback for bad input | Add Zod schema + React Hook Form |

### Authentication Issues

- ✅ OAuth2 flow works (tested in bridge-ia-pro)
- ✅ Token refresh works
- ❌ **No server functions that actually USE the token** to call ML API
- ❓ **Are Cloudflare Workers environment variables set for ML_APP_ID, ML_CLIENT_SECRET?** (Required for OAuth)

### ML API Compatibility

- ML requires product category ID (from ML category tree)
- Listing type affects pricing & visibility (Premium, Gold, Free, etc.)
- Images must be uploaded separately before inclusion in listing
- Price must match currency (BRL for Brazil)
- Stock available_quantity must be > 0 to publish

---

## 7. Actionable Implementation Plan

### Phase 1: Foundation (Server Functions)
1. Create `src/routes/api/listings.get.ts` — Fetch listings from cache
2. Create `src/routes/api/listings.post.ts` — Create new listing on ML
3. Create `src/routes/api/listings.put.ts` — Update listing
4. Create `src/routes/api/listings.delete.ts` — Delete listing
5. Create `src/routes/api/listings.sync.ts` — Sync from ML → cache
6. Extend `mercadolivre.server.ts` with product API methods using `mlFetch()`

### Phase 2: Components
1. Create `src/components/ListingsForm.tsx` (or use order-hive reference)
2. Create `src/components/ListingDetailModal.tsx`
3. Create `src/components/DeleteListingDialog.tsx`
4. Wire buttons in `_authenticated.listings.tsx` to handlers
5. Add image upload component (reference: order-hive `ImageUploader.tsx`)

### Phase 3: React Query
1. Create hook: `useListings()` — Fetch + cache listings
2. Create hook: `useCreateListing()` — POST mutation
3. Create hook: `useUpdateListing()` — PUT mutation
4. Create hook: `useDeleteListing()` — DELETE mutation
5. Create hook: `useSyncListings()` — Sync from ML

### Phase 4: UX Polish
1. Add loading skeletons
2. Add error boundaries
3. Add success/error toasts
4. Add pagination for large listing counts
5. Add filters (status, category, price range)

---

## 8. Code Examples

### Example: Fetch Listings Server Function

```typescript
// src/routes/api/listings.get.ts
import { createServerFn } from "@tanstack/start";
import { getValidAccessToken, mlFetch } from "@/lib/mercadolivre.server";

const getListingsServerFn = createServerFn({
  method: "GET",
})
  .handler(async (event, userId) => {
    // Get token (auto-refresh if needed)
    const { accessToken, mlUserId } = await getValidAccessToken(userId);

    // Fetch from ML API
    const listings = await mlFetch(userId, `/v1/users/${mlUserId}/listings`);

    // TODO: Upsert into listings_cache table

    return listings;
  });

export default getListingsServerFn;
```

### Example: Create Listing

```typescript
// src/routes/api/listings.post.ts
const createListingServerFn = createServerFn({
  method: "POST",
})
  .inputType<{
    title: string;
    categoryId: string;
    price: number;
    images: string[];
  }>()
  .handler(async (data, userId) => {
    const { accessToken } = await getValidAccessToken(userId);

    const payload = {
      title: data.title,
      category_id: data.categoryId,
      price: data.price,
      currency_id: "BRL",
      available_quantity: 1,
      buying_mode: "buy_it_now",
      condition: "new",
      listing_type_id: "gold_special",
      pictures: data.images.map((url) => ({ source: url })),
    };

    const result = await fetch(
      "https://api.mercadolibre.com/v1/items",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    ).then((r) => r.json());

    if (!result?.id) throw new Error(result?.message || "Failed to create");

    // Upsert to listings_cache
    // await supabaseAdmin.from("listings_cache").upsert(...)

    return result;
  });
```

### Example: React Component Usage

```typescript
// src/components/ListingCreate.tsx
export function ListingCreate() {
  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await createListingServerFn(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Listing published!");
      onClose();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createMutation.mutate({ title, price, images });
      }}
    >
      {/* Form fields */}
      <button
        type="submit"
        disabled={createMutation.isPending}
      >
        Publicar
      </button>
    </form>
  );
}
```

---

## 9. Comparison: bridge-ia-pro vs order-hive-marketplace

| Feature | bridge-ia-pro | order-hive | Status |
|---------|---------------|-----------|--------|
| **Mock Data** | ✅ YES | ❌ NO (Real ML data) | bridge needs live API |
| **OAuth Flow** | ✅ COMPLETE | ✅ COMPLETE | Both ready |
| **Token Refresh** | ✅ YES | ✅ YES | Both working |
| **Product CRUD** | ❌ NO | ✅ YES | bridge missing |
| **List Component** | ⚠️ TABLE ONLY | ✅ FULL UI | bridge needs expansion |
| **Form Component** | ❌ NO | ✅ YES | bridge missing |
| **Image Upload** | ❌ NO | ✅ YES | bridge missing |
| **Draft Products** | ❌ NO | ✅ YES | bridge missing |
| **Sync Logic** | ❌ NO | ✅ (PARTIAL) | bridge missing |
| **Error Handling** | ❌ MINIMAL | ✅ GOOD | bridge needs improvement |
| **React Query** | ✅ YES (setup) | ✅ YES (used) | Both present |

---

## 10. Next Steps

### Immediate (This Sprint)
1. ✅ Review `order-hive-marketplace/src/services/mercadolivre.service.ts` for reference
2. ✅ Copy image upload solution from order-hive
3. ⏳ Implement server functions for product CRUD
4. ⏳ Connect UI buttons to actual handlers

### Short-term (Next Sprint)
1. Add product form component
2. Add React Query hooks
3. Test end-to-end product creation
4. Test image upload flow

### Medium-term (Month 2)
1. Add draft products support
2. Add sync from ML API to cache
3. Add filters & search
4. Add analytics/insights

---

## 11. Questions to Answer

- [ ] Are ML_APP_ID and ML_CLIENT_SECRET set in Cloudflare environment?
- [ ] Should we support multiple marketplaces (Shopee, Amazon) in same flow?
- [ ] Do we need draft/local products (like order-hive), or direct ML publish?
- [ ] Should sync be periodic (cron) or on-demand (user click)?
- [ ] Do we need full product editor or simplified form?
- [ ] Image upload: S3 directly, or via ML API upload?

---

## References

- **ML API Docs**: https://developers.mercadolivre.com.br/
- **order-hive Implementation**: `/home/ismael/order-hive-marketplace/src/pages/dashboard/Anuncios.tsx`
- **bridge-ia-pro OAuth**: `/home/ismael/bridge-ia-pro-main/src/lib/mercadolivre.server.ts`
- **Database Schema**: `/home/ismael/bridge-ia-pro-main/supabase/migrations/`

---

**Last Updated**: 1 de junho de 2026  
**Analysis Scope**: Listings (Anúncios) integration in bridge-ia-pro  
**Prepared For**: Development team review & implementation planning
