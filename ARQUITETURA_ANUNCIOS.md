# 🏗️ Arquitetura do Sistema — Anúncios

**Visualização**: Fluxo de dados completo  
**Status**: ✅ Implementado  
**Complexidade**: Média (5 camadas)

---

## 🔄 Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────────────┐
│                      LAYER 1: USER INTERFACE                    │
│                                                                  │
│  ┌────────────────────┐         ┌──────────────────────────┐   │
│  │  _authenticated.   │         │    ListingsTable.tsx     │   │
│  │   listings.tsx     │────┬───→│  - Exibe dados           │   │
│  │                    │    │    │  - Actions buttons       │   │
│  │ - AppShell layout  │    │    │  - Loading states        │   │
│  │ - Header search    │    │    │  - Toast messages        │   │
│  │ - Create button    │    │    └──────────────────────────┘   │
│  └────────────────────┘    │                                    │
│                            │    ┌──────────────────────────┐   │
│                            └───→│ CreateListingForm.tsx    │   │
│                                 │  - Dialog modal          │   │
│                                 │  - Form inputs           │   │
│                                 │  - Validation on change  │   │
│                                 │  - Submit button         │   │
│                                 └──────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ useListings() hooks
                           │ useCreateListing()
                           │ useUpdateListing()
                           │ useDeleteListing()
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│              LAYER 2: STATE MANAGEMENT (React Query)             │
│                                                                  │
│  queryClient.invalidateQueries(["listings"])                    │
│  useQuery({ queryKey: ["listings"], staleTime: 5 * 60 * 1000 }) │
│  useMutation(...)  ← auto-invalidate on success                  │
│                                                                  │
│  Cache Layer:                                                    │
│  - In-memory cache (React Query)                                 │
│  - Supabase listings_cache table                                │
│  - Auto-refetch every 5 minutes                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ mutateAsync(data)
                           │ OR refetch()
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│           LAYER 3: SERVER FUNCTIONS (TanStack Start)             │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │ listings.get.ts  │  │ listings.post.ts │  │ listings.    │   │
│  │                  │  │                  │  │ $id.put.ts   │   │
│  │ GET /api/        │  │ POST /api/       │  │ PUT /api/    │   │
│  │   listings       │  │   listings       │  │   listings/{} │   │
│  └──────────────────┘  └──────────────────┘  └──────────────┘   │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │ listings.$id.    │  │ listings.$id/pictures.post.ts        │ │
│  │ delete.ts        │  │                                       │ │
│  │                  │  │ POST /api/listings/{id}/pictures      │ │
│  │ DELETE /api/     │  │ - Validate URLs                      │ │
│  │   listings/{}    │  │ - Max 12 images                      │ │
│  │ - 2-step delete  │  │ - Upload to ML                       │ │
│  │ - Error retry    │  └──────────────────────────────────────┘ │
│  └──────────────────┘                                            │
│                                                                  │
│ Features:                                                        │
│ - User auth from TanStack context                               │
│ - Error logging with [namespace]                                │
│ - Graceful error handling                                       │
│ - Supabase cache sync                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ await methodName(userId, ...)
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│         LAYER 4: API LIBRARY (src/lib/mercadolivre.items.ts)    │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────────────────────┐ │
│  │ Data Methods       │  │ Mutation Methods                   │ │
│  │                    │  │                                    │ │
│  │ • listUserItems()  │  │ • createItem()                     │ │
│  │ • getItem()        │  │ • updateItem()                     │ │
│  │ • searchProducts() │  │ • deleteItem()                     │ │
│  │ • searchCategories│  │ • uploadItemPictures()             │ │
│  │ • getCategoryAttr()│  │ • updateItemPrice()                │ │
│  │                    │  │ • updateItemQuantity()             │ │
│  │                    │  │ • predictCategory()                │ │
│  │                    │  │ • setItemStatus()                  │ │
│  └────────────────────┘  └────────────────────────────────────┘ │
│                                                                  │
│ All methods use mlFetch() for:                                  │
│  - Bearer token from Supabase                                  │
│  - Auto-refresh if < 120s to expiry                            │
│  - Proper error handling                                       │
│  - Logging                                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ mlFetch(url, options)
                           │ - Get valid token
                           │ - Refresh if needed
                           │ - Add Bearer header
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│     LAYER 5: EXTERNAL SERVICES & PERSISTENCE                    │
│                                                                  │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │  Mercado Livre API      │  │  Supabase PostgreSQL         │  │
│  │                         │  │                              │  │
│  │ https://api.mercado     │  │ Tables:                      │  │
│  │   libre.com/items       │  │ • marketplace_connections    │  │
│  │                         │  │   (tokens, user_id, etc)    │  │
│  │ Methods:                │  │ • listings_cache             │  │
│  │ • GET /items/{id}       │  │   (id, title, price, ...)   │  │
│  │ • GET /users/me/items   │  │ • audit_logs                │  │
│  │ • POST /items           │  │   (mutations log)           │  │
│  │ • PUT /items/{id}       │  │                              │  │
│  │ • DELETE /items/{id}    │  │ RLS Policies:                │  │
│  │ • POST /items/{id}/     │  │ • User can only see own data │  │
│  │   pictures              │  │ • Auto timestamp on update   │  │
│  │ • GET /categories/{id}/ │  │                              │  │
│  │   attributes            │  │                              │  │
│  │ • GET /sites/MLA/       │  │                              │  │
│  │   category_predictor/   │  │                              │  │
│  │   predict               │  │                              │  │
│  │                         │  │                              │  │
│  │ Auth:                   │  │ Auth:                        │  │
│  │ Bearer {access_token}   │  │ Row Level Security (RLS)     │  │
│  │ (6h expiry)             │  │ Token in JWT claims         │  │
│  └─────────────────────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow: Criar Anúncio

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER FILLS FORM                                              │
│                                                                 │
│   Form state:                                                   │
│   {                                                             │
│     title: "iPhone 13 Pro",                                    │
│     description: "Excelente condição",                         │
│     price: 3500,                                               │
│     available_quantity: 5,                                     │
│     condition: "new"                                           │
│   }                                                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ onClick="Criar Anúncio"
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. VALIDATION (Client-side)                                    │
│                                                                 │
│   ✓ title.trim() !== ""                                        │
│   ✓ price > 0                                                  │
│   ✓ available_quantity >= 1                                    │
│   ✓ condition in ["new", "used"]                              │
│                                                                 │
│   ❌ FAIL → toast.error("Validação falhou")                    │
│   ✓ PASS → continue                                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ await createMutation.mutateAsync(formData)
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. REACT QUERY MUTATION                                        │
│                                                                 │
│   - Call server function: createListing                        │
│   - Set isPending=true                                         │
│   - Disable form inputs                                        │
│   - Show "Criando..."                                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ await createListing(formData)
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. SERVER FUNCTION (listings.post.ts)                          │
│                                                                 │
│   - Get userId from context                                    │
│   - Validate inputs again (server-side)                        │
│   - Auto-predict category if not provided:                     │
│     const category = await predictCategory(title)             │
│   - Build itemData with ML requirements:                      │
│     {                                                           │
│       title, description, price,                              │
│       available_quantity, condition,                           │
│       site_id: "MLA",                                          │
│       category_id: "...",                                     │
│       buying_mode: "buy_it_now",                              │
│       listing_type_id: "gold"                                 │
│     }                                                           │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ await createItem(userId, itemData)
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. API LIBRARY METHOD (mercadolivre.items.ts)                  │
│                                                                 │
│   createItem(userId, itemData):                                │
│   - Validate required fields                                   │
│   - Call mlFetch("POST", "/items", itemData)                  │
│   - mlFetch() checks token expiry                             │
│   - If < 120s: refresh token from Supabase                   │
│   - Add Bearer header                                          │
│   - Return response                                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ POST https://api.mercadolibre.com/items
                 │ Authorization: Bearer {access_token}
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. MERCADO LIVRE API                                            │
│                                                                 │
│   Status: 200 OK                                               │
│   Response:                                                     │
│   {                                                             │
│     id: "MLM987654321",                                        │
│     title: "iPhone 13 Pro",                                    │
│     status: "active",                                          │
│     price: 3500,                                               │
│     currency_id: "BRL",                                        │
│     available_quantity: 5,                                     │
│     sold_quantity: 0,                                          │
│     condition: "new",                                          │
│     permalink: "https://www.mercadolivre.com.br/...",         │
│     pictures: [],                                              │
│     date_created: "2026-06-01T...",                           │
│     last_updated: "2026-06-01T..."                            │
│   }                                                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Item created in ML ✅
                 │ Now sync to local cache
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. CACHE SYNC (Supabase)                                       │
│                                                                 │
│   INSERT INTO listings_cache (                                 │
│     user_id, item_id, title, price, status,                  │
│     available_quantity, sold_quantity, condition,             │
│     pictures, category_id, permalink, created_at             │
│   ) VALUES (...)                                               │
│                                                                 │
│   ✅ Cache entry created                                       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Return result to mutation
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. REACT QUERY INVALIDATION                                    │
│                                                                 │
│   - Mutation succeeds                                          │
│   - queryClient.invalidateQueries(["listings"])              │
│   - Trigger useListings() refetch                             │
│   - React Query fetches latest data                           │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ New data fetched from ML API
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. UI UPDATE                                                    │
│                                                                 │
│   - ListingsTable re-renders                                   │
│   - New item appears in table                                  │
│   - isPending=false                                            │
│   - Form re-enabled                                            │
│   - Dialog closes                                              │
│   - Form reset                                                 │
│                                                                 │
│   ✅ User sees new item in table                               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Show success toast
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. NOTIFICATION                                                │
│                                                                 │
│   toast.success("Anúncio criado com sucesso!")                │
│   - Green toast appears (top-right)                           │
│   - Auto-dismisses after 3s                                    │
│                                                                 │
│   ✅ USER SEES SUCCESS MESSAGE                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Error Handling Flow

```
┌────────────────────────────────┐
│ ERROR AT ANY LAYER             │
└────────────┬───────────────────┘
             │
             ↓
    ┌─────────────────────────────────────┐
    │ TRY-CATCH IN COMPONENT             │
    │ catch (error) {                     │
    │   toast.error(error.message)        │
    │ }                                   │
    └─────────────────────────────────────┘
             │
             ↓
    ┌─────────────────────────────────────┐
    │ TOAST NOTIFICATION                  │
    │ ❌ "Erro ao criar anúncio"          │
    │    (ML API message)                 │
    └─────────────────────────────────────┘
             │
             ↓
    ┌─────────────────────────────────────┐
    │ USER CAN SEE ERROR & RETRY          │
    │ - Form inputs remain filled         │
    │ - Dialog stays open                 │
    │ - "Criar Anúncio" button clickable  │
    └─────────────────────────────────────┘
```

---

## 📱 Component Hierarchy

```
_authenticated.listings.tsx (Route)
├── AppShell
│   ├── Topbar
│   │   └── title: "Anúncios"
│   │
│   └── main
│       ├── Header (Search + Filters)
│       │   ├── Search input
│       │   ├── Marketplace filter button
│       │   └── "Criar anúncio" button
│       │
│       ├── ListingsTable (Component)
│       │   ├── Table
│       │   │   ├── TableHeader
│       │   │   │   └── 7 columns
│       │   │   │
│       │   │   └── TableBody
│       │   │       └── TableRow (for each listing)
│       │   │           ├── Product title (link)
│       │   │           ├── Price
│       │   │           ├── Status badge
│       │   │           ├── Stock qty
│       │   │           ├── Sold qty
│       │   │           ├── Last updated
│       │   │           └── Actions
│       │   │               ├── Edit button
│       │   │               ├── Pause/Play toggle
│       │   │               └── Delete button
│       │   │
│       │   └── Loading/Error/Empty states
│       │
│       └── CreateListingForm (Component)
│           └── Dialog
│               ├── DialogHeader
│               ├── Form
│               │   ├── Title input
│               │   ├── Description textarea
│               │   ├── Price input
│               │   ├── Quantity input
│               │   ├── Condition select
│               │   └── Submit buttons
│               │
│               └── Toast notifications
```

---

## 🎯 State Management Map

```
┌──────────────────────────────────────┐
│ React Query Global State             │
│                                      │
│ queryKey: ["listings"]               │
│ ├─ data: ListingData[]               │
│ ├─ isLoading: boolean                │
│ ├─ error: Error | null               │
│ └─ isFetching: boolean               │
│                                      │
│ Mutations:                           │
│ ├─ createListing (isPending)         │
│ ├─ updateListing (isPending)         │
│ ├─ deleteListing (isPending)         │
│ └─ uploadPictures (isPending)        │
└──────────────────────────────────────┘
           ↕
┌──────────────────────────────────────┐
│ Component Local State                │
│                                      │
│ _authenticated.listings.tsx:         │
│ └─ createDialogOpen: boolean         │
│ └─ searchQuery: string               │
│                                      │
│ CreateListingForm.tsx:               │
│ └─ formData: {                       │
│     title, description,              │
│     price, available_quantity,       │
│     condition                        │
│   }                                  │
└──────────────────────────────────────┘
           ↕
┌──────────────────────────────────────┐
│ Server-side (Supabase)               │
│                                      │
│ marketplace_connections:             │
│ ├─ user_id                           │
│ ├─ access_token                      │
│ ├─ refresh_token                     │
│ ├─ expires_at                        │
│ └─ account_id                        │
│                                      │
│ listings_cache:                      │
│ ├─ id                                │
│ ├─ title, price, status              │
│ ├─ available_qty, sold_qty           │
│ └─ synced_at                         │
└──────────────────────────────────────┘
```

---

**Arquitetura**: 5 camadas separadas  
**Data Flow**: Completo com error handling  
**Synchronization**: Bidirecional (React Query + Supabase)  
**Status**: ✅ Pronto para produção

*Criado: 1 de Junho 2026*
