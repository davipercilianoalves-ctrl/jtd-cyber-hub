import { useEffect, useRef, useState } from "react";
import { Tag, X, Copy, Check, Sparkles, Eraser } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export interface FieldDef {
  id: string;
  /** Short label for the pill (ex: T1, BD, DC) */
  label: string;
  /** Full label shown inside the expanded card (ex: "Título 1") */
  expandedLabel?: string;
  /** Current text content of the field, for auto-detection */
  text: string;
}

interface Props {
  keywords: string[];
  fields: FieldDef[];
}

interface Pos {
  x: number;
  y: number;
}

function isAutoUsed(text: string, keyword: string) {
  if (!keyword) return false;
  return (text || "").toLowerCase().includes(keyword.trim().toLowerCase());
}

function FloatingBox({
  field,
  keywords,
  isOpen,
  onClose,
  manualSet,
  toggleManual,
  clearManual,
}: {
  field: FieldDef;
  keywords: string[];
  isOpen: boolean;
  onClose: () => void;
  manualSet: Set<string>;
  toggleManual: (keyword: string) => void;
  clearManual: () => void;
}) {
  const storageKey = `kwbox-pos-${field.id}`;
  const [pos, setPos] = useState<Pos | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    if (isOpen && pos === null) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) setPos(JSON.parse(saved));
        else setPos({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 180 });
      } catch {
        setPos({ x: 200, y: 200 });
      }
    }
  }, [isOpen, pos, storageKey]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!pos) return;
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    const move = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({ x: ev.clientX - dragRef.current.dx, y: ev.clientY - dragRef.current.dy });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  useEffect(() => {
    if (pos) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(pos));
      } catch {}
    }
  }, [pos, storageKey]);

  if (!isOpen || !pos) return null;

  const autoCount = keywords.filter((k) => isAutoUsed(field.text, k)).length;
  const manualCount = keywords.filter((k) => manualSet.has(k.toLowerCase())).length;
  const freeCount = keywords.filter(
    (k) => !isAutoUsed(field.text, k) && !manualSet.has(k.toLowerCase())
  ).length;

  const copyFree = () => {
    const free = keywords.filter(
      (k) => !isAutoUsed(field.text, k) && !manualSet.has(k.toLowerCase())
    );
    if (!free.length) {
      toast.info("Nenhuma keyword livre.");
      return;
    }
    navigator.clipboard.writeText(free.join(", "));
    toast.success("Livres copiadas!");
  };

  return (
    <div
      className="fixed z-[9999] w-[300px] max-h-[420px] rounded-lg border-2 border-primary/70 bg-background/90 backdrop-blur-md shadow-2xl flex flex-col animate-scale-in origin-bottom-right"
      style={{ left: pos.x, top: pos.y, animationDuration: "150ms" }}
    >
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border cursor-grab active:cursor-grabbing bg-primary/10 rounded-t-lg select-none"
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-2 font-bold text-foreground text-sm">
            <Tag size={14} className="text-primary" />
            <span>{field.expandedLabel || field.label}</span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            {autoCount} auto · {manualCount} manual · {freeCount} livres
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Fechar"
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="overflow-y-auto p-3 flex flex-wrap gap-2">
        {keywords.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-1 py-2">
            Adicione palavras-chave acima
          </p>
        )}
        {keywords.map((k) => {
          const auto = isAutoUsed(field.text, k);
          const manual = manualSet.has(k.toLowerCase());

          let cls =
            "border-sidebar-border bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/40";
          if (manual) {
            cls = "border-lime-500 bg-lime-500/90 text-background";
          } else if (auto) {
            cls = "border-lime-400/60 bg-lime-400/20 text-lime-400";
          }

          return (
            <button
              type="button"
              key={k}
              onClick={() => toggleManual(k)}
              className={`relative inline-flex items-center gap-1 px-3 py-1 rounded-full border text-sm font-semibold tracking-wide transition-all ${cls}`}
            >
              {manual && <Check size={12} />}
              {!manual && auto && <Sparkles size={12} />}
              <span className="truncate max-w-[200px]">{k}</span>
            </button>
          );
        })}
      </div>

      <Separator />
      <div className="flex items-center gap-2 px-3 pt-2 pb-2">
        <button
          type="button"
          onClick={copyFree}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          <Copy size={11} /> Copiar livres
        </button>
        <button
          type="button"
          onClick={clearManual}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive ml-auto transition-colors"
        >
          <Eraser size={11} /> Limpar manual
        </button>
      </div>
    </div>
  );
}

export default function KeywordFloatingBoxes({ keywords, fields }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  // manual selections per field id -> Set of lowercased keywords
  const [manual, setManual] = useState<Record<string, Set<string>>>({});

  const openField = (id: string) => setOpenId(id);
  const closeField = () => setOpenId(null);

  const toggleManual = (fieldId: string, keyword: string) => {
    const k = keyword.toLowerCase();
    setManual((prev) => {
      const cur = new Set(prev[fieldId] || []);
      if (cur.has(k)) cur.delete(k);
      else cur.add(k);
      return { ...prev, [fieldId]: cur };
    });
  };

  const clearManual = (fieldId: string) =>
    setManual((prev) => ({ ...prev, [fieldId]: new Set() }));

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[9998] flex flex-col gap-2 items-end">
        {fields.map((f) => {
          if (openId === f.id) return null;
          const manualSet = manual[f.id] || new Set<string>();
          const usedCount = keywords.filter(
            (k) => isAutoUsed(f.text, k) || manualSet.has(k.toLowerCase())
          ).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => openField(f.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm border-2 border-primary/60 shadow-lg text-xs font-bold transition-all hover:border-primary hover:shadow-[0_0_12px_hsl(var(--primary)/0.6)] animate-fade-in"
            >
              <Tag size={12} className="text-primary" />
              <span className="text-foreground">{f.label}</span>
              <span className="text-muted-foreground">
                {usedCount}/{keywords.length}
              </span>
            </button>
          );
        })}
      </div>
      {fields.map((f) => (
        <FloatingBox
          key={f.id}
          field={f}
          keywords={keywords}
          isOpen={openId === f.id}
          onClose={closeField}
          manualSet={manual[f.id] || new Set()}
          toggleManual={(k) => toggleManual(f.id, k)}
          clearManual={() => clearManual(f.id)}
        />
      ))}
    </>
  );
}
