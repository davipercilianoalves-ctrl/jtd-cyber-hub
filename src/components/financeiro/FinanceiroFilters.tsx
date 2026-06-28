import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FilterStatus = "all" | "released" | "pending" | "in_mediation";
export type SortBy =
  | "date_desc"
  | "date_asc"
  | "value_desc"
  | "value_asc"
  | "release_date";

const STATUSES: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "released", label: "Liberado" },
  { value: "pending", label: "Pendente" },
  { value: "in_mediation", label: "Em Mediação" },
];

export function FinanceiroFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  sortBy,
  onSortChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  status: FilterStatus;
  onStatusChange: (v: FilterStatus) => void;
  sortBy: SortBy;
  onSortChange: (v: SortBy) => void;
}) {
  return (
    <div className="jtd-glass p-3 flex flex-col md:flex-row items-stretch md:items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por produto, comprador, pedido..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => onStatusChange(s.value)}
            className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-[0.08em] transition-colors border ${
              status === s.value
                ? "bg-[color:var(--lime,#a3e635)]/15 text-[color:var(--lime,#a3e635)] border-[color:var(--lime,#a3e635)]/30"
                : "bg-muted/10 text-muted-foreground border-transparent hover:bg-muted/20"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortBy)}>
        <SelectTrigger className="h-9 w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date_desc">Mais recente</SelectItem>
          <SelectItem value="date_asc">Mais antiga</SelectItem>
          <SelectItem value="value_desc">Maior valor</SelectItem>
          <SelectItem value="value_asc">Menor valor</SelectItem>
          <SelectItem value="release_date">Próxima liberação</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
