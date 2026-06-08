// Layout principal autenticado — Sidebar + área de conteúdo
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  title: string;
  breadcrumb?: string;
  children: ReactNode;
}

export function Layout({ title, breadcrumb, children }: LayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground transition-colors duration-200">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center border-b border-sidebar-border px-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            <p className="text-xs text-muted-foreground">
              JTD <span className="mx-1 opacity-50">/</span> {breadcrumb ?? title}
            </p>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
