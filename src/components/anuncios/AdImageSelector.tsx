import { Link } from "@tanstack/react-router";
import { ImageIcon, Loader2, Check } from "lucide-react";
import { useProductImages } from "@/hooks/useProductImages";

interface Props {
  productId?: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function AdImageSelector({ productId, selectedIds, onChange }: Props) {
  const { images, loading } = useProductImages(productId);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  };

  return (
    <section className="jtd-glass p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
          <ImageIcon size={20} className="text-primary" />
          Imagens do Anúncio
        </h3>
        {productId && images.length > 0 && (
          <div className="flex gap-4 text-xs">
            <button
              type="button"
              onClick={() => onChange(images.map((i) => i.id))}
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Selecionar todas
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Limpar seleção
            </button>
          </div>
        )}
      </div>

      {!productId && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Vincule um produto para ver as imagens disponíveis.
        </p>
      )}

      {productId && loading && (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      )}

      {productId && !loading && images.length === 0 && (
        <div className="text-sm text-muted-foreground py-6 text-center space-y-2">
          <p>Este produto não tem imagens.</p>
          <Link to="/produtos" className="text-primary hover:underline font-medium">
            Adicionar em Produtos
          </Link>
        </div>
      )}

      {productId && !loading && images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {images.map((img) => {
            const checked = selectedIds.includes(img.id);
            return (
              <button
                type="button"
                key={img.id}
                onClick={() => toggle(img.id)}
                className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                  checked ? "border-primary ring-2 ring-primary/40" : "border-sidebar-border hover:border-primary/50"
                }`}
              >
                <img
                  src={img.url}
                  alt={img.file_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
                {checked && (
                  <div className="absolute top-1 right-1 bg-primary text-black rounded-full p-1">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
