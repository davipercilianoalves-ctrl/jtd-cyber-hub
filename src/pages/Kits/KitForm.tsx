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
      setKitProducts(kit_products);
    }
    setLoading(false);
  }

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
    setSaving(true);
    try {
      if (id) {
        await supabase.from("kits").update(formData).eq("id", id);
        await supabase.from("kit_products").delete().eq("kit_id", id);
        await supabase.from("kit_products").insert(kitProducts.map(kp => ({ kit_id: id, product_id: kp.product_id, quantity: kp.quantity })));
      } else {
        const { data } = await supabase.from("kits").insert([formData]).select().single();
        await supabase.from("kit_products").insert(kitProducts.map(kp => ({ kit_id: data.id, product_id: kp.product_id, quantity: kp.quantity })));
      }
      toast.success("Kit salvo!");
      navigate({ to: "/kits" });
    } catch (e) {
      toast.error("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      <Link to="/kits" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit"><ArrowLeft size={16}/> Voltar</Link>
      
      {/* BLOCO 1 — Identificação */}
      <section className="jtd-glass p-6 space-y-4">
        <h3 className="font-bold text-lg text-foreground flex items-center gap-3"><Layers size={20} className="text-primary"/> Identificação</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3 space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nome do Kit*</label>
            <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-internal-20 rounded border border-sidebar-border p-3 focus:border-primary outline-none" />
          </div>
          <div className="col-span-2 flex gap-2">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SKU</label>
              <input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full bg-internal-20 rounded border border-sidebar-border p-3 focus:border-primary outline-none" />
            </div>
            <button onClick={() => setFormData({...formData, sku: `KIT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`})} className="bg-primary text-black px-4 font-bold rounded mt-5">GERAR</button>
          </div>
        </div>
      </section>

      {/* BLOCO 2 — Produtos */}
      <section className="jtd-glass p-6 space-y-4">
        <h3 className="font-bold text-lg text-foreground flex items-center gap-3"><Package size={20} className="text-primary"/> Produtos do Kit</h3>
        {kitProducts.map((kp, i) => (
          <div key={i} className="flex justify-between items-center p-3 border border-sidebar-border rounded bg-internal-20">
            <div>
              <p className="font-bold text-sm">{kp.products?.name}</p>
              <p className="text-[10px] text-muted-foreground">{kp.products?.sku} - Custo: R$ {kp.products?.cost_price}</p>
            </div>
            <div className="flex items-center gap-4">
              <input type="number" min="1" value={kp.quantity} onChange={e => { const n = [...kitProducts]; n[i].quantity = Number(e.target.value); setKitProducts(n); }} className="w-16 bg-black/20 p-1 text-center rounded border border-sidebar-border"/>
              <button onClick={() => setKitProducts(kitProducts.filter((_, idx) => idx !== i))} className="text-red-500"><Trash2 size={18}/></button>
            </div>
          </div>
        ))}
        <select onChange={e => { const p = products.find(prod => prod.id === e.target.value); if (p) setKitProducts([...kitProducts, { product_id: p.id, products: p, quantity: 1 }]); }} className="w-full bg-internal-20 p-3 rounded border border-dashed border-sidebar-border text-center">
          <option>+ ADICIONAR PRODUTO</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="text-lime-500 font-bold">Custo Total dos Produtos: R$ {costTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
      </section>

      {/* BLOCO 5/6 (Precificação Simplificada) */}
      <section className="jtd-glass p-6 space-y-4">
        <h3 className="font-bold text-lg text-foreground">Precificação</h3>
        <div className="grid grid-cols-2 gap-4">
            <input type="number" placeholder="Taxa MK (%)" onChange={e => setFormData({...formData, marketplace_fee: Number(e.target.value)})} className="bg-internal-20 p-3 rounded"/>
            <input type="number" placeholder="Frete (R$)" onChange={e => setFormData({...formData, shipping_cost: Number(e.target.value)})} className="bg-internal-20 p-3 rounded"/>
        </div>
        <div className="p-4 bg-internal-40 rounded">
            <p className="text-2xl font-black text-cyan-400">R$ {calcs.venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-lime-500 font-bold">{calcs.margemReal.toFixed(1)}% de margem</p>
        </div>
      </section>

      <div className="flex justify-end gap-4">
        <button onClick={() => navigate({ to: "/kits" })} className="px-6 py-2 border rounded">CANCELAR</button>
        <button onClick={handleSubmit} className="bg-primary px-6 py-2 rounded text-black font-bold">SALVAR KIT</button>
      </div>
    </div>
  );
}
