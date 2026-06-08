import { useState, useEffect, useRef } from "react";
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
  ExternalLink,
  DollarSign,
  Package,
  Users,
  Search,
  ClipboardList,
  Weight,
  Maximize
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

  // Auto-resize helper
  const adjustHeight = (e: React.ChangeEvent<HTMLTextAreaElement> | HTMLTextAreaElement) => {
    const target = 'target' in e ? e.target : e;
    target.style.height = 'auto';
    target.style.height = `${Math.max(80, target.scrollHeight)}px`;
  };

  useEffect(() => {
    fetchSuppliers();
    if (productId) fetchProduct();
  }, [productId]);

  // Initial auto-resize for existing content
  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        document.querySelectorAll('textarea').forEach(textarea => {
          adjustHeight(textarea);
        });
      }, 100);
    }
  }, [loading, competitors.length]);

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

  const handleAddCompetitor = () => {
    setCompetitors([...competitors, { ...newCompetitor }]);
    setNewCompetitor({ title: "", description: "", price: 0, url: "", keywords_found: [] });
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
    <div className="max-w-4xl mx-auto space-y-8 pb-40 animate-in fade-in duration-300">
      <button type="button" onClick={() => navigate({ to: "/produtos" })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Voltar para Produtos
      </button>

      {/* SEÇÃO 1 — INFORMAÇÕES BÁSICAS */}
      <section className="jtd-glass p-8 space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-xl text-foreground flex items-center gap-3 italic tracking-tighter uppercase">
            <Package size={24} className="text-primary" />
            Informações Básicas
          </h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer group">
              <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${formData.is_active ? "text-primary" : "text-muted-foreground"}`}>
                {formData.is_active ? "Produto Ativo" : "Produto Inativo"}
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="sr-only"
                />
                <div className={`w-10 h-5 rounded-full transition-all duration-300 ${formData.is_active ? "bg-primary shadow-[0_0_10px_rgba(191,255,0,0.5)]" : "bg-muted"}`} />
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${formData.is_active ? "translate-x-5" : ""}`} />
              </div>
            </label>
          </div>
        </div>

        <div className="space-y-6">
          <div className="w-full">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Nome do Produto</label>
            <input 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full rounded-none border-b-2 border-sidebar-border bg-transparent p-3 text-2xl font-black text-foreground focus:border-primary transition-all focus:outline-none placeholder:text-white/10 uppercase italic" 
              placeholder="NOME DO PRODUTO AQUI..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">SKU + Botão Gerar</label>
              <div className="flex gap-2">
                <input 
                  value={formData.sku} 
                  onChange={e => setFormData({...formData, sku: e.target.value})} 
                  className="flex-1 rounded border border-sidebar-border bg-accent/5 p-3 text-sm text-foreground focus:border-primary font-mono focus:outline-none" 
                  placeholder="EX: SKU-001" 
                />
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, sku: `PRD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`})} 
                  className="text-[10px] font-black bg-primary text-black hover:brightness-110 px-6 rounded transition-all whitespace-nowrap italic"
                >
                  GERAR
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categoria</label>
              <input 
                value={formData.category || ""} 
                onChange={e => setFormData({...formData, category: e.target.value})} 
                className="w-full rounded border border-sidebar-border bg-accent/5 p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                placeholder="Ex: Eletrônicos"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fornecedor Dropdown</label>
              <select 
                value={formData.supplier_id || ""} 
                onChange={e => setFormData({...formData, supplier_id: e.target.value})} 
                className="w-full rounded border border-sidebar-border bg-accent/5 p-3 text-sm text-foreground focus:border-primary focus:outline-none appearance-none cursor-pointer"
              >
                <option value="">Selecionar Fornecedor...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {selectedSupplier && (
                <div className="mt-2 animate-in slide-in-from-left-2 duration-300">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black bg-primary/10 text-primary border border-primary/40 uppercase italic tracking-widest">
                    <Truck size={12} className="mr-2" />
                    🚚 {selectedSupplier.delivery_days} DIAS ENTREGA • 🛡️ {selectedSupplier.warranty_days} DIAS GARANTIA
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preço de Custo</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.cost_price || 0} 
                  onChange={e => setFormData({...formData, cost_price: parseFloat(e.target.value) || 0})} 
                  className="w-full rounded border border-sidebar-border bg-accent/5 pl-8 p-3 text-sm text-foreground focus:border-primary focus:outline-none font-mono" 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Peso (gramas)</label>
              <div className="relative">
                <Weight size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="number" 
                  value={formData.weight_g || 0} 
                  onChange={e => setFormData({...formData, weight_g: parseInt(e.target.value) || 0})} 
                  className="w-full rounded border border-sidebar-border bg-accent/5 pl-8 p-3 text-sm text-foreground focus:border-primary focus:outline-none" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dimensões</label>
              <div className="relative">
                <Maximize size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  value={formData.dimensions || ""} 
                  onChange={e => setFormData({...formData, dimensions: e.target.value})} 
                  className="w-full rounded border border-sidebar-border bg-accent/5 pl-8 p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  placeholder="Ex: 30x20x10 cm"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2 — TEXTOS */}
      <section className="jtd-glass p-8 space-y-8">
        <h3 className="font-black text-xl text-foreground flex items-center gap-3 italic tracking-tighter uppercase">
          <ClipboardList size={24} className="text-primary" />
          Textos do Produto
        </h3>

        <div className="space-y-8">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descrição Interna</label>
            <textarea 
              value={formData.description || ""} 
              onChange={e => {
                setFormData({...formData, description: e.target.value});
                adjustHeight(e);
              }} 
              className="w-full rounded border border-sidebar-border bg-accent/5 p-4 text-sm text-foreground focus:border-primary resize-none focus:outline-none min-h-[80px] overflow-hidden transition-all duration-200"
              placeholder="Digite a descrição interna..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Perguntas Frequentes</label>
            <textarea 
              value={formData.common_questions || ""} 
              onChange={e => {
                setFormData({...formData, common_questions: e.target.value});
                adjustHeight(e);
              }} 
              className="w-full rounded border border-sidebar-border bg-accent/5 p-4 text-sm text-foreground focus:border-primary resize-none focus:outline-none min-h-[80px] overflow-hidden transition-all duration-200"
              placeholder="Liste as dúvidas frequentes..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Notas Internas</label>
            <textarea 
              value={formData.notes || ""} 
              onChange={e => {
                setFormData({...formData, notes: e.target.value});
                adjustHeight(e);
              }} 
              className="w-full rounded border border-sidebar-border bg-accent/5 p-4 text-sm text-foreground focus:border-primary resize-none focus:outline-none min-h-[80px] overflow-hidden transition-all duration-200"
              placeholder="Anotações importantes..."
            />
          </div>
        </div>
      </section>

      {/* SEÇÃO 3 — ANÁLISE DE CONCORRENTES */}
      <section className="jtd-glass p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h3 className="font-black text-xl text-foreground flex items-center gap-3 italic tracking-tighter uppercase">
            <Search size={24} className="text-primary" />
            Análise de Concorrentes
          </h3>

          <div className="flex items-center gap-2 bg-black/40 border border-sidebar-border rounded px-4 py-2 font-black text-[10px] tracking-widest italic">
            <span className="text-green-500">MIN: {minPrice ? `R$ ${minPrice.toFixed(2)}` : "—"}</span>
            <span className="text-white/20">|</span>
            <span className="text-cyan-500">MÉDIO: {avgPrice ? `R$ ${avgPrice.toFixed(2)}` : "—"}</span>
            <span className="text-white/20">|</span>
            <span className="text-magenta">MÁX: {maxPrice ? `R$ ${maxPrice.toFixed(2)}` : "—"}</span>
          </div>
        </div>

        <div className="space-y-6">
          {competitors.map((comp, idx) => (
            <div key={idx} className="jtd-glass bg-white/5 border-sidebar-border/50 p-6 space-y-6 relative group animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-primary italic">#{idx + 1}</span>
                <button 
                  type="button" 
                  onClick={() => setCompetitors(competitors.filter((_, i) => i !== idx))} 
                  className="p-2 text-muted-foreground hover:text-red-500 transition-colors bg-white/5 rounded"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Título</label>
                  <textarea 
                    value={comp.title} 
                    onChange={e => {
                      updateCompetitor(idx, 'title', e.target.value);
                      adjustHeight(e);
                    }}
                    className="w-full bg-transparent border-b border-sidebar-border focus:border-primary p-0 py-2 text-lg font-black text-foreground focus:outline-none resize-none overflow-hidden" 
                    placeholder="TÍTULO DO ANÚNCIO..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descrição</label>
                  <textarea 
                    value={comp.description} 
                    onChange={e => {
                      updateCompetitor(idx, 'description', e.target.value);
                      adjustHeight(e);
                    }}
                    className="w-full bg-transparent border-b border-sidebar-border focus:border-primary p-0 py-2 text-sm text-muted-foreground focus:outline-none resize-none overflow-hidden" 
                    placeholder="DESCRIÇÃO DO CONCORRENTE..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preço</label>
                    <div className="relative">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-cyan-500 font-black italic">R$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        value={comp.price || ""}
                        onChange={e => updateCompetitor(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent border-b border-sidebar-border focus:border-primary pl-8 py-2 text-xl font-black text-cyan-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">URL</label>
                    <div className="flex gap-2 items-center">
                      <input 
                        value={comp.url} 
                        onChange={e => updateCompetitor(idx, 'url', e.target.value)}
                        className="flex-1 bg-transparent border-b border-sidebar-border focus:border-primary py-2 text-xs text-muted-foreground focus:outline-none truncate" 
                        placeholder="https://..."
                      />
                      <a href={comp.url} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-sidebar-border/30">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Palavras-Chave Deste Concorrente</label>
                  <div className="flex flex-wrap gap-2">
                    {comp.keywords_found.map((kw, kIdx) => (
                      <span key={kIdx} className="bg-primary/10 border border-primary/40 px-3 py-1 rounded text-[10px] font-black text-primary uppercase italic tracking-tighter">
                        {kw}
                      </span>
                    ))}
                    <button 
                      type="button" 
                      onClick={() => setOpenPanels([...openPanels, idx])}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 hover:bg-white/10 border border-sidebar-border text-[10px] font-black text-white/60 transition-all italic uppercase"
                    >
                      <Plus size={10} /> ADICIONAR
                    </button>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      const uniqueKeywords = Array.from(new Set([...formData.keywords, ...comp.keywords_found]));
                      setFormData({ ...formData, keywords: uniqueKeywords });
                      toast.success(`Keywords enviadas para o produto!`);
                    }}
                    className="text-[10px] font-black text-primary hover:underline uppercase italic tracking-widest"
                  >
                    [ ENVIAR TODAS PARA O PRODUTO ]
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button 
            type="button" 
            onClick={handleAddCompetitor}
            className="w-full border-2 border-dashed border-sidebar-border py-8 rounded flex items-center justify-center gap-3 text-muted-foreground hover:border-primary/50 hover:text-primary transition-all group bg-white/2"
          >
            <Plus size={24} className="group-hover:scale-125 transition-transform" />
            <span className="font-black italic uppercase tracking-[0.2em] text-sm">ADICIONAR CONCORRENTE</span>
          </button>
        </div>
      </section>

      {/* SEÇÃO 4 — PALAVRAS-CHAVE DO PRODUTO */}
      <section className="jtd-glass p-8 space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-xl text-foreground flex items-center gap-3 italic tracking-tighter uppercase">
            <Tag size={24} className="text-primary" />
            Palavras-Chave do Produto
          </h3>
          <span className="bg-primary/20 text-primary text-[10px] font-black px-3 py-1 rounded-full border border-primary/40 italic uppercase tracking-widest">
            {formData.keywords.length} PALAVRAS-CHAVE
          </span>
        </div>

        <div className="flex flex-wrap gap-3 min-h-[40px]">
          {formData.keywords.length === 0 ? (
            <p className="text-xs text-muted-foreground italic opacity-50">Nenhuma palavra-chave adicionada ao produto ainda.</p>
          ) : (
            formData.keywords.map((kw, i) => (
              <span 
                key={i} 
                className="flex items-center gap-2 rounded bg-primary/10 border border-primary/40 px-3 py-1.5 text-xs font-black text-primary transition-all hover:bg-primary/20 italic uppercase tracking-tighter"
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
            className="flex-1 rounded border border-sidebar-border bg-accent/5 p-4 text-sm text-foreground focus:border-primary focus:outline-none uppercase font-black italic tracking-widest" 
            placeholder="DIGITAR PALAVRA..."
          />
          <button 
            type="button" 
            onClick={() => { addKeyword(newKeywordInput); setNewKeywordInput(""); }}
            className="bg-primary px-8 rounded font-black text-black text-xs hover:brightness-110 transition-all italic tracking-widest"
          >
            ADICIONAR
          </button>
        </div>

        <div className="flex gap-8 pt-4 border-t border-sidebar-border/30">
          <button type="button" onClick={copyKeywords} className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors italic">
            [ COPIAR TODAS ]
          </button>
          <button type="button" onClick={() => { if(confirm("Limpar todas as palavras-chave?")) setFormData({...formData, keywords: []}) }} className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-red-500 transition-colors italic">
            [ LIMPAR TODAS ]
          </button>
        </div>
      </section>

      {/* RODAPÉ FIXO */}
      <footer className="fixed bottom-0 left-0 right-0 jtd-glass border-t border-sidebar-border bg-black/90 backdrop-blur-xl p-4 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap gap-8 text-[10px] font-black tracking-[0.15em] uppercase italic">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-primary" />
              <span className="text-muted-foreground">Keywords:</span>
              <span className="text-primary">{formData.keywords.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} className="text-cyan-500" />
              <span className="text-muted-foreground">Concorrentes:</span>
              <span className="text-cyan-500">{competitors.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-magenta" />
              <span className="text-muted-foreground">Faixa:</span>
              <span className="text-magenta">
                {minPrice ? `R$ ${minPrice.toFixed(2)} - R$ ${maxPrice.toFixed(2)}` : "—"}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate({ to: "/produtos" })} className="px-8 py-3 rounded font-black text-muted-foreground text-xs hover:text-white transition-all italic tracking-widest">
              CANCELAR
            </button>
            <button 
              type="button" 
              onClick={() => handleSubmit()} 
              disabled={saving} 
              className="flex items-center gap-3 bg-primary px-12 py-3 rounded font-black text-black text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(191,255,0,0.4)] italic uppercase tracking-tighter"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              SALVAR PRODUTO
            </button>
          </div>
        </div>
      </footer>

      {/* Botão Flutuante Palavras-Chave */}
      <button 
        type="button" 
        onClick={() => setShowGeneralPanel(!showGeneralPanel)}
        className="fixed bottom-28 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-black shadow-[0_0_25px_rgba(191,255,0,0.6)] hover:scale-110 transition-all active:scale-90 border-2 border-white/20"
      >
        <Tag size={28} />
        <span className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-magenta text-[10px] font-black text-white ring-2 ring-black shadow-lg">
          {formData.keywords.length}
        </span>
        <div className="absolute -bottom-6 text-[8px] font-black tracking-widest text-primary bg-black/60 px-2 py-0.5 rounded italic">KEYWORDS</div>
      </button>

      {/* Painéis Flutuantes Arrastáveis */}
      {openPanels.map((compIdx) => (
        <FloatingKeywordPanel
          key={`panel-${compIdx}`}
          title={`CONCORRENTE #${compIdx + 1}`}
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
            toast.success(`Keywords enviadas para o produto!`);
          }}
          initialX={100 + compIdx * 30}
          initialY={100 + compIdx * 30}
        />
      ))}

      {showGeneralPanel && (
        <FloatingKeywordPanel
          title="KEYWORDS DO PRODUTO"
          keywords={formData.keywords}
          isGeneral
          onClose={() => setShowGeneralPanel(false)}
          onAddKeyword={addKeyword}
          onRemoveKeyword={removeKeyword}
          initialX={window.innerWidth - 450}
          initialY={window.innerHeight - 600}
        />
      )}
    </div>
  );
}
