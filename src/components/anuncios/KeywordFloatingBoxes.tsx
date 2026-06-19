import { useEffect, useRef, useState } from "react";
import { Tag, X, Copy, Check, Sparkles, Eraser } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export interface TitleField {
  id: string;
  label: string;
  text: string;
}

interface Props {
  keywords: string[];
  titles: TitleField[];
  briefText: string;
  fullText: string;
}

interface Pos {
  x: number;
  y: number;
}

type CardId = "titles" | "bd" | "dc";

function isAutoUsed(text: string, keyword: string) {
  if (!keyword) return false;
  return (text || "").toLowerCase().includes(keyword.trim().toLowerCase());
}

function useDraggable(storageKey: string, isOpen: boolean) {
  const [pos, setPos] = useState<Pos | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    if (isOpen && pos === null) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) setPos(JSON.parse(saved));
        else setPos({ x: window.innerWidth / 2 - 160, y: window.innerHeight / 2 - 200 });
      } catch {
        setPos({ x: 200, y: 200 });
      }
    }
  }, [isOpen, pos, storageKey]);

  useEffect(() => {
    if (pos) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(pos));
      } catch {}
    }
  }, [pos, storageKey]);

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

  return { pos, onMouseDown };
}

function ChipList({
  keywords,
  text,
  manualSet,
  toggleManual,
}: {
  keywords: string[];
  text: string;
  manualSet: Set<string>;
  toggleManual: (k: string) => void;
}) {
  if (!keywords.length) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-xs text-muted-foreground italic text-center">
          Adicione palavras-chave acima
        </p>
      </div>
    );
  }
  return (
    <div
      className="overflow-y-auto p-3 flex flex-wrap gap-2 scrollbar-thin"
      style={{ maxHeight: 300 }}
    >
      {keywords.map((k) => {
        const auto = isAutoUsed(text, k);
        const manual = manualSet.has(k.toLowerCase());
        let cls =
          "border-sidebar-border bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/40";
        if (manual) {
          cls = "border-lime-500 bg-lime-500 text-background font-bold";
        } else if (auto) {
          cls = "border-lime-400/40 bg-lime-500/20 text-lime-400";
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
  );
}

function CardFooter({
  keywords,
  text,
  manualSet,
  onClear,
}: {
  keywords: string[];
  text: string;
  manualSet: Set<string>;
  onClear: () => void;
}) {
  const autoCount = keywords.filter((k) => isAutoUsed(text, k)).length;
  const manualCount = keywords.filter((k) => manualSet.has(k.toLowerCase())).length;
  const free = keywords.filter(
    (k) => !isAutoUsed(text, k) && !manualSet.has(k.toLowerCase())
  );

  const copyFree = () => {
    if (!free.length) {
      toast.info("Nenhuma keyword livre.");
      return;
    }
    navigator.clipboard.writeText(free.join(", "));
    toast.success("Livres copiadas!");
  };

  return (
    <>
      <Separator />
      <div className="px-3 pt-2 pb-2 flex flex-col gap-1">
        <span className="text-[10px] text-muted-foreground">
          {autoCount} auto · {manualCount} manual · {free.length} livres
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyFree}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
          >
            <Copy size={11} /> Copiar livres
          </button>
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive ml-auto transition-colors"
          >
            <Eraser size={11} /> Limpar manual
          </button>
        </div>
      </div>
    </>
  );
}

function CardShell({
  storageKey,
  isOpen,
  onClose,
  title,
  width = 300,
  children,
}: {
  storageKey: string;
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  width?: number;
  children: React.ReactNode;
}) {
  const { pos, onMouseDown } = useDraggable(storageKey, isOpen);
  if (!isOpen || !pos) return null;
  return (
    <div
      className="fixed z-[9999] rounded-lg border-2 border-primary/70 bg-background/95 backdrop-blur-md shadow-2xl flex flex-col animate-scale-in origin-center"
      style={{ left: pos.x, top: pos.y, width, animationDuration: "150ms" }}
    >
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border cursor-grab active:cursor-grabbing bg-primary/10 rounded-t-lg select-none"
      >
        <div className="flex items-center gap-2 font-bold text-foreground text-sm">
          <Tag size={14} className="text-primary" />
          {title}
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
      {children}
    </div>
  );
}

export default function KeywordFloatingBoxes({ keywords, titles, briefText, fullText }: Props) {
  const [openId, setOpenId] = useState<CardId | null>(null);
  // manual selections keyed by scope (title id, "bd", "dc") -> Set of lowercased keywords
  const [manual, setManual] = useState<Record<string, Set<string>>>({});
  const [activeTitleId, setActiveTitleId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeTitleId && titles.length > 0) {
      setActiveTitleId(titles[0].id);
    }
    if (activeTitleId && !titles.some((t) => t.id === activeTitleId)) {
      setActiveTitleId(titles[0]?.id || null);
    }
  }, [titles, activeTitleId]);

  const toggleManual = (scope: string, keyword: string) => {
    const k = keyword.toLowerCase();
    setManual((prev) => {
      const cur = new Set(prev[scope] || []);
      if (cur.has(k)) cur.delete(k);
      else cur.add(k);
      return { ...prev, [scope]: cur };
    });
  };
  const clearManual = (scope: string) =>
    setManual((prev) => ({ ...prev, [scope]: new Set() }));

  const titlesUsedCount = titles.reduce((sum, t) => {
    const ms = manual[t.id] || new Set<string>();
    return (
      sum +
      keywords.filter((k) => isAutoUsed(t.text, k) || ms.has(k.toLowerCase())).length
    );
  }, 0);
  const bdSet = manual["bd"] || new Set<string>();
  const dcSet = manual["dc"] || new Set<string>();
  const bdUsed = keywords.filter(
    (k) => isAutoUsed(briefText, k) || bdSet.has(k.toLowerCase())
  ).length;
  const dcUsed = keywords.filter(
    (k) => isAutoUsed(fullText, k) || dcSet.has(k.toLowerCase())
  ).length;

  const pills: { id: CardId; label: string; count: number }[] = [
    { id: "titles", label: "Títulos", count: titlesUsedCount },
    { id: "bd", label: "BD", count: bdUsed },
    { id: "dc", label: "DC", count: dcUsed },
  ];

  const activeTitle = titles.find((t) => t.id === activeTitleId);
  const activeTitleManual = activeTitle ? manual[activeTitle.id] || new Set<string>() : new Set<string>();

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[9998] flex flex-col gap-2 items-end">
        {pills.map((p) => {
          if (openId === p.id) return null;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpenId(p.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm border-2 border-primary/60 shadow-lg text-xs font-bold tracking-wide transition-all hover:border-primary hover:shadow-[0_0_12px_hsl(var(--primary)/0.6)] animate-fade-in"
            >
              <Tag size={12} className="text-primary" />
              <span className="text-foreground">{p.label}</span>
              <span className="text-muted-foreground">{p.count}</span>
            </button>
          );
        })}
      </div>

      {/* Títulos card with tabs */}
      <CardShell
        storageKey="kwbox-pos-titles"
        isOpen={openId === "titles"}
        onClose={() => setOpenId(null)}
        width={320}
        title={
          <div className="flex flex-col">
            <span>Títulos</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              {titlesUsedCount} marcadas no total
            </span>
          </div>
        }
      >
        {titles.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground italic text-center">
            Adicione títulos acima
          </div>
        ) : (
          <>
            <div
              className="flex items-center gap-1 px-2 py-1.5 border-b border-sidebar-border overflow-x-auto scrollbar-thin"
              style={{ scrollbarWidth: "thin" }}
            >
              {titles.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTitleId(t.id)}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide transition-colors ${
                    activeTitleId === t.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {activeTitle && (
              <>
                <ChipList
                  keywords={keywords}
                  text={activeTitle.text}
                  manualSet={activeTitleManual}
                  toggleManual={(k) => toggleManual(activeTitle.id, k)}
                />
                <CardFooter
                  keywords={keywords}
                  text={activeTitle.text}
                  manualSet={activeTitleManual}
                  onClear={() => clearManual(activeTitle.id)}
                />
              </>
            )}
          </>
        )}
      </CardShell>

      {/* BD card */}
      <CardShell
        storageKey="kwbox-pos-bd"
        isOpen={openId === "bd"}
        onClose={() => setOpenId(null)}
        title={<span>Breve Descrição</span>}
      >
        <ChipList
          keywords={keywords}
          text={briefText}
          manualSet={bdSet}
          toggleManual={(k) => toggleManual("bd", k)}
        />
        <CardFooter
          keywords={keywords}
          text={briefText}
          manualSet={bdSet}
          onClear={() => clearManual("bd")}
        />
      </CardShell>

      {/* DC card */}
      <CardShell
        storageKey="kwbox-pos-dc"
        isOpen={openId === "dc"}
        onClose={() => setOpenId(null)}
        title={<span>Desc Completa</span>}
      >
        <ChipList
          keywords={keywords}
          text={fullText}
          manualSet={dcSet}
          toggleManual={(k) => toggleManual("dc", k)}
        />
        <CardFooter
          keywords={keywords}
          text={fullText}
          manualSet={dcSet}
          onClear={() => clearManual("dc")}
        />
      </CardShell>
    </>
  );
}
