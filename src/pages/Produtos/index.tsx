import { useState, useEffect, useMemo } from "react";
import { Package } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ListToolbar } from "@/components/layout/ListToolbar";
import { DataView, type DataColumn } from "@/components/data/DataView";
import { useViewMode } from "@/hooks/useViewMode";

type StatusFilter = "all" | "active" | "inactive";
type SortKey = "recent" | "name" | "cost_desc" | "cost_asc";

export default function Produtos() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useViewMode("view:produtos", "table");

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase.from("products").select(`*, suppliers(name), product_competitors(id)`).order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar produtos.");
    setProducts(data || []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const list = products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === "all" || (status === "active" ? p.is_active : !p.is_active);
      return matchSearch && matchStatus;
    });
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "cost_desc") sorted.sort((a, b) => (b.cost_price || 0) - (a.cost_price || 0));
    else if (sort === "cost_asc") sorted.sort((a, b) => (a.cost_price || 0) - (b.cost_price || 0));
    return sorted;
  }, [products, search, status, sort]);

  const columns: DataColumn<any>[] = [
    { key: "supplier", label: "Fornecedor", render: (p) => <span className="text-sm text-muted-foreground">{p.suppliers?.name || "—"}</span> },
    { key: "cost", label: "Custo", align: "right", className: "text-sm font-semibold tabular-nums font-mono text-primary", render: (p) => `R$ ${(p.cost_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { key: "kw", label: "Keywords", render: (p) => <span className="inline-flex items-center rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">{p.keywords?.length || 0} kw</span> },
    { key: "comp", label: "Concorrentes", align: "right", render: (p) => <span className="text-sm font-semibold tabular-nums font-mono text-muted-foreground">{p.product_competitors?.length || 0}</span> },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <ListToolbar
        icon={Package}
        title="Produtos"
        subtitle="Gerencie sua base de produtos"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome ou SKU..."
        totalCount={products.length}
        filteredCount={filtered.length}
        filters={[
          { label: "Todos", active: status === "all", onClick: () => setStatus("all") },
          { label: "Ativos", active: status === "active", onClick: () => setStatus("active") },
          { label: "Inativos", active: status === "inactive", onClick: () => setStatus("inactive") },
        ]}
        view={view}
        onViewChange={setView}
        sortOptions={[
          { key: "recent", label: "Mais recentes" },
          { key: "name", label: "Nome (A→Z)" },
          { key: "cost_desc", label: "Maior custo" },
          { key: "cost_asc", label: "Menor custo" },
        ]}
        sortValue={sort}
        onSortChange={(v) => setSort(v as SortKey)}
        cta={{ label: "Novo Produto", to: "/produtos/novo" }}
      />

      <DataView
        items={filtered}
        view={view}
        loading={loading}
        getKey={(p) => p.id}
        onItemClick={(p) => navigate({ to: "/produtos/$id/editar", params: { id: p.id } })}
        emptyIcon={Package}
        emptyText="Nenhum produto cadastrado"
        columns={columns}
        renderAvatar={(p) => (
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-primary/20 bg-primary/5 text-primary font-bold">
            {(p.name?.[0] || "?").toUpperCase()}
          </div>
        )}
        renderHeader={(p) => (
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">{p.sku || "sem SKU"}</div>
          </div>
        )}
        renderHighlight={(p) => (
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Custo</span>
            <span className="text-[20px] font-bold tabular-nums tracking-tight font-mono text-primary">
              R$ {(p.cost_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        renderStatus={(p) => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.is_active ? 'bg-green-500/10 text-green-500 border border-green-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
            {p.is_active ? 'ATIVO' : 'INATIVO'}
          </span>
        )}
        renderActions={(p) => (
          <div className="flex gap-3 justify-end">
            <button className="text-primary text-[11px] font-bold uppercase tracking-[0.08em]">Editar</button>
            <button onClick={(e) => { e.stopPropagation(); toast.info("Em breve: anúncios vinculados"); }} className="text-muted-foreground hover:text-foreground text-[11px] font-bold uppercase tracking-[0.08em]">Anúncios</button>
          </div>
        )}
      />
    </div>
  );
}
