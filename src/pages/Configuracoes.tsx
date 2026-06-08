// Configurações — inclui logout e tema
import { Settings, LogOut, Sun, Moon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";

export default function Configuracoes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="space-y-6">
      <div className="jtd-glass flex items-center gap-4 p-6 transition-all duration-200">
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4 transition-colors duration-200">
          <Settings size={32} className="text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground transition-colors duration-200">Configurações</h2>
          <p className="text-sm text-muted-foreground transition-colors duration-200">Em construção — Módulo 8</p>
        </div>
      </div>

      <div className="jtd-glass p-6 transition-all duration-200">
        <h3 className="mb-6 text-sm uppercase tracking-wider text-muted-foreground transition-colors duration-200">Aparência</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground transition-colors duration-200">Tema do aplicativo</p>
            <p className="text-xs text-muted-foreground transition-colors duration-200">Selecione entre o modo claro e escuro</p>
          </div>
          
          <div className="flex items-center gap-1 rounded-lg border border-sidebar-border bg-sidebar p-1 transition-colors duration-200">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                theme === 'light' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Sun size={14} />
              Claro
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                theme === 'dark' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Moon size={14} />
              Escuro
            </button>
          </div>
        </div>
      </div>

      <div className="jtd-glass p-6 transition-all duration-200">
        <h3 className="mb-4 text-sm uppercase tracking-wider text-muted-foreground transition-colors duration-200">Sessão</h3>
        <div className="mb-4 flex items-center justify-between border-b border-sidebar-border pb-4 transition-colors duration-200">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground transition-colors duration-200">Usuário</p>
            <p className="font-mono text-sm text-foreground transition-colors duration-200">{user?.email ?? "—"}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-[6px] border border-destructive bg-transparent px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </div>
  );
}
