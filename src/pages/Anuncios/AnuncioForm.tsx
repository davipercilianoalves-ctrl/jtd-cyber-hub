import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
import { 
  Loader2, 
  Save, 
  ArrowLeft, 
  Trash2, 
  Megaphone, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Plus,
  Tag,
  Video,
  Play,
  Copy,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AdImageSelector from "@/components/anuncios/AdImageSelector";
import KeywordFloatingBoxes from "@/components/anuncios/KeywordFloatingBoxes";


interface Product {
  id: string;
  name: string;
  sku: string | null;
  cost_price: number | null;
  keywords: string[] | null;
}

export default function AnuncioForm() {
  const navigate = useNavigate();
  const { id } = useParams({ strict: false }) as { id?: string };
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    product_id: "",
    marketplace: "mercado_livre",
    titles: [""] as string[],
    brief_description: "",
    full_description: "",
    full_description_template: "",
    video_name: "",
    video_script: "",
    video_youtube_url: "",
    cost_price: 0,
    marketplace_fee: 0,
    shipping_cost: 0,
    packaging_cost: 0,
    transport_cost: 0,
    tax: 0,
    profit_margin: 0,
    fake_discount: 0,
    final_price: 0,
    fake_price: 0,
    is_active: true,
    keywords: [] as string[],
    selected_image_ids: [] as string[],
  });


  const textareaStyle: React.CSSProperties = { 
    minHeight: '80px', 
    overflow: 'hidden', 
    resize: 'none' 
  };

  function autoResize(target: HTMLElement | null) {
    if (!target) return;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  }

  useEffect(() => {
    fetchProducts();
    if (id) fetchAd();
  }, [id]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        document.querySelectorAll('textarea').forEach(textarea => {
          autoResize(textarea);
        });
      }, 100);
    }
  }, [loading, formData.titles]);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("id, name, sku, cost_price, keywords").eq("is_active", true);
    setProducts(data || []);
  }

  async function fetchAd() {
    if (!id) return;
    const { data, error } = await supabase.from("ads").select("*").eq("id", id).single();
    if (data) {
      setFormData(data as any);
      const prod = products.find(p => p.id === data.product_id);
      if (prod) setSelectedProduct(prod);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (products.length > 0 && formData.product_id) {
      const prod = products.find(p => p.id === formData.product_id);
      if (prod) {
        setSelectedProduct(prod);
        // Só herdar se for novo ou se mudar o produto
        if (!id || (id && prod.id !== formData.product_id)) {
          setFormData(prev => ({
            ...prev,
            cost_price: prod.cost_price || 0,
            keywords: prod.keywords || []
          }));
        }
      }
    }
  }, [formData.product_id, products, id]);

  // Cálculos de precificação
  const calculations = () => {
    const costTotal = Number(formData.cost_price) + Number(formData.shipping_cost) + Number(formData.packaging_cost) + Number(formData.transport_cost);
    
    // Preço de Venda = (Custo Total) / (1 - taxa_mk/100 - imposto/100 - lucro/100)
    const divisor = (1 - (Number(formData.marketplace_fee) / 100) - (Number(formData.tax) / 100) - (Number(formData.profit_margin) / 100));
    
    const venda = divisor > 0 ? costTotal / divisor : 0;
    const riscado = venda * (1 + (Number(formData.fake_discount) / 100));
    const mkFeeReal = venda * (Number(formData.marketplace_fee) / 100);
    const taxReal = venda * (Number(formData.tax) / 100);
    const lucroReal = venda * (Number(formData.profit_margin) / 100);
    const margemReal = venda > 0 ? (lucroReal / venda) * 100 : 0;

    return {
      costTotal,
      venda,
      riscado,
      mkFeeReal,
      taxReal,
      lucroReal,
      margemReal
    };
  };

  const calcs = calculations();

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      final_price: calcs.venda,
      fake_price: calcs.riscado
    }));
  }, [calcs.venda, calcs.riscado]);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!formData.product_id) return toast.error("Selecione um produto.");
    
    setSaving(true);
    try {
      if (id) {
        await supabase.from("ads").update(formData as any).eq("id", id);
      } else {
        await supabase.from("ads").insert([formData] as any);
      }


      toast.success(id ? "Anúncio atualizado!" : "Anúncio criado!");
      navigate({ to: "/anuncios" });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar anúncio.");
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

  const toggleSelectedKeyword = (kw: string) => {
    if (selectedKeywords.includes(kw)) {
      setSelectedKeywords(selectedKeywords.filter(k => k !== kw));
    } else {
      setSelectedKeywords([...selectedKeywords, kw]);
    }
  };

  const isKeywordUsed = (kw: string) => {
    return formData.titles.some(title => title.toLowerCase().includes(kw.toLowerCase()));
  };

  const addTitle = () => {
    setFormData({ ...formData, titles: [...formData.titles, ""] });
  };

  const updateTitle = (index: number, val: string) => {
    const newTitles = [...formData.titles];
    newTitles[index] = val;
    setFormData({ ...formData, titles: newTitles });
  };

  const removeTitle = (index: number) => {
    setFormData({ ...formData, titles: formData.titles.filter((_, i) => i !== index) });
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 size={32} className="animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
      <Link 
        to="/anuncios"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft size={16} /> Voltar para Anúncios
      </Link>

      {/* BLOCO 1 — Produto Vinculado */}
      <section className="jtd-glass p-6 space-y-4">
        <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
          <Tag size={20} className="text-primary" />
          Produto Vinculado
        </h3>

        <div className="space-y-4">
          <select 
            value={formData.product_id}
            onChange={e => setFormData({ ...formData, product_id: e.target.value })}
            className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none appearance-none cursor-pointer"
          >
            <option value="">Selecionar Produto...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {selectedProduct && (
            <div className="bg-internal-w5 border border-sidebar-border rounded p-4 space-y-2 text-sm animate-in slide-in-from-top-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SKU:</span>
                <span className="font-mono text-foreground">{selectedProduct.sku || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo base:</span>
                <span className="text-foreground">R$ {selectedProduct.cost_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block">Keywords do produto:</span>
                <p className="text-xs text-muted-foreground/60 leading-relaxed italic">
                  {selectedProduct.keywords?.join(", ") || "Nenhuma palavra cadastrada"}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* BLOCO 2 — Palavras-Chave */}
      <section className="jtd-glass p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg text-foreground">Palavras-Chave</h3>
          <div className="flex gap-4">
            <button 
              type="button" 
              onClick={() => {
                navigator.clipboard.writeText(formData.keywords.join(", "));
                toast.success("Copiado!");
              }} 
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Copiar Todas
            </button>
            <button 
              type="button" 
              onClick={() => {
                navigator.clipboard.writeText(selectedKeywords.join(", "));
                toast.success("Copiado!");
              }} 
              disabled={selectedKeywords.length === 0}
              className={`text-xs font-medium transition-colors ${selectedKeywords.length === 0 ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground hover:text-primary"}`}
            >
              Copiar Selecionadas
            </button>
          </div>
        </div>

        <div className="space-y-0.5">
          {formData.keywords.map((kw, i) => {
            const used = isKeywordUsed(kw);
            return (
              <div 
                key={i} 
                className="flex items-center justify-between p-2 rounded hover:bg-internal-w04 group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={selectedKeywords.includes(kw)}
                    onChange={() => toggleSelectedKeyword(kw)}
                    className="w-4 h-4 rounded border-sidebar-border bg-internal-20 text-primary focus:ring-primary"
                  />
                  <span className={`text-sm ${used ? "text-muted-foreground line-through opacity-50" : "text-lime-500 font-bold"}`}>
                    {kw}
                  </span>
                </div>
                <button 
                  type="button" 
                  onClick={() => removeKeyword(kw)} 
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <input 
            type="text"
            value={newKeywordInput}
            onChange={e => setNewKeywordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword(newKeywordInput), setNewKeywordInput(""))}
            className="flex-1 rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none" 
            placeholder="Adicionar nova palavra..."
          />
          <button 
            type="button" 
            onClick={() => { addKeyword(newKeywordInput); setNewKeywordInput(""); }}
            className="bg-primary text-black font-bold px-6 rounded hover:brightness-110 transition-all text-xs"
          >
            ADICIONAR
          </button>
        </div>
      </section>

      {/* BLOCO 3 — Títulos */}
      <section className="jtd-glass p-6 space-y-6">
        <h3 className="font-bold text-lg text-foreground">Títulos do Anúncio</h3>
        
        <div className="space-y-4">
          {formData.titles.map((title, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>Título #{idx + 1}</span>
                <span className={title.length > 150 ? "text-red-500" : ""}>{title.length}/150</span>
              </div>
              <div className="flex gap-3">
                <textarea 
                  value={title}
                  onChange={e => {
                    updateTitle(idx, e.target.value);
                    autoResize(e.target);
                  }}
                  style={textareaStyle}
                  className="flex-1 rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none"
                  placeholder="Digite o título do anúncio..."
                />
                <button 
                  type="button" 
                  onClick={() => removeTitle(idx)}
                  className="text-muted-foreground hover:text-red-500 p-2 h-fit"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}

          <button 
            type="button" 
            onClick={addTitle}
            className="w-full border-2 border-dashed border-sidebar-border rounded-lg py-4 text-muted-foreground hover:border-primary/50 hover:text-primary flex items-center justify-center gap-2 transition-all"
          >
            <Plus size={20} />
            <span className="font-bold text-xs uppercase tracking-widest">ADICIONAR TÍTULO</span>
          </button>
        </div>
      </section>

      {/* BLOCO 4 — Descrições */}
      <section className="jtd-glass p-6 space-y-6">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Breve Descrição</label>
          <textarea 
            value={formData.brief_description || ""}
            onChange={e => {
              setFormData({ ...formData, brief_description: e.target.value });
              autoResize(e.target);
            }}
            style={textareaStyle}
            className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none"
            placeholder="Crie uma breve descrição com as palavras-chave..."
          />
        </div>

        <div className="space-y-1.5 pt-4 border-t border-sidebar-border/30">
          <label className="text-xs font-medium text-muted-foreground">Descrição Completa</label>
          <textarea 
            value={formData.full_description || ""}
            onChange={e => {
              setFormData({ ...formData, full_description: e.target.value });
              autoResize(e.target);
            }}
            style={textareaStyle}
            className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none"
            placeholder="Cole aqui a descrição completa gerada pela IA externa..."
          />
        </div>

        <div className="space-y-1.5 pt-4 border-t border-sidebar-border/30">
          <label className="text-xs font-medium text-muted-foreground">Template para IA Externa</label>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="flex-1 bg-internal-w5 border border-sidebar-border rounded py-3 text-xs font-bold text-foreground hover:bg-muted/15 transition-all"
            >
              VER TEMPLATE
            </button>
            <button 
              type="button"
              onClick={() => {
                const template = formData.full_description_template || `Use as seguintes palavras-chave: ${formData.keywords.join(", ")}\nCrie uma descrição completa para marketplace com:\n- Título principal: ${formData.titles[0] || "—"}\n- Palavras-chave obrigatórias: ${formData.keywords.join(", ")}\n- Breve descrição base: ${formData.brief_description}\n- Tom: profissional e persuasivo`;
                navigator.clipboard.writeText(template);
                toast.success("Template copiado!");
              }}
              className="px-6 bg-internal-w5 border border-sidebar-border rounded text-xs font-bold text-foreground hover:bg-muted/15 transition-all"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* BLOCO 5 — Imagens do Anúncio */}
      <AdImageSelector
        productId={formData.product_id || undefined}
        selectedIds={formData.selected_image_ids}
        onChange={(ids) => setFormData({ ...formData, selected_image_ids: ids })}
      />


      {/* Precificação foi movida para o cadastro do Produto */}


      {/* BLOCO 6 — Vídeo */}
      <section className="jtd-glass p-6 space-y-6">
        <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
          <Video size={20} className="text-primary" />
          Vídeo do Anúncio
        </h3>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome do Vídeo</label>
            <input 
              value={formData.video_name || ""}
              onChange={e => setFormData({ ...formData, video_name: e.target.value })}
              className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary"
              placeholder="Ex: Vídeo Unboxing Teclado"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Roteiro/Falas</label>
            <textarea 
              value={formData.video_script || ""}
              onChange={e => {
                setFormData({ ...formData, video_script: e.target.value });
                autoResize(e.target);
              }}
              style={textareaStyle}
              className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary"
              placeholder="Digite o roteiro para o vídeo..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Link YouTube</label>
            <div className="flex gap-2">
              <input 
                value={formData.video_youtube_url || ""}
                onChange={e => setFormData({ ...formData, video_youtube_url: e.target.value })}
                className="flex-1 rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary"
                placeholder="https://youtube.com/watch?v=..."
              />
              {formData.video_youtube_url && (
                <a 
                  href={formData.video_youtube_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 bg-primary text-black flex items-center justify-center rounded hover:brightness-110"
                >
                  <Play size={16} fill="black" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Ações Finais */}
      <div className="flex justify-end gap-4 pt-6">
        <button 
          type="button" 
          onClick={() => navigate({ to: "/anuncios" })}
          className="px-8 py-3 rounded font-bold text-muted-foreground border border-sidebar-border hover:bg-internal-w5 transition-all text-sm"
        >
          CANCELAR
        </button>
        <button 
          type="button" 
          onClick={() => handleSubmit()}
          disabled={saving}
          className="bg-lime-500 px-8 py-3 rounded font-bold text-black text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg flex items-center gap-2"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          SALVAR ANÚNCIO
        </button>
      </div>

      {/* Modal Template IA */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-internal-80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="jtd-glass max-w-2xl w-full p-8 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowTemplateModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-xl font-bold text-primary mb-2">Template para IA Externa</h2>
            <p className="text-xs text-muted-foreground mb-4">Edite o template livremente. Use como base para colar na sua IA externa.</p>

            <textarea
              value={
                formData.full_description_template ||
                `Use as seguintes palavras-chave: ${formData.keywords.join(", ")}\nCrie uma descrição completa para marketplace com:\n- Título principal: ${formData.titles[0] || "—"}\n- Palavras-chave obrigatórias: ${formData.keywords.join(", ")}\n- Breve descrição base: ${formData.brief_description || "—"}\n- Tom: profissional e persuasivo`
              }
              onChange={(e) => setFormData({ ...formData, full_description_template: e.target.value })}
              className="w-full bg-internal-50 border border-sidebar-border rounded p-6 font-mono text-sm leading-relaxed text-foreground h-[400px] focus:border-primary outline-none resize-none"
              placeholder="Edite o template aqui..."
            />

            <div className="mt-6 flex gap-4">
              <button
                type="button"
                onClick={() => {
                  const template = formData.full_description_template || `Use as seguintes palavras-chave: ${formData.keywords.join(", ")}\nCrie uma descrição completa para marketplace com:\n- Título principal: ${formData.titles[0] || "—"}\n- Palavras-chave obrigatórias: ${formData.keywords.join(", ")}\n- Breve descrição base: ${formData.brief_description}\n- Tom: profissional e persuasivo`;
                  navigator.clipboard.writeText(template);
                  toast.success("Template copiado!");
                }}
                className="flex-1 bg-lime-500 text-black font-bold py-3 rounded hover:brightness-110"
              >
                COPIAR TEMPLATE
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, full_description_template: "" });
                  toast.success("Template restaurado ao padrão!");
                }}
                className="px-6 border border-sidebar-border text-muted-foreground font-bold py-3 rounded hover:bg-internal-w5"
              >
                RESTAURAR
              </button>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="flex-1 border border-sidebar-border text-muted-foreground font-bold py-3 rounded hover:bg-internal-w5"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}

      <KeywordFloatingBoxes
        keywords={formData.keywords}
        titles={formData.titles.map((t, i) => ({
          id: `t${i + 1}`,
          label: `T${i + 1}`,
          text: t,
        }))}
        briefText={formData.brief_description || ""}
        fullText={formData.full_description || ""}
      />
    </div>

  );
}
