import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Package, 
  Truck, 
  Shield, 
  Tag, 
  Users,
  Loader2,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  supplier_id: string | null;
  category: string | null;
  cost_price: number | null;
  keywords: string[] | null;
  is_active: boolean;
  suppliers: {
    name: string;
  } | null;
  _count?: {
    competitors: number;
  };
}

export default function Produtos() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      // Querying products and their competitors count
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          suppliers (name),
          product_competitors (id)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erro ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  function handleVerAnuncios() {
    toast("Em breve: módulo de Anúncios", {
      icon: <ExternalLink size={16} />
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground">Gerencie sua base de produtos</p>
        </div>
        <Link
          to="/produtos/novo"
          className="flex items-center justify-center gap-2 rounded-[8px] bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <Plus size={18} />
          NOVO PRODUTO
        </Link>
      </div>

      {/* Busca */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search size={18} className="text-muted-foreground" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, SKU ou categoria..."
          className="w-full rounded-[8px] border border-sidebar-border bg-accent/5 py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-all duration-200"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 size={40} className="animate-spin text-primary" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="jtd-glass flex min-h-[40vh] flex-col items-center justify-center gap-6 p-12 text-center">
          <div className="rounded-full border border-primary/30 bg-primary/5 p-8">
            <Package size={64} className="text-primary opacity-50" strokeWidth={1} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Nenhum produto cadastrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">Clique em + Novo Produto para começar</p>
          </div>
          <Link
            to="/produtos/novo"
            className="flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-bold text-primary-foreground"
          >
            <Plus size={16} />
            CRIAR AGORA
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredProducts.map((product) => (
            <div key={product.id} className="jtd-glass flex flex-col p-6 transition-all duration-200 hover:border-primary/30">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground line-clamp-1">{product.name}</h3>
                    {product.sku && (
                      <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-sidebar-border">
                        {product.sku}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck size={14} className="opacity-60" />
                    <span>{product.suppliers?.name || "Sem fornecedor"}</span>
                    <span className="opacity-30">•</span>
                    <span>{product.category || "Sem categoria"}</span>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  product.is_active 
                    ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                    : "bg-red-500/10 text-red-500 border border-red-500/20"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${product.is_active ? "bg-green-500" : "bg-red-500"}`} />
                  {product.is_active ? "Ativo" : "Inativo"}
                </div>
              </div>

              <div className="mb-6 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">Preço de Custo</p>
                  <p className="text-lg font-bold text-primary">
                    {product.cost_price ? `R$ ${product.cost_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">Keywords</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Tag size={14} className="text-muted-foreground opacity-60" />
                    <p className="font-semibold text-foreground">{product.keywords?.length || 0}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">Concorrentes</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Users size={14} className="text-muted-foreground opacity-60" />
                    <p className="font-semibold text-foreground">{product.product_competitors?.length || 0}</p>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex items-center gap-2 pt-4 border-t border-sidebar-border">
                <Link
                  to="/produtos/$id/editar"
                  params={{ id: product.id }}
                  className="flex-1 flex justify-center items-center rounded-md border border-primary px-3 py-2 text-xs font-bold text-primary transition-all hover:bg-primary/5 active:scale-[0.98]"
                >
                  EDITAR
                </Link>
                <button
                  onClick={handleVerAnuncios}
                  className="flex-1 rounded-md border border-sidebar-border px-3 py-2 text-xs font-bold text-muted-foreground transition-all hover:bg-accent/10 active:scale-[0.98]"
                >
                  VER ANÚNCIOS
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
