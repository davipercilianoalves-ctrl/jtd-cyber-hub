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
  Trash2, 
  ExternalLink,
  DollarSign,
  Package,
  Search,
  FileText,
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

  // AUTO-RESIZE OBRIGATÓRIO
  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement> | HTMLTextAreaElement) {
    const target = 'target' in e ? e.target : e;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  }

  const textareaStyle: React.CSSProperties = { 
    minHeight: '80px', 
    overflow: 'hidden', 
    resize: 'none' 
  };

  const titleTextareaStyle: React.CSSProperties = { 
    minHeight: '48px', 
    overflow: 'hidden', 
    resize: 'none' 
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
          autoResize(textarea);
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

  const handleAddCompetitor = () => {
    setCompetitors([...competitors, { 
      title: "", 
      description: "", 
      price: 0, 
      url: "", 
      keywords_found: [] 
    }]);
  };

  const updateCompetitor = (idx: number, field: keyof Competitor, value: any) => {
    const newComps = [...competitors];
    (newComps[idx] as any)[field] = value;
    setCompetitors(newComps);
  };

  // Price calculations
  const pricesArr = competitors.map(c => c.price).filter(p => p > 0);
  const minPrice = pricesArr.length ? Math.min(...pricesArr) : 0;
  const maxPrice = pricesArr.length ? Math.max(...pricesArr) : 0;
  const avgPrice = pricesArr.length ? pricesArr.reduce((a, b) => a + b, 0) / pricesArr.length : 0;

  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 size={32} className="animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-40 animate-in fade-in duration-300">
      
      {/* BLOCO 0 — Navegação */}
      <button 
        type="button" 
        onClick={() => navigate({ to: "/produtos" })} 
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} /> Voltar para Produtos
      </button>

      {/* BLOCO 1 — Informações Básicas */}
      <section className="jtd-glass p-6 space-y-6">
        <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
          <Package size={20} className="text-primary" />
          Informações Básicas
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome do Produto*</label>
            <input 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full rounded border border-sidebar-border bg-black/20 p-3 text-sm focus:border-primary focus:outline-none transition-all" 
              placeholder="Ex: Teclado Mecânico RGB"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">SKU</label>
            <div className="flex gap-2">
              <input 
                value={formData.sku} 
                onChange={e => setFormData({...formData, sku: e.target.value})} 
                className="flex-1 rounded border border-sidebar-border bg-black/20 p-3 text-sm focus:border-primary focus:outline-none font-mono" 
                placeholder="SKU-001" 
              />
              <button 
                type="button" 
                onClick={() => setFormData({...formData, sku: `PRD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`})} 
                className="bg-primary text-black font-bold px-4 rounded text-xs hover:brightness-110 transition-all uppercase"
              >
                GERAR
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Categoria</label>
            <input 
              value={formData.category || ""} 
              onChange={e => setFormData({...formData, category: e.target.value})} 
              className="w-full rounded border border-sidebar-border bg-black/20 p-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Ex: Eletrônicos"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Fornecedor</label>
            <select 
              value={formData.supplier_id || ""} 
              onChange={e => setFormData({...formData, supplier_id: e.target.value})} 
              className="w-full rounded border border-sidebar-border bg-black/20 p-3 text-sm focus:border-primary focus:outline-none appearance-none cursor-pointer"
            >
              <option value="">Selecionar Fornecedor...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {selectedSupplier && (
              <div className="mt-1 text-[10px] font-bold text-primary animate-in fade-in">
                🚚 {selectedSupplier.delivery_days} dias entrega • 🛡️ {selectedSupplier.warranty_days} dias garantia
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Preço de Custo (R$)</label>
            <div className="relative">
              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="number" 
                step="0.01" 
                value={formData.cost_price || 0} 
                onChange={e => setFormData({...formData, cost_price: parseFloat(e.target.value) || 0})} 
                className="w-full rounded border border-sidebar-border bg-black/20 pl-8 p-3 text-sm focus:border-primary focus:outline-none font-mono" 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Peso (gramas)</label>
            <input 
              type="number" 
              value={formData.weight_g || 0} 
              onChange={e => setFormData({...formData, weight_g: parseInt(e.target.value) || 0})} 
              className="w-full rounded border border-sidebar-border bg-black/20 p-3 text-sm focus:border-primary focus:outline-none font-mono" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Dimensões</label>
            <input 
              value={formData.dimensions || ""} 
              onChange={e => setFormData({...formData, dimensions: e.target.value})} 
              className="w-full rounded border border-sidebar-border bg-black/20 p-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Ex: 30x20x10 cm"
            />
          </div>

          <div className="col-span-2 flex items-center justify-between py-2 border-t border-sidebar-border/30 mt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status do Produto</label>
            <label className="flex items-center gap-3 cursor-pointer">
              <span className={`text-[10px] font-black uppercase ${formData.is_active ? "text-primary" : "text-muted-foreground"}`}>
                {formData.is_active ? "Ativo" : "Inativo"}
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="sr-only"
                />
                <div className={`w-10 h-5 rounded-full transition-all duration-300 ${formData.is_active ? "bg-primary" : "bg-muted"}`} />
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${formData.is_active ? "translate-x-5" : ""}`} />
              </div>
            </label>
          </div>
        </div>
      </section>

      {/* BLOCO 2 — Textos do Produto */}
      <section className="jtd-glass p-6 space-y-6">
        <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
          <FileText size={20} className="text-primary" />
          Textos do Produto
        </h3>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Descrição Interna</label>
            <textarea 
              value={formData.description || ""} 
              onChange={e => {
                setFormData({...formData, description: e.target.value});
                autoResize(e);
              }} 
              style={textareaStyle}
              className="w-full rounded border border-sidebar-border bg-black/20 p-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Digite a descrição interna completa do produto..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Perguntas Frequentes</label>
            <textarea 
              value={formData.common_questions || ""} 
              onChange={e => {
                setFormData({...formData, common_questions: e.target.value});
                autoResize(e);
              }} 
              style={textareaStyle}
              className="w-full rounded border border-sidebar-border bg-black/20 p-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Liste as principais dúvidas dos compradores"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Notas Internas</label>
            <textarea 
              value={formData.notes || ""} 
              onChange={e => {
                setFormData({...formData, notes: e.target.value});
                autoResize(e);
              }} 
              style={textareaStyle}
              className="w-full rounded border border-sidebar-border bg-black/20 p-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Anotações de uso exclusivo da equipe..."
            />
          </div>
        </div>
      </section>

      {/* BLOCO 3 — Análise de Concorrentes */}
      <section className="jtd-glass p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg text-foreground">Análise de Concorrentes</h3>
            <p className="text-muted-foreground text-xs">Analise preços e extraia palavras-chave</p>
          </div>
          <div className="flex gap-2">
            <div className="bg-green-500/10 text-green-400 border border-green-500/20 rounded px-2 py-1 text-xs font-bold">
              MIN {minPrice ? `R$${minPrice.toFixed(2)}` : "—"}
            </div>
            <div className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded px-2 py-1 text-xs font-bold">
              MÉD {avgPrice ? `R$${avgPrice.toFixed(2)}` : "—"}
            </div>
            <div className="bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded px-2 py-1 text-xs font-bold">
              MÁX {maxPrice ? `R$${maxPrice.toFixed(2)}` : "—"}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {competitors.map((comp, idx) => (
            <div key={idx} className="border border-sidebar-border rounded-lg p-4 space-y-3 relative">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black text-primary">#{idx + 1}</span>
                <button 
                  type="button" 
                  onClick={() => setCompetitors(competitors.filter((_, i) => i !== idx))} 
                  className="text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">TÍTULO *</label>
                <textarea 
                  value={comp.title} 
                  onChange={e => {
                    updateCompetitor(idx, 'title', e.target.value);
                    autoResize(e);
                  }}
                  style={titleTextareaStyle}
                  className="w-full bg-black/20 border border-sidebar-border rounded p-2 text-sm focus:border-primary focus:outline-none" 
                  placeholder="Título do anúncio do concorrente..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">DESCRIÇÃO</label>
                <textarea 
                  value={comp.description} 
                  onChange={e => {
                    updateCompetitor(idx, 'description', e.target.value);
                    autoResize(e);
                  }}
                  style={textareaStyle}
                  className="w-full bg-black/20 border border-sidebar-border rounded p-2 text-sm focus:border-primary focus:outline-none" 
                  placeholder="Descrição completa do concorrente..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">PREÇO (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={comp.price || ""}
                    onChange={e => updateCompetitor(idx, 'price', parseFloat(e.target.value) || 0)}
                    className="w-full bg-black/20 border border-sidebar-border rounded p-2 text-sm focus:border-primary focus:outline-none font-mono" 
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">URL DO ANÚNCIO</label>
                  <div className="flex gap-2">
                    <input 
                      value={comp.url} 
                      onChange={e => updateCompetitor(idx, 'url', e.target.value)}
                      className="flex-1 bg-black/20 border border-sidebar-border rounded p-2 text-sm focus:border-primary focus:outline-none truncate" 
                      placeholder="https://..."
                    />
                    <a href={comp.url} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:text-primary transition-colors">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-sidebar-border/30">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Palavras-chave deste concorrente</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {comp.keywords_found.map((kw, kIdx) => (
                    <span key={kIdx} className="bg-primary/10 border border-primary/40 px-2 py-1 rounded text-[10px] font-bold text-primary">
                      {kw}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <button 
                    type="button" 
                    onClick={() => setOpenPanels([...openPanels, idx])}
                    className="text-[10px] font-black text-white/60 hover:text-primary transition-all flex items-center gap-1.5 uppercase italic"
                  >
                    <Plus size={12} /> Adicionar Palavras-chave
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      const uniqueKeywords = Array.from(new Set([...formData.keywords, ...comp.keywords_found]));
                      setFormData({ ...formData, keywords: uniqueKeywords });
                      toast.success(`Keywords enviadas para o produto!`);
                    }}
                    className="text-[10px] font-black text-primary hover:underline flex items-center gap-1 uppercase italic"
                  >
                    Enviar todas para o produto →
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button 
            type="button" 
            onClick={handleAddCompetitor}
            className="w-full border-2 border-dashed border-sidebar-border rounded-lg py-4 text-muted-foreground hover:border-primary/50 hover:text-primary flex items-center justify-center gap-2 transition-all group bg-black/5"
          >
            <Plus size={20} className="group-hover:scale-110 transition-transform" />
            <span className="font-bold text-xs uppercase tracking-widest">ADICIONAR CONCORRENTE</span>
          </button>
        </div>
      </section>

      {/* BLOCO 4 — Palavras-Chave do Produto */}
      <section className="jtd-glass p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-lg text-foreground">Palavras-Chave</h3>
            <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full border border-primary/40">
              {formData.keywords.length}
            </span>
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={() => {
              const text = formData.keywords.join(", ");
              navigator.clipboard.writeText(text);
              toast.success("Palavras-chave copiadas!");
            }} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
              Copiar Todas
            </button>
            <button type="button" onClick={() => { if(confirm("Limpar todas as palavras-chave?")) setFormData({...formData, keywords: []}) }} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-red-500 transition-colors">
              Limpar Todas
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {formData.keywords.map((kw, i) => (
            <span 
              key={i} 
              className="bg-primary/12 border border-primary/40 text-primary rounded px-3 py-1 text-sm flex items-center gap-2 font-medium"
            >
              {kw}
              <button type="button" onClick={() => removeKeyword(kw)} className="text-primary/70 hover:text-primary">
                <X size={14} />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input 
            type="text"
            value={newKeywordInput}
            onChange={e => setNewKeywordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword(newKeywordInput), setNewKeywordInput(""))}
            className="flex-1 rounded border border-sidebar-border bg-black/20 p-3 text-sm focus:border-primary focus:outline-none" 
            placeholder="Adicionar nova palavra-chave..."
          />
          <button 
            type="button" 
            onClick={() => { addKeyword(newKeywordInput); setNewKeywordInput(""); }}
            className="bg-primary text-black font-bold px-4 rounded hover:brightness-110 transition-all text-xs"
          >
            ADICIONAR
          </button>
        </div>
      </section>

      {/* RODAPÉ FIXO */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-sidebar-border p-4 z-40 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            <span>Keywords: <span className="text-primary">{formData.keywords.length}</span></span>
            <span className="text-sidebar-border">|</span>
            <span>Concorrentes: <span className="text-cyan-400">{competitors.length}</span></span>
            <span className="text-sidebar-border">|</span>
            <span>Faixa: <span className="text-magenta">{minPrice ? `R$${minPrice.toFixed(2)} - R$${maxPrice.toFixed(2)}` : "—"}</span></span>
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
            <button 
              type="button" 
              onClick={() => navigate({ to: "/produtos" })} 
              className="px-6 py-2 rounded font-bold text-muted-foreground hover:text-white transition-all text-xs border border-transparent hover:border-sidebar-border"
            >
              CANCELAR
            </button>
            <button 
              type="button" 
              onClick={() => handleSubmit()} 
              disabled={saving} 
              className="flex items-center gap-2 bg-primary px-8 py-2 rounded font-bold text-black text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
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
        className="fixed bottom-28 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-black shadow-xl hover:scale-110 transition-all active:scale-95"
      >
        <Tag size={24} />
        <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white ring-2 ring-black">
          {formData.keywords.length}
        </span>
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
          initialX={window.innerWidth - 350}
          initialY={window.innerHeight - 600}
        />
      )}
    </div>
  );
}
