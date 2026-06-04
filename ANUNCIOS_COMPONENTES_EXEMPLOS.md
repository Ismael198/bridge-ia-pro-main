# Implementação de Components — Anúncios

## Exemplo 1: ListingsTable Component

```typescript
// src/components/anuncios/ListingsTable.tsx
import { useListings, useDeleteListing, usePauseListing, useReactivateListing } from "@/hooks/useListings";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pause, Play, Edit } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export function ListingsTable({ onEditClick }: { onEditClick: (itemId: string) => void }) {
  const { data: listings, isLoading, error } = useListings();
  const deleteMutation = useDeleteListing();
  const pauseMutation = usePauseListing();
  const reactivateMutation = useReactivateListing();

  if (isLoading) return <div className="p-8 text-center">Carregando anúncios...</div>;
  if (error) return <div className="p-8 text-red-500">Erro ao carregar: {error.message}</div>;
  if (!listings?.length) return <div className="p-8 text-center">Nenhum anúncio criado</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      case "under_review":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Título</TableHead>
          <TableHead className="text-right">Preço</TableHead>
          <TableHead className="text-center">Status</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Vendidos</TableHead>
          <TableHead className="text-right">Atualizado</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {listings.map((listing) => (
          <TableRow key={listing.id}>
            <TableCell className="font-medium">
              <a href={listing.permalink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {listing.title}
              </a>
            </TableCell>
            <TableCell className="text-right">{formatCurrency(listing.price, listing.currency_id)}</TableCell>
            <TableCell className="text-center">
              <Badge className={getStatusColor(listing.status)}>{listing.status}</Badge>
            </TableCell>
            <TableCell className="text-right">{listing.available_quantity}</TableCell>
            <TableCell className="text-right">{listing.sold_quantity}</TableCell>
            <TableCell className="text-right text-sm text-muted-foreground">{formatDate(listing.last_updated)}</TableCell>
            <TableCell className="text-right space-x-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditClick(listing.id)}
              >
                <Edit className="size-4" />
              </Button>

              {listing.status === "active" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => pauseMutation.mutate(listing.id)}
                  disabled={pauseMutation.isPending}
                >
                  <Pause className="size-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reactivateMutation.mutate(listing.id)}
                  disabled={reactivateMutation.isPending}
                >
                  <Play className="size-4" />
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (confirm(`Delete "${listing.title}"?`)) {
                    deleteMutation.mutate(listing.id);
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

## Exemplo 2: CreateListingForm Component

```typescript
// src/components/anuncios/CreateListingForm.tsx
import { useState } from "react";
import { useCreateListing } from "@/hooks/useListings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

export function CreateListingForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: 0,
    available_quantity: 1,
    condition: "new" as const,
  });

  const createMutation = useCreateListing();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createMutation.mutateAsync(formData);
      toast({ title: "Sucesso!", description: "Anúncio criado com êxito." });
      onOpenChange(false);
      setFormData({ title: "", description: "", price: 0, available_quantity: 1, condition: "new" });
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao criar anúncio",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Anúncio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="ex: iPhone 13 Pro Max 128GB"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalhe o seu produto..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Preço (R$) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <Label htmlFor="qty">Quantidade *</Label>
              <Input
                id="qty"
                type="number"
                value={formData.available_quantity}
                onChange={(e) => setFormData({ ...formData, available_quantity: parseInt(e.target.value) })}
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="condition">Condição</Label>
            <select
              id="condition"
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value as "new" | "used" })}
              className="w-full px-3 py-2 border border-border rounded-md"
            >
              <option value="new">Novo</option>
              <option value="used">Usado</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Anúncio"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## Exemplo 3: UpdateListingsPage Component

```typescript
// src/routes/_authenticated.listings.tsx (Updated)
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";
import { ListingsTable } from "@/components/anuncios/ListingsTable";
import { CreateListingForm } from "@/components/anuncios/CreateListingForm";

export const Route = createFileRoute("/_authenticated/listings")({
  component: Listings,
  head: () => ({ meta: [{ title: "Anúncios" }] }),
});

function Listings() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <AppShell title="Anúncios" subtitle="Gerencie seus anúncios em todos os marketplaces.">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 rounded-lg bg-input border border-border px-3 h-10 flex-1 min-w-[240px]">
          <Search className="size-4 text-muted-foreground" />
          <input
            className="flex-1 bg-transparent outline-none text-sm"
            placeholder="Buscar por nome ou SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="h-10 px-3 rounded-lg border border-border bg-card hover:bg-muted text-sm inline-flex items-center gap-2">
          <Filter className="size-4" /> Marketplace
        </button>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="size-4" /> Criar anúncio
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-gradient-card shadow-card overflow-hidden">
        <ListingsTable onEditClick={(id) => alert(`Edit ${id}`)} />
      </div>

      {/* Create Dialog */}
      <CreateListingForm open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </AppShell>
  );
}
```

---

## Próximos Passos

1. Copiar exemplos acima nos arquivos mencionados
2. Ajustar imports para seus paths reais
3. Implementar EditListingForm similar a CreateListingForm
4. Adicionar ImageUploader para fotos
5. Testar com ML API

---

**Status**: Componentes prontos para copiar/colar
