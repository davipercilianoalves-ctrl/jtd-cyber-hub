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
  Copy,
  Trash
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FloatingKeywordPanel from "@/components/FloatingKeywordPanel";

interface Competitor {
  id?: string;
  title: string;
  description: string;
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
  const [openCompetitorIndex, setOpenCompetitorIndex] = useState<number | null>(null);
  const [openPanels, setOpenPanels] = useState<number[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

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

  function autoResize(target: HTMLTextAreaElement | null) {
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
        title: c.title,
        description: c.description,
        keywords_found: c.keywords_found || []
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
            price: 0, // Legacy support
            url: ""   // Legacy support
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
    setSelectedKeywords(selectedKeywords.filter(k => k !== kw));
  };

  const handleAddCompetitor = () => {
    const newIdx = competitors.length;
    setCompetitors([...competitors, { 
      title: "", 
      description: "", 
      keywords_found: [] 
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

  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 size={32} className="animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
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
                autoResize(e.target);
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
                autoResize(e.target);
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
                autoResize(e.target);
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
        <div>
          <h3 className="font-bold text-lg text-foreground">Análise de Concorrentes</h3>
          <p className="text-muted-foreground text-xs">A seção de concorrentes serve APENAS para localizar palavras-chave.</p>
        </div>

        <div className="space-y-3">
          {competitors.map((comp, idx) => {
            const isOpen = openCompetitorIndex === idx;
            return (
              <div key={idx} className="border border-sidebar-border rounded-lg overflow-hidden transition-all duration-300">
                {/* Header Accordion */}
                <div 
                  className="flex items-center justify-between p-4 bg-black/20 cursor-pointer hover:bg-black/30 transition-all"
                  onClick={() => setOpenCompetitorIndex(isOpen ? null : idx)}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronUp size={18} className="text-primary" /> : <ChevronDown size={18} className="text-primary" />}
                    <span className="text-sm font-bold text-foreground">Concorrente #{idx + 1}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCompetitors(competitors.filter((_, i) => i !== idx));
                      if (openCompetitorIndex === idx) setOpenCompetitorIndex(null);
                    }} 
                    className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Content Accordion */}
                {isOpen && (
                  <div className="p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">TÍTULO</label>
                      <textarea 
                        value={comp.title} 
                        onChange={e => {
                          updateCompetitor(idx, 'title', e.target.value);
                          autoResize(e.target);
                        }}
                        style={{ ...textareaStyle, minHeight: '48px' }}
                        className="w-full bg-black/20 border border-sidebar-border rounded p-3 text-sm focus:border-primary focus:outline-none" 
                        placeholder="Título do anúncio..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">DESCRIÇÃO</label>
                      <textarea 
                        value={comp.description} 
                        onChange={e => {
                          updateCompetitor(idx, 'description', e.target.value);
                          autoResize(e.target);
                        }}
                        style={textareaStyle}
                        className="w-full bg-black/20 border border-sidebar-border rounded p-3 text-sm focus:border-primary focus:outline-none" 
                        placeholder="Descrição do anúncio..."
                      />
                    </div>

                    <div className="pt-2 border-t border-sidebar-border/30">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 block">Palavras-chave deste concorrente</label>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {comp.keywords_found.map((kw, kIdx) => (
                          <span key={kIdx} className="bg-primary/10 border border-primary/40 px-2 py-1 rounded text-[10px] font-bold text-primary">
                            {kw}
                          </span>
                        ))}
                        {comp.keywords_found.length === 0 && <span className="text-[10px] text-muted-foreground italic">Nenhuma palavra adicionada</span>}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button 
                          type="button" 
                          onClick={() => {
                            if (!openPanels.includes(idx)) {
                              setOpenPanels([...openPanels, idx]);
                            }
                          }}
                          style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                          className="flex-1 border rounded px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={14} /> Adicionar Palavras-chave
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            if (comp.keywords_found.length === 0) return;
                            const uniqueKeywords = Array.from(new Set([...formData.keywords, ...comp.keywords_found]));
                            setFormData({ ...formData, keywords: uniqueKeywords });
                            toast.success(`Keywords enviadas para o produto!`);
                          }}
                          className="flex-1 text-[10px] font-bold text-primary hover:underline flex items-center justify-center gap-1 uppercase tracking-wider"
                        >
                          Enviar todas para o produto →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

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
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
              Palavras-Chave
              <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full border border-primary/40">
                {formData.keywords.length}
              </span>
            </h3>
            <div className="flex gap-4">
              <button 
                type="button" 
                onClick={copyAllKeywords} 
                className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Copiar Todas
              </button>
              <button 
                type="button" 
                onClick={copySelectedKeywords} 
                disabled={selectedKeywords.length === 0}
                className={`text-xs font-medium transition-colors ${selectedKeywords.length === 0 ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground hover:text-primary"}`}
              >
                Copiar Selecionadas
              </button>
            </div>
          </div>

          <div className="space-y-0.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {formData.keywords.map((kw, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between p-2 rounded hover:bg-white/[0.04] group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={selectedKeywords.includes(kw)}
                    onChange={() => toggleSelectedKeyword(kw)}
                    className="w-4 h-4 rounded border-sidebar-border bg-black/20 text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <span className="text-sm text-foreground">{kw}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => removeKeyword(kw)} 
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-1"
                >
                  <Trash size={14} />
                </button>
              </div>
            ))}
            {formData.keywords.length === 0 && (
              <div className="py-8 text-center text-muted-foreground/50 text-xs italic border border-dashed border-sidebar-border rounded">
                Nenhuma palavra-chave adicionada ainda.
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
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
              className="bg-primary text-black font-bold px-6 rounded hover:brightness-110 transition-all text-xs"
            >
              ADICIONAR
            </button>
          </div>
        </div>
      </section>

      {/* Ações Finais */}
      <div className="flex justify-end gap-4 pt-6 border-t border-sidebar-border/30">
        <button 
          type="button" 
          onClick={() => navigate({ to: "/produtos" })} 
          className="px-8 py-3 rounded font-bold text-muted-foreground border border-sidebar-border hover:bg-white/5 transition-all text-sm"
        >
          CANCELAR
        </button>
        <button 
          type="button" 
          onClick={() => handleSubmit()} 
          disabled={saving} 
          className="bg-primary px-8 py-3 rounded font-bold text-black text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg flex items-center gap-2"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          SALVAR PRODUTO
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