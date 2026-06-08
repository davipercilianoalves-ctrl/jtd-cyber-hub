// Configurações — inclui logout
import { Settings, LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Configuracoes() {
  const navigate = useNavigate();
  const { user } = useAuth();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="space-y-6">
      <div className="jtd-glass flex items-center gap-4 p-6">
        <div className="rounded-md border border-[rgba(191,255,0,0.3)] bg-[rgba(191,255,0,0.05)] p-4">
          <Settings size={32} color="#BFFF00" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Configurações</h2>
          <p className="text-sm text-[#A0A0A0]">Em construção — Módulo 8</p>
        </div>
      </div>

      <div className="jtd-glass p-6">
        <h3 className="mb-4 text-sm uppercase tracking-wider text-[#A0A0A0]">Sessão</h3>
        <div className="mb-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#A0A0A0]">Usuário</p>
            <p className="font-mono text-sm text-white">{user?.email ?? "—"}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-[6px] border border-[#FF3366] bg-transparent px-4 py-2 text-sm font-semibold text-[#FF3366] transition-colors hover:bg-[rgba(255,51,102,0.1)]"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </div>
  );
}
