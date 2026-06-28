import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  Plus,
  X,
  Save,
  ArrowLeft,
  Package,
  FileText,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Trash,
  ExternalLink,
  Tag,
  Copy,
  BarChart3,
  CheckSquare,
  Square,
  Highlighter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FloatingKeywordPanel from "@/components/FloatingKeywordPanel";
import PricingModule from "@/components/pricing/PricingModule";
import ProductImageGallery from "@/components/products/ProductImageGallery";
import { useProductImages } from "@/hooks/useProductImages";
import { ImagePlus, Upload, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { MlFetchButton } from "@/components/competitors/MlFetchButton";
import {
  PricingState,
  defaultPricing,
  mergePricing,
  computePricing,
} from "@/components/pricing/engine";

// Botão pequeno de copiar — usado ao lado de cada campo
function CopyBtn({ value }: { value: any }) {
  const text = value === null || value === undefined ? "" : String(value);
  return (
    <button
      type="button"
      onClick={() => {
        if (!text) {
          toast.error("Campo vazio");
          return;
        }
        navigator.clipboard.writeText(text);
        toast.success("Copiado!");
      }}
      title="Copiar"
      className="shrink-0 w-9 h-[44px] flex items-center justify-center rounded border border-sidebar-border bg-internal-20 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
    >
      <Copy size={13} />
    </button>
  );
}

const fieldLabelCls =
  "text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground";

function Field({
  label,
  value,
  children,
  span = 1,
}: {
  label: string;
  value: any;
  children: React.ReactNode;
  span?: number;
}) {
  return (
    <div className={`space-y-1.5 ${span === 2 ? "col-span-2" : span === 3 ? "col-span-3" : ""}`}>
      <label className={fieldLabelCls}>{label}</label>
      <div className="flex gap-2 items-start">
        <div className="flex-1 min-w-0">{children}</div>
        <CopyBtn value={value} />
      </div>
    </div>
  );
}




interface Highlight {
  start: number;
  end: number;
  text: string;
}

interface Competitor {
  id?: string;
  title: string;
  description: string;
  keywords_found: string[];
  highlights: Highlight[];
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
  const [panelOpen, setPanelOpen] = useState<boolean>(false);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, text: string, start: number, end: number, competitorIdx: number, isExisting: boolean } | null>(null);
  const descriptionRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
  const { uploadImages } = useProductImages(undefined);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const pendingFileRef = useRef<HTMLInputElement>(null);

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
    pricing: defaultPricing() as PricingState,
    images: [] as any[],
  });


  function autoResize(target: HTMLElement | null) {
    if (!target) return;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
    
    // Sincroniza a altura da camada de destaque se houver uma
    const highlightLayer = target.previousElementSibling as HTMLElement;
    if (highlightLayer && highlightLayer.tagName === 'DIV') {
      highlightLayer.style.height = target.style.height;
    }
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
          if (document.activeElement === textarea) return;
          autoResize(textarea);
        });
      }, 100);
    }
  }, [loading, competitors, openCompetitorIndex, panelOpen]);

  async function fetchSuppliers() {
    const { data } = await supabase.from("suppliers").select("id, name, delivery_days, warranty_days").eq("is_active", true);
    setSuppliers(data || []);
  }

  async function fetchProduct() {
    if (!productId) return;
    const { data, error } = await supabase.from("products").select("*, product_competitors(*)").eq("id", productId).single();
    if (data) {
      const { product_competitors, ...rest } = data as any;
      setFormData({ ...rest, pricing: mergePricing(rest.pricing) });
      setCompetitors((product_competitors || []).map((c: any) => ({
        id: c.id,
        title: c.title || "",
        description: c.description || "",
        keywords_found: c.keywords_found || [],
        highlights: Array.isArray(c.highlights) ? c.highlights : [],
        price: Number(c.price) || 0,
        url: c.url || ""
      })));
    }
    setLoading(false);
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!formData.name?.trim()) {
      toast.error("Preencha o nome do produto para continuar");
      return;
    }

    setSaving(true);

    const sku = formData.sku || `PRD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    // Sincroniza cost_price/sale_price a partir do módulo de precificação
    const pricingResult = computePricing(formData.pricing as PricingState);
    const payload: any = {
      ...formData,
      sku,
      cost_price: pricingResult.costFixedTotal || formData.cost_price || 0,
      sale_price: pricingResult.invalid
        ? formData.sale_price || 0
        : pricingResult.idealPrice,
    };
    // Sanitiza colunas tipadas — strings vazias em UUID/date quebram o INSERT (22P02)
    if (!payload.supplier_id) payload.supplier_id = null;
    if (!payload.expiration_date) payload.expiration_date = null;

    try {
      let savedProductId = productId;
      if (productId) {
        const { error } = await supabase.from("products").update(payload).eq("id", productId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert([payload]).select().single();
        if (error) throw error;
        savedProductId = data.id;
      }

      if (savedProductId) {
        const { error: delErr } = await supabase.from("product_competitors").delete().eq("product_id", savedProductId);
        if (delErr) throw delErr;
        if (competitors.length > 0) {
          const competitorsToSave = competitors.map(c => ({
            title: c.title,
            description: c.description,
            keywords_found: c.keywords_found,
            highlights: c.highlights as any,
            product_id: savedProductId,
            price: c.price,
            url: c.url
          }));
          const { error: insErr } = await supabase.from("product_competitors").insert(competitorsToSave);
          if (insErr) throw insErr;
        }
      }

      // Sobe imagens pendentes (modo "novo produto") agora que temos o ID
      if (!productId && savedProductId && pendingImages.length > 0) {
        try {
          await uploadImages(savedProductId, pendingImages);
          setPendingImages([]);
        } catch (e: any) {
          toast.error("Produto criado, mas falhou o upload de imagens", {
            description: e?.message ?? String(e),
          });
        }
      }

      toast.success(productId ? "Produto atualizado!" : "Produto criado com sucesso!");
      if (!productId && savedProductId) {
        navigate({ to: "/produtos/$id/editar", params: { id: savedProductId } });
      } else {
        navigate({ to: "/produtos" });
      }
    } catch (error) {
      console.error(error);
      const { formatSupabaseError } = await import("@/lib/supabaseError");
      toast.error("Não foi possível salvar o produto", {
        description: formatSupabaseError(error, "Erro ao salvar produto."),
      });
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
      highlights: [],
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

  // Ajusta os offsets dos highlights quando a descrição é editada
  const updateCompetitorDescription = (idx: number, newValue: string) => {
    const oldValue = competitors[idx].description || "";
    const oldHighlights = competitors[idx].highlights || [];
    
    // Acha o ponto de divergência (prefixo comum)
    let prefixLen = 0;
    const minLen = Math.min(oldValue.length, newValue.length);
    while (prefixLen < minLen && oldValue[prefixLen] === newValue[prefixLen]) prefixLen++;
    
    // Acha o sufixo comum
    let suffixLen = 0;
    while (
      suffixLen < (minLen - prefixLen) &&
      oldValue[oldValue.length - 1 - suffixLen] === newValue[newValue.length - 1 - suffixLen]
    ) suffixLen++;
    
    const oldChangeEnd = oldValue.length - suffixLen;
    const newChangeEnd = newValue.length - suffixLen;
    const delta = newChangeEnd - oldChangeEnd; // positive if insert, negative if delete
    
    const newHighlights: Highlight[] = [];
    for (const h of oldHighlights) {
      if (h.end <= prefixLen) {
        // edição depois deste highlight — mantém intacto
        newHighlights.push(h);
      } else if (h.start >= oldChangeEnd) {
        // edição antes deste highlight — desloca
        newHighlights.push({ ...h, start: h.start + delta, end: h.end + delta });
      } else {
        // edição dentro/sobrepondo o highlight — descarta
      }
    }
    
    const newComps = [...competitors];
    newComps[idx].description = newValue;
    newComps[idx].highlights = newHighlights;
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

  const handleTextSelection = (e: React.MouseEvent<HTMLTextAreaElement>, competitorIdx: number) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    if (selectedText && selectedText.trim().length > 0) {
      // Verifica se a seleção sobrepõe um highlight existente
      const existing = (competitors[competitorIdx].highlights || []).find(
        h => !(end <= h.start || start >= h.end)
      );
      setSelectionMenu({
        x: e.clientX,
        y: e.clientY - 60,
        text: selectedText,
        start,
        end,
        competitorIdx,
        isExisting: !!existing
      });
    } else {
      setSelectionMenu(null);
    }
  };

  const handleAddHighlightedKeyword = () => {
    if (!selectionMenu) return;
    const { text, start, end, competitorIdx } = selectionMenu;
    const trimmed = text.trim();
    const newComps = [...competitors];
    const comp = newComps[competitorIdx];
    
    // Remove highlights sobrepostos antes de adicionar o novo
    const filteredHighlights = (comp.highlights || []).filter(
      h => end <= h.start || start >= h.end
    );
    
    comp.highlights = [...filteredHighlights, { start, end, text }].sort((a, b) => a.start - b.start);
    
    // Adiciona ao concorrente se não existir
    if (trimmed && !comp.keywords_found.includes(trimmed)) {
      comp.keywords_found.push(trimmed);
    }

    // Adiciona AUTOMATICAMENTE à lista principal do produto (sem duplicados)
    if (trimmed && !formData.keywords.includes(trimmed)) {
      setFormData((prev: any) => ({
        ...prev,
        keywords: [...prev.keywords, trimmed]
      }));
      toast.success(`"${trimmed}" adicionada às keywords do produto!`);
    } else {
      toast.success(`"${trimmed}" marcada!`);
    }

    
    setCompetitors(newComps);
    setSelectionMenu(null);
  };


  const handleRemoveHighlight = () => {
    if (!selectionMenu) return;
    const { start, end, competitorIdx } = selectionMenu;
    const newComps = [...competitors];
    newComps[competitorIdx].highlights = (newComps[competitorIdx].highlights || []).filter(
      h => end <= h.start || start >= h.end
    );
    setCompetitors(newComps);
    toast.success("Marcação removida!");
    setSelectionMenu(null);
  };


  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.selection-menu')) {
        setSelectionMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Price analysis
  const prices = competitors.map(c => c.price).filter(p => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const medPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 size={32} className="animate-spin text-primary" /></div>;

  // helpers de classes reutilizáveis
  const inputCls =
    "w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary focus:outline-none transition-all break-all";
  const labelCls = fieldLabelCls;
  const sectionTitleCls =
    "text-[11px] font-bold uppercase tracking-[0.08em] text-primary";

  const allSelected =
    formData.keywords.length > 0 && selectedKeywords.length === formData.keywords.length;
  const toggleSelectAll = () => {
    if (allSelected) setSelectedKeywords([]);
    else setSelectedKeywords([...formData.keywords]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Voltar */}
      <button
        type="button"
        onClick={() => navigate({ to: "/produtos" })}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft size={16} /> Voltar para Produtos
      </button>

      {/* ============================================================ */}
      {/* 1. INFORMAÇÕES BÁSICAS                                       */}
      {/* ============================================================ */}
      <section className="jtd-glass p-6 space-y-6 relative">
        <div className="flex justify-between items-start">
          <h3 className="text-[18px] font-bold tracking-tight text-foreground flex items-center gap-3">
            <Package size={20} className="text-primary" />
            Informações Básicas
          </h3>
          <div className="flex items-center gap-3">
            <span
              className={`text-[10px] font-black uppercase ${
                formData.is_active ? "text-primary" : "text-muted-foreground"
              }`}
            >
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

        {/* IDENTIFICAÇÃO */}
        <div className="space-y-3">
          <h4 className={sectionTitleCls}>Identificação</h4>
          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Nome do Produto*" value={formData.name} span={3}>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`${inputCls} text-lg font-bold`}
                placeholder="Ex: Teclado Mecânico RGB"
              />
            </Field>

            <div className="space-y-1.5">
              <label className={labelCls}>Código (SKU)</label>
              <div className="flex gap-2">
                <input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className={`flex-1 ${inputCls} font-mono`}
                  placeholder="SKU-001"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      sku: `PRD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                    })
                  }
                  className="bg-primary text-primary-foreground font-bold px-3 rounded text-xs hover:brightness-110 transition-all uppercase whitespace-nowrap"
                >
                  GERAR
                </button>
                <CopyBtn value={formData.sku} />
              </div>
            </div>

            <Field label="Marca" value={formData.brand}>
              <input
                value={formData.brand || ""}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className={inputCls}
                placeholder="Ex: Logitech"
              />
            </Field>

            <Field label="Categoria" value={formData.category}>
              <input
                value={formData.category || ""}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={inputCls}
                placeholder="Ex: Eletrônicos"
              />
            </Field>

            <Field label="Fornecedor" value={selectedSupplier?.name || ""} span={2}>
              <select
                value={formData.supplier_id || ""}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="">Selecionar Fornecedor...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            {selectedSupplier && (
              <div className="col-span-3 -mt-2 flex items-center gap-2 text-[10px] font-bold text-primary animate-in fade-in">
                <span>🚚 {selectedSupplier.delivery_days} dias entrega</span>
                <span className="opacity-30">•</span>
                <span>🛡️ {selectedSupplier.warranty_days} dias garantia</span>
              </div>
            )}

            <Field label="Produção" value={formData.production_type}>
              <select
                value={formData.production_type || "propria"}
                onChange={(e) => setFormData({ ...formData, production_type: e.target.value })}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="propria">Própria</option>
                <option value="terceiros">Terceiros</option>
              </select>
            </Field>
          </div>
        </div>

        {/* CLASSIFICAÇÃO */}
        <div className="space-y-3 border-t border-sidebar-border/20 pt-6">
          <h4 className={sectionTitleCls}>Classificação</h4>
          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Formato" value={formData.format}>
              <select
                value={formData.format || "simples"}
                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="simples">Simples (item único)</option>
                <option value="variacoes">Com variações</option>
                <option value="composicao">Com composição (kit)</option>
              </select>
            </Field>
            <Field label="Tipo" value={formData.type}>
              <select
                value={formData.type || "produto"}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="produto">Produto</option>
                <option value="servico">Serviço</option>
              </select>
            </Field>
            <Field label="Situação" value={formData.status}>
              <select
                value={formData.status || "ativo"}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </Field>
            <Field label="Condição" value={formData.condition}>
              <select
                value={formData.condition || "novo"}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="novo">Novo</option>
                <option value="usado">Usado</option>
                <option value="recondicionado">Recondicionado</option>
              </select>
            </Field>
            <Field label="Unidade" value={formData.unit}>
              <input
                value={formData.unit || "UN"}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className={`${inputCls} font-mono uppercase`}
                placeholder="UN"
              />
            </Field>
          </div>
        </div>

        {/* PREÇO */}
        <div className="space-y-3 border-t border-sidebar-border/20 pt-6">
          <h4 className={sectionTitleCls}>Preço</h4>
          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Preço de Venda (R$)" value={formData.sale_price}>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  step="0.01"
                  value={formData.sale_price || 0 || ""}
                  onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })}
                  className={`${inputCls} pl-8 font-mono`}
                />
              </div>
            </Field>
            <Field label="Preço de Custo (R$)" value={formData.cost_price}>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost_price || 0 || ""}
                  onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                  className={`${inputCls} pl-8 font-mono`}
                />
              </div>
            </Field>
            <Field
              label="Listas de Preço"
              value={Array.isArray(formData.price_lists) ? formData.price_lists.join(", ") : ""}
            >
              <input
                value={Array.isArray(formData.price_lists) ? formData.price_lists.join(", ") : ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price_lists: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                className={inputCls}
                placeholder="Ex: Atacado, Varejo"
              />
            </Field>
          </div>
        </div>

        {/* CÓDIGOS FISCAIS */}
        <div className="space-y-3 border-t border-sidebar-border/20 pt-6">
          <h4 className={sectionTitleCls}>Códigos Fiscais</h4>
          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            <Field label="GTIN/EAN" value={formData.gtin}>
              <input
                value={formData.gtin || ""}
                onChange={(e) => setFormData({ ...formData, gtin: e.target.value })}
                className={`${inputCls} font-mono`}
                placeholder="7891234567890"
              />
            </Field>
            <Field label="GTIN/EAN Tributário" value={formData.gtin_tax}>
              <input
                value={formData.gtin_tax || ""}
                onChange={(e) => setFormData({ ...formData, gtin_tax: e.target.value })}
                className={`${inputCls} font-mono`}
                placeholder="7891234567890"
              />
            </Field>
          </div>
        </div>

        {/* LOGÍSTICA */}
        <div className="space-y-3 border-t border-sidebar-border/20 pt-6">
          <h4 className={sectionTitleCls}>Logística</h4>
          <div className="grid grid-cols-4 gap-x-6 gap-y-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Frete Grátis</label>
              <div className="flex items-center gap-3 h-[44px]">
                <span
                  className={`text-[10px] font-black uppercase ${
                    formData.free_shipping ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {formData.free_shipping ? "Sim" : "Não"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!formData.free_shipping}
                    onChange={(e) => setFormData({ ...formData, free_shipping: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-all duration-300"></div>
                  <div className="absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-all duration-300 peer-checked:translate-x-5"></div>
                </label>
              </div>
            </div>
            <Field label="Volumes" value={formData.volumes}>
              <input
                type="number"
                value={formData.volumes || 1 || ""}
                onChange={(e) => setFormData({ ...formData, volumes: parseInt(e.target.value) || 1 })}
                className={`${inputCls} font-mono`}
              />
            </Field>
            <Field label="Itens p/ Caixa" value={formData.items_per_box}>
              <input
                type="number"
                value={formData.items_per_box || 1 || ""}
                onChange={(e) => setFormData({ ...formData, items_per_box: parseInt(e.target.value) || 1 })}
                className={`${inputCls} font-mono`}
              />
            </Field>
            <Field label="Data de Validade" value={formData.expiration_date}>
              <input
                type="date"
                value={formData.expiration_date || ""}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                className={`${inputCls} font-mono`}
              />
            </Field>
          </div>
        </div>

        {/* DIMENSÕES & PESO */}
        <div className="space-y-3 border-t border-sidebar-border/20 pt-6">
          <h4 className={sectionTitleCls}>Dimensões & Peso</h4>
          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Unidade de Medida" value={formData.measurement_unit}>
              <select
                value={formData.measurement_unit || "cm"}
                onChange={(e) => setFormData({ ...formData, measurement_unit: e.target.value })}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="m">Metros</option>
                <option value="cm">Centímetros</option>
                <option value="mm">Milímetros</option>
              </select>
            </Field>
            <Field label="Largura" value={formData.width}>
              <input
                type="number"
                step="0.01"
                value={formData.width || 0 || ""}
                onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) || 0 })}
                className={`${inputCls} font-mono`}
              />
            </Field>
            <Field label="Altura" value={formData.height}>
              <input
                type="number"
                step="0.01"
                value={formData.height || 0 || ""}
                onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) || 0 })}
                className={`${inputCls} font-mono`}
              />
            </Field>
            <Field label="Profundidade" value={formData.depth}>
              <input
                type="number"
                step="0.01"
                value={formData.depth || 0 || ""}
                onChange={(e) => setFormData({ ...formData, depth: parseFloat(e.target.value) || 0 })}
                className={`${inputCls} font-mono`}
              />
            </Field>
            <Field label="Peso Líquido (g)" value={formData.net_weight_g}>
              <input
                type="number"
                step="0.01"
                value={formData.net_weight_g || 0 || ""}
                onChange={(e) => setFormData({ ...formData, net_weight_g: parseFloat(e.target.value) || 0 })}
                className={`${inputCls} font-mono`}
              />
            </Field>
            <Field label="Peso Bruto (g)" value={formData.gross_weight_g}>
              <input
                type="number"
                step="0.01"
                value={formData.gross_weight_g || 0 || ""}
                onChange={(e) => setFormData({ ...formData, gross_weight_g: parseFloat(e.target.value) || 0 })}
                className={`${inputCls} font-mono`}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. PALAVRAS-CHAVE DO PRODUTO                                 */}
      {/* ============================================================ */}

      <section className="jtd-glass p-6 space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="text-[18px] font-bold tracking-tight text-foreground flex items-center gap-3">
            <Tag size={20} className="text-primary" />
            Palavras-Chave do Produto
            <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full border border-primary/40">
              {formData.keywords.length}
            </span>
          </h3>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {selectedKeywords.length} de {formData.keywords.length} selecionadas
          </div>
        </div>

        {/* Barra de ações */}
        <div className="flex flex-wrap gap-2 items-center bg-internal-w5 border border-sidebar-border rounded-lg p-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            disabled={formData.keywords.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded border border-sidebar-border bg-internal-20 text-[10px] font-black uppercase tracking-wider text-foreground hover:border-primary hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
            {allSelected ? "Desmarcar Todas" : "Selecionar Todas"}
          </button>
          <button
            type="button"
            onClick={copySelectedKeywords}
            disabled={selectedKeywords.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded border border-primary/50 bg-primary/10 text-[10px] font-black uppercase tracking-wider text-primary hover:bg-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary/10"
          >
            <Copy size={13} /> Copiar Selecionadas
          </button>
          <button
            type="button"
            onClick={copyAllKeywords}
            disabled={formData.keywords.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Copy size={13} /> Copiar Todas
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={clearAllKeywords}
            disabled={formData.keywords.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded border border-sidebar-border text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-destructive hover:border-destructive transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash size={13} /> Limpar
          </button>
        </div>

        {/* Lista de chips */}
        <div className="flex flex-wrap gap-2 min-h-[60px]">
          {formData.keywords.map((kw: string, i: number) => {
            const sel = selectedKeywords.includes(kw);
            return (
              <div
                key={i}
                onClick={() => toggleSelectedKeyword(kw)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-all text-[12px] ${
                  sel
                    ? "bg-primary text-primary-foreground border-primary font-black shadow-[0_0_12px_rgba(191,255,0,0.4)]"
                    : "bg-primary/10 border-primary/40 text-primary hover:bg-primary/20 font-bold"
                }`}
              >
                {sel && <CheckSquare size={12} />}
                <span>{kw}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeKeyword(kw);
                  }}
                  className={`transition-colors ${
                    sel ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-primary/60 hover:text-primary"
                  }`}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
          {formData.keywords.length === 0 && (
            <p className="text-xs italic text-muted-foreground/50 py-2">
              Nenhuma palavra-chave adicionada ainda. Adicione abaixo ou colete dos concorrentes.
            </p>
          )}
        </div>

        {/* Adicionar nova */}
        <div className="flex gap-2 pt-2">
          <input
            type="text"
            value={newKeywordInput}
            onChange={(e) => setNewKeywordInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), addKeyword(newKeywordInput), setNewKeywordInput(""))
            }
            className={inputCls}
            placeholder="Adicionar nova palavra-chave..."
          />
          <button
            type="button"
            onClick={() => {
              addKeyword(newKeywordInput);
              setNewKeywordInput("");
            }}
            className="bg-primary text-primary-foreground font-bold px-8 rounded hover:brightness-110 transition-all text-xs uppercase tracking-wider whitespace-nowrap"
          >
            Adicionar
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. ANÁLISE DE CONCORRENTES                                   */}
      {/* ============================================================ */}
      <section className="jtd-glass p-6 space-y-6">
        <div className="border-b border-sidebar-border/30 pb-6">
          <h3 className="text-[18px] font-bold tracking-tight text-foreground">Análise de Concorrentes</h3>
          <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
            Analise preços e extraia keywords
          </p>
        </div>

        <div className="space-y-4">
          {competitors.map((comp, idx) => {
            const isOpen = openCompetitorIndex === idx;
            const toggleOpen = () => setOpenCompetitorIndex(isOpen ? null : idx);
            return (
              <div
                key={idx}
                className="jtd-glass border border-sidebar-border rounded-lg overflow-hidden transition-all duration-300"
              >
                {/* HEADER BAR — só texto ao lado da seta */}
                <button
                  type="button"
                  onClick={toggleOpen}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors border-b border-sidebar-border/30 text-left cursor-pointer"
                  title={isOpen ? "Recolher" : "Expandir"}
                >
                  <span className="text-primary shrink-0">
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-semibold text-foreground truncate">
                    {comp.title || <span className="text-muted-foreground/40">Concorrente sem título</span>}
                  </span>
                </button>

                {/* LINHA META: #N, link, preço, lixeira */}
                <div className="px-4 py-3 flex items-center gap-4">
                  <span className="text-primary font-black text-sm shrink-0">#{idx + 1}</span>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <input
                      value={comp.url}
                      onChange={(e) => updateCompetitor(idx, "url", e.target.value)}
                      className="text-[10px] text-muted-foreground bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-full placeholder:text-muted-foreground/20"
                      placeholder="Link do anúncio..."
                    />
                    {comp.url && (
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary shrink-0"
                      >
                        <ExternalLink size={10} />
                      </a>
                    )}
                    <MlFetchButton
                      linkValue={comp.url || ""}
                      onDataFetched={(data) => {
                        const newComps = [...competitors];
                        newComps[idx] = {
                          ...newComps[idx],
                          title: data.title,
                          price: data.price,
                          description: data.description,
                        };
                        setCompetitors(newComps);
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">R$</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      inputMode="decimal"
                      value={comp.price || ""}
                      onChange={(e) => updateCompetitor(idx, "price", e.target.value === "" ? 0 : Number(e.target.value))}
                      className="bg-transparent border-none p-0 text-[20px] font-bold tracking-tight text-cyan-500 w-32 text-right focus:ring-0 focus:outline-none font-mono tabular-nums"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCompetitors(competitors.filter((_, i) => i !== idx));
                      if (openCompetitorIndex === idx) setOpenCompetitorIndex(null);
                    }}
                    className="text-muted-foreground hover:text-destructive p-1 shrink-0"
                  >
                    <Trash size={14} />
                  </button>
                </div>

                {/* CONTEÚDO EXPANDIDO */}
                {isOpen && (
                  <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="border-t border-sidebar-border/30 pt-4 space-y-3">
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground block mb-2">
                          Título do Anúncio
                        </label>
                        <input
                          value={comp.title}
                          onChange={(e) => updateCompetitor(idx, "title", e.target.value)}
                          className="w-full bg-internal-20 border border-sidebar-border rounded p-2 text-sm font-medium focus:border-primary focus:outline-none"
                          placeholder="Título do anúncio concorrente..."
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground block mb-2">
                          Descrição do Concorrente
                        </label>
                        <div className="relative group">
                          {/* Camada de Visualização (Highlights por ranges) */}
                          <div 
                            data-highlight-layer
                            className="absolute inset-0 p-3 text-sm leading-[1.7] pointer-events-none whitespace-pre-wrap break-all overflow-hidden text-transparent border border-transparent rounded"
                            style={{ ...textareaStyle, height: '100%', fontFamily: 'inherit', letterSpacing: 'normal' }}
                          >
                            {(() => {
                              const text = comp.description || "";
                              const highlights = [...(comp.highlights || [])]
                                .filter(h => h.start >= 0 && h.end <= text.length && h.start < h.end)
                                .sort((a, b) => a.start - b.start);
                              
                              if (highlights.length === 0) return text;
                              
                              const parts: React.ReactNode[] = [];
                              let cursor = 0;
                              highlights.forEach((h, i) => {
                                if (h.start > cursor) parts.push(text.slice(cursor, h.start));
                                parts.push(
                                  <mark key={i} className="bg-magenta text-transparent rounded-sm">
                                    {text.slice(h.start, h.end)}
                                  </mark>

                                );
                                cursor = Math.max(cursor, h.end);
                              });
                              if (cursor < text.length) parts.push(text.slice(cursor));
                              return parts;
                            })()}
                          </div>

                          <textarea
                            value={comp.description}
                            onChange={(e) => {
                              updateCompetitorDescription(idx, e.target.value);
                              autoResize(e.target);
                            }}
                            onScroll={(e) => {
                              const layer = (e.currentTarget.previousElementSibling as HTMLElement);
                              if (layer) layer.scrollTop = e.currentTarget.scrollTop;
                            }}
                            onMouseDown={(e) => {
                              // Impede o "drag" do texto em alguns browsers que pode bugar a seleção
                              if (e.detail > 1) e.preventDefault();
                            }}
                            onMouseUp={(e) => handleTextSelection(e, idx)}
                            ref={(el) => { descriptionRefs.current[idx] = el; }}
                            style={{ ...textareaStyle, background: 'transparent', letterSpacing: 'normal' }}
                            className="relative z-10 w-full bg-transparent border border-sidebar-border rounded p-3 text-sm leading-[1.7] focus:border-primary focus:outline-none selection:bg-magenta/30 selection:text-current break-all touch-none"
                            placeholder="Cole aqui a descrição do anúncio concorrente..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* KEYWORDS */}
                <div className="px-4 pb-4 flex flex-wrap items-center gap-2 overflow-hidden">
                  <span className="text-[8px] font-black uppercase text-muted-foreground mr-2 shrink-0">Keywords:</span>
                  <div className="flex flex-wrap gap-2 items-center min-w-0">
                    {comp.keywords_found.map((kw, kIdx) => (
                      <span
                        key={kIdx}
                        className="bg-primary/10 border border-primary/30 px-2 py-0.5 rounded text-[10px] font-bold text-primary break-all max-w-full"
                      >
                        {kw}
                      </span>
                    ))}
                    {isOpen && (
                      <button
                        type="button"
                        onClick={() => setPanelOpen(!panelOpen)}
                        className="text-[10px] font-bold text-primary hover:underline ml-2 uppercase shrink-0"
                      >
                        {panelOpen ? "− Fechar painel" : "+ Adicionar Palavras-chave"}
                      </button>
                    )}
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

      {/* ============================================================ */}
      {/* 4. PRECIFICAÇÃO INTELIGENTE                                 */}
      {/* ============================================================ */}
      <PricingModule
        value={formData.pricing as PricingState}
        onChange={(next) => setFormData({ ...formData, pricing: next })}
        competitorPrices={prices}
      />




      {/* ============================================================ */}
      {/* GALERIA DE IMAGENS (product_images table)                    */}
      {/* ============================================================ */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Imagens
          </span>
          <Separator className="flex-1" />
        </div>
        <h3 className="text-sm font-semibold">Imagens do Produto</h3>
        {productId ? (
          <ProductImageGallery productId={productId} />
        ) : (
          <div className="space-y-3">
            <input
              ref={pendingFileRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) setPendingImages((prev) => [...prev, ...files]);
                if (pendingFileRef.current) pendingFileRef.current.value = "";
              }}
            />
            <div className="border-2 border-dashed border-sidebar-border rounded-lg p-6 text-center bg-internal-20">
              <div className="flex flex-col items-center gap-2">
                <ImagePlus className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Selecione as imagens agora — elas serão enviadas automaticamente após salvar o produto.
                </p>
                <button
                  type="button"
                  onClick={() => pendingFileRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
                >
                  <Upload className="w-4 h-4" />
                  Adicionar imagens
                </button>
                <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP</p>
              </div>
            </div>
            {pendingImages.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">
                  {pendingImages.length} imagem(ns) na fila — serão enviadas ao salvar.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {pendingImages.map((file, idx) => {
                    const url = URL.createObjectURL(file);
                    return (
                      <div
                        key={`${file.name}-${idx}`}
                        className="group relative border border-sidebar-border rounded-lg overflow-hidden bg-internal-20"
                      >
                        <div className="aspect-square overflow-hidden">
                          <img
                            src={url}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            onLoad={() => URL.revokeObjectURL(url)}
                          />
                        </div>
                        <div className="p-2 text-xs">
                          <div className="truncate" title={file.name}>{file.name}</div>
                          <div className="text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <button
                          type="button"
                          title="Remover"
                          onClick={() =>
                            setPendingImages((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="absolute top-1 right-1 p-1.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>




      {/* ============================================================ */}
      {/* 5. TEXTOS DO PRODUTO                                         */}
      {/* ============================================================ */}

      <section className="jtd-glass p-6 space-y-6">
        <h3 className="text-[18px] font-bold tracking-tight text-foreground flex items-center gap-3">
          <FileText size={20} className="text-primary" />
          Textos do Produto
        </h3>

        <div className="flex flex-col gap-8">
          <div className="space-y-3">
            <label className={labelCls}>Descrição Interna</label>
            <div className="flex gap-2 items-start">
              <textarea
                value={formData.description || ""}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  autoResize(e.target);
                }}
                style={textareaStyle}
                className={`${inputCls} !min-h-0 py-1`}
                placeholder="Digite a descrição interna completa do produto..."
              />
              <CopyBtn value={formData.description} />
            </div>
          </div>
          
          <div className="space-y-3">
            <label className={labelCls}>Perguntas Frequentes</label>
            <div className="flex gap-2 items-start">
              <textarea
                value={formData.common_questions || ""}
                onChange={(e) => {
                  setFormData({ ...formData, common_questions: e.target.value });
                  autoResize(e.target);
                }}
                style={textareaStyle}
                className={`${inputCls} !min-h-0 py-1`}
                placeholder="Liste as principais dúvidas dos compradores"
              />
              <CopyBtn value={formData.common_questions} />
            </div>
          </div>
          
          <div className="space-y-3">
            <label className={labelCls}>Notas Internas</label>
            <div className="flex gap-2 items-start">
              <textarea
                value={formData.notes || ""}
                onChange={(e) => {
                  setFormData({ ...formData, notes: e.target.value });
                  autoResize(e.target);
                }}
                style={textareaStyle}
                className={`${inputCls} !min-h-0 py-1`}
                placeholder="Anotações de uso exclusivo da equipe..."
              />
              <CopyBtn value={formData.notes} />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. ANÁLISE GERAL DO PRODUTO                                  */}
      {/* ============================================================ */}
      <section className="jtd-glass p-6 space-y-5">

        <h3 className="text-[18px] font-bold tracking-tight text-foreground flex items-center gap-3">
          <BarChart3 size={20} className="text-primary" />
          Análise Geral do Produto
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary">Keywords</p>
            <p className="text-2xl font-black text-primary font-mono mt-1">{formData.keywords.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase">cadastradas</p>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-cyan-500/70">Concorrentes</p>
            <p className="text-2xl font-black text-cyan-500 font-mono mt-1">{competitors.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase">analisados</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-green-500/70">Faixa de Preço</p>
            <p className="text-base font-black text-green-500 font-mono mt-1">
              R$ {minPrice.toFixed(0)} — R$ {maxPrice.toFixed(0)}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">min / max</p>
          </div>
          <div
            className="rounded-lg p-4 border"
            style={{ backgroundColor: "rgba(255, 0, 255, 0.08)", borderColor: "rgba(255, 0, 255, 0.3)" }}
          >
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(255,0,255,0.7)" }}>
              Preço de Venda
            </p>
            <p className="text-2xl font-black font-mono mt-1" style={{ color: "#ff00ff" }}>
              R$ {(formData.sale_price || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">configurado</p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. AÇÕES — barra inline (não fixa)                           */}
      {/* ============================================================ */}

      <div className="flex justify-end gap-4 pt-4">
        <button
          type="button"
          onClick={() => navigate({ to: "/produtos" })}
          className="px-8 py-3 rounded font-bold text-muted-foreground border border-sidebar-border hover:bg-internal-w5 transition-all text-sm uppercase tracking-wider"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={saving}
          className="bg-primary px-10 py-3 rounded font-black text-primary-foreground text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg flex items-center gap-2 uppercase tracking-wider"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Salvar Produto
        </button>
      </div>

      {/* Menu de seleção flutuante */}
      {selectionMenu && (
        <div 
          className="selection-menu fixed z-[9999] flex items-center gap-1 bg-background border border-sidebar-border shadow-2xl rounded-full p-1.5 animate-in fade-in zoom-in duration-150"
          style={{ 
            left: `${selectionMenu.x}px`, 
            top: `${selectionMenu.y}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <button
            type="button"
            onClick={handleAddHighlightedKeyword}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider hover:brightness-110 transition-all whitespace-nowrap"
          >
            <Highlighter size={12} />
            {selectionMenu.isExisting ? "Substituir Marca" : "Marcar Keyword"}
          </button>
          {selectionMenu.isExisting && (
            <button
              type="button"
              onClick={handleRemoveHighlight}
              className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-black uppercase tracking-wider hover:bg-destructive/20 transition-all whitespace-nowrap"
              title="Remover marcação"
            >
              <X size={12} /> Desmarcar
            </button>
          )}
          <div className="w-[1px] h-4 bg-sidebar-border mx-1" />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(selectionMenu.text);
              toast.success("Copiado!");
              setSelectionMenu(null);
            }}
            className="p-1.5 rounded-full hover:bg-internal-20 text-muted-foreground hover:text-primary transition-colors"
            title="Copiar texto"
          >
            <Copy size={12} />
          </button>
          <button
            type="button"
            onClick={() => setSelectionMenu(null)}
            className="p-1.5 rounded-full hover:bg-internal-20 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Painel Flutuante Universal — sempre envia ao concorrente atualmente aberto */}
      {panelOpen && (
        <FloatingKeywordPanel
          title="PAINEL DE KEYWORDS"
          targetTitle={
            openCompetitorIndex !== null && competitors[openCompetitorIndex]
              ? `→ Concorrente #${openCompetitorIndex + 1}${competitors[openCompetitorIndex].title ? ` — ${competitors[openCompetitorIndex].title}` : ""}`
              : null
          }
          keywordSources={(() => {
            const map = new Map<string, { keyword: string; sources: Array<{ label: string; isCurrent: boolean }> }>();
            competitors.forEach((c, i) => {
              c.keywords_found.forEach((kw) => {
                const entry = map.get(kw) || { keyword: kw, sources: [] };
                entry.sources.push({ label: `#${i + 1}`, isCurrent: i === openCompetitorIndex });
                map.set(kw, entry);
              });
            });
            (formData.keywords as string[]).forEach((kw) => {
              const entry = map.get(kw) || { keyword: kw, sources: [] };
              entry.sources.push({ label: 'P', isCurrent: false });
              map.set(kw, entry);
            });
            return Array.from(map.values()).sort((a, b) => a.keyword.localeCompare(b.keyword));
          })()}
          onClose={() => setPanelOpen(false)}
          onAddKeyword={(kw) => {
            if (openCompetitorIndex === null) {
              toast.error("Abra um concorrente para adicionar keywords");
              return;
            }
            const newComps = [...competitors];
            if (!newComps[openCompetitorIndex].keywords_found.includes(kw)) {
              newComps[openCompetitorIndex].keywords_found.push(kw);
              setCompetitors(newComps);
            }
          }}
          onRemoveKeyword={(kw) => {
            if (openCompetitorIndex === null) return;
            const newComps = [...competitors];
            newComps[openCompetitorIndex].keywords_found =
              newComps[openCompetitorIndex].keywords_found.filter((k) => k !== kw);
            setCompetitors(newComps);
          }}
          onSendToProduct={() => {
            if (openCompetitorIndex === null) return;
            const kws = competitors[openCompetitorIndex].keywords_found;
            const uniqueKeywords = Array.from(new Set([...(formData.keywords as string[]), ...kws]));
            setFormData({ ...formData, keywords: uniqueKeywords });
            toast.success("Keywords enviadas para o produto!");
          }}
          initialX={120}
          initialY={140}
        />
      )}
    </div>
  );
}

