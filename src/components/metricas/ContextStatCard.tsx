import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ContextStatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "primary" | "magenta" | "cyan" | "warning";
  delta?: { value: number; positive: boolean };
  context?: string;
}

const toneStyles: Record<NonNullable<ContextStatCardProps["tone"]>, { bg: string; fg: string }> = {
  primary: { bg: "bg-primary/10", fg: "text-primary" },
  magenta: { bg: "bg-[var(--magenta)]/10", fg: "text-[var(--magenta)]" },
  cyan: { bg: "bg-[var(--cyan)]/10", fg: "text-[var(--cyan)]" },
  warning: { bg: "bg-amber-500/10", fg: "text-amber-500" },
};

export function ContextStatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  delta,
  context,
}: ContextStatCardProps) {
  const t = toneStyles[tone];
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={cn("size-10 rounded-lg flex items-center justify-center", t.bg)}>
          <Icon className={cn("size-5", t.fg)} />
        </div>
        {delta && (
          <Badge
            variant="outline"
            className={cn(
              "gap-1",
              delta.positive
                ? "border-primary/40 text-primary bg-primary/10"
                : "border-destructive/40 text-destructive bg-destructive/10"
            )}
          >
            {delta.positive ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
            {Math.abs(delta.value).toFixed(1)}%
          </Badge>
        )}
      </div>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
        <div className="text-[20px] font-bold tabular-nums tracking-tight mt-1">{value}</div>
        {context && <div className="text-[13px] text-muted-foreground mt-1">{context}</div>}
      </div>
    </Card>
  );
}
