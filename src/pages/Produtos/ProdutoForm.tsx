import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { 
  Loader2, 
  Plus, 
  X, 
  Save, 
  ArrowLeft, 
  Trash2, 
  Package, 
  FileText,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Trash,
  ExternalLink,
  Tag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FloatingKeywordPanel from "@/components/FloatingKeywordPanel";

interface Competitor {
  id?: string;
  title: string;
  description: string;
  keywords_found: string[];
  price: number;
  url: string;
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
  const [openCompetitorIndex, setOpenCompetitorIndex] = useState<number | null>(null);
  const [openPanels, setOpenPanels] = useState<number[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

  const [formData, setFormData] = useState<any>({
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
    keywords: [] as string[],
    // novos campos
    brand: "",
    production_type: "propria",
    expiration_date: "",
    free_shipping: false,
    net_weight_g: 0,
    gross_weight_g: 0,
    width: 0,
    height: 0,
    depth: 0,
    volumes: 1,
    items_per_box: 1,
    measurement_unit: "cm",
    gtin: "",
    gtin_tax: "",
    price_lists: [] as any[],
    format: "simples",
    type: "produto",
    status: "ativo",
    sale_price: 0,
    unit: "UN",
    condition: "novo",
  });


  function autoResize(target: HTMLElement | null) {
    if (!target) return;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  }

  const textareaStyle: React.CSSProperties = { 
    minHeight: '80px', 
    overflow: 'hidden', 
    resize: 'none' 
  };

  useEffect(() => {
    fetchSuppliers();
    if (productId) fetchProduct();
  }, [productId]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        document.querySelectorAll('textarea').forEach(textarea => {
          autoResize(textarea);
        });
      }, 100);
    }
  }, [loading, competitors, openCompetitorIndex]);

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
      setCompetitors((product_competitors || []).map((c: any) => ({
        id: c.id,
        title: c.title || "",
        description: c.description || "",
        keywords_found: c.keywords_found || [],
        price: Number(c.price) || 0,
        url: c.url || ""
      })));
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
            title: c.title,
            description: c.description,
            keywords_found: c.keywords_found,
            product_id: savedProductId,
            price: c.price,
            url: c.url
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
    setFormData({ ...formData, keywords: formData.keywords.filter((k: string) => k !== kw) });
    setSelectedKeywords(selectedKeywords.filter(k => k !== kw));
  };

  const handleAddCompetitor = () => {
    const newIdx = competitors.length;
    setCompetitors([...competitors, { 
      title: "", 
      description: "", 
      keywords_found: [],
      price: 0,
      url: ""
    }]);
    setOpenCompetitorIndex(newIdx);
  };

  const updateCompetitor = (idx: number, field: keyof Competitor, value: any) => {
    const newComps = [...competitors];
    (newComps[idx] as any)[field] = value;
    setCompetitors(newComps);
  };

  const toggleSelectedKeyword = (kw: string) => {
    if (selectedKeywords.includes(kw)) {
      setSelectedKeywords(selectedKeywords.filter(k => k !== kw));
    } else {
      setSelectedKeywords([...selectedKeywords, kw]);
    }
  };

  const copySelectedKeywords = () => {
    if (selectedKeywords.length === 0) return;
    navigator.clipboard.writeText(selectedKeywords.join(", "));
    toast.success("Palavras-chave selecionadas copiadas!");
  };

  const copyAllKeywords = () => {
    if (formData.keywords.length === 0) return;
    navigator.clipboard.writeText(formData.keywords.join(", "));
    toast.success("Todas as palavras-chave copiadas!");
  };

  const clearAllKeywords = () => {
    if (formData.keywords.length === 0) return;
    setFormData({ ...formData, keywords: [] });
    setSelectedKeywords([]);
    toast.success("Lista limpa!");
  };

  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);

  // Price analysis
  const prices = competitors.map(c => c.price).filter(p => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const medPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 size={32} className="animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* BLOCO 0 — Navegação */}
      <button 
        type="button" 
        onClick={() => navigate({ to: "/produtos" })} 
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft size={16} /> Voltar para Produtos
      </button>

      {/* BLOCO 1 — Informações Básicas */}
      <section className="jtd-glass p-6 space-y-6 relative">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
            <Package size={20} className="text-primary" />
            Informações Básicas
          </h3>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-black uppercase ${formData.is_active ? "text-primary" : "text-muted-foreground"}`}>
              {formData.is_active ? "Ativo" : "Inativo"}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-all duration-300"></div>
              <div className="absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-all duration-300 peer-checked:translate-x-5"></div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
          <div className="col-span-3 space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nome do Produto*</label>
            <input 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-lg font-bold focus:border-primary focus:outline-none transition-all" 
              placeholder="Ex: Teclado Mecânico RGB"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SKU</label>
            <div className="flex gap-2">
              <input 
                value={formData.sku} 
                onChange={e => setFormData({...formData, sku: e.target.value})} 
                className="flex-1 rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none font-mono" 
                placeholder="SKU-001" 
              />
              <button 
                type="button" 
                onClick={() => setFormData({...formData, sku: `PRD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`})} 
                className="bg-primary text-black font-bold px-4 rounded text-xs hover:brightness-110 transition-all uppercase whitespace-nowrap"
              >
                GERAR
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Categoria</label>
            <input 
              value={formData.category || ""} 
              onChange={e => setFormData({...formData, category: e.target.value})} 
              className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Ex: Eletrônicos"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fornecedor</label>
            <select 
              value={formData.supplier_id || ""} 
              onChange={e => setFormData({...formData, supplier_id: e.target.value})} 
              className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none appearance-none cursor-pointer"
            >
              <option value="">Selecionar Fornecedor...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {selectedSupplier && (
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-primary animate-in fade-in">
                <span>🚚 {selectedSupplier.delivery_days} dias entrega</span>
                <span className="opacity-30">•</span>
                <span>🛡️ {selectedSupplier.warranty_days} dias garantia</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preço de Custo (R$)</label>
            <div className="relative">
              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="number" 
                step="0.01" 
                value={formData.cost_price || 0} 
                onChange={e => setFormData({...formData, cost_price: parseFloat(e.target.value) || 0})} 
                className="w-full rounded border border-sidebar-border bg-internal-20 pl-8 p-3 text-sm focus:border-primary focus:outline-none font-mono" 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Peso (gramas)</label>
            <input 
              type="number" 
              value={formData.weight_g || 0} 
              onChange={e => setFormData({...formData, weight_g: parseInt(e.target.value) || 0})} 
              className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none font-mono" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dimensões</label>
            <input 
              value={formData.dimensions || ""} 
              onChange={e => setFormData({...formData, dimensions: e.target.value})} 
              className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Ex: 30x20x10 cm"
            />
          </div>
        </div>
      </section>

      {/* BLOCO 2 — Textos do Produto */}
      <section className="jtd-glass p-6 space-y-6">
        <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
          <FileText size={20} className="text-primary" />
          Textos do Produto
        </h3>

        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descrição Interna</label>
            <textarea 
              value={formData.description || ""} 
              onChange={e => {
                setFormData({...formData, description: e.target.value});
                autoResize(e.target);
              }} 
              style={{ ...textareaStyle, minHeight: '120px' }}
              className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Digite a descrição interna completa do produto..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Perguntas Frequentes</label>
            <textarea 
              value={formData.common_questions || ""} 
              onChange={e => {
                setFormData({...formData, common_questions: e.target.value});
                autoResize(e.target);
              }} 
              style={{ ...textareaStyle, minHeight: '120px' }}
              className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Liste as principais dúvidas dos compradores"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notas Internas</label>
            <textarea 
              value={formData.notes || ""} 
              onChange={e => {
                setFormData({...formData, notes: e.target.value});
                autoResize(e.target);
              }} 
              style={{ ...textareaStyle, minHeight: '120px' }}
              className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Anotações de uso exclusivo da equipe..."
            />
          </div>
        </div>
      </section>

      {/* BLOCO 3 — Análise de Concorrentes */}
      <section className="jtd-glass p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-sidebar-border/30 pb-6">
          <div>
            <h3 className="font-bold text-lg text-foreground">Análise de Concorrentes</h3>
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Analise preços e extraia keywords</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded-lg text-center">
              <p className="text-[8px] font-black uppercase text-green-500">MIN</p>
              <p className="text-xs font-bold text-green-500 font-mono">R$ {minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-center">
              <p className="text-[8px] font-black uppercase text-cyan-500">MED</p>
              <p className="text-xs font-bold text-cyan-500 font-mono">R$ {medPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-magenta-500/10 border border-magenta-500/30 px-3 py-1.5 rounded-lg text-center" style={{ backgroundColor: 'rgba(255, 0, 255, 0.1)', borderColor: 'rgba(255, 0, 255, 0.3)' }}>
              <p className="text-[8px] font-black uppercase text-magenta-500" style={{ color: '#ff00ff' }}>MAX</p>
              <p className="text-xs font-bold font-mono" style={{ color: '#ff00ff' }}>R$ {maxPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {competitors.map((comp, idx) => {
            const isOpen = openCompetitorIndex === idx;
            return (
              <div key={idx} className="jtd-glass border border-sidebar-border rounded-lg overflow-hidden transition-all duration-300">
                <div className="p-4 flex items-start gap-4">
                  <span className="text-primary font-black text-sm pt-1">#{idx + 1}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <input 
                          value={comp.title}
                          onChange={e => updateCompetitor(idx, 'title', e.target.value)}
                          className="w-full bg-transparent border-none p-0 text-base font-bold text-foreground focus:ring-0 placeholder:text-muted-foreground/30"
                          placeholder="TÍTULO DO ANÚNCIO CONCORRENTE — editável"
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <input 
                            value={comp.url}
                            onChange={e => updateCompetitor(idx, 'url', e.target.value)}
                            className="text-[10px] text-muted-foreground bg-transparent border-none p-0 focus:ring-0 w-full placeholder:text-muted-foreground/20"
                            placeholder="Link do anúncio..."
                          />
                          {comp.url && (
                            <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground">R$</span>
                          <input 
                            type="number"
                            step="0.01"
                            value={comp.price}
                            onChange={e => updateCompetitor(idx, 'price', parseFloat(e.target.value) || 0)}
                            className="bg-transparent border-none p-0 text-xl font-bold text-cyan-500 w-24 text-right focus:ring-0 font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            type="button" 
                            onClick={() => {
                              setCompetitors(competitors.filter((_, i) => i !== idx));
                              if (openCompetitorIndex === idx) setOpenCompetitorIndex(null);
                            }} 
                            className="text-muted-foreground hover:text-red-500 p-1"
                          >
                            <Trash size={14} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setOpenCompetitorIndex(isOpen ? null : idx)}
                            className="text-muted-foreground hover:text-foreground p-1"
                          >
                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="pt-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="border-t border-sidebar-border/30 pt-4">
                          <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Descrição do Concorrente</label>
                          <textarea 
                            value={comp.description} 
                            onChange={e => {
                              updateCompetitor(idx, 'description', e.target.value);
                              autoResize(e.target);
                            }}
                            style={textareaStyle}
                            className="w-full bg-internal-20 border border-sidebar-border rounded p-3 text-xs focus:border-primary focus:outline-none" 
                            placeholder="Cole aqui a descrição do anúncio concorrente..."
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-4 flex flex-wrap items-center gap-2">
                      <span className="text-[8px] font-black uppercase text-muted-foreground mr-2">Keywords:</span>
                      {comp.keywords_found.map((kw, kIdx) => (
                        <span key={kIdx} className="bg-primary/10 border border-primary/30 px-2 py-0.5 rounded text-[10px] font-bold text-primary">
                          {kw}
                        </span>
                      ))}
                      <button 
                        type="button"
                        onClick={() => !openPanels.includes(idx) && setOpenPanels([...openPanels, idx])}
                        className="text-[10px] font-bold text-primary hover:underline ml-2 uppercase"
                      >
                        + Adicionar Palavras-chave
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <button 
            type="button" 
            onClick={handleAddCompetitor}
            className="w-full border-2 border-dashed border-sidebar-border rounded-lg py-6 text-muted-foreground hover:border-primary/50 hover:text-primary flex items-center justify-center gap-2 transition-all group bg-internal-w5"
          >
            <Plus size={20} className="group-hover:scale-110 transition-transform" />
            <span className="font-bold text-xs uppercase tracking-widest">ADICIONAR CONCORRENTE</span>
          </button>
        </div>
      </section>

      {/* BLOCO 4 — Palavras-Chave do Produto */}
      <section className="jtd-glass p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
            Palavras-Chave do Produto
            <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full border border-primary/40">
              {formData.keywords.length}
            </span>
          </h3>
          <div className="flex gap-4">
            <button type="button" onClick={copyAllKeywords} className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors uppercase">Copiar Todas</button>
            <button type="button" onClick={copySelectedKeywords} disabled={selectedKeywords.length === 0} className={`text-[10px] font-bold uppercase transition-colors ${selectedKeywords.length === 0 ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground hover:text-primary"}`}>Copiar Selecionadas</button>
            <button type="button" onClick={clearAllKeywords} className="text-[10px] font-bold text-muted-foreground hover:text-red-500 transition-colors uppercase">Limpar Todas</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 min-h-[40px]">
          {formData.keywords.map((kw: string, i: number) => (
            <div 
              key={i} 
              onClick={() => toggleSelectedKeyword(kw)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-all ${
                selectedKeywords.includes(kw) 
                ? "bg-primary text-black border-primary font-bold" 
                : "bg-primary/10 border-primary/40 text-primary hover:bg-primary/20"
              }`}
            >
              <span className="text-[11px] font-bold">{kw}</span>
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); removeKeyword(kw); }} 
                className={`transition-colors ${selectedKeywords.includes(kw) ? "text-black/60 hover:text-black" : "text-primary/60 hover:text-primary"}`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {formData.keywords.length === 0 && (
            <p className="text-xs italic text-muted-foreground/50 py-2">Nenhuma palavra-chave adicionada ainda...</p>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <input 
            type="text"
            value={newKeywordInput}
            onChange={e => setNewKeywordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword(newKeywordInput), setNewKeywordInput(""))}
            className="flex-1 rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none" 
            placeholder="Adicionar nova palavra-chave..."
          />
          <button 
            type="button" 
            onClick={() => { addKeyword(newKeywordInput); setNewKeywordInput(""); }}
            className="bg-primary text-black font-bold px-8 rounded hover:brightness-110 transition-all text-xs"
          >
            ADICIONAR
          </button>
        </div>
      </section>

      {/* RODAPÉ FIXO */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-sidebar/95 backdrop-blur-sm border-t border-sidebar-border p-4 shadow-2xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-8 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Keywords</span>
              <span className="font-bold text-primary">{formData.keywords.length} cadastradas</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Concorrentes</span>
              <span className="font-bold text-cyan-400">{competitors.length} analisados</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Faixa de Preço</span>
              <span className="font-bold text-foreground">
                R$ {minPrice.toFixed(0)} — R$ {maxPrice.toFixed(0)}
              </span>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button 
              type="button" 
              onClick={() => navigate({ to: "/produtos" })} 
              className="px-6 py-2.5 rounded font-bold text-muted-foreground border border-sidebar-border hover:bg-internal-w5 transition-all text-sm"
            >
              CANCELAR
            </button>
            <button 
              type="button" 
              onClick={() => handleSubmit()} 
              disabled={saving} 
              className="bg-primary px-8 py-2.5 rounded font-bold text-black text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg flex items-center gap-2"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              SALVAR PRODUTO
            </button>
          </div>
        </div>
      </footer>

      {/* Botão Flutuante Palavras-Chave (acima da barra fixa) */}
      <div className="fixed bottom-24 right-8 z-50">
        <button 
          type="button"
          onClick={() => toast.info("Painel de palavras-chave flutuante em breve...")}
          className="w-14 h-14 rounded-full bg-primary text-black shadow-[0_0_20px_rgba(191,255,0,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        >
          <Tag size={24} />
        </button>
      </div>

      {/* Painéis Flutuantes Arrastáveis (Apenas para Concorrentes) */}
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
    </div>
  );
}
