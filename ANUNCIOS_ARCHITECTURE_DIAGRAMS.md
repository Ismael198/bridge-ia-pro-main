# Anúncios Architecture Diagrams

## Current State (bridge-ia-pro)

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  _authenticated.listings.tsx                                    │
│  ├─ Table UI (mock data)                                        │
│  └─ Buttons (Edit, Pause, Play) — NO HANDLERS ❌                │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ├─→ src/lib/mock-data.ts (static mock listings)
                  │
                  └─→ NO API CALLS ❌
                      (mercadolivre.server.ts exists but not used)

┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE DATABASE                          │
│  marketplace_connections (tokens — OK ✅)                       │
│  listings_cache (EMPTY ❌ — never queried)                      │
│  orders_cache (EMPTY ❌ — never queried)                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      MERCADO LIVRE API                          │
│  (Connected via OAuth ✅ but never called ❌)                    │
└─────────────────────────────────────────────────────────────────┘
```

## Desired State (Full Implementation)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                             │
│  ┌─ _authenticated.listings.tsx                                      │
│  │  ├─ ListingsTable (displays items from cache)                     │
│  │  ├─ Buttons: Edit, Delete, Pause, Play → handlers                │
│  │  └─ Sync button → useListings().refetch()                        │
│  │                                                                    │
│  ├─ ListingCreateModal.tsx                                           │
│  │  ├─ Form: Title, Category, Price, Images                         │
│  │  ├─ ImageUploader (upload to S3 via presigned URL)               │
│  │  └─ Submit → useCreateListing().mutate()                         │
│  │                                                                    │
│  ├─ ListingDetailModal.tsx                                           │
│  │  └─ View/Edit existing listing                                    │
│  │                                                                    │
│  └─ DeleteListingDialog.tsx                                          │
│     └─ Confirm delete → useDeleteListing().mutate()                │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
          ┌───────┴────────────────┐
          │                        │
          ▼                        ▼
   (React Query)          (Server Functions)
   useListings()          /api/listings.get.ts
   useCreateListing()     /api/listings.post.ts
   useUpdateListing()     /api/listings.put.ts
   useDeleteListing()     /api/listings.delete.ts
   useSyncListings()      /api/listings.sync.ts

          │                        │
          └────────────┬───────────┘
                       │
          ┌────────────▼──────────────┐
          │                           │
          ▼                           ▼
   ┌─────────────────┐       ┌──────────────────────────────┐
   │   SUPABASE      │       │  CLOUDFLARE WORKERS          │
   │  (client RLS)   │       │  (server functions)          │
   │                 │       │                              │
   │ listings_cache  │◄──────┤ getValidAccessToken()        │
   │ orders_cache    │       │ mlFetch(userId, path)        │
   │ profiles        │       │ Upsert cache after sync      │
   │ auth.users      │       │                              │
   └─────────────────┘       └──────────────┬───────────────┘
                                            │
                                            ▼
                          ┌──────────────────────────────┐
                          │   MERCADO LIVRE API          │
                          │                              │
                          │ GET  /v1/users/me/listings   │
                          │ POST /v1/items               │
                          │ PUT  /v1/items/{id}          │
                          │ DELETE /v1/items/{id}        │
                          │                              │
                          │ (Bearer token in header)     │
                          └──────────────────────────────┘
```

## Data Flow: Create Listing

```
User Action                    Frontend                     Backend              Database         ML API
═════════════════════════════════════════════════════════════════════════════════════════════════════════

Click "Novo Anúncio" ─────────> ListingCreateModal opens
                                Form: title, price, images

Upload image ─────────────────> ImageUploader
                                POST /presigned-url ────────> Lambda ──────────> AWS S3
                                ◄─────────────────────────────────────────────── Returns URL
                                Upload to S3 (direct)
                                Get image URL

Fill form & click Publish ───→ useCreateListing.mutate({
                                title, price, images, ...
                              })
                                
                                ───────────────────────────> POST /api/listings.post
                                                            ├─ getValidAccessToken(userId)
                                                            ├─ Build ML API payload
                                                            └─ POST to ML ──────────────────────────────> ML API
                                                                                                           Returns {id, ...}
                                                            ├─ Upsert to listings_cache
                                                            └─ Return result
                                ◄─────────────────────────────────────────────────────
                                Display success toast
                                Close modal
                                React Query refetch ─────────> GET /api/listings.get
                                                            ├─ getValidAccessToken(userId)
                                                            └─ GET from ML API ────────────────────────> ML API
                                                                                                           Returns listings[]
                                                            ├─ Upsert to listings_cache
                                                            └─ Return array
                                ◄─────────────────────────────────────────────────────
                                Update cache
                                
                                ◄──────────────────────────────────────────────────────
                                New listing appears in table
```

## Image Upload: Separate Flow

```
Currently NOT IMPLEMENTED — Required for production:

┌─────────────────────────────────────────────────────────────────┐
│ ImageUploader.tsx (order-hive reference)                        │
│  1. User selects image                                          │
│  2. POST /api/presigned-url  (Lambda SigV4 proxy)              │
│  3. Returns: { url: 'https://s3.../signed', ...}               │
│  4. Frontend PUT image directly to S3 (signed URL)             │
│  5. S3 returns image URL                                        │
│  6. URL passed to product creation payload                      │
└─────────────────────────────────────────────────────────────────┘

Files needed:
- backend/lambda-upload-url.js (SigV4 signing)
- src/routes/api/public/presigned-url.ts (or similar)
- src/components/anuncios/components/ImageUploader.tsx
- S3 bucket setup + IAM role
```

## Component Tree (Desired)

```
_authenticated.listings.tsx (Route)
│
├─ ListingsHeader
│  ├─ Search input
│  ├─ Filter button
│  └─ "Novo Anúncio" button ──→ useState({showCreate: true})
│
├─ ListingsTable / ListingsGrid
│  ├─ Map over listings
│  └─ ListingCard
│     ├─ Image
│     ├─ Title, Price, Stock
│     ├─ Edit button ──→ setSelectedListing() + showEdit
│     ├─ Delete button ──→ showDeleteDialog
│     └─ Pause/Play button ──→ (not yet implemented)
│
├─ ListingCreateModal (visible if showCreate)
│  └─ ListingForm
│     ├─ Title field
│     ├─ Category dropdown
│     ├─ Price field
│     ├─ Condition (new/used)
│     ├─ Listing type (Gold/Premium/etc)
│     ├─ Stock quantity
│     ├─ ImageUploader (multiple images)
│     ├─ Warranty fields
│     ├─ Brand, EAN fields
│     └─ Submit/Cancel buttons
│
├─ ListingDetailModal (visible if selectedListing)
│  └─ Display + Edit fields
│
└─ DeleteListingDialog (visible if deleteTarget)
   └─ Confirm + Delete button
```

## API Routes Needed

```
/api/listings/list.ts           (GET)     Fetch from cache or ML
/api/listings/create.ts         (POST)    Create on ML, cache result
/api/listings/update.ts         (PUT)     Update on ML, cache result
/api/listings/delete.ts         (DELETE)  Delete on ML, remove from cache
/api/listings/sync.ts           (POST)    Sync from ML → cache (all listings)
/api/images/presigned-url.ts    (POST)    Get S3 presigned URL for upload
/api/listings/{id}/stock.ts     (PATCH)   Update stock only (quick update)
```

## Database Sync Strategy

```
Option A: On-Demand Sync (user clicks "Refresh")
  ├─ GET /api/listings/sync.ts
  ├─ Server calls ML API: GET /v1/users/{user_id}/listings
  ├─ Upsert all results to listings_cache
  └─ Return to frontend

Option B: Periodic Sync (background cron)
  ├─ Scheduled task (Cloudflare Cron or AWS EventBridge)
  ├─ For each user with active connection
  │  ├─ Call ML API
  │  └─ Upsert to cache
  └─ (Not shown in diagrams yet)

Option C: Event-based Sync (after CRUD)
  ├─ After create/update/delete
  ├─ Invalidate cache
  └─ React Query refetch
```

---

## Summary: What's Working vs. What's Broken

| Component | Status | Notes |
|-----------|--------|-------|
| OAuth flow | ✅ | mercadolivre.server.ts complete |
| Token storage | ✅ | marketplace_connections table |
| Database schema | ✅ | listings_cache, orders_cache defined |
| API auth helper | ✅ | mlFetch() ready to use |
| Frontend UI (table) | ✅ | _authenticated.listings.tsx |
| Form component | ❌ | MISSING |
| Create listing | ❌ | MISSING |
| Update listing | ❌ | MISSING |
| Delete listing | ❌ | MISSING |
| Sync listings | ❌ | MISSING |
| Image upload | ❌ | MISSING |
| Server functions | ❌ | MISSING |
| React Query hooks | ⚠️ | Setup exists, but not wired to listings |

---

## Implementation Checklist

### Week 1: Server Layer
- [ ] Extend `mercadolivre.server.ts` with product API methods
- [ ] Create `/api/listings.get.ts` server function
- [ ] Create `/api/listings.post.ts` server function
- [ ] Create `/api/listings.sync.ts` server function
- [ ] Test manually with curl or Postman

### Week 2: Component Layer
- [ ] Create `ListingForm.tsx` (copy from order-hive + adapt)
- [ ] Create `ListingDetailModal.tsx`
- [ ] Create `DeleteListingDialog.tsx`
- [ ] Create `ImageUploader.tsx`
- [ ] Wire buttons in `_authenticated.listings.tsx`

### Week 3: React Query
- [ ] Create `useListings()` hook
- [ ] Create `useCreateListing()` mutation
- [ ] Create `useDeleteListing()` mutation
- [ ] Create `useSyncListings()` mutation
- [ ] Test refetch + cache invalidation

### Week 4: Polish
- [ ] Add loading skeletons
- [ ] Add error handling + boundaries
- [ ] Add success/error toasts
- [ ] Add filters (status, price)
- [ ] Test end-to-end

---

**Diagram Version**: 1.0  
**Last Updated**: 1 de junho de 2026  
**Mermaid Diagrams**: Available separately (see ANUNCIOS_INTEGRATION_ANALYSIS.md for narrative)
