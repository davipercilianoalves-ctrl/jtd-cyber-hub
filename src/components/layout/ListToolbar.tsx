// ListToolbar — barra reutilizável para topo de listagens (Produtos, Anúncios, Fornecedores)
import type { LucideIcon } from "lucide-react";
import { Search, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";

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
}: ListToolbarProps) {
  const CtaIcon = cta?.icon ?? Plus;

  const ctaClasses =
    "inline-flex items-center gap-2 rounded-md bg-primary px-3.5 h-9 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_color-mix(in_oklab,var(--primary)_25%,transparent)] shrink-0";

  return (
    <div className="rounded-xl border border-sidebar-border bg-internal-w03 p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
        {/* Coluna 1: ícone + título + subtítulo + contador */}
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
              <span className="font-mono shrink-0">
                <span className="text-primary font-bold">{filteredCount}</span>
                <span className="opacity-50">/{totalCount}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Coluna 2: busca */}
        <div className="relative min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={14}
          />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-md border border-sidebar-border bg-background/40 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Coluna 3: filtros + CTA */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
          {filters && filters.length > 0 && (
            <div className="flex items-center gap-1.5">
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

          {cta &&
            (cta.to ? (
              <Link to={cta.to} className={ctaClasses}>
                <CtaIcon size={14} />
                {cta.label}
              </Link>
            ) : (
              <button onClick={cta.onClick} className={ctaClasses}>
                <CtaIcon size={14} />
                {cta.label}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
