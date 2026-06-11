// ListToolbar — barra reutilizável para topo de listagens (Produtos, Anúncios, Fornecedores)
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Search, Plus, ArrowUpDown, ChevronDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ViewSwitcher } from "@/components/data/ViewSwitcher";
import type { ViewMode } from "@/hooks/useViewMode";

interface FilterChip {
  label: string;
  active: boolean;
  onClick: () => void;
}

interface CTAConfig {
  label: string;
  to?: string;
  onClick?: () => void;
  icon?: LucideIcon;
}

export interface SortOption {
  key: string;
  label: string;
}

interface ListToolbarProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  totalCount: number;
  filteredCount: number;
  filters?: FilterChip[];
  cta?: CTAConfig;
  view?: ViewMode;
  onViewChange?: (v: ViewMode) => void;
  sortOptions?: SortOption[];
  sortValue?: string;
  onSortChange?: (v: string) => void;
}

export function ListToolbar({
  icon: Icon,
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  totalCount,
  filteredCount,
  filters,
  cta,
  view,
  onViewChange,
  sortOptions,
  sortValue,
  onSortChange,
}: ListToolbarProps) {
  const CtaIcon = cta?.icon ?? Plus;
  const [sortOpen, setSortOpen] = useState(false);
  const isFiltering = filteredCount !== totalCount;

  const ctaClasses =
    "inline-flex items-center gap-2 rounded-md bg-primary px-3.5 h-9 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_color-mix(in_oklab,var(--primary)_25%,transparent)] shrink-0";

  const activeSort = sortOptions?.find((o) => o.key === sortValue);

  return (
    <div className="rounded-xl border border-sidebar-border bg-internal-w03 p-3 sm:p-4 space-y-3">
      {/* Top row: identity + search + CTA */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl">
              {title}
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {subtitle && <span className="truncate">{subtitle}</span>}
              {subtitle && <span className="opacity-40">•</span>}
              <span
                className={[
                  "font-mono shrink-0 rounded px-1.5 py-0.5",
                  isFiltering ? "bg-primary/15 text-primary" : "",
                ].join(" ")}
              >
                <span className="font-bold">{filteredCount}</span>
                <span className="opacity-60">/{totalCount}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Search — expands on focus */}
        <div className="relative min-w-0 group">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
            size={14}
          />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-md border border-sidebar-border bg-background/40 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:bg-background/70 focus:outline-none focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_15%,transparent)] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 sm:justify-end shrink-0">
          {sortOptions && sortOptions.length > 0 && onSortChange && (
            <div className="relative">
              <button
                onClick={() => setSortOpen((v) => !v)}
                onBlur={() => setTimeout(() => setSortOpen(false), 150)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-sidebar-border bg-background/40 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                <ArrowUpDown size={12} />
                <span className="hidden sm:inline">{activeSort?.label || "Ordenar"}</span>
                <ChevronDown size={12} className={sortOpen ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-md border border-sidebar-border bg-popover p-1 shadow-lg">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onMouseDown={() => {
                        onSortChange(opt.key);
                        setSortOpen(false);
                      }}
                      className={[
                        "block w-full rounded px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                        sortValue === opt.key
                          ? "bg-primary/15 text-primary"
                          : "text-foreground hover:bg-internal-w04",
                      ].join(" ")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {view && onViewChange && <ViewSwitcher value={view} onChange={onViewChange} />}

          {cta &&
            (cta.to ? (
              <Link to={cta.to} className={ctaClasses}>
                <CtaIcon size={14} />
                <span className="hidden sm:inline">{cta.label}</span>
              </Link>
            ) : (
              <button onClick={cta.onClick} className={ctaClasses}>
                <CtaIcon size={14} />
                <span className="hidden sm:inline">{cta.label}</span>
              </button>
            ))}
        </div>
      </div>

      {/* Bottom row: filter chips */}
      {filters && filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-sidebar-border/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mr-1">
            Filtros:
          </span>
          {filters.map((f) => (
            <button
              key={f.label}
              onClick={f.onClick}
              className={[
                "h-7 rounded-full border px-3 text-[11px] font-semibold uppercase tracking-wider transition-all",
                f.active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-sidebar-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
