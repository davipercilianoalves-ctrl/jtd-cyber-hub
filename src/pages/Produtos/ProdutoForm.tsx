import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { 
  Loader2, 
  Plus, 
  Truck, 
  X, 
  Save, 
  ArrowLeft, 
  Tag, 
  Copy, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  DollarSign,
  Package,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FloatingKeywordPanel from "@/components/FloatingKeywordPanel";

interface Competitor {
  id?: string;
  title: string;
  description: string;
  price: number;
  url: string;
  keywords_found: string[];
}

interface ProdutoFormProps {
  productId?: string;
}

export default function ProdutoForm({ productId }: ProdutoFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [expandedCompetitor, setExpandedCompetitor] = useState<number | null>(null);
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [openPanels, setOpenPanels] = useState<number[]>([]);
  const [showGeneralPanel, setShowGeneralPanel] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    supplier_id: "",
    category: "",
    cost_price: 0,
    weight_g: 0,
    dimensions: "",
    description: "",
    common_questions: "",
    notes: "",
    is_active: true,
    keywords: [] as string[]
  });

  const [newCompetitor, setNewCompetitor] = useState<Competitor>({
    title: "",
    description: "",
    price: 0,
    url: "",
    keywords_found: []
  });

  useEffect(() => {
    fetchSuppliers();
    if (productId) fetchProduct();
  }, [productId]);

  async function fetchSuppliers() {
    const { data } = await supabase.from("suppliers").select("id, name, delivery_days, warranty_days").eq("is_active", true);
    setSuppliers(data || []);
  }

  async function fetchProduct() {
    if (!productId) return;
    const { data, error } = await supabase.from("products").select("*, product_competitors(*)").eq("id", productId).single();
    if (data) {
      const { product_competitors, ...rest } = data as any;
      setFormData(rest);
      setCompetitors(product_competitors || []);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    const sku = formData.sku || `PRD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const payload = { ...formData, sku };

    try {
      let savedProductId = productId;
      if (productId) {
        await supabase.from("products").update(payload).eq("id", productId);
      } else {
        const { data, error } = await supabase.from("products").insert([payload]).select().single();
        if (error) throw error;
        savedProductId = data.id;
      }

      // Save competitors
      if (savedProductId) {
        // Delete old ones and insert current ones for simplicity in this MVP
        await supabase.from("product_competitors").delete().eq("product_id", savedProductId);
        if (competitors.length > 0) {
          const competitorsToSave = competitors.map(c => ({
            ...c,
            product_id: savedProductId,
            id: undefined // Let DB generate new IDs or use existing if we handle it properly
          }));
          await supabase.from("product_competitors").insert(competitorsToSave);
        }
      }

      toast.success(productId ? "Produto atualizado!" : "Produto criado!");
      navigate({ to: "/produtos" });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar produto.");
    } finally {
      setSaving(false);
    }
  }

  const addKeyword = (kw: string) => {
    if (!kw.trim()) return;
    if (formData.keywords.includes(kw.trim())) return;
    setFormData({ ...formData, keywords: [...formData.keywords, kw.trim()] });
  };

  const removeKeyword = (kw: string) => {
    setFormData({ ...formData, keywords: formData.keywords.filter(k => k !== kw) });
  };

  const copyKeywords = (all = true) => {
    const text = formData.keywords.join(", ");
    navigator.clipboard.writeText(text);
    toast.success("Palavras-chave copiadas!");
  };

  const handleAddCompetitor = () => {
    setCompetitors([...competitors, newCompetitor]);
    setNewCompetitor({ title: "", description: "", price: 0, url: "", keywords_found: [] });
    setIsAddingCompetitor(false);
  };

  // Price calculations
  const prices = competitors.map(c => c.price).filter(p => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 size={32} className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      <button type="button" onClick={() => navigate({ to: "/produtos" })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Voltar para Produtos
      </button>

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-5">
        {/* Coluna Esquerda (60%) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="jtd-glass p-6 space-y-6">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Package size={18} className="text-primary" />
              Informações Básicas
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Nome do Produto*</label>
                <input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full rounded border border-sidebar-border bg-accent/5 p-2.5 text-sm text-foreground focus:border-primary transition-colors" 
                  placeholder="Ex: Smartwatch Pro Max X"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">SKU</label>
                <div className="flex gap-2">
                  <input 
                    value={formData.sku} 
                    onChange={e => setFormData({...formData, sku: e.target.value})} 
                    className="w-full rounded border border-sidebar-border bg-accent/5 p-2 text-sm text-foreground focus:border-primary font-mono" 
                    placeholder="Gerado automaticamente..." 
                  />
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, sku: `PRD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`})} 
                    className="text-[10px] font-bold bg-accent/10 hover:bg-accent/20 px-3 rounded border border-sidebar-border transition-colors"
                  >
                    GERAR
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Categoria</label>
                <input 
                  value={formData.category || ""} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  className="w-full rounded border border-sidebar-border bg-accent/5 p-2 text-sm text-foreground focus:border-primary"
                  placeholder="Ex: Eletrônicos"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Fornecedor</label>
                <select 
                  value={formData.supplier_id || ""} 
                  onChange={e => setFormData({...formData, supplier_id: e.target.value})} 
                  className="w-full rounded border border-sidebar-border bg-accent/5 p-2.5 text-sm text-foreground"
                >
                  <option value="">Selecionar...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {selectedSupplier && (
                  <p className="mt-1 text-[10px] text-primary flex items-center gap-1">
                    <Truck size={10} />
                    Prazo de entrega: {selectedSupplier.delivery_days} dias | Garantia: {selectedSupplier.warranty_days} dias
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Preço de Custo (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.cost_price || 0} 
                  onChange={e => setFormData({...formData, cost_price: parseFloat(e.target.value) || 0})} 
                  className="w-full rounded border border-sidebar-border bg-accent/5 p-2 text-sm text-foreground focus:border-primary" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Peso (gramas)</label>
                <input 
                  type="number" 
                  value={formData.weight_g || 0} 
                  onChange={e => setFormData({...formData, weight_g: parseInt(e.target.value) || 0})} 
                  className="w-full rounded border border-sidebar-border bg-accent/5 p-2 text-sm text-foreground focus:border-primary" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Dimensões</label>
                <input 
                  value={formData.dimensions || ""} 
                  onChange={e => setFormData({...formData, dimensions: e.target.value})} 
                  className="w-full rounded border border-sidebar-border bg-accent/5 p-2 text-sm text-foreground focus:border-primary"
                  placeholder="Ex: 30x20x10 cm"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Descrição interna</label>
                <textarea 
                  value={formData.description || ""} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  rows={4}
                  className="w-full rounded border border-sidebar-border bg-accent/5 p-2 text-sm text-foreground focus:border-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Perguntas frequentes</label>
                <textarea 
                  value={formData.common_questions || ""} 
                  onChange={e => setFormData({...formData, common_questions: e.target.value})} 
                  rows={3}
                  className="w-full rounded border border-sidebar-border bg-accent/5 p-2 text-sm text-foreground focus:border-primary resize-none"
                  placeholder="Liste as principais dúvidas dos compradores sobre este produto"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Notas internas</label>
                <textarea 
                  value={formData.notes || ""} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  rows={3}
                  className="w-full rounded border border-sidebar-border bg-accent/5 p-2 text-sm text-foreground focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${formData.is_active ? "bg-primary" : "bg-muted"}`} />
                  <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${formData.is_active ? "translate-x-5" : ""}`} />
                </div>
                <span className="text-sm font-medium text-foreground">Produto Ativo</span>
              </label>
            </div>
          </div>

          <div className="jtd-glass p-6 space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Tag size={18} className="text-primary" />
              Palavras-Chave do Produto
            </h3>

            <div className="flex flex-wrap gap-2 mb-4">
              {formData.keywords.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhuma palavra-chave adicionada.</p>
              ) : (
                formData.keywords.map((kw, i) => (
                  <span 
                    key={i} 
                    className="flex items-center gap-2 rounded bg-primary/15 border border-primary/40 px-3 py-1 text-sm font-medium text-primary transition-all hover:bg-primary/20"
                  >
                    {kw}
                    <button type="button" onClick={() => removeKeyword(kw)} className="text-primary/70 hover:text-primary">
                      <X size={14} />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input 
                type="text"
                value={newKeywordInput}
                onChange={e => setNewKeywordInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword(newKeywordInput), setNewKeywordInput(""))}
                className="flex-1 rounded border border-sidebar-border bg-accent/5 p-2 text-sm text-foreground focus:border-primary" 
                placeholder="Digitar palavra e apertar Enter..."
              />
              <button 
                type="button" 
                onClick={() => { addKeyword(newKeywordInput); setNewKeywordInput(""); }}
                className="bg-primary px-4 py-2 rounded font-bold text-black text-xs hover:brightness-110"
              >
                ADICIONAR
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => copyKeywords()} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors">
                <Copy size={12} /> Copiar Todas
              </button>
              <button type="button" onClick={() => { if(confirm("Limpar todas as palavras-chave?")) setFormData({...formData, keywords: []}) }} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-red-500 transition-colors">
                <Trash2 size={12} /> Limpar Todas
              </button>
            </div>
          </div>
        </div>

        {/* Coluna Direita (40%) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="jtd-glass p-6 space-y-4">
            <div>
              <h3 className="font-bold text-foreground">Análise de Concorrentes</h3>
              <p className="text-xs text-muted-foreground">Analise preços e extraia palavras-chave</p>
            </div>

            {/* Resumo de Preços */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-sidebar-border bg-accent/5 p-3 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-60">Mínimo</p>
                <p className="text-sm font-bold text-green-500">{minPrice ? `R$ ${minPrice.toFixed(2)}` : "—"}</p>
              </div>
              <div className="rounded-md border border-sidebar-border bg-accent/5 p-3 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-60">Médio</p>
                <p className="text-sm font-bold text-cyan-500">{avgPrice ? `R$ ${avgPrice.toFixed(2)}` : "—"}</p>
              </div>
              <div className="rounded-md border border-sidebar-border bg-accent/5 p-3 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-60">Máximo</p>
                <p className="text-sm font-bold text-magenta">{maxPrice ? `R$ ${maxPrice.toFixed(2)}` : "—"}</p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              {competitors.map((comp, idx) => (
                <div key={idx} className="jtd-glass border-sidebar-border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground">#{idx + 1}</span>
                    <button type="button" onClick={() => setCompetitors(competitors.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div>
                    <input 
                      value={comp.title} 
                      onChange={e => {
                        const newComps = [...competitors];
                        newComps[idx].title = e.target.value;
                        setCompetitors(newComps);
                      }}
                      className="w-full bg-transparent font-semibold text-foreground focus:outline-none" 
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-cyan-500 font-bold text-sm">R$ {comp.price.toFixed(2)}</span>
                      <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => setExpandedCompetitor(expandedCompetitor === idx ? null : idx)}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground"
                  >
                    {expandedCompetitor === idx ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    Ver Descrição
                  </button>

                  {expandedCompetitor === idx && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                      <textarea 
                        value={comp.description} 
                        onChange={e => {
                          const newComps = [...competitors];
                          newComps[idx].description = e.target.value;
                          setCompetitors(newComps);
                        }}
                        rows={3}
                        className="w-full bg-accent/5 border border-sidebar-border rounded p-2 text-xs text-muted-foreground resize-none focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="pt-2">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Palavras-chave</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {comp.keywords_found.map((kw, kIdx) => (
                        <span key={kIdx} className="bg-primary/10 px-1.5 py-0.5 rounded text-[10px] text-primary">
                          {kw}
                        </span>
                      ))}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setOpenPanels([...openPanels, idx])}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus size={10} /> Adicionar Palavras-chave
                    </button>
                  </div>
                </div>
              ))}

              {isAddingCompetitor ? (
                <div className="jtd-glass p-4 space-y-3 bg-accent/5">
                  <input 
                    placeholder="URL do anúncio" 
                    value={newCompetitor.url}
                    onChange={e => setNewCompetitor({...newCompetitor, url: e.target.value})}
                    className="w-full bg-transparent border-b border-sidebar-border p-1 text-sm text-foreground focus:outline-none focus:border-primary" 
                  />
                  <input 
                    placeholder="Título" 
                    value={newCompetitor.title}
                    onChange={e => setNewCompetitor({...newCompetitor, title: e.target.value})}
                    className="w-full bg-transparent border-b border-sidebar-border p-1 text-sm text-foreground focus:outline-none focus:border-primary" 
                  />
                  <div className="flex gap-2 items-center">
                    <span className="text-muted-foreground">R$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="Preço" 
                      value={newCompetitor.price || ""}
                      onChange={e => setNewCompetitor({...newCompetitor, price: parseFloat(e.target.value) || 0})}
                      className="w-full bg-transparent border-b border-sidebar-border p-1 text-sm text-foreground focus:outline-none focus:border-primary" 
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={handleAddCompetitor} className="flex-1 bg-primary py-2 rounded text-black text-[10px] font-bold">SALVAR</button>
                    <button type="button" onClick={() => setIsAddingCompetitor(false)} className="flex-1 border border-sidebar-border py-2 rounded text-muted-foreground text-[10px] font-bold">CANCELAR</button>
                  </div>
                </div>
              ) : (
                <button 
                  type="button" 
                  onClick={() => setIsAddingCompetitor(true)}
                  className="w-full border border-dashed border-sidebar-border py-4 rounded-md text-muted-foreground hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> ADICIONAR CONCORRENTE
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Resumo Final (Sticky bottom bar) */}
      <div className="fixed bottom-0 left-0 right-0 jtd-glass border-t border-sidebar-border bg-black/80 backdrop-blur-md p-4 z-40 transition-all">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-primary" />
              <span className="text-muted-foreground">Keywords:</span>
              <span className="font-bold text-foreground">{formData.keywords.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} className="text-cyan-500" />
              <span className="text-muted-foreground">Concorrentes:</span>
              <span className="font-bold text-foreground">{competitors.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-magenta" />
              <span className="text-muted-foreground">Faixa:</span>
              <span className="font-bold text-foreground">
                {minPrice ? `R$ ${minPrice.toFixed(2)} - R$ ${maxPrice.toFixed(2)}` : "—"}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate({ to: "/produtos" })} className="px-6 py-2 rounded font-bold text-muted-foreground text-sm hover:text-foreground">
              CANCELAR
            </button>
            <button 
              type="button" 
              onClick={handleSubmit} 
              disabled={saving} 
              className="flex items-center gap-2 bg-primary px-8 py-2.5 rounded font-bold text-black text-sm hover:brightness-110 active:scale-[0.98] transition-all"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              SALVAR PRODUTO
            </button>
          </div>
        </div>
      </div>

      {/* Painéis Flutuantes */}
      {openPanels.map((compIdx) => (
        <FloatingKeywordPanel
          key={`panel-${compIdx}`}
          title={`Concorrente #${compIdx + 1}`}
          keywords={competitors[compIdx].keywords_found}
          onClose={() => setOpenPanels(openPanels.filter(id => id !== compIdx))}
          onAddKeyword={(kw) => {
            const newComps = [...competitors];
            if (!newComps[compIdx].keywords_found.includes(kw)) {
              newComps[compIdx].keywords_found.push(kw);
              setCompetitors(newComps);
            }
          }}
          onRemoveKeyword={(kw) => {
            const newComps = [...competitors];
            newComps[compIdx].keywords_found = newComps[compIdx].keywords_found.filter(k => k !== kw);
            setCompetitors(newComps);
          }}
          onSendToProduct={(kws) => {
            const uniqueKeywords = Array.from(new Set([...formData.keywords, ...kws]));
            setFormData({ ...formData, keywords: uniqueKeywords });
            toast.success(`Palavras enviadas para o produto!`);
          }}
          initialX={200 + compIdx * 20}
          initialY={150 + compIdx * 20}
        />
      ))}

      {/* Painel Geral */}
      <button 
        type="button" 
        onClick={() => setShowGeneralPanel(!showGeneralPanel)}
        className="fixed bottom-24 right-8 z-50 flex items-center gap-2 rounded-full bg-primary p-4 font-bold text-black shadow-lg hover:scale-105 transition-all active:scale-95"
      >
        <Tag size={20} />
        {formData.keywords.length > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-magenta text-[10px] text-white ring-2 ring-black">{formData.keywords.length}</span>}
        <span className="hidden md:inline">PALAVRAS-CHAVE</span>
      </button>

      {showGeneralPanel && (
        <FloatingKeywordPanel
          title="Keywords do Produto"
          keywords={formData.keywords}
          isGeneral
          onClose={() => setShowGeneralPanel(false)}
          onAddKeyword={addKeyword}
          onRemoveKeyword={removeKeyword}
          initialX={window.innerWidth - 400}
          initialY={window.innerHeight - 500}
        />
      )}
    </div>
  );
}
