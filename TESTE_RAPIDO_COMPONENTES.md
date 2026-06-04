# 🚀 Teste Rápido — Componentes Implementados

**Objetivo**: Validar que os componentes funcionam corretamente com os hooks  
**Tempo**: ~10 minutos  
**Requisitos**: Servidor dev rodando, usuário autenticado

---

## ✅ Checklist de Teste

### Passo 1: Start Dev Server

```bash
cd /home/ismael/bridge-ia-pro-main
npm run dev
```

**Esperado**: 
- Compilação sem erros
- Servidor roda em http://localhost:5173
- Nenhum warning relacionado a Anúncios

---

### Passo 2: Navegar para Anúncios

```
1. Abrir browser: http://localhost:5173
2. Login se necessário
3. Clicar em "Anúncios" no sidebar
4. Esperado: Página /listings carrega
```

**Validar**:
- [ ] Header "Anúncios" visível
- [ ] Subtitle "Gerencie seus anúncios..." visível
- [ ] Botão "Criar anúncio" (azul com gradient)
- [ ] Search input funciona
- [ ] Marketplace filter button existe

---

### Passo 3: Verificar Carregamento de Dados

**Esperado - Um dos cenários**:

**Cenário A**: Dados carregando
```
[Table mostra] "Carregando anúncios..."
[Duração] ~2 segundos
[Resultado] Tabela mostra anúncios do usuário
```

**Cenário B**: Nenhum anúncio
```
[Table mostra] "Nenhum anúncio criado ainda..."
[Botão] "Criar anúncio" funciona
```

**Cenário C**: Dados carregados
```
[Table mostra] Lista de anúncios
[Colunas] Produto, Preço, Status, Estoque, Vendidos, Atualizado, Ações
[Cada linha] Com title, preço em R$, badge de status
```

**Teste**:
- [ ] Tabela não mostra erro
- [ ] Dados aparecem em < 3s
- [ ] Sem console errors (F12)

---

### Passo 4: Abrir Dialog Criar Anúncio

```
1. Clicar botão "Criar anúncio" (gradient azul)
2. Esperado: Dialog modal abre
```

**Validar**:
- [ ] Dialog title "Criar Novo Anúncio" visível
- [ ] Form inputs aparecem:
  - [ ] Título (com placeholder "ex: iPhone 13...")
  - [ ] Descrição (textarea)
  - [ ] Preço (com input number)
  - [ ] Quantidade (com input number)
  - [ ] Condição (dropdown: Novo/Usado)
- [ ] Botões:
  - [ ] "Criar Anúncio" (azul, disabled até submit)
  - [ ] "Cancelar" (outline)

---

### Passo 5: Testar Validações

**Teste 1: Enviar vazio**
```
1. Clicar "Criar Anúncio" sem preencher
2. Esperado: Toast erro "Título é obrigatório"
```

**Teste 2: Preço inválido**
```
1. Preencher:
   - Título: "iPhone 13"
   - Preço: 0 (ou deixar vazio)
2. Clicar "Criar Anúncio"
3. Esperado: Toast erro "Preço deve ser maior que 0"
```

**Teste 3: Quantidade inválida**
```
1. Preencher:
   - Título: "iPhone 13"
   - Preço: 3000
   - Quantidade: 0
2. Clicar "Criar Anúncio"
3. Esperado: Toast erro "Quantidade deve ser no mínimo 1"
```

**Validar**:
- [ ] Toast notifications aparecem (canto superior direito)
- [ ] Mensagens são claras
- [ ] Dialog fica aberta após erro

---

### Passo 6: Criar Anúncio Válido

```
1. Preencher formulário:
   Título: "iPhone 13 Pro Max 128GB"
   Descrição: "Excelente condição, com caixa e acessórios"
   Preço: 3500
   Quantidade: 5
   Condição: Novo

2. Clicar "Criar Anúncio"
3. Observar:
   - Botão muda para "Criando..."
   - Inputs desabilitados (cinzento)
   - Dialog continua aberta
```

**Esperado (após 2-5 segundos)**:
```
✅ Toast: "Anúncio criado com sucesso!"
✅ Dialog fecha automaticamente
✅ Tabela refetch dados (mostra novo anúncio)
✅ FormData resetado
```

**Se erro**:
```
❌ Toast com mensagem de erro
❌ Dialog permanece aberta
❌ Form preserva dados (pode retentar)
❌ Check console F12 para detalhes
```

---

### Passo 7: Testar Ações da Tabela

**Teste: Pausar Anúncio**
```
1. Na tabela, clicar ícone "Pausa" (||)
2. Esperado:
   - Status muda de "active" para "paused"
   - Toast: "Anúncio pausado"
   - Ícone muda para "Play"
```

**Teste: Reativar Anúncio**
```
1. Clicar ícone "Play" (>)
2. Esperado:
   - Status volta para "active"
   - Toast: "Anúncio reativado"
   - Ícone volta para "Pausa"
```

**Teste: Deletar Anúncio**
```
1. Clicar ícone "Trash" (🗑️)
2. Esperado:
   - Dialog de confirmação: "Tem certeza que deseja deletar 'XXX'?"
   - Opções: [OK] [Cancelar]
3. Clicar OK
4. Esperado:
   - Toast: "Anúncio deletado com sucesso"
   - Linha remove da tabela
```

**Validar**:
- [ ] Ícones aparecem alinhados à direita
- [ ] Botões respondem ao hover (background muda)
- [ ] Confirmação aparece antes de deletar
- [ ] Toasts aparecem corretamente
- [ ] Tabela atualiza após ação

---

### Passo 8: Verificar Console (DevTools)

Abrir F12 → Console:

**Esperado - Nenhum erro**:
```
❌ Errors relacionados a "useListings"
❌ Errors relacionados a "CreateListingForm"  
❌ Errors relacionados a "ListingsTable"
❌ Errors de tipo TypeScript
❌ Warnings de React sobre keys
```

**Esperado - Logs úteis** (se houver):
```
✅ [Listings] Fetching user items...
✅ [CreateListing] Creating item: {title, price, ...}
✅ [Listing] Pausing item...
```

---

### Passo 9: Verificar Supabase

Se tiver acesso ao Supabase:

```sql
-- Verificar que listings foram criadas no cache
SELECT * FROM listings_cache WHERE user_id = 'seu_user_id' ORDER BY created_at DESC LIMIT 5;

-- Esperado: Novas linhas aparecem após criar anúncio
```

---

### Passo 10: Verificar Mercado Livre (Opcional)

Se conectou à conta real de ML:

```
1. Abrir https://vendas.mercadolivre.com.br (sua conta)
2. Verificar "Meus anúncios"
3. Esperado: Novo anúncio aparece (pode levar 30-60 segundos)
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module @/hooks/useListings"
```
Solução: Verificar se arquivo src/hooks/useListings.ts existe
- Verificar path em tsconfig (@ points to src/)
- npm install
```

### Erro: "Toast is not a function"
```
Solução: Verificar import
✅ import { toast } from "sonner";
❌ import { useToast } from "@/hooks/use-toast";
```

### Tabela mostra "Carregando..." permanentemente
```
Solução: 
1. Check console F12 para erro de fetch
2. Verificar se useListings() retorna erro
3. Verificar se server function listings.get.ts existe
4. Verificar autenticação/token
```

### Dialog não abre quando clica botão
```
Solução:
1. Verificar se useState(false) está em sync
2. Verificar onClick={() => setCreateDialogOpen(true)}
3. Check console para erros
```

### Criar anúncio falha com erro 401/403
```
Solução:
1. Verificar se usuário está autenticado (AuthContext)
2. Verificar token em Supabase (marketplace_connections)
3. Verificar se OAuth token expirou
```

### Tabela vazia mas deve ter dados
```
Solução:
1. Verificar em Supabase > listings_cache se dados existem
2. Verificar se useListings() query key é correto: ["listings"]
3. Verificar React Query DevTools (npm install @tanstack/react-query-devtools)
```

---

## 📊 Expected Performance

| Ação | Tempo Esperado | Descrição |
|------|---|---|
| Página Load | < 2s | Fetch + render |
| Tabela com 100 items | < 1s | Render |
| Criar anúncio | 3-5s | API ML call |
| Pausar/Reativar | 2-3s | API ML call |
| Deletar | 3-4s | 2-step ML call |
| Toast | Imediato | Local notification |

---

## ✅ Conclusão

Se todos os testes passarem, componentes estão 100% funcional!

**Status**:
- [ ] Passo 1-3: Básico (interface renders)
- [ ] Passo 4-5: Validações (form works)
- [ ] Passo 6: Create (API integration)
- [ ] Passo 7: Mutations (CRUD works)
- [ ] Passo 8: Console (no errors)
- [ ] Passo 9: Database (data persists)
- [ ] Passo 10: ML API (real data syncs)

**Após passar todos**: Componentes estão prontos para produção! 🎉

---

**Criado**: 1 de Junho 2026  
**Última Atualização**: Após implementação de componentes  
**Status**: ✅ Pronto para testes
