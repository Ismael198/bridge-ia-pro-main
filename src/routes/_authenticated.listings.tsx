import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter } from "lucide-react";
import { ListingsTable } from "@/components/anuncios/ListingsTable";
import { CreateListingForm } from "@/components/anuncios/CreateListingForm";

export const Route = createFileRoute("/_authenticated/listings")({
  component: Listings,
  head: () => ({ meta: [{ title: "Anúncios — Gerencie Pedido Connect" }] }),
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
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-gradient-primary text-primary-foreground font-medium shadow-glow"
        >
          <Plus className="size-4" /> Criar anúncio
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-gradient-card shadow-card overflow-hidden">
        <ListingsTable onEditClick={(id) => alert(`Editar ${id} - em desenvolvimento`)} />
      </div>

      {/* Create Dialog */}
      <CreateListingForm open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </AppShell>
  );
}
