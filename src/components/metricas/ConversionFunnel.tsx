import { motion } from "framer-motion";

export interface FunnelStage {
  label: string;
  value: number;
  color: string; // CSS color
}

interface ConversionFunnelProps {
  stages: FunnelStage[];
  className?: string;
}

/**
 * Vertical animated funnel inspired by ref #5/#6.
 * Each stage renders as a trapezoid row whose width is scaled by stage value
 * relative to the first (top) stage. A glow halo sits behind the funnel.
 */
export function ConversionFunnel({ stages, className }: ConversionFunnelProps) {
  const top = stages[0]?.value || 0;
  const safe = (v: number) => (top > 0 ? Math.max(0.08, v / top) : 0.08);

  return (
    <div className={`relative ${className ?? ""}`}>
      {/* Glow background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 blur-3xl opacity-40"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, var(--primary) 0%, transparent 60%)",
        }}
      />
      <div className="relative flex flex-col gap-1.5">
        {stages.map((stage, i) => {
          const ratio = safe(stage.value);
          const nextRatio = i < stages.length - 1 ? safe(stages[i + 1].value) : ratio * 0.85;
          const pct = i > 0 && stages[i - 1].value > 0
            ? ((stage.value / stages[i - 1].value) * 100).toFixed(1)
            : null;

          return (
            <div key={stage.label} className="relative">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
                className="relative flex items-center justify-center"
              >
                <svg
                  viewBox="0 0 100 24"
                  preserveAspectRatio="none"
                  className="w-full h-12"
                >
                  <defs>
                    <linearGradient id={`funnel-${i}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={stage.color} stopOpacity="0.9" />
                      <stop offset="100%" stopColor={stage.color} stopOpacity="0.55" />
                    </linearGradient>
                  </defs>
                  <motion.polygon
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    points={`${50 - ratio * 50},0 ${50 + ratio * 50},0 ${50 + nextRatio * 50},24 ${50 - nextRatio * 50},24`}
                    fill={`url(#funnel-${i})`}
                    stroke={stage.color}
                    strokeOpacity="0.4"
                    strokeWidth="0.3"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-between px-4">
                  <span className="text-xs font-medium text-foreground/90 uppercase tracking-wider">
                    {stage.label}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {stage.value.toLocaleString("pt-BR")}
                    </span>
                    {pct && (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {pct}%
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
