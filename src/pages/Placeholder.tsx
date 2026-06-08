// Componente reutilizável para telas em construção
import type { LucideIcon } from "lucide-react";

interface PlaceholderProps {
  title: string;
  moduleNumber: number;
  icon: LucideIcon;
}

export function Placeholder({ title, moduleNumber, icon: Icon }: PlaceholderProps) {
  return (
    <div className="jtd-glass flex min-h-[60vh] flex-col items-center justify-center gap-6 p-12 text-center">
      <div className="rounded-full border border-[rgba(191,255,0,0.3)] bg-[rgba(191,255,0,0.05)] p-8">
        <Icon size={72} color="#BFFF00" strokeWidth={1.5} />
      </div>
      <div>
        <h2 className="text-3xl font-bold text-white">{title}</h2>
        <p className="mt-2 text-sm text-[#A0A0A0]">
          Em construção — Módulo {moduleNumber}
        </p>
      </div>
    </div>
  );
}
