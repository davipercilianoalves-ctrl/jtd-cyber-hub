import { useRef, useState, DragEvent, useEffect } from "react";
import {
  ImageIcon,
  Loader2,
  Upload,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useAdImages } from "@/hooks/useAdImages";

interface Props {
  adId?: string;
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
}

const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";

export default function AdDirectImages({
  adId,
  pendingFiles,
  onPendingFilesChange,
}: Props) {
  const { images, loading, uploading, uploadImages, deleteImage, reorder } =
    useAdImages(adId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);

  // Keep object URLs in sync with the pending file list.
  useEffect(() => {
    if (!pendingFiles?.length) {
      setPendingPreviews([]);
      return;
    }
    const urls = pendingFiles.map((f) => URL.createObjectURL(f));
    setPendingPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [pendingFiles]);

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) =>
      ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(f.type),
    );
    if (!arr.length) return toast.error("Selecione JPG, PNG ou WEBP");

    if (!adId) {
      if (onPendingFilesChange) {
        onPendingFilesChange([...(pendingFiles ?? []), ...arr]);
        toast.success(
          `${arr.length} imagem(ns) na fila — serão enviadas ao salvar.`,
        );
        return;
      }
      toast.error("Salve o anúncio antes de enviar imagens próprias.");
      return;
    }

    try {
      await uploadImages(arr);
      toast.success(`${arr.length} imagem(ns) enviada(s)`);
    } catch (e: any) {
      toast.error(`Erro: ${e.message ?? e}`);
    }
  };

  const onFileDrop = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = images.map((i) => i.id);
    const t = idx + dir;
    if (t < 0 || t >= next.length) return;
    [next[idx], next[t]] = [next[t], next[idx]];
    reorder(next);
  };

  const setCover = (idx: number) => {
    if (idx === 0) return;
    const next = images.map((i) => i.id);
    const [picked] = next.splice(idx, 1);
    next.unshift(picked);
    reorder(next);
  };

  const onDropReorder = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const next = images.map((i) => i.id);
    const from = next.indexOf(draggingId);
    const to = next.indexOf(targetId);
    if (from < 0 || to < 0) return;
    next.splice(to, 0, next.splice(from, 1)[0]);
    reorder(next);
    setDraggingId(null);
  };

  const removePending = (idx: number) => {
    if (!onPendingFilesChange || !pendingFiles) return;
    onPendingFilesChange(pendingFiles.filter((_, i) => i !== idx));
  };

  const showUploader = adId || onPendingFilesChange;
  const hasPending = !adId && pendingFiles && pendingFiles.length > 0;

  return (
    <section className="jtd-glass p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
          <ImageIcon size={20} className="text-primary" />
          Imagens próprias do Anúncio
        </h3>
        <span className="text-xs text-muted-foreground">
          {adId
            ? "Arraste para reordenar · 1ª imagem é a capa"
            : hasPending
              ? "Imagens em fila — serão enviadas ao salvar"
              : ""}
        </span>
      </div>

      {showUploader && (
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
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? "Enviando…" : "Adicionar imagens ao anúncio"}
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            JPG, PNG ou WEBP. Solte arquivos aqui também.
          </p>
        </div>
      )}

      {hasPending && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {pendingFiles!.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="group relative aspect-square rounded overflow-hidden border-2 border-amber-500/40"
            >
              <div className="absolute top-1 left-1 z-10 text-[9px] font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded">
                FILA
              </div>
              {pendingPreviews[idx] && (
                <img
                  src={pendingPreviews[idx]}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/70 to-transparent">
                <button
                  type="button"
                  onClick={() => removePending(idx)}
                  className="p-1 rounded bg-black/60 text-white hover:bg-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {!loading && images.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {images.map((img, idx) => (
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
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/70 to-transparent">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => move(idx, -1)}
                  className="p-1 rounded bg-black/60 text-white hover:bg-black/80 disabled:opacity-30"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => setCover(idx)}
                  className="p-1 rounded bg-black/60 text-white hover:bg-primary disabled:opacity-30"
                >
                  <Star className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={idx === images.length - 1}
                  onClick={() => move(idx, 1)}
                  className="p-1 rounded bg-black/60 text-white hover:bg-black/80 disabled:opacity-30"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Remover esta imagem?")) deleteImage(img.id, img.storage_path);
                  }}
                  className="p-1 rounded bg-black/60 text-white hover:bg-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

