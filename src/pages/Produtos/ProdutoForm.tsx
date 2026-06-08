import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Plus, Truck, X, Save, ArrowLeft, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FloatingKeywordPanel from "@/components/FloatingKeywordPanel";

interface ProdutoFormProps {
  productId?: string;
}

export default function ProdutoForm({ productId }: ProdutoFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
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

  useEffect(() => {
    fetchSuppliers();
    if (productId) fetchProduct();
  }, [productId]);

  async function fetchSuppliers() {
    const { data } = await supabase.from("suppliers").select("id, name, delivery_days, warranty_days").eq("is_active", true);
    setSuppliers(data || []);
  }

  async function fetchProduct() {
    const { data, error } = await supabase.from("products").select("*").eq("id", productId).single();
    if (data) setFormData(data as any);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    // Auto-generate SKU if empty
    const sku = formData.sku || `PRD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    const payload = { ...formData, sku };

    try {
      if (productId) {
        await supabase.from("products").update(payload).eq("id", productId);
        toast.success("Produto atualizado!");
      } else {
        await supabase.from("products").insert([payload]);
        toast.success("Produto criado!");
      }
      navigate({ to: "/produtos" });
    } catch (error) {
      toast.error("Erro ao salvar produto.");
    } finally {
      setSaving(false);
    }
  }

  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 size={32} className="animate-spin text-primary" /></div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-20 animate-in fade-in duration-300">
      <button type="button" onClick={() => navigate({ to: "/produtos" })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Voltar para Produtos
      </button>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Coluna Esquerda */}
        <div className="lg:col-span-2 space-y-6">
          <div className="jtd-glass p-6 space-y-4">
            <h3 className="font-bold text-foreground">Informações Básicas</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Nome*</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded border border-sidebar-border bg-accent/5 p-2 text-sm text-foreground focus:border-primary" />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">SKU</label>
                <div className="flex gap-2">
                  <input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full rounded border border-sidebar-border bg-accent/5 p-2 text-sm text-foreground focus:border-primary" placeholder="Gerado automaticamente..." />
                  <button type="button" onClick={() => setFormData({...formData, sku: `PRD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`})} className="text-[10px] bg-accent/10 px-2 rounded">GERAR</button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Fornecedor</label>
                <select value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})} className="w-full rounded border border-sidebar-border bg-accent/5 p-2 text-sm text-foreground">
                  <option value="">Selecionar...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {selectedSupplier && (
                  <p className="mt-1 text-[10px] text-primary">Entrega: {selectedSupplier.delivery_days}d | Garantia: {selectedSupplier.warranty_days}d</p>
                )}
              </div>
            </div>
            
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Descrição interna" className="w-full rounded border border-sidebar-border bg-accent/5 p-2 text-sm text-foreground h-24" />
          </div>
        </div>

        {/* Coluna Direita */}
        <div className="space-y-6">
          <div className="jtd-glass p-6">
            <h3 className="font-bold text-foreground mb-4">Análise</h3>
            <p className="text-muted-foreground text-sm italic">Em breve: integração com análise de concorrentes.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-6 border-t border-sidebar-border">
        <button type="submit" disabled={saving} className="flex items-center gap-2 bg-primary px-6 py-2 rounded font-bold text-black text-sm hover:brightness-110">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} SALVAR PRODUTO
        </button>
      </div>
    </form>
  );
}
