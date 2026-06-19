interface Props {
  keywords: string[];
  text: string;
  manual?: Set<string>;
}

/**
 * Read-only reference strip showing keyword usage state for a given text field.
 * - unused: subtle border, muted text
 * - auto-detected in text: lime/20 bg, lime text
 * - manual selection (from floating box): solid lime bg, dark text
 */
export default function KeywordRefStrip({ keywords, text, manual }: Props) {
  if (!keywords || keywords.length === 0) return null;
  const lower = (text || "").toLowerCase();

  return (
    <div className="space-y-1.5 mt-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
        Keywords disponíveis
      </div>
      <div className="flex flex-wrap gap-1">
        {keywords.map((k) => {
          const auto = lower.includes(k.trim().toLowerCase());
          const isManual = manual?.has(k.toLowerCase()) ?? false;
          let cls =
            "border-sidebar-border/60 text-muted-foreground/80 bg-transparent";
          if (isManual) cls = "border-lime-500 bg-lime-500 text-background";
          else if (auto) cls = "border-lime-400/50 bg-lime-400/20 text-lime-400";
          return (
            <span
              key={k}
              className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${cls}`}
            >
              {k}
            </span>
          );
        })}
      </div>
    </div>
  );
}
