import { useState, useEffect } from "react";
import { Package } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ListToolbar } from "@/components/layout/ListToolbar";

type StatusFilter = "all" | "active" | "inactive";

export default function Produtos() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase.from("products").select(`*, suppliers(name), product_competitors(id)`).order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar produtos.");
    setProducts(data || []);
    setLoading(false);
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "all" || (status === "active" ? p.is_active : !p.is_active);
    return matchSearch && matchStatus;
  });

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
        cta={{ label: "Novo Produto", to: "/produtos/novo" }}
      />

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
