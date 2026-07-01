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

type LinkTarget = { kind: 'ad' | 'product'; id: string };

function encodeTarget(t: LinkTarget | null): string {
  return t ? `${t.kind}:${t.id}` : '';
}
function decodeTarget(v: string): LinkTarget | null {
  if (!v) return null;
  const [kind, id] = v.split(':');
  if ((kind === 'ad' || kind === 'product') && id) return { kind, id };
  return null;
}

function VinculacaoML() {
  const { fetchMLItems } = useMLCruzamento();
  const [mlItems, setMLItems] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [vinculacoes, setVinculacoes] = useState<Record<string, LinkTarget | null>>({});
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [token, setToken] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [search, setSearch] = useState('');

  async function loadAppData() {
    const [{ data: adsData }, { data: prodData }] = await Promise.all([
      supabase.from('ads').select('id, titles, ml_item_id, products(name, sku)').order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, sku, ml_item_id' as any).order('name', { ascending: true }),
    ]);
    const adsArr = (adsData as any[]) || [];
    const prodArr = (prodData as any[]) || [];
    setAds(adsArr);
    setProducts(prodArr);
    return { adsArr, prodArr };
  }

  function buildLinks(adsArr: any[], prodArr: any[], mlIds: string[]) {
    const map: Record<string, LinkTarget | null> = {};
    mlIds.forEach((id) => {
      const ad = adsArr.find((a: any) => a.ml_item_id === id);
      if (ad) { map[id] = { kind: 'ad', id: ad.id }; return; }
      const prod = prodArr.find((p: any) => p.ml_item_id === id);
      if (prod) { map[id] = { kind: 'product', id: prod.id }; return; }
      map[id] = null;
    });
    return map;
  }

  useEffect(() => {
    (async () => {
      const { data: tk } = await supabase.from('ml_tokens').select('id, user_id, expires_at, owner_id, created_at').maybeSingle();
      setToken(tk);
      const { adsArr, prodArr } = await loadAppData();
      if (tk) await handleBuscar(tk, adsArr, prodArr);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBuscar(tk: any = token, adsArr: any[] = ads, prodArr: any[] = products) {
    if (!tk) return;
    setLoading(true);
    try {
      const items = await fetchMLItems(tk.user_id);
      setMLItems(items);
      setVinculacoes(buildLinks(adsArr, prodArr, items.map((i: any) => i.id)));
      if (items.length === 0) toast.info('Nenhum anúncio ativo encontrado no ML');
    } catch {
      toast.error('Erro ao buscar anúncios do ML');
    } finally {
      setLoading(false);
    }
  }

  async function persistLink(mlItemId: string, target: LinkTarget | null) {
    // Limpa vínculo antigo nesse MLB em ads e products
    await supabase.from('ads').update({ ml_item_id: null } as any).eq('ml_item_id', mlItemId);
    await supabase.from('products').update({ ml_item_id: null } as any).eq('ml_item_id' as any, mlItemId);
    if (target?.kind === 'ad') {
      const { error } = await supabase.from('ads').update({ ml_item_id: mlItemId } as any).eq('id', target.id);
      if (error) throw error;
    } else if (target?.kind === 'product') {
      const { error } = await supabase.from('products').update({ ml_item_id: mlItemId } as any).eq('id', target.id);
      if (error) throw error;
    }
  }

  async function handleSalvar(mlItemId: string) {
    setSaving(prev => ({ ...prev, [mlItemId]: true }));
    try {
      await persistLink(mlItemId, vinculacoes[mlItemId] ?? null);
      toast.success(vinculacoes[mlItemId] ? 'Vínculo salvo!' : 'Vínculo removido');
      await loadAppData();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message ?? ''));
    } finally {
      setSaving(prev => ({ ...prev, [mlItemId]: false }));
    }
  }

  async function handleAutoVincular() {
    if (!mlItems.length) return;
    setAutoLoading(true);
    let count = 0;
    const novos: Record<string, LinkTarget | null> = { ...vinculacoes };
    try {
      for (const item of mlItems) {
        if (vinculacoes[item.id]) continue; // não sobrescreve manual
        const mlSku = (item.seller_sku || item.seller_custom_field || '').toLowerCase().trim();
        const mlTitle = (item.title || '').toLowerCase();
        let target: LinkTarget | null = null;

        if (mlSku) {
          const ad = ads.find((a: any) => (a.products?.sku || '').toLowerCase() === mlSku);
          if (ad) target = { kind: 'ad', id: ad.id };
          if (!target) {
            const p = products.find((p: any) => (p.sku || '').toLowerCase() === mlSku);
            if (p) target = { kind: 'product', id: p.id };
          }
        }
        if (!target) {
          const p = products.find((p: any) => p.sku && mlTitle.includes(String(p.sku).toLowerCase()));
          if (p) target = { kind: 'product', id: p.id };
        }
        if (target) {
          try {
            await persistLink(item.id, target);
            novos[item.id] = target;
            count++;
          } catch {}
        }
      }
      setVinculacoes(novos);
      await loadAppData();
      toast.success(`${count} vínculos criados automaticamente`);
    } finally {
      setAutoLoading(false);
    }
  }

  const totalVinc = Object.values(vinculacoes).filter(Boolean).length;
  const totalSem = mlItems.length - totalVinc;
  const pct = mlItems.length ? Math.round((totalVinc / mlItems.length) * 100) : 0;

  const filteredItems = mlItems.filter((item: any) => {
    const isLinked = !!vinculacoes[item.id];
    if (filter === 'linked' && !isLinked) return false;
    if (filter === 'unlinked' && isLinked) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!(item.title || '').toLowerCase().includes(s) && !item.id.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  if (!token) {
    return <div className="text-sm text-muted-foreground">Conecte o Mercado Livre na aba API primeiro.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <p className="text-sm text-muted-foreground">
            Vincule seus anúncios do ML aos produtos ou anúncios cadastrados no app.
          </p>
          {mlItems.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground">
                {mlItems.length} no ML · <span className="text-emerald-500 font-bold">{totalVinc}</span> vinculados · <span className="text-amber-500 font-bold">{totalSem}</span> sem vínculo
              </p>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleAutoVincular}
            disabled={autoLoading || !mlItems.length}
            className="flex items-center gap-2 border border-primary text-primary font-bold px-3 py-2 rounded text-sm hover:bg-primary/10 disabled:opacity-50"
          >
            {autoLoading ? <Loader2 size={16} className="animate-spin" /> : null}
            Auto-vincular por SKU
          </button>
          <button
            onClick={() => handleBuscar()}
            disabled={loading}
            className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-4 py-2 rounded text-sm hover:brightness-110 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Buscar Anúncios do ML
          </button>
        </div>
      </div>

      {mlItems.length > 0 && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
              {(['all', 'linked', 'unlinked'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'linked' ? 'Vinculados' : 'Sem vínculo'}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título ou MLB..."
              className="flex-1 min-w-[200px] text-xs rounded border border-border bg-background text-foreground px-3 py-2"
            />
          </div>

          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {filteredItems.map((item: any) => {
              const target = vinculacoes[item.id] ?? null;
              const isVinculado = !!target;
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
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span className="font-mono">{item.id}</span>
                            {item.seller_sku && <span>SKU: {item.seller_sku}</span>}
                            <span className="text-primary font-bold">
                              R$ {Number(item.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                        {isVinculado ? (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full px-2 py-0.5 font-mono uppercase flex-shrink-0">
                            ✓ Vinculado
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full px-2 py-0.5 font-mono uppercase flex-shrink-0">
                            ⚠ Sem vínculo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <select
                          value={encodeTarget(target)}
                          onChange={e => setVinculacoes(prev => ({
                            ...prev,
                            [item.id]: decodeTarget(e.target.value),
                          }))}
                          className="flex-1 text-xs rounded border border-border bg-background text-foreground px-2 py-1.5"
                        >
                          <option value="">— Sem vínculo —</option>
                          {ads.length > 0 && (
                            <optgroup label="── Anúncios ──">
                              {ads.map((ad: any) => (
                                <option key={`ad-${ad.id}`} value={`ad:${ad.id}`}>
                                  {(ad.titles?.[0] || ad.products?.name || 'Sem título')}
                                  {ad.products?.sku ? ` (${ad.products.sku})` : ''}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {products.length > 0 && (
                            <optgroup label="── Produtos ──">
                              {products.map((p: any) => (
                                <option key={`prod-${p.id}`} value={`product:${p.id}`}>
                                  {p.name}{p.sku ? ` (SKU: ${p.sku})` : ''}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        <button
                          onClick={() => handleSalvar(item.id)}
                          disabled={saving[item.id]}
                          className="text-xs bg-primary text-primary-foreground font-bold px-3 py-1.5 rounded hover:brightness-110 disabled:opacity-50 flex items-center gap-1"
                        >
                          {saving[item.id] ? <Loader2 size={12} className="animate-spin" /> : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
