import { useRef, useState, DragEvent } from "react";
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

function formatKB(bytes: number) {
  if (!bytes) return "—";
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function ProductImageGallery({ productId }: Props) {
  const { images, loading, uploading, uploadImages, deleteImage } =
    useProductImages(productId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<{ id: string; path: string } | null>(
    null,
  );

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

  const onDrop = (e: DragEvent) => {
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

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
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
          <p className="text-sm text-muted-foreground">
            Arraste imagens aqui ou
          </p>
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
              className="group relative border border-sidebar-border rounded-lg overflow-hidden bg-internal-20 hover:border-primary/60 transition-all"
            >
              <button
                type="button"
                onClick={() => setLightbox(idx)}
                className="block w-full aspect-square overflow-hidden"
              >
                <img
                  src={img.url}
                  alt={img.file_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
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
                  onClick={() =>
                    setToDelete({ id: img.id, path: img.storage_path })
                  }
                  className="p-1.5 rounded bg-black/50 text-white hover:bg-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && images[lightbox] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
          >
            <X className="w-5 h-5" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
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
                className="absolute right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((i) =>
                    i === null ? 0 : (i + 1) % images.length,
                  );
                }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <img
            src={images[lightbox].url}
            alt={images[lightbox].file_name}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir imagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta imagem? Esta ação não pode ser
              desfeita.
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
