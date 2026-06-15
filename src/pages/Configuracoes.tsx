// Configurações — inclui logout, tema e vinculação ML
import { useEffect, useState } from "react";
import { Settings, LogOut, Sun, Moon, Link2, Loader2, RefreshCcw } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/JtdThemeContext";
import { useMLCruzamento } from "@/hooks/useMLCruzamento";
import { toast } from "sonner";

export default function Configuracoes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="space-y-6">
      <div className="jtd-glass flex items-center gap-4 p-6 transition-all duration-200">
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4 transition-colors duration-200">
          <Settings size={32} className="text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground transition-colors duration-200">Configurações</h2>
          <p className="text-sm text-muted-foreground transition-colors duration-200">Em construção — Módulo 8</p>
        </div>
      </div>

      <div className="jtd-glass p-6 transition-all duration-200">
        <h3 className="mb-6 text-sm uppercase tracking-wider text-muted-foreground transition-colors duration-200">Aparência</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground transition-colors duration-200">Tema do aplicativo</p>
            <p className="text-xs text-muted-foreground transition-colors duration-200">Selecione entre o modo claro e escuro</p>
          </div>
          
          <div className="flex items-center gap-1 rounded-lg border border-sidebar-border bg-sidebar p-1 transition-colors duration-200">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                theme === 'light' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Sun size={14} />
              Claro
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                theme === 'dark' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Moon size={14} />
              Escuro
            </button>
          </div>
        </div>
      </div>

      <div className="jtd-glass p-6 transition-all duration-200">
        <h3 className="mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground transition-colors duration-200">
          <Link2 size={14} />
          Vinculação com Mercado Livre
        </h3>
        <VinculacaoML />
      </div>

      <div className="jtd-glass p-6 transition-all duration-200">
        <h3 className="mb-4 text-sm uppercase tracking-wider text-muted-foreground transition-colors duration-200">Sessão</h3>
        <div className="mb-4 flex items-center justify-between border-b border-sidebar-border pb-4 transition-colors duration-200">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground transition-colors duration-200">Usuário</p>
            <p className="font-mono text-sm text-foreground transition-colors duration-200">{user?.email ?? "—"}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-[6px] border border-destructive bg-transparent px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </div>
  );
}

// ============= Seção: Vinculação ML =============

function VinculacaoML() {
  const { fetchMLItems, cruzarItem, vincularItem, desvincularItem } = useMLCruzamento();
  const [mlItems, setMLItems] = useState<any[]>([]);
  const [localAds, setLocalAds] = useState<any[]>([]);
  const [vinculacoes, setVinculacoes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [token, setToken] = useState<any>(null);

  useEffect(() => {
    supabase.from('ml_tokens').select('*').maybeSingle()
      .then(({ data }) => setToken(data));

    supabase.from('ads')
      .select('id, titles, ml_item_id, products(name, sku)')
      .eq('is_active', true)
      .then(({ data }) => {
        const ads = (data as any[]) || [];
        setLocalAds(ads);
        const saved: Record<string, string> = {};
        ads.forEach((ad: any) => {
          if (ad.ml_item_id) saved[ad.ml_item_id] = ad.id;
        });
        setVinculacoes(saved);
      });
  }, []);

  async function handleBuscar() {
    if (!token) return;
    setLoading(true);
    try {
      const items = await fetchMLItems(token.user_id);
      setMLItems(items);

      const autoCruz: Record<string, string> = {};
      items.forEach((item: any) => {
        const match = cruzarItem(item, localAds);
        if (match && !vinculacoes[item.id]) {
          autoCruz[item.id] = match.id;
        }
      });
      setVinculacoes(prev => ({ ...prev, ...autoCruz }));

      if (Object.keys(autoCruz).length > 0) {
        toast.success(`${Object.keys(autoCruz).length} anúncios vinculados automaticamente!`);
      } else if (items.length === 0) {
        toast.info('Nenhum anúncio ativo encontrado no ML');
      }
    } catch (e: any) {
      toast.error('Erro ao buscar anúncios do ML');
    } finally {
      setLoading(false);
    }
  }

  async function handleSalvar(mlItemId: string) {
    const adId = vinculacoes[mlItemId];
    setSaving(prev => ({ ...prev, [mlItemId]: true }));
    try {
      if (adId) {
        await vincularItem(adId, mlItemId);
        toast.success('Vínculo salvo!');
      } else {
        const adComEsse = localAds.find(a => a.ml_item_id === mlItemId);
        if (adComEsse) await desvincularItem(adComEsse.id);
        toast.success('Vínculo removido');
      }
      const { data } = await supabase.from('ads')
        .select('id, titles, ml_item_id, products(name, sku)')
        .eq('is_active', true);
      setLocalAds((data as any[]) || []);
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message ?? ''));
    } finally {
      setSaving(prev => ({ ...prev, [mlItemId]: false }));
    }
  }

  if (!token) {
    return (
      <div className="text-sm text-muted-foreground">
        Conecte o Mercado Livre na aba API primeiro.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Vincule seus anúncios do ML com os cadastrados no app
          para puxar visitas e métricas reais.
        </p>
        <button
          onClick={handleBuscar}
          disabled={loading}
          className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-4 py-2 rounded text-sm hover:brightness-110 disabled:opacity-50 flex-shrink-0"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          Buscar Anúncios do ML
        </button>
      </div>

      {mlItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {mlItems.length} anúncios encontrados no ML • {Object.values(vinculacoes).filter(Boolean).length} vinculados
          </p>
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {mlItems.map((item: any) => {
              const isVinculado = !!vinculacoes[item.id];
              const adVinculado = localAds.find(a => a.id === vinculacoes[item.id]);
              return (
                <div key={item.id} className="p-4 bg-card">
                  <div className="flex items-start gap-4">
                    {item.thumbnail && (
                      <img
                        src={item.thumbnail.replace('http:', 'https:')}
                        alt=""
                        className="w-12 h-12 object-cover rounded border border-border flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span className="font-mono">{item.id}</span>
                            {item.seller_sku && <span>SKU: {item.seller_sku}</span>}
                            <span className="text-primary font-bold">
                              R$ {Number(item.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                        {isVinculado && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full px-2 py-0.5 font-mono uppercase flex-shrink-0">
                            Vinculado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <select
                          value={vinculacoes[item.id] || ''}
                          onChange={e => setVinculacoes(prev => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))}
                          className="flex-1 text-xs rounded border border-border bg-background text-foreground px-2 py-1.5"
                        >
                          <option value="">— Sem vínculo —</option>
                          {localAds.map((ad: any) => (
                            <option key={ad.id} value={ad.id}>
                              {ad.titles?.[0] || ad.products?.name || 'Sem título'}
                              {ad.products?.sku ? ` (${ad.products.sku})` : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleSalvar(item.id)}
                          disabled={saving[item.id]}
                          className="text-xs bg-primary text-primary-foreground font-bold px-3 py-1.5 rounded hover:brightness-110 disabled:opacity-50 flex items-center gap-1"
                        >
                          {saving[item.id]
                            ? <Loader2 size={12} className="animate-spin" />
                            : 'Salvar'}
                        </button>
                      </div>
                      {adVinculado && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          → {adVinculado.titles?.[0] || adVinculado.products?.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
