// Conta anúncios com problema de promoção para badge de alerta.
// Atualiza a cada 60s + escuta mudanças em promo_snapshots via realtime.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const PROBLEM_STATUSES = ["missing_fake", "wrong_discount", "unexpected_promo"];

export function usePromoAlerts() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { count: c } = await supabase
        .from("promo_snapshots")
        .select("id", { count: "exact", head: true })
        .in("status", PROBLEM_STATUSES);
      if (!cancelled) setCount(c ?? 0);
    }

    load();
    const interval = setInterval(load, 60_000);

    const channel = supabase
      .channel("promo_snapshots_alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promo_snapshots" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
