// Componente reutilizável para telas em construção
import type { LucideIcon } from "lucide-react";

interface PlaceholderProps {
  title: string;
  moduleNumber: number;
  icon: LucideIcon;
}

export function Placeholder({ title, moduleNumber, icon: Icon }: PlaceholderProps) {
  return (
    <div className="jtd-glass flex min-h-[60vh] flex-col items-center justify-center gap-6 p-12 text-center transition-all duration-200">
      <div className="rounded-full border border-primary/30 bg-primary/5 p-8 transition-colors duration-200">
        <Icon size={72} className="text-primary" strokeWidth={1.5} />
      </div>
      <div>
        <h2 className="text-3xl font-bold text-foreground transition-colors duration-200">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground transition-colors duration-200">
          Em construção — Módulo {moduleNumber}
        </p>
      </div>
    </div>
  );
}
