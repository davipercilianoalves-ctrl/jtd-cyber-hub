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
  Users,
  Search,
  MessageSquare,
  ClipboardList
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
  const [expandedCompetitors, setExpandedCompetitors] = useState<number[]>([]);
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

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
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

      if (savedProductId) {
        await supabase.from("product_competitors").delete().eq("product_id", savedProductId);
        if (competitors.length > 0) {
          const competitorsToSave = competitors.map(c => ({
            ...c,
            product_id: savedProductId,
            id: undefined 
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

  const copyKeywords = () => {
    const text = formData.keywords.join(", ");
    navigator.clipboard.writeText(text);
    toast.success("Palavras-chave copiadas!");
  };

  const toggleCompetitorExpansion = (idx: number) => {
    setExpandedCompetitors(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleAddCompetitor = () => {
    if (!newCompetitor.url) {
      toast.error("Informe a URL do concorrente.");
      return;
    }
    setCompetitors([...competitors, newCompetitor]);
    setNewCompetitor({ title: "", description: "", price: 0, url: "", keywords_found: [] });
    setIsAddingCompetitor(false);
  };

  const updateCompetitor = (idx: number, field: keyof Competitor, value: any) => {
    const newComps = [...competitors];
    (newComps[idx] as any)[field] = value;
    setCompetitors(newComps);
  };

  // Price calculations
  const prices = competitors.map(c => c.price).filter(p => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 size={32} className="animate-spin text-primary" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-32 animate-in fade-in duration-300">
      <button type="button" onClick={() => navigate({ to: "/produtos" })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Voltar para Produtos
      </button>

      {/* BLOCO 1 — Informações Básicas */}
      <div className="jtd-glass p-6 relative">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Package size={18} className="text-primary" />
            Informações Básicas
          </h3>
          
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                {formData.is_active ? "Ativo" : "Inativo"}
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="sr-only"
                />
                <div className={`w-8 h-4 rounded-full transition-colors ${formData.is_active ? "bg-primary" : "bg-muted"}`} />
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${formData.is_active ? "translate-x-4" : ""}`} />
              </div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Nome do Produto*</label>
            <input 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full rounded border border-sidebar-border bg-accent/5 p-3 text-lg font-semibold text-foreground focus:border-primary transition-colors focus:outline-none" 
              placeholder="Ex: Smartwatch Pro Max X"
            />
          </div>

          <div className="col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">SKU</label>
            <div className="flex gap-2">
              <input 
                value={formData.sku} 
                onChange={e => setFormData({...formData, sku: e.target.value})} 
                className="w-full rounded border border-sidebar-border bg-accent/5 p-2.5 text-sm text-foreground focus:border-primary font-mono focus:outline-none" 
                placeholder="Ex: PRD-001" 
              />
              <button 
                type="button" 
                onClick={() => setFormData({...formData, sku: `PRD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`})} 
                className="text-[10px] font-bold bg-accent/10 hover:bg-accent/20 px-3 rounded border border-sidebar-border transition-colors whitespace-nowrap"
              >
                GERAR
              </button>
            </div>
          </div>

          <div className="col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Categoria</label>
            <input 
              value={formData.category || ""} 
              onChange={e => setFormData({...formData, category: e.target.value})} 
              className="w-full rounded border border-sidebar-border bg-accent/5 p-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              placeholder="Ex: Eletrônicos"
            />
          </div>

          <div className="col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Fornecedor</label>
            <select 
              value={formData.supplier_id || ""} 
              onChange={e => setFormData({...formData, supplier_id: e.target.value})} 
              className="w-full rounded border border-sidebar-border bg-accent/5 p-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Selecionar...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {selectedSupplier && (
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                  <Truck size={10} className="mr-1" />
                  {selectedSupplier.delivery_days} dias entrega  •  🛡️ {selectedSupplier.warranty_days} dias garantia
                </span>
              </div>
            )}
          </div>

          <div className="col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Preço de Custo (R$)</label>
            <div className="relative">
              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="number" 
                step="0.01" 
                value={formData.cost_price || 0} 
                onChange={e => setFormData({...formData, cost_price: parseFloat(e.target.value) || 0})} 
                className="w-full rounded border border-sidebar-border bg-accent/5 pl-8 p-2.5 text-sm text-foreground focus:border-primary focus:outline-none" 
              />
            </div>
          </div>

          <div className="col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Peso (gramas)</label>
            <input 
              type="number" 
              value={formData.weight_g || 0} 
              onChange={e => setFormData({...formData, weight_g: parseInt(e.target.value) || 0})} 
              className="w-full rounded border border-sidebar-border bg-accent/5 p-2.5 text-sm text-foreground focus:border-primary focus:outline-none" 
            />
          </div>

          <div className="col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Dimensões</label>
            <input 
              value={formData.dimensions || ""} 
              onChange={e => setFormData({...formData, dimensions: e.target.value})} 
              className="w-full rounded border border-sidebar-border bg-accent/5 p-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              placeholder="Ex: 30x20x10 cm"
            />
          </div>
        </div>
      </div>

      {/* BLOCO 2 — Textos do Produto */}
      <div className="jtd-glass p-6">
        <h3 className="font-bold text-foreground flex items-center gap-2 mb-6">
          <ClipboardList size={18} className="text-primary" />
          Textos do Produto
        </h3>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Descrição Interna</label>
            <textarea 
              value={formData.description || ""} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              rows={5}
              className="w-full rounded border border-sidebar-border bg-accent/5 p-3 text-sm text-foreground focus:border-primary resize-none focus:outline-none"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Perguntas Frequentes</label>
            <textarea 
              value={formData.common_questions || ""} 
              onChange={e => setFormData({...formData, common_questions: e.target.value})} 
              rows={5}
              className="w-full rounded border border-sidebar-border bg-accent/5 p-3 text-sm text-foreground focus:border-primary resize-none focus:outline-none"
              placeholder="Liste as principais dúvidas..."
            />
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Notas Internas</label>
            <textarea 
              value={formData.notes || ""} 
              onChange={e => setFormData({...formData, notes: e.target.value})} 
              rows={5}
              className="w-full rounded border border-sidebar-border bg-accent/5 p-3 text-sm text-foreground focus:border-primary resize-none focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* BLOCO 3 — Análise de Concorrentes */}
      <div className="jtd-glass p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Search size={18} className="text-primary" />
              Análise de Concorrentes
            </h3>
            <p className="text-xs text-muted-foreground">Analise preços e extraia keywords</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-black/20 border border-sidebar-border rounded-lg px-4 py-2 flex items-center gap-4">
              <div className="text-center">
                <span className="block text-[10px] font-bold uppercase text-green-500">MIN</span>
                <span className="text-sm font-bold text-foreground">{minPrice ? `R$ ${minPrice.toFixed(2)}` : "—"}</span>
              </div>
              <div className="h-8 w-px bg-sidebar-border" />
              <div className="text-center">
                <span className="block text-[10px] font-bold uppercase text-cyan-500">MED</span>
                <span className="text-sm font-bold text-foreground">{avgPrice ? `R$ ${avgPrice.toFixed(2)}` : "—"}</span>
              </div>
              <div className="h-8 w-px bg-sidebar-border" />
              <div className="text-center">
                <span className="block text-[10px] font-bold uppercase text-magenta">MAX</span>
                <span className="text-sm font-bold text-foreground">{maxPrice ? `R$ ${maxPrice.toFixed(2)}` : "—"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {competitors.map((comp, idx) => (
            <div key={idx} className="jtd-glass border-sidebar-border/50 bg-accent/5 p-5 space-y-4 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-muted-foreground bg-accent/10 px-1.5 py-0.5 rounded">#{idx + 1}</span>
                    <input 
                      value={comp.title} 
                      onChange={e => updateCompetitor(idx, 'title', e.target.value)}
                      className="flex-1 bg-transparent font-bold text-foreground text-base focus:outline-none border-none p-0" 
                      placeholder="Título do anúncio..."
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-9">
                    <ExternalLink size={12} className="text-muted-foreground" />
                    <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-2 hover:underline truncate max-w-md">
                      {comp.url}
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-cyan-500 font-black text-xl">R$</span>
                      <input 
                        type="number" 
                        value={comp.price || ""}
                        onChange={e => updateCompetitor(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-transparent text-cyan-500 font-black text-xl focus:outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => setCompetitors(competitors.filter((_, i) => i !== idx))} 
                      className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => toggleCompetitorExpansion(idx)}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expandedCompetitors.includes(idx) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              {expandedCompetitors.includes(idx) && (
                <div className="animate-in slide-in-from-top-2 duration-200 mt-2 border-t border-sidebar-border pt-4">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Descrição do Concorrente</label>
                  <textarea 
                    value={comp.description} 
                    onChange={e => updateCompetitor(idx, 'description', e.target.value)}
                    rows={4}
                    className="w-full bg-accent/5 border border-sidebar-border rounded p-3 text-sm text-muted-foreground resize-none focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-sidebar-border/30">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Keywords:</span>
                  {comp.keywords_found.map((kw, kIdx) => (
                    <span key={kIdx} className="bg-primary/10 border border-primary/30 px-2 py-0.5 rounded text-[10px] font-bold text-primary">
                      {kw}
                    </span>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => setOpenPanels([...openPanels, idx])}
                    className="ml-2 flex items-center gap-1.5 px-3 py-1 rounded bg-primary/5 hover:bg-primary/15 border border-primary/20 text-[10px] font-bold text-primary transition-all"
                  >
                    <Plus size={10} /> ADICIONAR PALAVRAS-CHAVE
                  </button>
                </div>
              </div>
            </div>
          ))}

          {isAddingCompetitor ? (
            <div className="jtd-glass p-6 space-y-4 bg-accent/10 border-primary/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">URL do Anúncio*</label>
                  <input 
                    placeholder="https://..." 
                    value={newCompetitor.url}
                    onChange={e => setNewCompetitor({...newCompetitor, url: e.target.value})}
                    className="w-full bg-accent/5 border border-sidebar-border rounded p-2.5 text-sm text-foreground focus:outline-none focus:border-primary" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Título</label>
                  <input 
                    placeholder="Nome do produto no concorrente" 
                    value={newCompetitor.title}
                    onChange={e => setNewCompetitor({...newCompetitor, title: e.target.value})}
                    className="w-full bg-accent/5 border border-sidebar-border rounded p-2.5 text-sm text-foreground focus:outline-none focus:border-primary" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Preço (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    value={newCompetitor.price || ""}
                    onChange={e => setNewCompetitor({...newCompetitor, price: parseFloat(e.target.value) || 0})}
                    className="w-full bg-accent/5 border border-sidebar-border rounded p-2.5 text-sm text-foreground focus:outline-none focus:border-primary" 
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleAddCompetitor} className="flex-1 bg-primary py-2.5 rounded font-bold text-black text-xs hover:brightness-110">SALVAR CONCORRENTE</button>
                <button type="button" onClick={() => setIsAddingCompetitor(false)} className="flex-1 border border-sidebar-border py-2.5 rounded font-bold text-muted-foreground text-xs hover:text-foreground">CANCELAR</button>
              </div>
            </div>
          ) : (
            <button 
              type="button" 
              onClick={() => setIsAddingCompetitor(true)}
              className="w-full border-2 border-dashed border-sidebar-border py-6 rounded-lg text-muted-foreground hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2 group"
            >
              <Plus size={20} className="group-hover:scale-110 transition-transform" />
              <span className="font-bold tracking-widest text-sm">ADICIONAR CONCORRENTE</span>
            </button>
          )}
        </div>
      </div>

      {/* BLOCO 4 — Palavras-Chave do Produto */}
      <div className="jtd-glass p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Tag size={18} className="text-primary" />
            Palavras-Chave do Produto
            <span className="ml-2 bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full border border-primary/30">
              {formData.keywords.length}
            </span>
          </h3>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 min-h-[40px]">
          {formData.keywords.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhuma palavra-chave adicionada.</p>
          ) : (
            formData.keywords.map((kw, i) => (
              <span 
                key={i} 
                className="flex items-center gap-2 rounded bg-primary/10 border border-primary/40 px-3 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary/20"
              >
                {kw}
                <button type="button" onClick={() => removeKeyword(kw)} className="text-primary/70 hover:text-primary">
                  <X size={14} />
                </button>
              </span>
            ))
          )}
        </div>

        <div className="flex gap-2 max-w-2xl">
          <input 
            type="text"
            value={newKeywordInput}
            onChange={e => setNewKeywordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword(newKeywordInput), setNewKeywordInput(""))}
            className="flex-1 rounded border border-sidebar-border bg-accent/5 p-3 text-sm text-foreground focus:border-primary focus:outline-none" 
            placeholder="Digitar palavra e apertar Enter..."
          />
          <button 
            type="button" 
            onClick={() => { addKeyword(newKeywordInput); setNewKeywordInput(""); }}
            className="bg-primary px-6 py-2 rounded font-black text-black text-xs hover:brightness-110 transition-all active:scale-[0.98]"
          >
            ADICIONAR
          </button>
        </div>

        <div className="flex gap-6 mt-6 border-t border-sidebar-border/30 pt-4">
          <button type="button" onClick={copyKeywords} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
            <Copy size={12} /> Copiar Todas
          </button>
          <button type="button" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
            <ClipboardList size={12} /> Copiar Selecionadas
          </button>
          <button type="button" onClick={() => { if(confirm("Limpar todas as palavras-chave?")) setFormData({...formData, keywords: []}) }} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 size={12} /> Limpar Todas
          </button>
        </div>
      </div>

      {/* Resumo Final (Sticky bottom bar) */}
      <div className="fixed bottom-0 left-0 right-0 jtd-glass border-t border-sidebar-border bg-black/80 backdrop-blur-md p-4 z-40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap gap-6 text-[10px] font-bold tracking-wider uppercase">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-primary" />
              <span className="text-muted-foreground">Keywords:</span>
              <span className="text-foreground">{formData.keywords.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} className="text-cyan-500" />
              <span className="text-muted-foreground">Concorrentes:</span>
              <span className="text-foreground">{competitors.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-magenta" />
              <span className="text-muted-foreground">Preços:</span>
              <span className="text-foreground">
                {minPrice ? `R$ ${minPrice.toFixed(2)} - R$ ${maxPrice.toFixed(2)}` : "—"}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate({ to: "/produtos" })} className="px-6 py-2 rounded font-bold text-muted-foreground text-xs hover:text-foreground tracking-widest">
              CANCELAR
            </button>
            <button 
              type="button" 
              onClick={() => handleSubmit()} 
              disabled={saving} 
              className="flex items-center gap-2 bg-primary px-10 py-3 rounded-lg font-black text-black text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(191,255,0,0.3)]"
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

      {/* Botão Flutuante Palavras-Chave */}
      <button 
        type="button" 
        onClick={() => setShowGeneralPanel(!showGeneralPanel)}
        className="fixed bottom-24 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-black shadow-[0_0_20px_rgba(191,255,0,0.5)] hover:scale-110 transition-all active:scale-90"
      >
        <Tag size={24} />
        {formData.keywords.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-magenta text-[10px] font-bold text-white ring-2 ring-black animate-in zoom-in duration-300">
            {formData.keywords.length}
          </span>
        )}
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
