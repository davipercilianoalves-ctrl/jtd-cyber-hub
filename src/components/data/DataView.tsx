import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { ViewMode } from "@/hooks/useViewMode";

export interface DataColumn<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  className?: string;
  /** Hide column in non-table modes (e.g. status shown elsewhere) */
  tableOnly?: boolean;
  align?: "left" | "right" | "center";
}

export interface DataViewProps<T> {
  items: T[];
  columns: DataColumn<T>[];
  view: ViewMode;
  getKey: (item: T) => string;
  onItemClick?: (item: T) => void;
  /** Renders the prominent header inside a card / list-item (title + sub) */
  renderHeader: (item: T) => ReactNode;
  /** Highlighted value in card mode (e.g. price). Optional. */
  renderHighlight?: (item: T) => ReactNode;
  /** Status pill rendered in every mode */
  renderStatus?: (item: T) => ReactNode;
  /** Row/card actions */
  renderActions?: (item: T) => ReactNode;
  /** Visual accent (icon avatar) on left of cards/list items */
  renderAvatar?: (item: T) => ReactNode;
  loading?: boolean;
  emptyIcon: LucideIcon;
  emptyText: string;
}

export function DataView<T>({
  items,
  columns,
  view,
  getKey,
  onItemClick,
  renderHeader,
  renderHighlight,
  renderStatus,
  renderActions,
  renderAvatar,
  loading,
  emptyIcon: EmptyIcon,
  emptyText,
}: DataViewProps<T>) {
  if (loading) {
    const skeletonCount = view === "table" ? 8 : 6;
    if (view === "table") {
      return (
        <div className="overflow-hidden rounded-xl border border-sidebar-border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-internal-w03 border-b border-sidebar-border">
                <th className="p-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Item</th>
                {columns.map((c) => (
                  <th key={c.key} className={`p-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground ${c.align === "right" ? "text-right" : ""}`}>
                    {c.label}
                  </th>
                ))}
                {renderStatus && <th className="p-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Status</th>}
                {renderActions && <th className="p-3" />}
              </tr>
            </thead>
            <tbody>
              {[...Array(skeletonCount)].map((_, i) => (
                <tr key={i} className={`border-b border-sidebar-border/30 ${i % 2 === 1 ? "bg-internal-w03/40" : ""}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-internal-w03 animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-32 rounded bg-internal-w03 animate-pulse" />
                        <div className="h-2 w-20 rounded bg-internal-w03/60 animate-pulse" />
                      </div>
                    </div>
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} className="p-3">
                      <div className={`h-3 rounded bg-internal-w03 animate-pulse ${c.align === "right" ? "ml-auto w-16" : "w-24"}`} />
                    </td>
                  ))}
                  {renderStatus && <td className="p-3"><div className="h-5 w-16 rounded-full bg-internal-w03 animate-pulse" /></td>}
                  {renderActions && <td className="p-3"><div className="h-3 w-20 rounded bg-internal-w03 animate-pulse ml-auto" /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    // grid / card skeleton
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {[...Array(skeletonCount)].map((_, i) => (
          <div key={i} className="rounded-xl border border-sidebar-border bg-internal-w03/30 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-internal-w03 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-internal-w03 animate-pulse" />
                <div className="h-2 w-1/2 rounded bg-internal-w03/60 animate-pulse" />
              </div>
            </div>
            <div className="h-8 w-full rounded bg-internal-w03 animate-pulse" />
            <div className="flex justify-between">
              <div className="h-5 w-16 rounded-full bg-internal-w03 animate-pulse" />
              <div className="h-3 w-20 rounded bg-internal-w03 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }


  if (items.length === 0) {
    return (
      <div className="text-center py-20 rounded-xl border border-dashed border-sidebar-border">
        <EmptyIcon size={56} className="mx-auto mb-4 text-primary/30" />
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  if (view === "table") {
    return (
      <div className="overflow-hidden rounded-xl border border-sidebar-border">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-internal-w03 border-b border-sidebar-border">
              <th className="p-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Item</th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`p-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground ${
                    c.align === "right" ? "text-right" : ""
                  }`}
                >
                  {c.label}
                </th>
              ))}
              {renderStatus && (
                <th className="p-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Status</th>
              )}
              {renderActions && <th className="p-3" />}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr
                key={getKey(item)}
                onClick={onItemClick ? () => onItemClick(item) : undefined}
                className={`group border-b border-sidebar-border/30 transition-colors ${
                  idx % 2 === 1 ? "bg-internal-w03/40" : ""
                } hover:bg-primary/5 ${onItemClick ? "cursor-pointer" : ""}`}
              >
                <td className="p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {renderAvatar && <div className="shrink-0">{renderAvatar(item)}</div>}
                    <div className="min-w-0">{renderHeader(item)}</div>
                  </div>
                </td>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`p-3 text-sm ${c.align === "right" ? "text-right" : ""} ${c.className || ""}`}
                  >
                    {c.render(item)}
                  </td>
                ))}
                {renderStatus && <td className="p-3">{renderStatus(item)}</td>}
                {renderActions && (
                  <td className="p-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    {renderActions(item)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (view === "grid") {
    const visibleCols = columns.filter((c) => !c.tableOnly);
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={getKey(item)}
            onClick={onItemClick ? () => onItemClick(item) : undefined}
            className={`group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-sidebar-border bg-internal-w03 p-4 transition-all hover:border-primary/40 hover:bg-internal-w04 hover:shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_15%,transparent)] ${
              onItemClick ? "cursor-pointer" : ""
            }`}
          >
            <div className="absolute inset-y-0 left-0 w-0.5 bg-primary/0 group-hover:bg-primary transition-colors" />
            <div className="flex items-start gap-3">
              {renderAvatar && <div className="shrink-0">{renderAvatar(item)}</div>}
              <div className="min-w-0 flex-1">{renderHeader(item)}</div>
              {renderStatus && <div className="shrink-0">{renderStatus(item)}</div>}
            </div>

            {renderHighlight && (
              <div className="border-y border-sidebar-border/60 py-2.5 my-1">
                {renderHighlight(item)}
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {visibleCols.map((c) => (
                <div key={c.key} className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {c.label}
                  </div>
                  <div className={`text-sm truncate ${c.className || ""}`}>{c.render(item)}</div>
                </div>
              ))}
            </div>

            {renderActions && (
              <div className="mt-auto pt-2 border-t border-border/40 opacity-0 group-hover:opacity-100 transition-opacity">
                {renderActions(item)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // list mode
  const visibleCols = columns.filter((c) => !c.tableOnly);
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={getKey(item)}
          onClick={onItemClick ? () => onItemClick(item) : undefined}
          className={`group flex items-center gap-4 rounded-xl border border-sidebar-border bg-internal-w03 p-3 pr-4 transition-all hover:border-primary/40 hover:bg-internal-w04 ${
            onItemClick ? "cursor-pointer" : ""
          }`}
        >
          {renderAvatar && <div className="shrink-0">{renderAvatar(item)}</div>}
          <div className="min-w-0 flex-1">{renderHeader(item)}</div>
          <div className="hidden md:flex items-center gap-5 shrink-0">
            {visibleCols.slice(0, 4).map((c) => (
              <div key={c.key} className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {c.label}
                </div>
                <div className={`text-sm ${c.className || ""}`}>{c.render(item)}</div>
              </div>
            ))}
          </div>
          {renderStatus && <div className="shrink-0">{renderStatus(item)}</div>}
          {renderActions && (
            <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {renderActions(item)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
