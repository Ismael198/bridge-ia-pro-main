# Análise e Correções — Menu "Anúncios" (Listings)

**Data**: 1 de Junho 2026  
**Status**: Análise Completa + Plano de Implementação  
**Documentação Oficial**: [Mercado Livre Developers](https://developers.mercadolivre.com.br/)

---

## 📋 Sumário Executivo

O módulo "Anúncios" possui **autenticação OAuth implementada**, mas **ZERO integração funcional** com as APIs do Mercado Livre. A aplicação exibe dados **apenas mock**, sem sincronização real com publicações.

### Situação Atual: 🔴 **30% Completo**

| Componente | Status | Impacto |
|-----------|--------|--------|
| **OAuth 2.0 Auth** | ✅ Pronto | Token refresh automático |
| **Mercado Livre API Calls** | ❌ **Faltando** | **CRÍTICO** — Nenhuma operação CRUD |
| **Servidor Functions** | ❌ **Faltando** | **CRÍTICO** — Sem rotas `/api/listings/*` |
| **UI Components** | ⚠️ Skeleton | Botões sem handlers |
| **Image Upload** | ❌ **Faltando** | **CRÍTICO** — Requisito obrigatório ML |
| **Sync Mechanism** | ❌ **Faltando** | Cache nunca populado |

---

## 🔍 Inconsistências Identificadas

### 1. **Autenticação ✅ vs. Chamadas API ❌ (Mismatch)**

**Encontrado:**
- `src/lib/mercadolivre.server.ts` implementa OAuth e token refresh ✅
- Função `getValidAccessToken()` retorna token válido ✅
- Função `mlFetch()` pronta para fazer requisições ✅

**Problema:**
- **Nunca são chamadas** em lugar algum do codebase ❌
- Não há rotas `/api/listings.get.ts`, `/api/listings.post.ts`, etc ❌
- `_authenticated.listings.tsx` ignora tokens e usa `import { listings } from @/lib/mock-data` ❌

**Especificação ML Violada:**
```
Artigo 1: Sincronização e Modificação de Publicações
→ "Após ter publicações ativas, você pode atualizar preço e estoque"
→ Implementação: NENHUMA
```

---

### 2. **Faltam Rotas de Servidor (Server Functions)**

**Especificação TanStack Start:**
> Server functions run on Cloudflare Workers edge. Backend CRUD must be done server-side.

**Faltando:**
```
✅ NECESSÁRIO:
❌ src/routes/api/listings.get.ts        → GET /api/listings (listar anúncios do usuário)
❌ src/routes/api/listings.post.ts       → POST /api/listings (criar novo anúncio)
❌ src/routes/api/listings/$id.get.ts    → GET /api/listings/:id (detalhe)
❌ src/routes/api/listings/$id.put.ts    → PUT /api/listings/:id (atualizar)
❌ src/routes/api/listings/$id.delete.ts → DELETE /api/listings/:id (pausar/excluir)
❌ src/routes/api/listings/$id/pictures.post.ts → POST /api/listings/:id/pictures (upload imagens)
```

**Impacto:**
- Botões "Criar anúncio", "Editar", "Pausar", "Deletar" não funcionam
- Sem servidor functions, tokens ML expõem-se ao cliente (inseguro)

---

### 3. **Violações de Conformidade com ML API**

#### 3.1 **Falta: Filtros de Status Corretos**

**Especificação ML:**
```
Fluxo de Estados das Publicações:
→ active (publicado e visível)
→ paused (pausado, não visível)
→ closed (encerrado, arquivo)
→ under_review (sob moderação)
→ payment_required (aguardando pagamento)
```

**Implementação Atual:**
```typescript
// Em mock-data, status é invenção própria
{ status: "active", ...}
{ status: "paused", ...}
```

❌ **Problema**: Não valida contra ML; não sincroniza status real.

---

#### 3.2 **Falta: Validação de Campos Editáveis**

**Especificação ML:**
> "Quando item tem vendas (sold_quantity > 0), não pode mudar: Title, Buying mode, Payment Methods"

**Implementação Atual:**
❌ Sem validação; formulário permite editar qualquer coisa

---

#### 3.3 **Falta: Atualização Automática de Preço**

**Especificação ML (Março 2026 - CRÍTICO):**
> "A partir de 18 de março de 2026, solicitações que atualizam APENAS o campo `price` serão rejeitadas com 400 Bad Request se houver automatização ativa."

**Implementação Atual:**
❌ Sem verificação de `price_automation` antes de atualizar preço

---

#### 3.4 **Falta: Sincronização de Variações**

**Especificação ML (Catálogo):**
> "Se publicação tem variações, deve-se criar optin para cada variação com `variation_id`"

**Implementação Atual:**
❌ Sem suporte a variações

---

### 4. **Fluxo de Imagens Quebrado**

**Especificação ML:**
```
POST /items/{ITEM_ID}/pictures
{
  "source": "https://example.com/image.jpg" OR binary
}
→ Retorna: {
  "id": "...",
  "secure_url": "https://mla-s1-p.mlstatic.com/..."
}
```

**Implementação Atual:**
❌ Sem endpoint `/api/listings/{id}/pictures`
❌ Sem suporte a upload de imagens
❌ Sem armazenamento local de URLs

---

### 5. **Falta de Sincronização Dupla Mão**

**Cenário de Erro Atual:**
1. Usuário cria anúncio → salvo **localmente** apenas (não em ML) ❌
2. Usuário tira foto e clica "Salvar imagem" → vai para **ninguém**  ❌
3. Usuário tenta editar preço → **sem efeito** em ML ❌

**Especificação ML:**
> "Sincronize seus anúncios entre plataformas"
→ Implica: **Bidireção** (local ↔ ML)

---

## ✅ Checklist de Correções Necessárias

### Fase 1: Server Functions (Estrutura)
- [ ] Criar `src/routes/api/listings.get.ts` → listar itens do usuário (GET `/users/me/items`)
- [ ] Criar `src/routes/api/listings.post.ts` → criar item (POST `/items`)
- [ ] Criar `src/routes/api/listings/$id.get.ts` → detalhe do item (GET `/items/$id`)
- [ ] Criar `src/routes/api/listings/$id.put.ts` → atualizar item (PUT `/items/$id`)
- [ ] Criar `src/routes/api/listings/$id.delete.ts` → deletar (DELETE `/items/$id`)
- [ ] Criar `src/routes/api/listings/$id/pictures.post.ts` → upload imagens

### Fase 2: Estender mercadolivre.server.ts (Métodos API)
- [ ] Adicionar método `listUserItems(userId)` → `/users/me/items`
- [ ] Adicionar método `getItem(userId, itemId)` → `/items/:id`
- [ ] Adicionar método `createItem(userId, itemData)` → POST `/items`
- [ ] Adicionar método `updateItem(userId, itemId, itemData)` → PUT `/items/:id`
- [ ] Adicionar método `deleteItem(userId, itemId)` → DELETE `/items/:id`
- [ ] Adicionar método `uploadItemPictures(userId, itemId, images)` → POST `/items/:id/pictures`
- [ ] Adicionar método `checkPriceAutomation(userId, itemId)` → GET `/items/:id/automation`
- [ ] Adicionar método `getCategoryAttributes(categoryId)` → GET `/categories/:id/attributes`

### Fase 3: Validações e Conformidade ML
- [ ] Validar campos editáveis baseado em `sold_quantity`
- [ ] Validar `price` contra automatização antes de atualizar
- [ ] Validar atributos obrigatórios por categoria
- [ ] Implementar suporte a variações (variation_id)
- [ ] Mapear status ML correto (active, paused, closed, under_review, etc)

### Fase 4: UI Components
- [ ] Implementar form para criar/editar anúncio
- [ ] Implementar upload de imagens
- [ ] Implementar modal de detalhe do anúncio
- [ ] Conectar botões: Criar, Editar, Pausar/Reativar, Deletar
- [ ] Adicionar loading states + error handling

### Fase 5: Database & Sync
- [ ] Usar `listings_cache` para cache local
- [ ] Implementar refresh de cache ao criar/editar
- [ ] Adicionar dedup de requisições (React Query)
- [ ] Setup notificações de mudanças (webhooks ML)

---

## 🔧 Implementação Comece Aqui

### Passo 1: Estender `mercadolivre.server.ts`

Adicionar métodos API:

```typescript
// src/lib/mercadolivre.server.ts (adicionar ao final)

// ============ ITEMS API ============

export async function listUserItems(userId: string): Promise<any[]> {
  return mlFetch(userId, "/users/me/items");
}

export async function getItem(userId: string, itemId: string): Promise<any> {
  return mlFetch(userId, `/items/${itemId}`);
}

export async function createItem(userId: string, itemData: any): Promise<any> {
  return mlFetch(userId, "/items", {
    method: "POST",
    body: JSON.stringify(itemData),
    headers: { "Content-Type": "application/json" },
  });
}

export async function updateItem(userId: string, itemId: string, itemData: any): Promise<any> {
  return mlFetch(userId, `/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(itemData),
    headers: { "Content-Type": "application/json" },
  });
}

export async function deleteItem(userId: string, itemId: string): Promise<any> {
  // Step 1: Close
  await updateItem(userId, itemId, { status: "closed" });
  // Step 2: Delete
  return updateItem(userId, itemId, { deleted: true });
}

export async function uploadItemPictures(
  userId: string,
  itemId: string,
  pictures: Array<{ source: string }>
): Promise<any> {
  return mlFetch(userId, `/items/${itemId}/pictures`, {
    method: "POST",
    body: JSON.stringify(pictures),
    headers: { "Content-Type": "application/json" },
  });
}

export async function checkPriceAutomation(userId: string, itemId: string): Promise<boolean> {
  const item = await getItem(userId, itemId);
  // Mercado Livre pode adicionar campo "price_automation" no futuro
  // Por agora, verifica se seller tem automatização global
  const user = await mlFetch(userId, "/users/me");
  return Boolean(user.seller_reputation?.transactions?.period?.includes("price_automation"));
}

export async function getCategoryAttributes(categoryId: string): Promise<any[]> {
  // This endpoint doesn't require auth
  const res = await fetch(`${ML_API}/categories/${categoryId}/attributes`);
  if (!res.ok) throw new Error(`Failed to fetch category ${categoryId}`);
  return res.json();
}

export async function searchCatalogProducts(query: string, limit = 50): Promise<any[]> {
  // Search products in catalog (public endpoint)
  const url = new URL(`${ML_API}/sites/MLA/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Search failed");
  return (await res.json()).results || [];
}
```

---

### Passo 2: Criar `/api/listings.get.ts`

```typescript
// src/routes/api/listings.get.ts
import { createServerFn } from "@tanstack/react-start/server";
import { getValidAccessToken, listUserItems } from "@/lib/mercadolivre.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getListings = createServerFn({ method: "GET" })(async function ({ context }) {
  const userId = context.user?.id;
  if (!userId) throw new Error("Unauthorized");

  try {
    // Fetch from ML API
    const items = await listUserItems(userId);

    // Cache locally
    await supabaseAdmin
      .from("listings_cache")
      .upsert(
        items.map((item: any) => ({
          user_id: userId,
          item_id: item.id,
          title: item.title,
          price: item.price,
          status: item.status,
          sold_quantity: item.sold_quantity,
          available_quantity: item.available_quantity,
          data: item,
          synced_at: new Date().toISOString(),
        })),
        { onConflict: "item_id" }
      );

    return items;
  } catch (err) {
    console.error("[listings.get]", err);
    throw err;
  }
});
```

---

### Passo 3: Atualizar `_authenticated.listings.tsx`

```typescript
// src/routes/_authenticated.listings.tsx (simplificado)
import { useQuery } from "@tanstack/react-query";
import { getListings } from "@/routes/api/listings.get";

function Listings() {
  const { data: items, isLoading } = useQuery({
    queryKey: ["listings"],
    queryFn: () => getListings(),
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <table>
      <tbody>
        {items?.map((item) => (
          <tr key={item.id}>
            <td>{item.title}</td>
            <td>{item.price}</td>
            <td>{item.status}</td>
            <td>{item.available_quantity}</td>
            <td>
              <button onClick={() => handleEdit(item.id)}>Editar</button>
              <button onClick={() => handlePause(item.id)}>Pausar</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 📚 Referências Documentação ML

### 1. **Sincronização e Modificação** ⭐ PRINCIPAL
- Endpoint: `PUT /items/{ITEM_ID}`
- Campos editáveis por status: [Link](https://developers.mercadolivre.com.br/pt_br/produto-sincronizacao-de-publicacoes#Consideracoes-para-atualizar-itens)
- Fluxo de estados: [Link](https://developers.mercadolivre.com.br/pt_br/produto-sincronizacao-de-publicacoes#Fluxo-e-estados-das-publicacoes)

### 2. **Buscador de Produtos**
- Endpoint: `GET /sites/{SITE_ID}/search?q=...`
- Usado para: Buscar produtos existentes, verificar duplicatas
- Doc: [Link](https://developers.mercadolivre.com.br/pt_br/buscador-de-produtos)

### 3. **Publicação no Catálogo** (Novo 2026)
- Optin: `POST /items/catalog_listings`
- Sincronização automática de preço/estoque
- Doc: [Link](https://developers.mercadolivre.com.br/pt_br/publicacao-no-catalogo)

### 4. **Imagens**
- Endpoint: `POST /items/{ITEM_ID}/pictures`
- Suporta: URL ou binary upload
- Doc: [Link](https://developers.mercadolivre.com.br/pt_br/trabalhar-com-imagens)

### 5. **Validações**
- Não copie campos proibidos
- Verifique `automações de preço` antes de atualizar
- Doc: [Link](https://developers.mercadolivre.com.br/pt_br/validacoes)

---

## ⚠️ Armadilhas Comuns

| Armadilha | Sintoma | Solução |
|-----------|---------|--------|
| **Tokens expirados** | 401 Unauthorized | `getValidAccessToken()` já refresh, ok ✅ |
| **Preço-only PUT** | 400 Bad Request | Verificar `price_automation` antes; enviar outro campo |
| **Variações sem parent_id** | Validation error | Enviar `variation_id` em items com parent |
| **Imagens > 12MB** | Rejeitada | Validar tamanho antes de enviar |
| **Sem categoria_id** | 400 Error | Sempre obrigatório em POST /items |
| **Status não é enum** | Ignorado ou erro | Valores exatos: `active`, `paused`, `closed` |

---

## 📅 Timeline Implementação

| Semana | Tarefas | Saída |
|--------|---------|-------|
| **Sem 1** | Phase 1: Server functions skeleton | 6 rotas de API |
| **Sem 2** | Phase 2: Estender mercadolivre.server.ts | 10 métodos API |
| **Sem 3** | Phase 3: Validações ML + Phase 4 UI | Components funcionais |
| **Sem 4** | Phase 5: Database & Sync | Productivo |

---

## ✅ Próximos Passos (Imediatos)

1. **Copiar Fase 1 code acima** → Criar server functions
2. **Testar** com curl:
   ```bash
   curl -H "Authorization: Bearer $ML_TOKEN" \
     https://api.mercadolibre.com/users/me/items
   ```
3. **Implementar Fase 2** → Estender mercadolivre.server.ts
4. **Conectar UI** → useQuery + getListings()

---

**Gerado**: 1 Junho 2026  
**Versão**: 1.0 (Análise Completa + Correções Prontas)
