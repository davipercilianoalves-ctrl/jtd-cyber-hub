import { Rows3, LayoutGrid, List } from "lucide-react";
import type { ViewMode } from "@/hooks/useViewMode";

const OPTIONS: { mode: ViewMode; icon: typeof Rows3; label: string }[] = [
  { mode: "table", icon: Rows3, label: "Tabela" },
  { mode: "grid", icon: LayoutGrid, label: "Cards" },
  { mode: "list", icon: List, label: "Lista" },
];

export function ViewSwitcher({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <div className="inline-flex h-9 shrink-0 items-center rounded-md border border-sidebar-border bg-background/40 p-0.5">
      {OPTIONS.map(({ mode, icon: Icon, label }) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            title={label}
            aria-label={label}
            className={[
              "grid h-full w-8 place-items-center rounded transition-all",
              active
                ? "bg-primary/15 text-primary shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_30%,transparent)]"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
