import { useState, useEffect, useMemo } from "react";
import { Megaphone } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ListToolbar } from "@/components/layout/ListToolbar";

export default function Anuncios() {
  const navigate = useNavigate();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [marketplace, setMarketplace] = useState<string>("all");

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

  const filtered = ads.filter(a => {
    const matchSearch =
      (a.products?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.marketplace || "").toLowerCase().includes(search.toLowerCase());
    const matchMarketplace = marketplace === "all" || a.marketplace === marketplace;
    return matchSearch && matchMarketplace;
  });

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
        cta={{ label: "Novo Anúncio", to: "/anuncios/novo" }}
      />

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 w-full rounded bg-internal-w5 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-primary/30"><Megaphone size={64} className="mx-auto mb-4" />Nenhum anúncio cadastrado</div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-internal-w03 border-b border-sidebar-border">
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Produto</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Títulos</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Preço Venda</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Margem</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} onClick={() => navigate({ to: "/anuncios/$id/editar", params: { id: a.id } })} className="border-b border-sidebar-border/40 hover:bg-internal-w04 transition-colors group cursor-pointer">
                <td className="p-4 font-semibold text-foreground">{a.products?.name || "—"}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground truncate max-w-[200px]">{a.titles?.[0] || "—"}</span>
                    {a.titles?.length > 1 && <span className="bg-white/10 text-[10px] px-1.5 py-0.5 rounded">+{a.titles.length - 1}</span>}
                  </div>
                </td>
                <td className="p-4 font-mono font-bold text-cyan-400">R$ {a.final_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="p-4 font-bold text-lime-500">{a.profit_margin}%</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {a.is_active ? 'ATIVO' : 'INATIVO'}
                  </span>
                </td>
                <td className="p-4 opacity-0 group-hover:opacity-100 transition-opacity text-right">
                  <div className="flex gap-2 justify-end">
                    <button className="text-primary text-xs font-bold">EDITAR</button>
                    <button onClick={(e) => { e.stopPropagation(); toast.info("Em breve: métricas"); }} className="text-muted-foreground text-xs font-bold">VER MÉTRICAS</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
