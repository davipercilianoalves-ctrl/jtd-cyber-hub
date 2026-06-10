import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
import { 
  Loader2, Save, ArrowLeft, Trash2, Layers, ChevronDown, ChevronUp, DollarSign, Plus, Tag, Video, Play, Copy, X, Package 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function KitForm() {
  const navigate = useNavigate();
  const { id } = useParams({ strict: false }) as { id?: string };
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [kitProducts, setKitProducts] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    keywords: [] as string[],
    titles: [""] as string[],
    brief_description: "",
    video_name: "",
    video_script: "",
    video_youtube_url: "",
    marketplace_fee: 0,
    shipping_cost: 0,
    packaging_cost: 0,
    transport_cost: 0,
    tax: 0,
    profit_margin: 0,
    fake_discount: 0,
    final_price: 0,
    fake_price: 0,
    is_active: true
  });

  const textareaStyle: React.CSSProperties = { minHeight: '80px', overflow: 'hidden', resize: 'none' };

  function autoResize(target: HTMLElement | null) {
    if (!target) return;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  }

  useEffect(() => {
    fetchProducts();
    if (id) fetchKit();
  }, [id]);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("id, name, sku, cost_price, keywords").eq("is_active", true);
    setProducts(data || []);
  }

  async function fetchKit() {
    if (!id) return;
    const { data, error } = await supabase.from("kits").select("*, kit_products(*, products(name, sku, cost_price, keywords))").eq("id", id).single();
    if (data) {
      const { kit_products, ...rest } = data as any;
      setFormData(rest);
      setKitProducts(kit_products || []);
    }
    setLoading(false);
  }

  // Herança automática de keywords
  useEffect(() => {
    const allKeywords = new Set<string>(formData.keywords);
    kitProducts.forEach(kp => {
      if (kp.products?.keywords) {
        kp.products.keywords.forEach((kw: string) => allKeywords.add(kw));
      }
    });
    const updatedKeywords = Array.from(allKeywords);
    if (JSON.stringify(updatedKeywords) !== JSON.stringify(formData.keywords)) {
      setFormData(prev => ({ ...prev, keywords: updatedKeywords }));
    }
  }, [kitProducts]);

  const costTotal = kitProducts.reduce((acc, kp) => acc + ((kp.products?.cost_price || 0) * kp.quantity), 0);

  const calculations = () => {
    const divisor = (1 - (Number(formData.marketplace_fee) / 100) - (Number(formData.tax) / 100) - (Number(formData.profit_margin) / 100));
    const totalCost = costTotal + Number(formData.shipping_cost) + Number(formData.packaging_cost) + Number(formData.transport_cost);
    const venda = divisor > 0 ? totalCost / divisor : 0;
    const riscado = venda * (1 + (Number(formData.fake_discount) / 100));
    const lucroReal = venda * (Number(formData.profit_margin) / 100);
    const margemReal = venda > 0 ? (lucroReal / venda) * 100 : 0;

    return { totalCost, venda, riscado, lucroReal, margemReal };
  };

  const calcs = calculations();

  useEffect(() => {
    setFormData(prev => ({ ...prev, final_price: calcs.venda, fake_price: calcs.riscado }));
  }, [calcs.venda, calcs.riscado]);

  async function handleSubmit() {
    if (!formData.name) return toast.error("Nome é obrigatório.");
    if (kitProducts.length === 0) return toast.error("Adicione ao menos um produto.");

    setSaving(true);
    try {
      let kitId = id;
      if (id) {
        await supabase.from("kits").update(formData).eq("id", id);
        await supabase.from("kit_products").delete().eq("kit_id", id);
      } else {
        const { data, error } = await supabase.from("kits").insert([formData]).select().single();
        if (error) throw error;
        kitId = data.id;
      }

      if (kitId) {
        await supabase.from("kit_products").insert(
          kitProducts.map(kp => ({ kit_id: kitId, product_id: kp.product_id, quantity: kp.quantity }))
        );
      }
      
      toast.success("Kit salvo com sucesso!");
      navigate({ to: "/kits" });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar o kit.");
    } finally {
      setSaving(false);
    }
  }

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

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 size={32} className="animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      <Link to="/kits" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ArrowLeft size={16}/> Voltar para Kits
      </Link>
      
      {/* BLOCO 1 — Identificação */}
      <section className="jtd-glass p-6 space-y-6 relative">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
            <Layers size={20} className="text-primary" /> Identificação do Kit
          </h3>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-black uppercase ${formData.is_active ? "text-primary" : "text-muted-foreground"}`}>
              {formData.is_active ? "Ativo" : "Inativo"}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="sr-only peer" />
              <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-all duration-300"></div>
              <div className="absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-all duration-300 peer-checked:translate-x-5"></div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-3 space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nome do Kit*</label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-lg font-bold focus:border-primary outline-none transition-all" placeholder="Ex: Kit Teclado + Mouse Gamer" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SKU</label>
            <div className="flex gap-2">
              <input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="flex-1 rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary outline-none font-mono" placeholder="KIT-001" />
              <button type="button" onClick={() => setFormData({...formData, sku: `KIT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`})} className="bg-primary text-black font-bold px-4 rounded text-xs hover:brightness-110 transition-all uppercase">GERAR</button>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 2 — Produtos do Kit */}
      <section className="jtd-glass p-6 space-y-6">
        <h3 className="font-bold text-lg text-foreground flex items-center gap-3"><Package size={20} className="text-primary"/> Produtos do Kit</h3>
        
        <div className="space-y-3">
          {kitProducts.map((kp, i) => (
            <div key={i} className="flex justify-between items-center p-4 border border-sidebar-border rounded bg-internal-w03 hover:bg-internal-w04 transition-colors">
              <div className="space-y-1">
                <p className="font-bold text-sm text-foreground">{kp.products?.name}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                  <span>SKU: {kp.products?.sku}</span>
                  <span className="opacity-30">•</span>
                  <span>Custo Unit: R$ {kp.products?.cost_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <label className="text-[8px] font-bold text-muted-foreground uppercase">QTD</label>
                  <input type="number" min="1" value={kp.quantity} onChange={e => { const n = [...kitProducts]; n[i].quantity = Math.max(1, parseInt(e.target.value) || 1); setKitProducts(n); }} className="w-16 bg-black/20 p-2 text-center rounded border border-sidebar-border font-bold" />
                </div>
                <button onClick={() => setKitProducts(kitProducts.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
              </div>
            </div>
          ))}
          
          <div className="relative group">
            <select 
              value="" 
              onChange={e => { 
                const p = products.find(prod => prod.id === e.target.value); 
                if (p && !kitProducts.find(kp => kp.product_id === p.id)) {
                  setKitProducts([...kitProducts, { product_id: p.id, products: p, quantity: 1 }]); 
                } else if (p) {
                  toast.info("Este produto já está no kit.");
                }
              }} 
              className="w-full bg-internal-20 p-4 rounded border border-dashed border-sidebar-border text-center text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary transition-all cursor-pointer appearance-none"
            >
              <option value="" disabled>+ ADICIONAR PRODUTO AO KIT</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-sidebar-border/30 flex justify-between items-center">
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Resumo Financeiro da Composição</span>
          <div className="text-lime-500 font-black text-lg">Custo Total dos Produtos: R$ {costTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
      </section>

      {/* BLOCO 3 — Palavras-Chave */}
      <section className="jtd-glass p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg text-foreground">Palavras-Chave</h3>
          <div className="flex gap-4">
            <button type="button" onClick={() => { navigator.clipboard.writeText(formData.keywords.join(", ")); toast.success("Copiado!"); }} className="text-[10px] font-bold text-muted-foreground hover:text-primary uppercase">Copiar Todas</button>
            <button type="button" onClick={() => { navigator.clipboard.writeText(selectedKeywords.join(", ")); toast.success("Copiado!"); }} disabled={selectedKeywords.length === 0} className={`text-[10px] font-bold uppercase ${selectedKeywords.length === 0 ? "opacity-30" : "hover:text-primary"}`}>Copiar Selecionadas</button>
          </div>
        </div>

        <div className="space-y-4">
          {kitProducts.map((kp, idx) => kp.products?.keywords?.length > 0 && (
            <div key={idx} className="space-y-2">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">— {kp.products.name} —</p>
              <div className="flex flex-wrap gap-2">
                {kp.products.keywords.map((kw: string, i: number) => {
                  const used = isKeywordUsed(kw);
                  return (
                    <div key={i} onClick={() => toggleSelectedKeyword(kw)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-all ${selectedKeywords.includes(kw) ? "bg-primary text-black border-primary font-bold" : "bg-primary/5 border-primary/20 text-primary/70 hover:bg-primary/10"}`}>
                      <span className={`text-[11px] ${used ? "opacity-40 line-through" : ""}`}>{kw}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          <div className="space-y-2 pt-2 border-t border-sidebar-border/20">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">— Keywords Manuais do Kit —</p>
            <div className="flex flex-wrap gap-2">
              {formData.keywords.filter(kw => !kitProducts.some(kp => kp.products?.keywords?.includes(kw))).map((kw, i) => (
                <div key={i} onClick={() => toggleSelectedKeyword(kw)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-all ${selectedKeywords.includes(kw) ? "bg-primary text-black border-primary font-bold" : "bg-primary/5 border-primary/20 text-primary/70 hover:bg-primary/10"}`}>
                  <span className="text-[11px]">{kw}</span>
                  <X size={12} onClick={(e) => { e.stopPropagation(); setFormData({...formData, keywords: formData.keywords.filter(k => k !== kw)}); }}/>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <input value={newKeywordInput} onChange={e => setNewKeywordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (setFormData({...formData, keywords: [...formData.keywords, newKeywordInput.trim()]}), setNewKeywordInput(""))} className="flex-1 bg-internal-20 rounded border border-sidebar-border p-2 text-xs focus:border-primary outline-none" placeholder="Adicionar manual..." />
              <button onClick={() => { setFormData({...formData, keywords: [...formData.keywords, newKeywordInput.trim()]}); setNewKeywordInput(""); }} className="bg-primary text-black font-bold px-4 rounded text-[10px]">ADD</button>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 4 — Títulos */}
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
                <textarea value={title} onChange={e => { const n = [...formData.titles]; n[idx] = e.target.value; setFormData({...formData, titles: n}); autoResize(e.target); }} style={textareaStyle} className="flex-1 rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary outline-none" placeholder="Título do kit..." />
                <button onClick={() => setFormData({...formData, titles: formData.titles.filter((_, i) => i !== idx)})} className="text-muted-foreground hover:text-red-500"><Trash2 size={20}/></button>
              </div>
            </div>
          ))}
          <button onClick={() => setFormData({...formData, titles: [...formData.titles, ""]})} className="w-full border-2 border-dashed border-sidebar-border rounded-lg py-4 text-muted-foreground hover:border-primary/50 hover:text-primary flex items-center justify-center gap-2 transition-all">
            <Plus size={20}/> <span className="font-bold text-xs uppercase tracking-widest">ADICIONAR TÍTULO</span>
          </button>
        </div>
      </section>

      {/* BLOCO 5 — Descrição */}
      <section className="jtd-glass p-6 space-y-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Breve Descrição</label>
          <textarea value={formData.brief_description} onChange={e => { setFormData({...formData, brief_description: e.target.value}); autoResize(e.target); }} style={textareaStyle} className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary outline-none" placeholder="Resumo técnico do kit..." />
        </div>
        <button onClick={() => setShowTemplateModal(true)} className="w-full bg-white/5 border border-sidebar-border rounded py-3 text-xs font-bold text-foreground hover:bg-white/10">VER TEMPLATE IA</button>
      </section>

      {/* BLOCO 6 — Precificação */}
      <section className="jtd-glass p-6 space-y-6">
        <h3 className="font-bold text-lg text-foreground">Precificação do Kit</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Taxa MK (%)", key: "marketplace_fee" },
            { label: "Frete (R$)", key: "shipping_cost" },
            { label: "Embalagem (R$)", key: "packaging_cost" },
            { label: "Transporte (R$)", key: "transport_cost" },
            { label: "Imposto (%)", key: "tax" },
            { label: "Margem Lucro (%)", key: "profit_margin" },
            { label: "Falso Desconto (%)", key: "fake_discount" }
          ].map(field => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">{field.label}</label>
              <input type="number" value={(formData as any)[field.key]} onChange={e => setFormData({...formData, [field.key]: Number(e.target.value)})} className="w-full rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary font-mono" />
            </div>
          ))}
        </div>

        <div className="bg-internal-20 border border-border rounded p-6 space-y-4">
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            <span className="text-muted-foreground">Custo dos Produtos:</span>
            <span className="text-right text-foreground">R$ {costTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span className="text-muted-foreground">Lucro Estimado:</span>
            <span className="text-right font-bold text-lime-500">R$ {calcs.lucroReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="pt-4 border-t border-primary/10 grid grid-cols-2 items-end">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Preço de Venda</p>
              <p className="text-2xl font-black text-cyan-400">R$ {calcs.venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Preço Riscado</p>
              <p className="text-sm font-bold text-muted-foreground/50 line-through">R$ {calcs.riscado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <span className="text-[10px] font-bold text-lime-500 uppercase">Margem Real:</span>
            <span className="text-sm font-black text-lime-500">{calcs.margemReal.toFixed(1)}%</span>
          </div>
        </div>
      </section>

      {/* BLOCO 7 — Vídeo */}
      <section className="jtd-glass p-6 space-y-6">
        <h3 className="font-bold text-lg text-foreground flex items-center gap-3"><Video size={20} className="text-primary"/> Vídeo</h3>
        <input value={formData.video_name} onChange={e => setFormData({...formData, video_name: e.target.value})} className="w-full bg-internal-20 rounded border border-sidebar-border p-3 text-sm" placeholder="Nome do vídeo..." />
        <textarea value={formData.video_script} onChange={e => { setFormData({...formData, video_script: e.target.value}); autoResize(e.target); }} style={textareaStyle} className="w-full bg-internal-20 rounded border border-sidebar-border p-3 text-sm" placeholder="Roteiro..." />
        <div className="flex gap-2">
          <input value={formData.video_youtube_url} onChange={e => setFormData({...formData, video_youtube_url: e.target.value})} className="flex-1 bg-internal-20 rounded border border-sidebar-border p-3 text-sm" placeholder="Link YouTube..." />
          {formData.video_youtube_url && <a href={formData.video_youtube_url} target="_blank" className="bg-primary text-black flex items-center px-4 rounded"><Play size={16} fill="black"/></a>}
        </div>
      </section>

      {/* AÇÕES FINAIS */}
      <div className="flex justify-end gap-4 pt-6">
        <button onClick={() => navigate({ to: "/kits" })} className="px-8 py-3 rounded font-bold text-muted-foreground border border-sidebar-border hover:bg-white/5 text-sm uppercase">CANCELAR</button>
        <button onClick={handleSubmit} disabled={saving} className="bg-lime-500 px-8 py-3 rounded font-bold text-black text-sm hover:brightness-110 active:scale-[0.98] shadow-lg flex items-center gap-2 uppercase">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} SALVAR KIT
        </button>
      </div>

      {/* MODAL TEMPLATE */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="jtd-glass max-w-2xl w-full p-8 relative">
            <button onClick={() => setShowTemplateModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-white"><X size={24}/></button>
            <h2 className="text-xl font-bold text-primary mb-6">Template Kit IA</h2>
            <div className="bg-black/50 border border-sidebar-border rounded p-6 font-mono text-sm leading-relaxed text-muted-foreground h-[400px] overflow-y-auto">
              <p>Crie uma descrição para o kit: <span className="text-foreground">{formData.name}</span></p>
              <p className="mt-4 font-bold">Composição:</p>
              <ul className="list-disc ml-6">{kitProducts.map((kp, i) => <li key={i}>{kp.quantity}x {kp.products?.name}</li>)}</ul>
              <p className="mt-4 font-bold">Keywords:</p>
              <p className="text-lime-500">{formData.keywords.join(", ")}</p>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(`Crie uma descrição para o kit: ${formData.name}\n\nComposição:\n${kitProducts.map(kp => `- ${kp.quantity}x ${kp.products?.name}`).join('\n')}\n\nKeywords: ${formData.keywords.join(', ')}`); toast.success("Copiado!"); }} className="mt-6 w-full bg-lime-500 text-black font-bold py-3 rounded">COPIAR TEMPLATE</button>
          </div>
        </div>
      )}
    </div>
  );
}
