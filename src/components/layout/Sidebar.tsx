// Sidebar JTD — fixa, expande no hover do mouse
import { useState, useRef } from "react";
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
  Truck,
  Layers,
  Wallet,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/anuncios", label: "Anúncios", icon: Megaphone },
  { to: "/kits", label: "Kits", icon: Layers },
  { to: "/metricas", label: "Métricas", icon: BarChart2 },
  { to: "/fornecedores", label: "Fornecedores", icon: Truck },
  { to: "/vendas", label: "Vendas", icon: DollarSign },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/compras", label: "Compras", icon: ShoppingCart },
  { to: "/api", label: "API", icon: Plug },
  { to: "/configuracoes", label: "Configuração", icon: Settings },
] as const;

const COLLAPSED_W = 64;
const EXPANDED_W = 220;

export function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleEnter = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setExpanded(true);
  };
  const handleLeave = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setExpanded(false), 180);
  };

  return (
    <aside
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{ width: expanded ? EXPANDED_W : COLLAPSED_W }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-out overflow-hidden"
    >
      {/* Logo */}
      <div
        className={[
          "flex h-16 items-center shrink-0 transition-all duration-300",
          expanded ? "justify-start px-5" : "justify-center px-0",
        ].join(" ")}
      >
        <span
          className={[
            "jtd-text-gradient font-[800] tracking-tight transition-all duration-300",
            expanded ? "text-3xl" : "text-xl",
          ].join(" ")}
        >
          JTD
        </span>
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
                "group flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                expanded ? "gap-3 px-3 py-2 justify-start" : "justify-center px-0 py-2.5",
                active
                  ? "bg-[color:var(--lime)]/10 text-[color:var(--lime)] shadow-[inset_0_0_12px_color-mix(in_oklab,var(--lime)_15%,transparent)]"
                  : "text-muted-foreground hover:bg-muted/10 hover:text-foreground",
              ].join(" ")}
            >
              <Icon
                size={20}
                className={[
                  "shrink-0 transition-transform duration-200 group-hover:scale-110",
                  active ? "text-[color:var(--lime)]" : "text-muted-foreground/70 group-hover:text-foreground",
                ].join(" ")}
              />
              {expanded && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Perfil */}
      <div
        className={[
          "border-t border-sidebar-border py-4 shrink-0 transition-all duration-300",
          expanded ? "px-4" : "px-0 flex justify-center",
        ].join(" ")}
      >
        <div className={["flex items-center", expanded ? "gap-3" : "justify-center"].join(" ")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--lime)]/20 text-[color:var(--lime)] font-bold text-xs">
            U
          </div>
          {expanded && (
            <div className="flex flex-col truncate min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">Usuário JTD</span>
              <span className="text-[10px] text-muted-foreground truncate">admin@jtd.com</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
