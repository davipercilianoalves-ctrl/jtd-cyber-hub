import { useEffect, useRef, useState } from "react";
import { Key, Minus, Copy } from "lucide-react";
import { toast } from "sonner";

export interface FieldDef {
  id: string;
  label: string; // ex: T1, BD, DC
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

function countUsed(text: string, keywords: string[]) {
  const t = (text || "").toLowerCase();
  return keywords.filter((k) => k && t.includes(k.toLowerCase()));
}

function FloatingBox({
  field,
  keywords,
  isOpen,
  onClose,
}: {
  field: FieldDef;
  keywords: string[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const expanded = isOpen;
  const used = countUsed(field.text, keywords);
  const usedSet = new Set(used.map((k) => k.toLowerCase()));
  const storageKey = `kwbox-pos-${field.id}`;


  const [pos, setPos] = useState<Pos | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    if (expanded && pos === null) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) setPos(JSON.parse(saved));
        else setPos({ x: window.innerWidth / 2 - 140, y: window.innerHeight / 2 - 150 });
      } catch {
        setPos({ x: 200, y: 200 });
      }
    }
  }, [expanded, pos, storageKey]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!pos) return;
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    const move = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const np = { x: ev.clientX - dragRef.current.dx, y: ev.clientY - dragRef.current.dy };
      setPos(np);
    };
    const up = () => {
      if (pos) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(pos));
        } catch {}
      }
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

  if (!expanded) return null;
  if (!pos) return null;

  const copyFree = () => {
    const free = keywords.filter((k) => !usedSet.has(k.toLowerCase()));
    navigator.clipboard.writeText(free.join(", "));
    toast.success("Livres copiadas!");
  };

  return (
    <div
      className="fixed z-[60] w-[280px] max-h-[400px] rounded-lg border-2 border-primary/60 bg-background/90 backdrop-blur-sm shadow-2xl flex flex-col"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border cursor-grab active:cursor-grabbing bg-primary/10 rounded-t-lg select-none"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Key size={12} className="text-primary" />
          <span>{field.label}</span>
          <span className="text-muted-foreground">
            {used.length}/{keywords.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={copyFree}
            title="Copiar livres"
            className="p-1 text-muted-foreground hover:text-primary"
          >
            <Copy size={12} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <Minus size={12} />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto p-3 space-y-1">
        {keywords.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Nenhuma palavra-chave.</p>
        )}
        {keywords.map((k) => {
          const u = usedSet.has(k.toLowerCase());
          return (
            <div
              key={k}
              className={`text-xs ${u ? "text-lime-500 line-through opacity-70" : "text-foreground"}`}
            >
              {k}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function KeywordFloatingBoxes({ keywords, fields }: Props) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
        {fields.map((f) => {
          const used = countUsed(f.text, keywords);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => toggle(f.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm border-2 border-primary/60 shadow-lg text-xs font-bold hover:border-primary transition-all"
            >
              <Key size={12} className="text-primary" />
              <span className="text-foreground">{f.label}</span>
              <span className="text-muted-foreground">
                {used.length}/{keywords.length}
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
          isOpen={openIds.has(f.id)}
          onClose={() => toggle(f.id)}
        />
      ))}
    </>
  );
}

