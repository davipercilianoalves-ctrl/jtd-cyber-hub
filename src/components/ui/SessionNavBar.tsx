"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge"
import {
  Blocks,
  ChevronsUpDown,
  FileClock,
  GraduationCap,
  Layout,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  MessagesSquare,
  Plus,
  Settings,
  UserCircle,
  UserCog,
  UserSearch,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

const sidebarVariants = {
  open: {
    width: "15rem",
  },
  closed: {
    width: "3.5rem",
  },
};

const staggerVariants = {
  open: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

const transitionProps: any = {
  type: "spring",
  stiffness: 400,
  damping: 40,
};


export function SessionNavBar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const location = useLocation();
  const pathname = location.pathname;

  const NavItem = ({ href, icon: Icon, label, badge }: { href: string; icon: any; label: string; badge?: string }) => {
    const isActive = pathname === href;
    return (
      <li className="mb-1">
        <Link
          to={href}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
            isActive 
              ? "bg-primary text-primary-foreground" 
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm font-medium whitespace-nowrap overflow-hidden"
            >
              {label}
            </motion.span>
          )}
          {!isCollapsed && badge && (
            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 h-4">
              {badge}
            </Badge>
          )}
        </Link>
      </li>
    );
  };

  return (
    <motion.div
      className="fixed left-0 top-0 z-40 h-screen bg-card border-r shadow-sm overflow-hidden flex flex-col"
      initial="closed"
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarVariants}
      transition={transitionProps}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <div className="p-3 flex items-center gap-3 h-16 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold">J</span>
        </div>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col"
          >
            <span className="font-bold text-sm leading-tight text-foreground">JTD Gestão</span>
            <span className="text-[10px] text-muted-foreground">E-commerce</span>
          </motion.div>
        )}
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-2 py-4">
        <motion.ul variants={staggerVariants} className="space-y-1">
          <NavItem href="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/produtos" icon={Blocks} label="Produtos" />
          <NavItem href="/pedidos" icon={FileClock} label="Pedidos" />
          <NavItem href="/analytics" icon={GraduationCap} label="Analytics" />
          <NavItem href="/mensagens" icon={MessagesSquare} label="Mensagens" badge="BETA" />
        </motion.ul>

        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 px-2 mb-2"
          >
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Configurações
            </span>
          </motion.div>
        )}
        <motion.ul variants={staggerVariants} className="space-y-1">
          <NavItem href="/settings" icon={Settings} label="Ajustes" />
          <NavItem href="/integrations" icon={Blocks} label="Integrações" />
        </motion.ul>
      </ScrollArea>

      <Separator />

      <div className="p-2 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={cn("w-full justify-start p-1 h-auto", isCollapsed ? "px-1" : "px-2 py-2")}>
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">U</AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="ml-3 text-left overflow-hidden"
                >
                  <p className="text-xs font-medium text-foreground truncate">Usuário JTD</p>
                  <p className="text-[10px] text-muted-foreground truncate">admin@jtd.com</p>
                </motion.div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56">
            <DropdownMenuItem>
              <UserCircle className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UserCog className="mr-2 h-4 w-4" />
              <span>Minha Conta</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
