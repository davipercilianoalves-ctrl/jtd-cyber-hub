import { useRef, useState, DragEvent, useEffect } from "react";
import {
  Upload,
  Loader2,
  Trash2,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Star,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useProductImages } from "@/hooks/useProductImages";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  productId: string;
}

const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";
const MIN_IMAGES = 12;

function formatKB(bytes: number) {
  if (!bytes) return "—";
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function ProductImageGallery({ productId }: Props) {
  const { images, loading, uploading, uploadImages, deleteImage, reorderImages } =
    useProductImages(productId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [toDelete, setToDelete] = useState<{ id: string; path: string } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [lightbox]);

  const handleFiles = async (files: FileList | File[]) => {
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

  const onDropFiles = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteImage(toDelete.id, toDelete.path);
      toast.success("Imagem excluída");
      setLightbox(null);
    } catch (e: any) {
      toast.error(`Erro: ${e.message ?? e}`);
    } finally {
      setToDelete(null);
    }
  };

  const downloadImage = async (url: string, name: string) => {
    try {
      const r = await fetch(url);
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Erro ao baixar imagem");
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const ids = images.map((i) => i.id);
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    reorderImages(ids);
  };

  const onCardDragStart = (id: string) => setDraggingId(id);
  const onCardDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const ids = images.map((i) => i.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    reorderImages(ids);
    setDraggingId(null);
  };

  const remaining = Math.max(0, MIN_IMAGES - images.length);

  return (
    <div className="space-y-4">
      {/* Min-images indicator */}
      <div
        className={`flex items-center justify-between text-sm rounded-md px-3 py-2 border ${
          images.length >= MIN_IMAGES
            ? "border-primary/40 bg-primary/5 text-primary"
            : "border-amber-500/40 bg-amber-500/5 text-amber-500"
        }`}
      >
        <span className="flex items-center gap-2 font-medium">
          {images.length < MIN_IMAGES && <AlertTriangle className="w-4 h-4" />}
          {images.length} / {MIN_IMAGES} imagens
          {images.length < MIN_IMAGES && ` — faltam ${remaining}`}
        </span>
        <span className="text-xs opacity-80">A primeira imagem é a capa</span>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDropFiles}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-sidebar-border bg-internal-20 hover:border-primary/50"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          <ImagePlus className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Arraste imagens aqui ou</p>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? "Enviando…" : "Adicionar imagens"}
          </button>
          <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP</p>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
        </div>
      ) : images.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma imagem ainda.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => onCardDragStart(img.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onCardDrop(img.id)}
              className={`group relative border rounded-lg overflow-hidden bg-internal-20 transition-all ${
                idx === 0
                  ? "border-primary ring-1 ring-primary/40"
                  : "border-sidebar-border hover:border-primary/60"
              } ${draggingId === img.id ? "opacity-50" : ""}`}
            >
              {idx === 0 && (
                <div className="absolute top-1 left-1 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  <Star className="w-3 h-3" /> CAPA
                </div>
              )}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">
                {idx + 1}
              </div>
              <button
                type="button"
                onClick={() => setLightbox(idx)}
                className="block w-full aspect-square overflow-hidden cursor-zoom-in"
              >
                <img
                  src={img.url}
                  alt={img.file_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
              </button>
              <div className="p-2 text-xs">
                <div className="truncate" title={img.file_name}>
                  {img.file_name}
                </div>
                <div className="text-muted-foreground">
                  {formatKB(img.file_size)}
                </div>
              </div>
              <div className="absolute inset-x-0 top-0 p-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/60 to-transparent">
                <button
                  type="button"
                  title="Mover para esquerda"
                  disabled={idx === 0}
                  onClick={() => move(idx, -1)}
                  className="p-1.5 rounded bg-black/50 text-white hover:bg-black/70 disabled:opacity-30"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Mover para direita"
                  disabled={idx === images.length - 1}
                  onClick={() => move(idx, 1)}
                  className="p-1.5 rounded bg-black/50 text-white hover:bg-black/70 disabled:opacity-30"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Definir como capa"
                  disabled={idx === 0}
                  onClick={() => {
                    const ids = images.map((i) => i.id);
                    const [picked] = ids.splice(idx, 1);
                    ids.unshift(picked);
                    reorderImages(ids);
                  }}
                  className="p-1.5 rounded bg-black/50 text-white hover:bg-primary disabled:opacity-30"
                >
                  <Star className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Ver"
                  onClick={() => setLightbox(idx)}
                  className="p-1.5 rounded bg-black/50 text-white hover:bg-black/70"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Baixar"
                  onClick={() => downloadImage(img.url, img.file_name)}
                  className="p-1.5 rounded bg-black/50 text-white hover:bg-black/70"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Excluir"
                  onClick={() => setToDelete({ id: img.id, path: img.storage_path })}
                  className="p-1.5 rounded bg-black/50 text-white hover:bg-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox with zoom */}
      {lightbox !== null && images[lightbox] && (
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

          {images.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((i) =>
                    i === null ? 0 : (i - 1 + images.length) % images.length,
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
                  setLightbox((i) => (i === null ? 0 : (i + 1) % images.length));
                }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <img
            src={images[lightbox].url}
            alt={images[lightbox].file_name}
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
            {lightbox + 1} / {images.length}
            {lightbox === 0 && " · Capa"}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir imagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta imagem? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
