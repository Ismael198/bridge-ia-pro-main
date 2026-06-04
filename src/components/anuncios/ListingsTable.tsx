import { useListings, useDeleteListing, usePauseListing, useReactivateListing } from "@/hooks/useListings";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pause, Play, Edit3 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

export function ListingsTable({ onEditClick }: { onEditClick: (itemId: string) => void }) {
  const { data: listings, isLoading, error } = useListings();
  const deleteMutation = useDeleteListing();
  const pauseMutation = usePauseListing();
  const reactivateMutation = useReactivateListing();

  if (isLoading) {
    return (
      <div className="px-5 py-8 text-center text-sm text-muted-foreground">
        Carregando anúncios...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-8 text-center text-sm text-red-500">
        Erro ao carregar anúncios: {error instanceof Error ? error.message : "Tente novamente"}
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-sm text-muted-foreground">
        Nenhum anúncio criado ainda. Clique em "Criar anúncio" para começar.
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "paused":
        return "warning";
      case "closed":
        return "default";
      case "under_review":
        return "info";
      default:
        return "default";
    }
  };

  const formatCurrency = (price: number, currency: string = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(price);
  };

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const handleDelete = (itemId: string, title: string) => {
    if (confirm(`Tem certeza que deseja deletar "${title}"?`)) {
      deleteMutation.mutate(itemId, {
        onSuccess: () => {
          toast.success("Anúncio deletado com sucesso");
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Erro ao deletar");
        },
      });
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-left font-medium px-5">Produto</TableHead>
          <TableHead className="text-right font-medium px-5">Preço</TableHead>
          <TableHead className="text-center font-medium px-5">Status</TableHead>
          <TableHead className="text-right font-medium px-5">Estoque</TableHead>
          <TableHead className="text-right font-medium px-5">Vendidos</TableHead>
          <TableHead className="text-left font-medium px-5">Atualizado</TableHead>
          <TableHead className="text-right font-medium px-5">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {listings.map((listing) => (
          <TableRow key={listing.id} className="border-t border-border hover:bg-background/30">
            <TableCell className="px-5 py-3">
              <div className="font-medium">
                <a
                  href={listing.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate block"
                  title={listing.title}
                >
                  {listing.title}
                </a>
              </div>
              <div className="text-xs text-muted-foreground font-mono">{listing.id}</div>
            </TableCell>
            <TableCell className="px-5 py-3 text-right font-medium">
              {formatCurrency(listing.price, listing.currency_id)}
            </TableCell>
            <TableCell className="px-5 py-3 text-center">
              <StatusBadge status={listing.status} />
            </TableCell>
            <TableCell className="px-5 py-3 text-right">{listing.available_quantity}</TableCell>
            <TableCell className="px-5 py-3 text-right">{listing.sold_quantity}</TableCell>
            <TableCell className="px-5 py-3 text-sm text-muted-foreground">
              {formatDate(listing.last_updated)}
            </TableCell>
            <TableCell className="px-5 py-3">
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => onEditClick(listing.id)}
                  className="size-8 grid place-items-center rounded-md hover:bg-muted"
                  title="Editar"
                >
                  <Edit3 className="size-3.5" />
                </button>

                {listing.status === "active" ? (
                  <button
                    onClick={() => {
                      pauseMutation.mutate(listing.id, {
                        onSuccess: () => {
                          toast.success("Anúncio pausado");
                        },
                        onError: (error) => {
                          toast.error(error instanceof Error ? error.message : "Erro ao pausar");
                        },
                      });
                    }}
                    disabled={pauseMutation.isPending}
                    className="size-8 grid place-items-center rounded-md hover:bg-muted disabled:opacity-50"
                    title="Pausar"
                  >
                    <Pause className="size-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      reactivateMutation.mutate(listing.id, {
                        onSuccess: () => {
                          toast.success("Anúncio reativado");
                        },
                        onError: (error) => {
                          toast.error(error instanceof Error ? error.message : "Erro ao reativar");
                        },
                      });
                    }}
                    disabled={reactivateMutation.isPending}
                    className="size-8 grid place-items-center rounded-md hover:bg-muted text-success disabled:opacity-50"
                    title="Reativar"
                  >
                    <Play className="size-3.5" />
                  </button>
                )}

                <button
                  onClick={() => handleDelete(listing.id, listing.title)}
                  disabled={deleteMutation.isPending}
                  className="size-8 grid place-items-center rounded-md hover:bg-muted text-red-500 disabled:opacity-50"
                  title="Deletar"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
