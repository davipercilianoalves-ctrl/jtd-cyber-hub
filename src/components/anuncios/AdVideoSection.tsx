import { useRef, useState, DragEvent, useEffect } from "react";
import { Video, Upload, Trash2, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "ad-videos";
const ACCEPT = "video/mp4,video/quicktime,video/x-msvideo,video/webm";
const MAX_SIZE = 500 * 1024 * 1024;

interface Props {
  adId?: string;
  videoName: string;
  videoScript: string;
  videoYoutubeUrl: string;
  videoPath: string | null;
  pendingFile?: File | null;
  onPendingFileChange?: (f: File | null) => void;
  onChange: (patch: {
    video_name?: string;
    video_script?: string;
    video_youtube_url?: string;
    video_path?: string | null;
  }) => void;
}

function getYoutubeEmbed(url: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/,
  );
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default function AdVideoSection({
  adId,
  videoName,
  videoScript,
  videoYoutubeUrl,
  videoPath,
  pendingFile,
  onPendingFileChange,
  onChange,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!videoPath) {
        setSignedUrl(null);
        return;
      }
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(videoPath, 3600);
      if (!cancel) setSignedUrl(data?.signedUrl ?? null);
    })();
    return () => {
      cancel = true;
    };
  }, [videoPath]);

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const upload = async (file: File) => {
    if (file.size > MAX_SIZE) return toast.error("Arquivo maior que 500MB.");
    if (!adId) {
      if (onPendingFileChange) {
        onPendingFileChange(file);
        toast.success("Vídeo na fila — será enviado ao salvar.");
        return;
      }
      return toast.error("Salve o anúncio antes de enviar vídeo.");
    }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error("Não autenticado");
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${userId}/${adId}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      // remove old
      if (videoPath) await supabase.storage.from(BUCKET).remove([videoPath]);
      onChange({ video_path: path });
      toast.success("Vídeo enviado");
    } catch (e: any) {
      toast.error(`Erro: ${e.message ?? e}`);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  };

  const removeVideo = async () => {
    if (pendingFile && onPendingFileChange) {
      if (!confirm("Remover vídeo?")) return;
      onPendingFileChange(null);
      return;
    }
    if (!videoPath) return;
    if (!confirm("Remover vídeo?")) return;
    await supabase.storage.from(BUCKET).remove([videoPath]);
    onChange({ video_path: null });
  };

  const embed = getYoutubeEmbed(videoYoutubeUrl);

  return (
    <section className="jtd-glass p-6 space-y-6">
      <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
        <Video size={20} className="text-primary" />
        Vídeo do Anúncio
      </h3>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Título do Vídeo</label>
        <input
          value={videoName}
          onChange={(e) => onChange({ video_name: e.target.value })}
          className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none"
          placeholder="Ex: Unboxing Kit Panelas Inox 6 Peças"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Roteiro / Falas</label>
        <textarea
          value={videoScript}
          onChange={(e) => {
            onChange({ video_script: e.target.value });
            autoResize(e.target);
          }}
          ref={(el) => autoResize(el)}
          style={{ minHeight: 100, overflow: "hidden", resize: "none" }}
          className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none"
          placeholder="Escreva o roteiro completo do vídeo..."
        />
      </div>

      <div className="border-t border-sidebar-border/30 pt-4 space-y-3">
        <label className="text-xs font-medium text-muted-foreground">
          Upload do vídeo de demonstração
        </label>
        {!videoPath && !pendingFile && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="border-2 border-dashed border-sidebar-border hover:border-primary/50 rounded-lg p-6 text-center bg-internal-20"
          >
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? "Enviando…" : "Enviar vídeo (MP4, MOV, AVI — máx 500MB)"}
            </button>
            {!adId && !onPendingFileChange && (
              <p className="text-[11px] text-amber-500 mt-2">
                Salve o anúncio primeiro para habilitar o upload.
              </p>
            )}
          </div>
        )}
        {pendingFile && pendingPreview && (
          <div className="space-y-2">
            <video
              src={pendingPreview}
              controls
              className="w-full max-h-[300px] rounded border border-amber-500/40 bg-black"
            />
            <p className="text-[11px] text-amber-500">
              Vídeo na fila — será enviado ao salvar o anúncio.
            </p>
            <button
              type="button"
              onClick={removeVideo}
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="w-3 h-3" /> Remover vídeo
            </button>
          </div>
        )}
        {videoPath && signedUrl && (
          <div className="space-y-2">
            <video
              src={signedUrl}
              controls
              className="w-full max-h-[300px] rounded border border-sidebar-border bg-black"
            />
            <button
              type="button"
              onClick={removeVideo}
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="w-3 h-3" /> Remover vídeo
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-sidebar-border/30 pt-4 space-y-3">
        <label className="text-xs font-medium text-muted-foreground">
          Link externo (YouTube, Drive, etc.)
        </label>
        <div className="flex gap-2">
          <input
            value={videoYoutubeUrl}
            onChange={(e) => onChange({ video_youtube_url: e.target.value })}
            className="flex-1 rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary"
            placeholder="https://youtube.com/watch?v=..."
          />
          {videoYoutubeUrl && (
            <a
              href={videoYoutubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 bg-primary text-primary-foreground flex items-center justify-center rounded hover:brightness-110"
            >
              <Play size={16} />
            </a>
          )}
        </div>
        {embed && (
          <div className="aspect-video w-full rounded overflow-hidden border border-sidebar-border">
            <iframe
              src={embed}
              title="YouTube preview"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>
    </section>
  );
}
