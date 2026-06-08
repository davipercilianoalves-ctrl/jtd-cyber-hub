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
  { to: "/fornecedores", label: "Fornecedores", icon: Truck },
] as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      style={{ width: collapsed ? 64 : 220 }}
      className="flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width,background-color] duration-200"
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <span className="jtd-text-gradient text-2xl font-extrabold tracking-tight">JTD</span>
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
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
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
