import { useState, useEffect } from "react";
import { Plus, Search, Package, Loader2, Tag, Users } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Produtos() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase.from("products").select(`*, suppliers(name), product_competitors(id)`).order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar produtos.");
    setProducts(data || []);
    setLoading(false);
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground">Gerencie sua base de produtos</p>
        </div>
        <Link to="/produtos/novo" className="bg-primary px-4 py-2 text-sm font-bold text-black rounded hover:brightness-110 flex items-center gap-2"><Plus size={18}/> NOVO PRODUTO</Link>
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

      <p className="text-xs text-muted-foreground">Mostrando {filtered.length} de {products.length} produtos</p>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 w-full rounded bg-internal-w5 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-primary/30"><Package size={64} className="mx-auto mb-4" />Nenhum produto cadastrado</div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-internal-w03 border-b border-sidebar-border">
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Nome + SKU</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Fornecedor</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Custo</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Keywords</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Concorrentes</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} onClick={() => navigate({ to: "/produtos/$id/editar", params: { id: p.id } })} className="border-b border-sidebar-border/40 hover:bg-internal-w04 transition-colors group cursor-pointer">
                <td className="p-4">
                  <div className="font-semibold text-foreground">{p.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{p.sku || "—"}</div>
                </td>
                <td className="p-4 text-sm text-muted-foreground">{p.suppliers?.name || "—"}</td>
                <td className="p-4 font-mono font-bold text-primary">R$ {p.cost_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="p-4"><span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/20">{p.keywords?.length || 0} kw</span></td>
                <td className="p-4 text-sm text-muted-foreground">{p.product_competitors?.length || 0}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {p.is_active ? 'ATIVO' : 'INATIVO'}
                  </span>
                </td>
                <td className="p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-2">
                    <button className="text-primary text-xs font-bold">EDITAR</button>
                    <button onClick={(e) => { e.stopPropagation(); toast.info("Em breve: anúncios vinculados"); }} className="text-muted-foreground text-xs font-bold">VER ANÚNCIOS</button>
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
