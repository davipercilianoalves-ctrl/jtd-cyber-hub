import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Megaphone, 
  Tag, 
  Loader2,
  ChevronRight,
  Edit2,
  BarChart2
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Anuncios() {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAds();
  }, []);

  async function fetchAds() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ads")
        .select(`
          *,
          products (name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error("Error fetching ads:", error);
      toast.error("Erro ao carregar anúncios.");
    } finally {
      setLoading(false);
    }
  }

  const filteredAds = ads.filter(a => 
    (a.products?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.marketplace || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.titles || []).some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Anúncios</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus anúncios por marketplace</p>
        </div>
        <Link
          to="/anuncios/novo"
          className="flex items-center justify-center gap-2 rounded-[8px] bg-lime-500 px-4 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <Plus size={18} />
          NOVO ANÚNCIO
        </Link>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search size={18} className="text-muted-foreground" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, produto ou marketplace..."
          className="w-full rounded-[8px] border border-sidebar-border bg-accent/5 py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-all duration-200"
        />
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 size={40} className="animate-spin text-primary" />
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="jtd-glass flex min-h-[40vh] flex-col items-center justify-center gap-6 p-12 text-center">
          <div className="rounded-full border border-primary/30 bg-primary/5 p-8">
            <Megaphone size={64} className="text-primary opacity-50" strokeWidth={1} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Nenhum anúncio criado</h3>
            <p className="mt-2 text-sm text-muted-foreground">Clique em + Novo Anúncio para começar</p>
          </div>
          <Link
            to="/anuncios/novo"
            className="flex items-center gap-2 rounded-md bg-lime-500 px-6 py-2 text-sm font-bold text-black"
          >
            <Plus size={16} />
            CRIAR AGORA
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredAds.map((ad) => (
            <div key={ad.id} className="jtd-glass flex flex-col p-6 transition-all duration-200 hover:border-primary/30">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="text-xl font-bold text-foreground line-clamp-1">{ad.products?.name || "Produto Removido"}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-sidebar-border">
                      {ad.marketplace}
                    </span>
                    <span className="text-sm font-bold text-cyan-500">
                      R$ {ad.final_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  ad.is_active 
                    ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                    : "bg-red-500/10 text-red-500 border border-red-500/20"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${ad.is_active ? "bg-green-500" : "bg-red-500"}`} />
                  {ad.is_active ? "Ativo" : "Inativo"}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">Títulos criados</p>
                <p className="text-sm text-foreground mt-1">{ad.titles?.length || 0} títulos</p>
              </div>

              <div className="mt-auto flex items-center gap-2 pt-4 border-t border-sidebar-border">
                <Link
                  to="/anuncios/$id/editar"
                  params={{ id: ad.id }}
                  className="flex-1 flex justify-center items-center rounded-md border border-primary px-3 py-2 text-xs font-bold text-primary transition-all hover:bg-primary/5 active:scale-[0.98]"
                >
                  <Edit2 size={12} className="mr-2" /> EDITAR
                </Link>
                <button
                  onClick={() => toast.info("Em breve: Visualização de Métricas")}
                  className="flex-1 rounded-md border border-sidebar-border px-3 py-2 text-xs font-bold text-muted-foreground transition-all hover:bg-accent/10 active:scale-[0.98]"
                >
                  <BarChart2 size={12} className="mr-2" /> VER MÉTRICAS
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
