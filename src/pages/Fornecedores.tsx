import { useState, useEffect, useMemo } from "react";
import { Truck, Shield, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ListToolbar } from "@/components/layout/ListToolbar";
import { DataView, type DataColumn } from "@/components/data/DataView";
import { useViewMode } from "@/hooks/useViewMode";

interface Supplier {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  delivery_days: number | null;
  warranty_days: number | null;
  is_active: boolean;
}

type StatusFilter = "all" | "active" | "inactive";
type SortKey = "name" | "delivery" | "warranty";

export default function Fornecedores() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("name");
  const [view, setView] = useViewMode("view:fornecedores", "table");

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    setLoading(true);
    const { data, error } = await supabase.from("suppliers").select("*").order("name");
    if (error) toast.error("Erro ao carregar fornecedores.");
    setSuppliers(data || []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const list = suppliers.filter(s => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.city || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.state || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === "all" || (status === "active" ? s.is_active : !s.is_active);
      return matchSearch && matchStatus;
    });
    const sorted = [...list];
    if (sort === "delivery") sorted.sort((a, b) => (a.delivery_days || 0) - (b.delivery_days || 0));
    else if (sort === "warranty") sorted.sort((a, b) => (b.warranty_days || 0) - (a.warranty_days || 0));
    return sorted;
  }, [suppliers, search, status, sort]);

  const columns: DataColumn<Supplier>[] = [
    { key: "loc", label: "Localização", render: (s) => (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <MapPin size={12} className="text-primary/70" />
        {s.city ? `${s.city}/${s.state}` : "—"}
      </span>
    )},
    { key: "delivery", label: "Entrega", render: (s) => (
      <span className="inline-flex items-center gap-1.5 text-foreground">
        <Truck size={12} className="text-primary"/> <span className="font-mono">{s.delivery_days ?? "—"}</span> dias
      </span>
    )},
    { key: "warranty", label: "Garantia", render: (s) => (
      <span className="inline-flex items-center gap-1.5 text-foreground">
        <Shield size={12} className="text-primary"/> <span className="font-mono">{s.warranty_days ?? "—"}</span> dias
      </span>
    )},
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <ListToolbar
        icon={Truck}
        title="Fornecedores"
        subtitle="Gerencie seus fornecedores e condições"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome, cidade ou estado..."
        totalCount={suppliers.length}
        filteredCount={filtered.length}
        filters={[
          { label: "Todos", active: status === "all", onClick: () => setStatus("all") },
          { label: "Ativos", active: status === "active", onClick: () => setStatus("active") },
          { label: "Inativos", active: status === "inactive", onClick: () => setStatus("inactive") },
        ]}
        view={view}
        onViewChange={setView}
        sortOptions={[
          { key: "name", label: "Nome (A→Z)" },
          { key: "delivery", label: "Entrega mais rápida" },
          { key: "warranty", label: "Maior garantia" },
        ]}
        sortValue={sort}
        onSortChange={(v) => setSort(v as SortKey)}
        cta={{ label: "Novo Fornecedor", onClick: () => toast.info("Em breve: cadastro de fornecedor") }}
      />

      <DataView
        items={filtered}
        view={view}
        loading={loading}
        getKey={(s) => s.id}
        emptyIcon={Truck}
        emptyText="Nenhum fornecedor cadastrado"
        columns={columns}
        renderAvatar={(s) => (
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-primary/20 bg-primary/5 text-primary font-bold">
            {(s.name?.[0] || "?").toUpperCase()}
          </div>
        )}
        renderHeader={(s) => (
          <div className="min-w-0">
            <div className="truncate font-semibold text-foreground">{s.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {s.city ? `${s.city}/${s.state}` : "Localização não informada"}
            </div>
          </div>
        )}
        renderHighlight={(s) => (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Entrega</div>
              <div className="font-mono text-base font-bold text-primary">{s.delivery_days ?? "—"}<span className="text-xs text-muted-foreground"> dias</span></div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Garantia</div>
              <div className="font-mono text-base font-bold text-primary">{s.warranty_days ?? "—"}<span className="text-xs text-muted-foreground"> dias</span></div>
            </div>
          </div>
        )}
        renderStatus={(s) => (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.is_active ? 'bg-green-500/10 text-green-500 border border-green-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
            {s.is_active ? 'ATIVO' : 'INATIVO'}
          </span>
        )}
        renderActions={() => (
          <div className="flex gap-3 justify-end">
            <button className="text-primary text-[11px] font-bold uppercase tracking-wider">Editar</button>
            <button className="text-muted-foreground hover:text-foreground text-[11px] font-bold uppercase tracking-wider">Produtos</button>
          </div>
        )}
      />
    </div>
  );
}
