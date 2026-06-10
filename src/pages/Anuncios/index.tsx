import { useState, useEffect } from "react";
import { Plus, Search, Megaphone, Loader2, Edit2, BarChart2 } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Anuncios() {
  const navigate = useNavigate();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchAds(); }, []);

  async function fetchAds() {
    setLoading(true);
    const { data, error } = await supabase.from("ads").select(`*, products(name)`).order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar anúncios.");
    setAds(data || []);
    setLoading(false);
  }

  const filtered = ads.filter(a => 
    (a.products?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.marketplace || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Anúncios</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus anúncios por marketplace</p>
        </div>
        <Link to="/anuncios/novo" className="bg-primary px-4 py-2 text-sm font-bold text-black rounded hover:brightness-110 flex items-center gap-2"><Plus size={18}/> NOVO ANÚNCIO</Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
        <input 
          className="w-full bg-white/[0.03] border border-sidebar-border rounded py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
          placeholder="Buscar por produto ou marketplace..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <p className="text-xs text-muted-foreground">Mostrando {filtered.length} de {ads.length} anúncios</p>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 w-full rounded bg-white/5 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-primary/30"><Megaphone size={64} className="mx-auto mb-4" />Nenhum anúncio cadastrado</div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.03] border-b border-sidebar-border">
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
              <tr key={a.id} onClick={() => navigate({ to: "/anuncios/$id/editar", params: { id: a.id } })} className="border-b border-sidebar-border/40 hover:bg-white/[0.04] transition-colors group cursor-pointer">
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
