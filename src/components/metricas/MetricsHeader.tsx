import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type MetricsPeriod = "7D" | "30D" | "90D";

interface MetricsHeaderProps {
  period: MetricsPeriod;
  onPeriodChange: (p: MetricsPeriod) => void;
  onRefresh?: () => void;
  loading?: boolean;
  subtitle?: string;
}

const periodLabel: Record<MetricsPeriod, string> = {
  "7D": "Últimos 7 dias",
  "30D": "Últimos 30 dias",
  "90D": "Últimos 90 dias",
};

export function MetricsHeader({
  period,
  onPeriodChange,
  onRefresh,
  loading,
  subtitle,
}: MetricsHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Métricas</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Select value={period} onValueChange={(v) => onPeriodChange(v as MetricsPeriod)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(periodLabel) as MetricsPeriod[]).map((p) => (
              <SelectItem key={p} value={p}>
                {periodLabel[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onRefresh && (
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
            <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>
    </div>
  );
}
