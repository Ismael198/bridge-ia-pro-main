# Guia de Testes e Validações — Anúncios

**Objetivo**: Verificar conformidade com API Mercado Livre após implementar correções

---

## ✅ Checklist de Testes Funcionales

### Fase 1: Autenticação

- [ ] Usuário clica "Conectar Mercado Livre" → Redireciona para OAuth ML
- [ ] Usuário autoriza → Token salvo em `marketplace_connections`
- [ ] Verificar em Supabase: `access_token`, `refresh_token`, `account_id` preenchidos
- [ ] Token expira após 6h → `getValidAccessToken()` auto-refresha

### Fase 2: Listar Anúncios

```bash
# Test server function directly
curl -X GET http://localhost:5173/api/listings \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

- [ ] GET `/api/listings` retorna array de itens do usuário
- [ ] Cada item tem: `id`, `title`, `price`, `status`, `available_quantity`, `sold_quantity`, `pictures`
- [ ] Status values são exatos: `"active"`, `"paused"`, `"closed"`, `"under_review"` (não customizados)
- [ ] URLs de pictures são HTTPS seguras (secure_url)
- [ ] Cache em `listings_cache` é populado após fetch
- [ ] Refetch a cada 5min (staleTime)

### Fase 3: Criar Anúncio

```bash
curl -X POST http://localhost:5173/api/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -d '{
    "title": "iPhone 13 Pro 128GB",
    "description": "Impecável, com caixa e acessórios",
    "price": 3500,
    "available_quantity": 5,
    "condition": "new"
  }'
```

- [ ] POST `/api/listings` cria item em ML API
- [ ] Retorna: `id` (MLM/MLA/MLZ format), `title`, `price`, `status: "active"`, `permalink`
- [ ] Item é imediatamente visível em ML após criação
- [ ] Cache local atualizado com novo item
- [ ] `useListings()` hook refetch automático
- [ ] Botão "Criar anúncio" abre modal → form → submit → sucesso

### Fase 4: Atualizar Anúncio

#### 4.1 Atualizar Preço

```bash
curl -X PUT http://localhost:5173/api/listings/MLM123456 \
  -H "Content-Type: application/json" \
  -d '{ "price": 3200, "description": "..." }'
```

- [ ] PUT `/api/listings/{id}` com preço novo + descrição = sucesso
- [ ] PUT com APENAS preço (sem outro campo) = 400 erro (March 2026 compliance)
- [ ] Validação: Se `sold_quantity > 0`, não pode mudar título ✓
- [ ] Preço aparece atualizado em ML dentro de 1min
- [ ] Cache local sincronizado

#### 4.2 Atualizar Quantidade

```bash
curl -X PUT http://localhost:5173/api/listings/MLM123456 \
  -H "Content-Type: application/json" \
  -d '{ "available_quantity": 10 }'
```

- [ ] Aumentar quantidade de 0 → 5: status muda "paused" → "active"
- [ ] Diminuir para 0: status muda "active" → "paused" (out_of_stock)
- [ ] Quantidade reflete em ML dentro de 30s
- [ ] Badge "Sem Estoque" desaparece após aumentar qty

#### 4.3 Pausar/Reativar

```bash
# Pause
curl -X PUT http://localhost:5173/api/listings/MLM123456 \
  -d '{ "status": "paused" }'

# Reactivate
curl -X PUT http://localhost:5173/api/listings/MLM123456 \
  -d '{ "status": "active" }'
```

- [ ] Botão "Pausar" → status muda para "paused" em ML
- [ ] Botão "Reativar" → status muda para "active" em ML
- [ ] Item desaparece de pesquisa em ML quando pausado
- [ ] Item volta a aparecer ao reativar

### Fase 5: Upload de Imagens

```bash
curl -X POST http://localhost:5173/api/listings/MLM123456/pictures \
  -H "Content-Type: application/json" \
  -d '{
    "pictures": [
      { "source": "https://example.com/img1.jpg" },
      { "source": "https://example.com/img2.jpg" }
    ]
  }'
```

- [ ] POST `/api/listings/{id}/pictures` com URLs HTTPS
- [ ] Retorna array de pictures com `secure_url`, `id`, `size`
- [ ] Máximo 12 fotos por item (validação)
- [ ] Fotos rejeitadas se > 12MB cada (ML limit)
- [ ] URLs inválidas = 400 error
- [ ] Fotos aparecem em ML dentro de 2min

### Fase 6: Deletar Anúncio

```bash
curl -X DELETE http://localhost:5173/api/listings/MLM123456 \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

- [ ] DELETE `/api/listings/{id}` → 2-step process (close + delete)
- [ ] Item status muda "closed" na ML
- [ ] Item marcado como "deleted" na ML
- [ ] Item desaparece de `/users/me/items` na ML
- [ ] Removido de cache local
- [ ] Se 409 (conflict) → retry após 2s
- [ ] Botão com confirmação "Tem certeza?" antes de deletar

---

## 🔍 Validações de Conformidade ML

### 1. Status Enum (Case-Sensitive)

❌ **ERRADO:**
```typescript
{ status: "Active" }   // Maiúscula
{ status: "PAUSED" }   // Maiúscula
```

✅ **CORRETO:**
```typescript
{ status: "active" }
{ status: "paused" }
{ status: "closed" }
{ status: "under_review" }
```

**Teste**:
```bash
curl -X PUT ... -d '{ "status": "Active" }'  # Deve falhar ou ser ignorado
```

### 2. Restrições por sold_quantity

**Cenário**: Item vendido 5 unidades

```bash
# ❌ DEVE FALHAR
curl -X PUT http://localhost:5173/api/listings/MLM123 \
  -d '{ "title": "Novo Título" }'

# ✅ DEVE FUNCIONAR
curl -X PUT http://localhost:5173/api/listings/MLM123 \
  -d '{ "price": 3000, "available_quantity": 20 }'
```

**Validação no Código**:
```typescript
if (payload.title && current.sold_quantity > 0) {
  throw new Error("Cannot update title on items with sales");
}
```

**Teste**: Verificar erro no UI

### 3. Preço-Only Restriction (March 2026)

**Antes (OK)**:
```bash
curl -X PUT ... -d '{ "price": 3000 }'  # ✅ Aceito (antes de 18/Mar)
```

**Depois (REJEITADO)**:
```bash
curl -X PUT ... -d '{ "price": 3000 }'  # ❌ 400 Bad Request
```

**Solução**:
```bash
# SEMPRE incluir outro campo
curl -X PUT ... -d '{
  "price": 3000,
  "description": "Descrição atualizada"
}'  # ✅ Aceito
```

**Teste**:
- Tentar atualizar preço sozinho → deve falhar gracefully
- Atualizar preço + descrição → deve funcionar

### 4. Variações (Se Aplicável)

Se item tem variações (tamanho, cor, etc):

```bash
curl -X PUT ... \
  -d '{
    "variations": [
      { "variation_id": 123, "price": 100, "available_quantity": 5 },
      { "variation_id": 456, "price": 120, "available_quantity": 3 }
    ]
  }'
```

**Teste**:
- Criar item com atributos que geram variações
- Validar `variation_id` obrigatório para cada

### 5. Categoria & Atributos

**Fluxo**:
1. User digita título → `predictCategory()` busca categoria provável
2. Category returned → `getCategoryAttributes()` busca atributos obrigatórios
3. Formulário renderiza campos obrigatórios dinâmicamente
4. Validate: Não enviar item sem atributos obrigatórios

**Teste**:
```bash
# Deve retornar array de categorias
curl -X GET https://api.mercadolibre.com/sites/MLA/category_predictor/predict?title=iPhone

# Deve retornar atributos (brand, model, color, etc)
curl -X GET https://api.mercadolibre.com/categories/MLA1055/attributes
```

---

## 🛠️ Troubleshooting

### Erro 401 Unauthorized

**Causa**: Token expirado ou inválido

**Solução**:
```typescript
// getValidAccessToken() deve auto-refresh
// Se ainda falha, reconectar OAuth
```

**Debug**:
```typescript
const conn = await supabaseAdmin
  .from("marketplace_connections")
  .select("*")
  .eq("user_id", userId)
  .single();
  
console.log("Token expires at:", conn.expires_at);
console.log("Time until expiry:", new Date(conn.expires_at) - Date.now());
```

### Erro 400 Validation Error

**Causas comuns**:
1. Status não em lowercase
2. Campo obrigatório faltando (category_id, title, price, etc)
3. Tipo de dados errado (price deve ser number, não string)
4. Preço-only update sem outro campo (March 2026)

**Debug**:
```typescript
try {
  await updateListing(userId, itemId, { price: 3000 });
} catch (err) {
  console.log(err.message);
  // Look for "cause_id" in error response
}
```

### Erro 409 Conflict (Item Deletion)

**Causa**: Item ainda estar sendo processado após close

**Solução**:
```typescript
// Already handled in deleteItem()
await updateItem(userId, itemId, { status: "closed" });
await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
await updateItem(userId, itemId, { deleted: true });
```

### Imagens Rejeitadas

**Causas**:
- Arquivo > 12MB
- URL inválida ou inacessível
- Formato não suportado (apenas JPG, PNG)

**Debug**:
```typescript
const pic = await fetch(url);
console.log("Size:", pic.headers.get("content-length"));
console.log("Type:", pic.headers.get("content-type"));
```

---

## 📋 Definição de Pronto (Definition of Done)

Antes de considerar "concluído", validar:

- [ ] Todos os 6 testes de fase passam
- [ ] Sem erros 401/403/400 recorrentes
- [ ] Cache sincroniza 100% das vezes
- [ ] Botões UI respondem corretamente
- [ ] Erros ML são exibidos ao usuário (toast notifications)
- [ ] Sem console.errors relacionados a Anúncios
- [ ] Performance: Listar 100 anúncios em < 2s
- [ ] Documentação atualizada com exemplos de API

---

**Criado**: 1 de Junho 2026  
**Versão**: 1.0
