import { useEffect, useRef, useState, DragEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ImageIcon,
  Loader2,
  Check,
  Star,
  ArrowLeft,
  ArrowRight,
  Upload,
  ZoomIn,
  ZoomOut,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useProductImages } from "@/hooks/useProductImages";

interface Props {
  productId?: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";
const MIN_IMAGES = 12;

export default function AdImageSelector({ productId, selectedIds, onChange }: Props) {
  const { images, loading, uploading, uploadImages } = useProductImages(productId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [lightbox]);

  // Ordered selected images: respects user-defined order in selectedIds
  const selectedImages = selectedIds
    .map((id) => images.find((i) => i.id === id))
    .filter(Boolean) as typeof images;

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  };

  const moveSelected = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const setCover = (idx: number) => {
    if (idx === 0) return;
    const next = [...selectedIds];
    const [picked] = next.splice(idx, 1);
    next.unshift(picked);
    onChange(next);
  };

  const onDropReorder = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const next = [...selectedIds];
    const from = next.indexOf(draggingId);
    const to = next.indexOf(targetId);
    if (from < 0 || to < 0) return;
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
    setDraggingId(null);
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!productId) {
      toast.error("Vincule um produto antes de enviar imagens");
      return;
    }
    const arr = Array.from(files).filter((f) =>
      ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(f.type),
    );
    if (!arr.length) {
      toast.error("Selecione arquivos JPG, PNG ou WEBP");
      return;
    }
    try {
      await uploadImages(productId, arr);
      toast.success(`${arr.length} imagem(ns) enviada(s)`);
    } catch (e: any) {
      toast.error(`Erro no upload: ${e.message ?? e}`);
    }
  };

  const onFileDrop = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const remaining = Math.max(0, MIN_IMAGES - selectedIds.length);

  return (
    <section className="jtd-glass p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
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

      {productId && (
        <div
          className={`flex items-center justify-between text-sm rounded-md px-3 py-2 border ${
            selectedIds.length >= MIN_IMAGES
              ? "border-primary/40 bg-primary/5 text-primary"
              : "border-amber-500/40 bg-amber-500/5 text-amber-500"
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            {selectedIds.length < MIN_IMAGES && <AlertTriangle className="w-4 h-4" />}
            {selectedIds.length} / {MIN_IMAGES} selecionadas
            {selectedIds.length < MIN_IMAGES && ` — faltam ${remaining}`}
          </span>
          <span className="text-xs opacity-80">A primeira é a capa</span>
        </div>
      )}

      {!productId && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Vincule um produto para ver as imagens disponíveis.
        </p>
      )}

      {productId && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onFileDrop}
          className="border-2 border-dashed border-sidebar-border hover:border-primary/50 rounded-lg p-4 text-center transition-all bg-internal-20"
        >
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Enviando…" : "Adicionar imagens ao produto"}
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            Imagens enviadas aqui são salvas no produto vinculado.
          </p>
        </div>
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

      {/* Selected (ordered) preview */}
      {productId && selectedImages.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Ordem do anúncio (arraste para reordenar)
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {selectedImages.map((img, idx) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => setDraggingId(img.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDropReorder(img.id)}
                className={`group relative aspect-square rounded overflow-hidden border-2 ${
                  idx === 0 ? "border-primary ring-1 ring-primary/40" : "border-sidebar-border"
                } ${draggingId === img.id ? "opacity-50" : ""}`}
              >
                {idx === 0 && (
                  <div className="absolute top-1 left-1 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                    <Star className="w-2.5 h-2.5" /> CAPA
                  </div>
                )}
                <div className="absolute top-1 right-1 z-10 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">
                  {idx + 1}
                </div>
                <img
                  src={img.url}
                  alt={img.file_name}
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setLightbox(idx)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/70 to-transparent">
                  <button
                    type="button"
                    title="Mover esquerda"
                    disabled={idx === 0}
                    onClick={() => moveSelected(idx, -1)}
                    className="p-1 rounded bg-black/60 text-white hover:bg-black/80 disabled:opacity-30"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title="Definir como capa"
                    disabled={idx === 0}
                    onClick={() => setCover(idx)}
                    className="p-1 rounded bg-black/60 text-white hover:bg-primary disabled:opacity-30"
                  >
                    <Star className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title="Mover direita"
                    disabled={idx === selectedIds.length - 1}
                    onClick={() => moveSelected(idx, 1)}
                    className="p-1 rounded bg-black/60 text-white hover:bg-black/80 disabled:opacity-30"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available images grid (toggle selection) */}
      {productId && !loading && images.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Disponíveis no produto (clique para selecionar)
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {images.map((img) => {
              const checked = selectedIds.includes(img.id);
              return (
                <button
                  type="button"
                  key={img.id}
                  onClick={() => toggle(img.id)}
                  className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                    checked
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-sidebar-border hover:border-primary/50"
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
        </div>
      )}

      {/* Lightbox with zoom */}
      {lightbox !== null && selectedImages[lightbox] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center select-none"
          onClick={() => setLightbox(null)}
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.2 : -0.2;
            setZoom((z) => Math.max(1, Math.min(6, +(z + delta).toFixed(2))));
          }}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-mono self-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => setZoom((z) => Math.min(6, +(z + 0.25).toFixed(2)))}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
          {selectedImages.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((i) =>
                    i === null ? 0 : (i - 1 + selectedImages.length) % selectedImages.length,
                  );
                }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                className="absolute right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((i) =>
                    i === null ? 0 : (i + 1) % selectedImages.length,
                  );
                }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <img
            src={selectedImages[lightbox].url}
            alt={selectedImages[lightbox].file_name}
            draggable={false}
            className="max-w-[90vw] max-h-[90vh] object-contain transition-transform"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              cursor: zoom > 1 ? "grab" : "zoom-in",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => (z === 1 ? 2 : 1));
              setPan({ x: 0, y: 0 });
            }}
            onMouseDown={(e) => {
              if (zoom <= 1) return;
              e.stopPropagation();
              const startX = e.clientX - pan.x;
              const startY = e.clientY - pan.y;
              const onMove = (ev: MouseEvent) =>
                setPan({ x: ev.clientX - startX, y: ev.clientY - startY });
              const onUp = () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-xs">
            {lightbox + 1} / {selectedImages.length}
            {lightbox === 0 && " · Capa"}
          </div>
        </div>
      )}
    </section>
  );
}
