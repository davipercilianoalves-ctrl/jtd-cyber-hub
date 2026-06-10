import { useState, useEffect } from "react";
import { Plus, Search, Truck, Shield, Loader2, Edit2, ExternalLink, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  delivery_days: number | null;
  warranty_days: number | null;
  is_active: boolean;
}

export default function Fornecedores() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.city || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.state || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus fornecedores e condições</p>
        </div>
        <button className="bg-primary px-4 py-2 text-sm font-bold text-black rounded hover:brightness-110">+ NOVO FORNECEDOR</button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
        <input 
          className="w-full bg-internal-w03 border border-sidebar-border rounded py-3 pl-10 pr-4 text-sm focus:border-primary outline-none"
          placeholder="Buscar por nome, cidade ou estado..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <p className="text-xs text-muted-foreground">Mostrando {filtered.length} de {suppliers.length} fornecedores</p>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 w-full rounded bg-internal-w5 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-primary/30"><Truck size={64} className="mx-auto mb-4" />Nenhum fornecedor cadastrado</div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-internal-w03 border-b border-sidebar-border">
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Nome</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Cidade/Estado</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Entrega</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Garantia</th>
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-sidebar-border/40 hover:bg-internal-w04 transition-colors group">
                <td className="p-4 font-semibold text-foreground">{s.name}</td>
                <td className="p-4 text-sm text-muted-foreground">{s.city ? `${s.city}/${s.state}` : "—"}</td>
                <td className="p-4 text-sm flex items-center gap-2"><Truck size={14} className="text-primary"/> {s.delivery_days} dias</td>
                <td className="p-4 text-sm flex items-center gap-2"><Shield size={14} className="text-primary"/> {s.warranty_days} dias</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {s.is_active ? 'ATIVO' : 'INATIVO'}
                  </span>
                </td>
                <td className="p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-2">
                    <button className="text-primary text-xs font-bold">EDITAR</button>
                    <button className="text-muted-foreground text-xs font-bold">VER PRODUTOS</button>
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
