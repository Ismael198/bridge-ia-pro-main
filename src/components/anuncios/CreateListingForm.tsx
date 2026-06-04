import { useState } from "react";
import { useCreateListing } from "@/hooks/useListings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export function CreateListingForm({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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

    // Validação básica
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (formData.price <= 0) {
      toast.error("Preço deve ser maior que 0");
      return;
    }

    if (formData.available_quantity < 1) {
      toast.error("Quantidade deve ser no mínimo 1");
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        price: formData.price,
        available_quantity: formData.available_quantity,
        condition: formData.condition,
      });

      toast.success("Anúncio criado com sucesso!");
      onOpenChange(false);
      setFormData({
        title: "",
        description: "",
        price: 0,
        available_quantity: 1,
        condition: "new",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Falha ao criar anúncio";
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Anúncio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium">
              Título <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="ex: iPhone 13 Pro Max 128GB"
              disabled={createMutation.isPending}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Seja descritivo para melhor visibilidade
            </p>
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Descrição
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalhe as características, condição e especificações do seu produto..."
              disabled={createMutation.isPending}
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Uma descrição detalhada aumenta as chances de venda
            </p>
          </div>

          {/* Preço e Quantidade */}
          <div className="grid grid-cols-2 gap-4">
            {/* Preço */}
            <div>
              <Label htmlFor="price" className="text-sm font-medium">
                Preço (R$) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                value={formData.price === 0 ? "" : formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={createMutation.isPending}
                required
              />
            </div>

            {/* Quantidade */}
            <div>
              <Label htmlFor="qty" className="text-sm font-medium">
                Quantidade <span className="text-red-500">*</span>
              </Label>
              <Input
                id="qty"
                type="number"
                value={formData.available_quantity}
                onChange={(e) => setFormData({ ...formData, available_quantity: parseInt(e.target.value) || 1 })}
                placeholder="1"
                min="1"
                disabled={createMutation.isPending}
                required
              />
            </div>
          </div>

          {/* Condição */}
          <div>
            <Label htmlFor="condition" className="text-sm font-medium">
              Condição
            </Label>
            <select
              id="condition"
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value as "new" | "used" })}
              disabled={createMutation.isPending}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="new">Novo</option>
              <option value="used">Usado</option>
            </select>
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-gradient-primary text-primary-foreground"
            >
              {createMutation.isPending ? "Criando..." : "Criar Anúncio"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
