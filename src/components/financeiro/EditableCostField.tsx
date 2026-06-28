import { useEffect, useRef, useState } from "react";
import { Loader2, Pencil } from "lucide-react";

const fmtBRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function EditableCostField({
  value,
  onSave,
  className,
}: {
  value: number;
  onSave: (newValue: number) => Promise<void> | void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? 0));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(String(value ?? 0));
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = async () => {
    const parsed = parseFloat(draft.replace(",", "."));
    if (!isNaN(parsed) && parsed !== value) {
      setSaving(true);
      try {
        await onSave(parsed);
      } finally {
        setSaving(false);
      }
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-20 px-1 py-0.5 text-sm bg-background border border-border rounded font-mono tabular-nums text-right"
          type="number"
          step="0.01"
        />
        {saving && <Loader2 className="h-3 w-3 animate-spin" />}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`group inline-flex items-center gap-1 hover:text-foreground transition-colors ${className || ""}`}
    >
      <span className="tabular-nums font-mono">{fmtBRL(value || 0)}</span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60" />
    </button>
  );
}
