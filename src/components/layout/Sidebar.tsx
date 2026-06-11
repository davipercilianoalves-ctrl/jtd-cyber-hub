// Sidebar JTD — fixa, colapsável de 220px para 64px
import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Megaphone,
  BarChart2,
  ShoppingCart,
  DollarSign,
  Plug,
  Settings,
  ChevronLeft,
  ChevronRight,
  Truck,
  Layers,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/anuncios", label: "Anúncios", icon: Megaphone },
  { to: "/kits", label: "Kits", icon: Layers },
  { to: "/metricas", label: "Métricas", icon: BarChart2 },
  { to: "/fornecedores", label: "Fornecedores", icon: Truck },
  { to: "/vendas", label: "Vendas", icon: DollarSign },
  { to: "/compras", label: "Compras", icon: ShoppingCart },
  { to: "/api", label: "API", icon: Plug },
  { to: "/configuracoes", label: "Configuração", icon: Settings },
] as const;


export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      style={{ width: collapsed ? 64 : 220 }}
      className="flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width,background-color] duration-200 h-screen sticky top-0"
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-4 gap-2">
        <div className="flex h-8 w-12 items-center justify-center rounded bg-[#FF00FF] font-black text-white shrink-0">
          JTD
        </div>
        {!collapsed && (
          <span className="font-bold tracking-tight text-foreground truncate">Gestão</span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Alternar sidebar"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>


      {/* Navegação */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              title={label}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group",
                active
                  ? "bg-[#BFFF00]/10 text-[#BFFF00] shadow-[inset_0_0_12px_rgba(191,255,0,0.1)]"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              ].join(" ")}
            >
              <Icon 
                size={20} 
                className={[
                  "shrink-0 transition-transform duration-200 group-hover:scale-110",
                  active ? "text-[#BFFF00]" : "text-muted-foreground/60 group-hover:text-foreground"
                ].join(" ")} 
              />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>


      {/* Perfil do Usuário */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#BFFF00]/20 text-[#BFFF00] font-bold text-xs">
            U
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-foreground truncate">Usuário JTD</span>
              <span className="text-[10px] text-muted-foreground truncate">admin@jtd.com</span>
            </div>
          )}
        </div>
      </div>
    </aside>

  );
}
