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
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/anuncios", label: "Anúncios", icon: Megaphone },
  { to: "/metricas", label: "Métricas", icon: BarChart2 },
  { to: "/compras", label: "Compras", icon: ShoppingCart },
  { to: "/vendas", label: "Vendas", icon: DollarSign },
  { to: "/api", label: "API", icon: Plug },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      style={{ width: collapsed ? 64 : 220, background: "#0A0A0A" }}
      className="flex shrink-0 flex-col border-r border-[rgba(255,255,255,0.06)] transition-[width] duration-200"
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <span className="jtd-text-gradient text-2xl font-extrabold tracking-tight">JTD</span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-[rgba(191,255,0,0.08)] hover:text-[#BFFF00]"
          aria-label="Alternar sidebar"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 px-2 py-2">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              title={label}
              className={[
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                "border-l-2",
                active
                  ? "border-[#BFFF00] bg-[rgba(191,255,0,0.08)] text-[#BFFF00]"
                  : "border-transparent text-[#A0A0A0] hover:bg-[rgba(191,255,0,0.08)] hover:text-white",
              ].join(" ")}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
