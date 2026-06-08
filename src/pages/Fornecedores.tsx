import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Truck, 
  Shield, 
  MoreVertical, 
  X, 
  Check, 
  AlertCircle,
  Loader2,
  Trash2,
  Edit2,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  delivery_days: number | null;
  warranty_days: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", 
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function Fornecedores() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    contact_name: "",
    whatsapp: "",
    email: "",
    city: "",
    state: "",
    delivery_days: 0,
    warranty_days: 0,
    notes: "",
    is_active: true
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");
      
      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast.error("Erro ao carregar fornecedores.");
    } finally {
      setLoading(false);
    }
  }

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.city || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.state || "").toLowerCase().includes(search.toLowerCase())
  );

  function openCreateModal() {
    setEditingSupplier(null);
    setFormData({
      name: "",
      contact_name: "",
      whatsapp: "",
      email: "",
      city: "",
      state: "",
      delivery_days: 0,
      warranty_days: 0,
      notes: "",
      is_active: true
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(supplier: Supplier) {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_name: supplier.contact_name || "",
      whatsapp: supplier.whatsapp || "",
      email: supplier.email || "",
      city: supplier.city || "",
      state: supplier.state || "",
      delivery_days: supplier.delivery_days || 0,
      warranty_days: supplier.warranty_days || 0,
      notes: supplier.notes || "",
      is_active: supplier.is_active
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      setFormError("O nome do fornecedor é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from("suppliers")
          .update(formData)
          .eq("id", editingSupplier.id);
        if (error) throw error;
        toast.success("Fornecedor atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from("suppliers")
          .insert([formData]);
        if (error) throw error;
        toast.success("Fornecedor salvo com sucesso");
      }
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast.error("Erro ao salvar fornecedor.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleVerProdutos() {
    toast("Em breve: produtos vinculados a este fornecedor", {
      icon: <ExternalLink size={16} />
    });
  }

  // Máscara WhatsApp (00) 00000-0000
  function formatWhatsApp(val: string) {
    const numbers = val.replace(/\D/g, "");
    if (numbers.length <= 11) {
      let formatted = numbers;
      if (numbers.length > 2) formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
      if (numbers.length > 7) formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
      return formatted;
    }
    return val;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground transition-colors duration-200">Fornecedores</h1>
          <p className="text-sm text-muted-foreground transition-colors duration-200">Gerencie seus fornecedores e condições comerciais</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-[8px] bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <Plus size={18} />
          NOVO FORNECEDOR
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search size={18} className="text-muted-foreground" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, cidade ou estado..."
          className="w-full rounded-[8px] border border-sidebar-border bg-accent/5 py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-all duration-200"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 size={40} className="animate-spin text-primary" />
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="jtd-glass flex min-h-[40vh] flex-col items-center justify-center gap-6 p-12 text-center">
          <div className="rounded-full border border-primary/30 bg-primary/5 p-8">
            <Truck size={64} className="text-primary opacity-50" strokeWidth={1} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Nenhum fornecedor encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">Clique em + Novo Fornecedor para começar ou ajuste sua busca</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-bold text-primary-foreground"
          >
            <Plus size={16} />
            CRIAR AGORA
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="jtd-glass flex flex-col p-6 transition-all duration-200 hover:border-primary/30">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground line-clamp-1">{supplier.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {supplier.city}{supplier.state ? `, ${supplier.state}` : ""}
                  </p>
                </div>
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  supplier.is_active 
                    ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                    : "bg-red-500/10 text-red-500 border border-red-500/20"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${supplier.is_active ? "bg-green-500" : "bg-red-500"}`} />
                  {supplier.is_active ? "Ativo" : "Inativo"}
                </div>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10">
                    <Truck size={14} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider opacity-60">Entrega</p>
                    <p className="font-medium text-foreground">{supplier.delivery_days || 0} dias</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10">
                    <Shield size={14} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider opacity-60">Garantia</p>
                    <p className="font-medium text-foreground">{supplier.warranty_days || 0} dias</p>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex items-center gap-2 pt-4 border-t border-sidebar-border">
                <button
                  onClick={() => openEditModal(supplier)}
                  className="flex-1 rounded-md border border-primary px-3 py-2 text-xs font-bold text-primary transition-all hover:bg-primary/5 active:scale-[0.98]"
                >
                  EDITAR
                </button>
                <button
                  onClick={handleVerProdutos}
                  className="flex-1 rounded-md border border-sidebar-border px-3 py-2 text-xs font-bold text-muted-foreground transition-all hover:bg-accent/10 active:scale-[0.98]"
                >
                  VER PRODUTOS
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="jtd-glass relative w-full max-w-[560px] max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
                </h2>
                <p className="text-xs text-muted-foreground">Preencha as informações comerciais</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-accent/10 hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Nome do Fornecedor*
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full rounded-[6px] border ${formError ? "border-red-500" : "border-sidebar-border"} bg-accent/5 px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors`}
                    placeholder="Ex: Tech Solutions Ltda"
                  />
                  {formError && <p className="mt-1 text-[10px] font-medium text-red-500">{formError}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Nome do Contato
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full rounded-[6px] border border-sidebar-border bg-accent/5 px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                    placeholder="Nome da pessoa"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: formatWhatsApp(e.target.value) })}
                    className="w-full rounded-[6px] border border-sidebar-border bg-accent/5 px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-[6px] border border-sidebar-border bg-accent/5 px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                    placeholder="email@fornecedor.com"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-[6px] border border-sidebar-border bg-accent/5 px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                    placeholder="Cidade"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Estado
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full rounded-[6px] border border-sidebar-border bg-accent/5 px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none transition-colors appearance-none"
                  >
                    <option value="">Selecione...</option>
                    {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Entrega (dias)
                  </label>
                  <input
                    type="number"
                    value={formData.delivery_days}
                    onChange={(e) => setFormData({ ...formData, delivery_days: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-[6px] border border-sidebar-border bg-accent/5 px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                    min="0"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Garantia (dias)
                  </label>
                  <input
                    type="number"
                    value={formData.warranty_days}
                    onChange={(e) => setFormData({ ...formData, warranty_days: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-[6px] border border-sidebar-border bg-accent/5 px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                    min="0"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Observações
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full rounded-[6px] border border-sidebar-border bg-accent/5 px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors resize-none"
                    placeholder="Notas internas e condições comerciais..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-10 h-5 rounded-full transition-colors ${formData.is_active ? "bg-primary" : "bg-muted"}`} />
                      <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${formData.is_active ? "translate-x-5" : ""}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground">Fornecedor Ativo</span>
                  </label>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-3 pt-6 border-t border-sidebar-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-md border border-sidebar-border px-4 py-2 text-sm font-bold text-muted-foreground transition-all hover:bg-accent/10"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {isSaving && <Loader2 size={16} className="animate-spin" />}
                  SALVAR FORNECEDOR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
