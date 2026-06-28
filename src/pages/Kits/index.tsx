import { useState, useEffect } from "react";
import { Plus, Search, Layers, Loader2 } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Kits() {
  const navigate = useNavigate();
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchKits();
  }, []);

  async function fetchKits() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("kits")
        .select(`
          *,
          kit_products (id)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setKits(data || []);
    } catch (error) {
      console.error("Error fetching kits:", error);
      toast.error("Erro ao carregar kits.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = kits.filter(k => 
    k.name.toLowerCase().includes(search.toLowerCase()) || 
    (k.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight text-foreground">Kits e Composições</h1>
          <p className="text-[13px] text-muted-foreground">Gerencie seus kits de produtos</p>
        </div>
        <Link 
          to="/kits/novo" 
          className="bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-black rounded hover:brightness-110 flex items-center gap-2"
        >
          <Plus size={18}/> Novo Kit
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
        <input 
          className="w-full bg-internal-w03 border border-sidebar-border rounded py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
          placeholder="Buscar por nome ou SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Mostrando {filtered.length} de {kits.length} kits</p>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 w-full rounded bg-internal-w5 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="jtd-glass flex min-h-[40vh] flex-col items-center justify-center gap-6 p-12 text-center">
          <div className="rounded-full border border-primary/30 bg-primary/5 p-8">
            <Layers size={64} className="text-primary opacity-50" strokeWidth={1} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Nenhum kit cadastrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">Clique em + Novo Kit para começar</p>
          </div>
          <Link
            to="/kits/novo"
            className="flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-bold text-black"
          >
            <Plus size={16} />
            CRIAR AGORA
          </Link>
        </div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-internal-w03 border-b border-sidebar-border">
              <th className="p-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Nome + SKU</th>
              <th className="p-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Produtos</th>
              <th className="p-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Preço Venda</th>
              <th className="p-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Margem</th>
              <th className="p-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(k => (
              <tr 
                key={k.id} 
                onClick={() => navigate({ to: "/kits/$id/editar", params: { id: k.id } })} 
                className="border-b border-border/40 hover:bg-internal-w04 transition-colors group cursor-pointer"
              >
                <td className="p-4">
                  <div className="text-sm font-medium text-foreground">{k.name}</div>
                  <div className="text-[11px] text-muted-foreground">{k.sku || "—"}</div>
                </td>
                <td className="p-4">
                  <span className="bg-muted/15 text-foreground text-[11px] font-bold px-2 py-0.5 rounded border border-white/10">
                    {k.kit_products?.length || 0} produtos
                  </span>
                </td>
                <td className="p-4 text-sm font-semibold tabular-nums font-mono text-cyan-400">
                  R$ {k.final_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-4 text-sm font-semibold tabular-nums text-lime-500">
                  {k.profit_margin?.toFixed(1)}%
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    k.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {k.is_active ? 'ATIVO' : 'INATIVO'}
                  </span>
                </td>
                <td className="p-4 opacity-0 group-hover:opacity-100 transition-opacity text-right">
                  <div className="flex gap-2 justify-end">
                    <button className="text-primary text-[11px] font-bold uppercase tracking-[0.08em]">Editar</button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toast.info("Em breve: métricas do kit"); }} 
                      className="text-muted-foreground text-[11px] font-bold uppercase tracking-[0.08em]"
                    >
                      Ver Métricas
                    </button>
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
