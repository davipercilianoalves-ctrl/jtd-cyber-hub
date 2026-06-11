import { useState, useEffect, useMemo } from "react";
import { Megaphone } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ListToolbar } from "@/components/layout/ListToolbar";
import { DataView, type DataColumn } from "@/components/data/DataView";
import { useViewMode } from "@/hooks/useViewMode";

type SortKey = "recent" | "product" | "price_desc" | "margin_desc";

export default function Anuncios() {
  const navigate = useNavigate();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [marketplace, setMarketplace] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useViewMode("view:anuncios", "table");

  useEffect(() => { fetchAds(); }, []);

  async function fetchAds() {
    setLoading(true);
    const { data, error } = await supabase.from("ads").select(`*, products(name)`).order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar anúncios.");
    setAds(data || []);
    setLoading(false);
  }

  const marketplaces = useMemo(() => {
    const set = new Set<string>();
    ads.forEach(a => { if (a.marketplace) set.add(a.marketplace); });
    return Array.from(set);
  }, [ads]);

  const filtered = useMemo(() => {
    const list = ads.filter(a => {
      const matchSearch =
        (a.products?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (a.marketplace || "").toLowerCase().includes(search.toLowerCase());
      const matchMarketplace = marketplace === "all" || a.marketplace === marketplace;
      return matchSearch && matchMarketplace;
    });
    const sorted = [...list];
    if (sort === "product") sorted.sort((a, b) => (a.products?.name || "").localeCompare(b.products?.name || ""));
    else if (sort === "price_desc") sorted.sort((a, b) => (b.final_price || 0) - (a.final_price || 0));
    else if (sort === "margin_desc") sorted.sort((a, b) => (b.profit_margin || 0) - (a.profit_margin || 0));
    return sorted;
  }, [ads, search, marketplace, sort]);

  const columns: DataColumn<any>[] = [
    { key: "mp", label: "Marketplace", render: (a) => <span className="inline-flex items-center rounded border border-cyan-400/30 bg-cyan-400/10 px-1.5 py-0.5 text-[10px] font-bold text-cyan-400 uppercase">{a.marketplace || "—"}</span> },
    { key: "title", label: "Título", render: (a) => (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-muted-foreground truncate max-w-[180px] inline-block align-bottom">{a.titles?.[0] || "—"}</span>
        {a.titles?.length > 1 && <span className="bg-white/10 text-[10px] px-1.5 py-0.5 rounded">+{a.titles.length - 1}</span>}
      </span>
    ), tableOnly: true },
    { key: "price", label: "Preço", align: "right", className: "font-mono font-bold text-cyan-400", render: (a) => `R$ ${(a.final_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { key: "margin", label: "Margem", align: "right", className: "font-bold text-lime-500", render: (a) => `${a.profit_margin || 0}%` },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <ListToolbar
        icon={Megaphone}
        title="Anúncios"
        subtitle="Gerencie seus anúncios por marketplace"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por produto ou marketplace..."
        totalCount={ads.length}
        filteredCount={filtered.length}
        filters={[
          { label: "Todos", active: marketplace === "all", onClick: () => setMarketplace("all") },
          ...marketplaces.map(m => ({
            label: m,
            active: marketplace === m,
            onClick: () => setMarketplace(m),
          })),
        ]}
        view={view}
        onViewChange={setView}
        sortOptions={[
          { key: "recent", label: "Mais recentes" },
          { key: "product", label: "Produto (A→Z)" },
          { key: "price_desc", label: "Maior preço" },
          { key: "margin_desc", label: "Maior margem" },
        ]}
        sortValue={sort}
        onSortChange={(v) => setSort(v as SortKey)}
        cta={{ label: "Novo Anúncio", to: "/anuncios/novo" }}
      />

      <DataView
        items={filtered}
        view={view}
        loading={loading}
        getKey={(a) => a.id}
        onItemClick={(a) => navigate({ to: "/anuncios/$id/editar", params: { id: a.id } })}
        emptyIcon={Megaphone}
        emptyText="Nenhum anúncio cadastrado"
        columns={columns}
        renderAvatar={(a) => (
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-cyan-400/25 bg-cyan-400/5 text-cyan-400">
            <Megaphone size={16} />
          </div>
        )}
        renderHeader={(a) => (
          <div className="min-w-0">
            <div className="truncate font-semibold text-foreground">{a.products?.name || "—"}</div>
            <div className="truncate text-[11px] text-muted-foreground">{a.titles?.[0] || "Sem título"}</div>
          </div>
        )}
        renderHighlight={(a) => (
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Preço</div>
              <div className="font-mono text-lg font-bold text-cyan-400">R$ {(a.final_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Margem</div>
              <div className="font-bold text-lime-500">{a.profit_margin || 0}%</div>
            </div>
          </div>
        )}
        renderStatus={(a) => (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.is_active ? 'bg-green-500/10 text-green-500 border border-green-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
            {a.is_active ? 'ATIVO' : 'INATIVO'}
          </span>
        )}
        renderActions={(a) => (
          <div className="flex gap-3 justify-end">
            <button className="text-primary text-[11px] font-bold uppercase tracking-wider">Editar</button>
            <button onClick={(e) => { e.stopPropagation(); toast.info("Em breve: métricas"); }} className="text-muted-foreground hover:text-foreground text-[11px] font-bold uppercase tracking-wider">Métricas</button>
          </div>
        )}
      />
    </div>
  );
}
