import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ImagePlus,
  Trash2,
  Download,
  ArrowLeft,
  ArrowRight,
  Star,
  X,
  ZoomIn,
  ZoomOut,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

export interface ProductImage {
  path: string; // storage object path
  url: string;  // public url
  name?: string;
}

interface Props {
  images: ProductImage[];
  onChange: (imgs: ProductImage[]) => void;
  productId?: string;
}

const BUCKET = "product-images";

export default function ProductImages({ images, onChange, productId }: Props) {
  const [uploading, setUploading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowRight") setLightboxIdx((i) => (i! + 1) % images.length);
      if (e.key === "ArrowLeft") setLightboxIdx((i) => (i! - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, images.length]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const folder = productId || "draft";
    const added: ProductImage[] = [];
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
        if (error) {
          if (error.message?.toLowerCase().includes("bucket")) {
            toast.error(
              "Bucket 'product-images' não existe. Crie no Supabase Storage (público) e tente novamente."
            );
            setUploading(false);
            return;
          }
          throw error;
        }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        added.push({ path, url: data.publicUrl, name: file.name });
      }
      onChange([...images, ...added]);
      toast.success(`${added.length} imagem(ns) enviada(s)!`);
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao enviar imagem: " + (e.message || ""));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemove(idx: number) {
    const img = images[idx];
    if (!confirm("Remover esta imagem?")) return;
    try {
      await supabase.storage.from(BUCKET).remove([img.path]);
    } catch (e) {
      console.warn(e);
    }
    const next = images.filter((_, i) => i !== idx);
    onChange(next);
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...images];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }

  function setCover(idx: number) {
    if (idx === 0) return;
    const next = [...images];
    const [pick] = next.splice(idx, 1);
    next.unshift(pick);
    onChange(next);
  }

  async function downloadOne(img: ProductImage) {
    try {
      const res = await fetch(img.url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = img.name || img.path.split("/").pop() || "imagem.jpg";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Erro ao baixar");
    }
  }

  async function downloadAll() {
    for (const img of images) await downloadOne(img);
  }

  // Drag & Drop reorder
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  function onDragStart(i: number) { setDragIdx(i); }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDrop(i: number) {
    if (dragIdx === null || dragIdx === i) return;
    const next = [...images];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    onChange(next);
    setDragIdx(null);
  }

  // Lightbox handlers
  function resetZoom() { setZoom(1); setPan({ x: 0, y: 0 }); }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => Math.min(6, Math.max(1, z + (e.deltaY < 0 ? 0.25 : -0.25))));
  }
  function onMouseDown(e: React.MouseEvent) {
    if (zoom <= 1) return;
    dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return;
    setPan({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  }
  function onMouseUp() { dragRef.current = null; }

  return (
    <section className="jtd-glass p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
          <ImageIcon size={20} className="text-primary" />
          Imagens do Produto
          <span className="text-xs font-normal text-muted-foreground">
            ({images.length}) — a primeira é a capa
          </span>
        </h3>
        <div className="flex gap-2">
          {images.length > 0 && (
            <button
              type="button"
              onClick={downloadAll}
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary px-3 py-2 rounded border border-sidebar-border hover:border-primary/50 transition-all flex items-center gap-2"
            >
              <Download size={14} /> Baixar Todas
            </button>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground px-4 py-2 rounded hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
            Adicionar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </div>

      {images.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
          className="border-2 border-dashed border-sidebar-border rounded-lg py-14 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary cursor-pointer transition-all"
        >
          <ImagePlus size={32} />
          <p className="text-sm font-bold uppercase tracking-wider">Clique ou arraste imagens aqui</p>
          <p className="text-xs">JPG, PNG, WEBP — múltiplas seleções ok</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, i) => (
            <div
              key={img.path}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(i)}
              className={`relative group rounded-lg overflow-hidden border-2 ${
                i === 0 ? "border-primary" : "border-sidebar-border"
              } bg-internal-20 aspect-square cursor-move transition-all hover:border-primary/60`}
            >
              <img
                src={img.url}
                alt={img.name || `Imagem ${i + 1}`}
                onClick={() => { setLightboxIdx(i); resetZoom(); }}
                className="w-full h-full object-cover cursor-zoom-in"
                loading="lazy"
              />
              {i === 0 && (
                <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                  <Star size={10} fill="currentColor" /> Capa
                </div>
              )}
              <div className="absolute top-1.5 right-1.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                {i + 1}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/85 to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} title="Mover esquerda" className="bg-white/10 hover:bg-white/25 text-white p-1 rounded">
                    <ArrowLeft size={12} />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} title="Mover direita" className="bg-white/10 hover:bg-white/25 text-white p-1 rounded">
                    <ArrowRight size={12} />
                  </button>
                  {i !== 0 && (
                    <button type="button" onClick={() => setCover(i)} title="Definir como capa" className="bg-white/10 hover:bg-primary hover:text-primary-foreground text-white p-1 rounded">
                      <Star size={12} />
                    </button>
                  )}
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => downloadOne(img)} title="Baixar" className="bg-white/10 hover:bg-white/25 text-white p-1 rounded">
                    <Download size={12} />
                  </button>
                  <button type="button" onClick={() => handleRemove(i)} title="Remover" className="bg-white/10 hover:bg-red-500 text-white p-1 rounded">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && images[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* Toolbar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-2 rounded-full border border-white/10 z-10">
            <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="text-white p-1.5 hover:bg-white/10 rounded-full"><ZoomOut size={16} /></button>
            <span className="text-white text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(6, z + 0.5))} className="text-white p-1.5 hover:bg-white/10 rounded-full"><ZoomIn size={16} /></button>
            <div className="w-px h-4 bg-white/20" />
            <button onClick={resetZoom} className="text-white text-[10px] font-bold uppercase px-2 py-1 hover:bg-white/10 rounded">Reset</button>
            <div className="w-px h-4 bg-white/20" />
            <button onClick={() => downloadOne(images[lightboxIdx])} className="text-white p-1.5 hover:bg-white/10 rounded-full"><Download size={16} /></button>
            <span className="text-white/60 text-xs font-mono">{lightboxIdx + 1} / {images.length}</span>
          </div>
          <button onClick={() => setLightboxIdx(null)} className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full z-10">
            <X size={20} />
          </button>
          {images.length > 1 && (
            <>
              <button onClick={() => { setLightboxIdx((lightboxIdx - 1 + images.length) % images.length); resetZoom(); }} className="absolute left-4 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full z-10">
                <ArrowLeft size={20} />
              </button>
              <button onClick={() => { setLightboxIdx((lightboxIdx + 1) % images.length); resetZoom(); }} className="absolute right-4 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full z-10">
                <ArrowRight size={20} />
              </button>
            </>
          )}
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden"
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onDoubleClick={() => (zoom === 1 ? setZoom(2.5) : resetZoom())}
            style={{ cursor: zoom > 1 ? (dragRef.current ? "grabbing" : "grab") : "zoom-in" }}
          >
            <img
              src={images[lightboxIdx].url}
              alt=""
              draggable={false}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transition: dragRef.current ? "none" : "transform 0.15s ease-out",
                maxWidth: "95vw",
                maxHeight: "90vh",
              }}
              className="object-contain select-none"
            />
          </div>
        </div>
      )}
    </section>
  );
}
