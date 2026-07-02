// Aba Promoções — monitora se cada anúncio ML está com a promoção fake correta.
// Fonte da verdade: `ads.fake_discount` (esperado) vs ML `original_price/price` (real).
// Snapshots persistidos em `promo_snapshots`. Refresh manual + cron horário público.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, AlertTriangle, CheckCircle2, Tag, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Status = "ok" | "missing_fake" | "wrong_discount" | "unexpected_promo" | "no_ml" | "unknown";

interface Row {
  ad_id: string;
  ml_item_id: string | null;
  title: string;
  expected_discount_pct: number; // 0 = sem promo fake esperada
  price: number | null;
  original_price: number | null;
  ml_discount_pct: number | null;
  deal_ids: string[];
  status: Status;
}

const TOLERANCE = 1; // ±1 p.p.

function computeStatus(expected: number, price: number | null, original: number | null): { status: Status; discount: number | null } {
  if (price == null) return { status: "no_ml", discount: null };
  const hasReal = original != null && original > price;
  const realPct = hasReal ? ((original! - price) / original!) * 100 : 0;
  if (expected > 0) {
    if (!hasReal) return { status: "missing_fake", discount: 0 };
    return {
      status: Math.abs(realPct - expected) <= TOLERANCE ? "ok" : "wrong_discount",
      discount: realPct,
    };
  }
  // esperado sem promo
  if (hasReal) return { status: "unexpected_promo", discount: realPct };
  return { status: "ok", discount: 0 };
}

const STATUS_META: Record<Status, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  ok: { label: "OK", className: "border-primary/40 text-primary bg-primary/10", icon: CheckCircle2 },
  missing_fake: { label: "Recolocar promo fake", className: "border-destructive/40 text-destructive bg-destructive/10", icon: AlertTriangle },
  wrong_discount: { label: "Desconto divergente", className: "border-amber-500/40 text-amber-500 bg-amber-500/10", icon: AlertTriangle },
  unexpected_promo: { label: "Promo indevida", className: "border-amber-500/40 text-amber-500 bg-amber-500/10", icon: AlertTriangle },
  no_ml: { label: "Sem dados ML", className: "text-muted-foreground", icon: AlertTriangle },
  unknown: { label: "—", className: "text-muted-foreground", icon: AlertTriangle },
};

export default function Promocoes() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "ok" | "problem" | "deal">("all");
  const [query, setQuery] = useState("");
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  async function loadFromDB() {
    setLoading(true);
    try {
      const { data: ads } = await supabase
        .from("ads")
        .select("ml_item_id, fake_discount, titles")
        .not("ml_item_id", "is", null);
      const byAd = new Map<string, { fake: number; title?: string }>();
      (ads ?? []).forEach((a: any) => {
        if (a.ml_item_id) byAd.set(a.ml_item_id, {
          fake: Number(a.fake_discount ?? 0),
          title: a.titles?.[0],
        });
      });

      const { data: snaps, error: snapErr } = await supabase
        .from("promo_snapshots")
        .select("ml_item_id, ad_id, price, original_price, ml_discount_pct, deal_ids, status, checked_at, title, expected_discount_pct");
      if (snapErr) throw snapErr;

      const rowsBuilt: Row[] = (snaps ?? []).map((s: any) => {
        const ad = byAd.get(s.ml_item_id);
        const expected = ad ? ad.fake : Number(s.expected_discount_pct ?? 0);
        return {
          ad_id: s.ad_id ?? s.ml_item_id,
          ml_item_id: s.ml_item_id,
          title: ad?.title ?? s.title ?? s.ml_item_id,
          expected_discount_pct: expected,
          price: s.price ?? null,
          original_price: s.original_price ?? null,
          ml_discount_pct: s.ml_discount_pct ?? null,
          deal_ids: (s.deal_ids as string[]) ?? [],
          status: (s.status as Status) ?? "unknown",
        };
      });

      setRows(rowsBuilt);
      const newest = (snaps ?? []).reduce<string | null>(
        (acc, s: any) => (!acc || s.checked_at > acc ? s.checked_at : acc),
        null,
      );
      setLastRefresh(newest);
    } catch (e: any) {
      toast.error(`Erro ao carregar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function refreshFromML() {
    setRefreshing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Não autenticado");

      // 1) Descobre o ML user id (via /users/me)
      const meRes = await supabase.functions.invoke("ml-proxy", {
        body: { endpoint: "/users/me", method: "GET" },
      });
      if (meRes.error) throw new Error(meRes.error.message);
      const mlUserId = meRes.data?.id;
      if (!mlUserId) throw new Error("Não foi possível obter o usuário ML. Reconecte sua conta.");

      // 2) Lista TODOS os IDs de anúncios do usuário no ML (paginado)
      const allIds: string[] = [];
      let scrollId: string | null = null;
      for (let page = 0; page < 20; page++) {
        const currentScroll: string | null = scrollId;
        const qs: string = currentScroll
          ? `search_type=scan&scroll_id=${encodeURIComponent(currentScroll)}`
          : `search_type=scan`;
        const searchRes: { data: any; error: any } = await supabase.functions.invoke("ml-proxy", {
          body: { endpoint: `/users/${mlUserId}/items/search?${qs}&limit=100`, method: "GET" },
        });
        if (searchRes.error) throw new Error(searchRes.error.message);
        const results: string[] = searchRes.data?.results ?? [];
        allIds.push(...results);
        scrollId = (searchRes.data?.scroll_id as string | null) ?? null;
        if (!scrollId || results.length === 0) break;
      }


      if (allIds.length === 0) {
        toast.info("Nenhum anúncio encontrado na sua conta ML.");
        return;
      }

      // 3) Puxa lookup de ads (para casar fake_discount esperado)
      const { data: adsRows } = await supabase
        .from("ads")
        .select("id, ml_item_id, fake_discount")
        .not("ml_item_id", "is", null);
      const adByItem = new Map<string, { id: string; fake: number }>();
      (adsRows ?? []).forEach((a: any) => {
        if (a.ml_item_id) adByItem.set(a.ml_item_id, { id: a.id, fake: Number(a.fake_discount ?? 0) });
      });

      // 4) Batch /items?ids=... (20 por vez) para trazer preço, original_price, título etc.
      let ok = 0, fail = 0;
      for (let i = 0; i < allIds.length; i += 20) {
        const chunk = allIds.slice(i, i + 20);
        const endpoint = `/items?ids=${chunk.join(",")}&attributes=id,title,price,original_price,deal_ids,permalink,thumbnail`;
        const { data, error } = await supabase.functions.invoke("ml-proxy", {
          body: { endpoint, method: "GET" },
        });
        if (error) { fail += chunk.length; continue; }

        const arr = Array.isArray(data) ? data : [];
        const upserts = arr.map((entry: any) => {
          const body = entry?.body;
          const itemId: string = body?.id;
          if (!itemId) return null;
          const price = body?.price ?? null;
          const original = body?.original_price ?? null;
          const deal_ids = body?.deal_ids ?? [];
          const ad = adByItem.get(itemId);
          const expected = ad?.fake ?? 0;
          const { status, discount } = computeStatus(expected, price, original);
          ok++;
          return {
            user_id: userId,
            ml_item_id: itemId,
            ad_id: ad?.id ?? null,
            title: body?.title ?? null,
            permalink: body?.permalink ?? null,
            thumbnail: body?.thumbnail ?? null,
            price,
            original_price: original,
            ml_discount_pct: discount,
            expected_discount_pct: expected,
            deal_ids,
            has_fake_promo_expected: expected > 0,
            status,
            checked_at: new Date().toISOString(),
          };
        }).filter(Boolean);

        if (upserts.length) {
          const { error: upErr } = await supabase
            .from("promo_snapshots")
            .upsert(upserts as any, { onConflict: "user_id,ml_item_id" });
          if (upErr) fail += upserts.length;
        }
      }

      toast.success(`${ok} anúncios atualizados do ML${fail ? ` (${fail} falharam)` : ""}.`);
      await loadFromDB();
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  }


  useEffect(() => { loadFromDB(); }, []);

  const counts = useMemo(() => {
    let ok = 0, problem = 0, deal = 0;
    rows.forEach((r) => {
      if (r.status === "ok") ok++;
      else if (r.status !== "unknown" && r.status !== "no_ml") problem++;
      if (r.deal_ids.length) deal++;
    });
    return { ok, problem, deal, total: rows.length };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filter === "ok") return r.status === "ok";
        if (filter === "problem") return r.status !== "ok" && r.status !== "unknown" && r.status !== "no_ml";
        if (filter === "deal") return r.deal_ids.length > 0;
        return true;
      })
      .filter((r) =>
        q ? r.title.toLowerCase().includes(q) || (r.ml_item_id ?? "").toLowerCase().includes(q) : true,
      )
      .sort((a, b) => {
        const rank = (s: Status) => (s === "missing_fake" ? 0 : s === "wrong_discount" || s === "unexpected_promo" ? 1 : s === "ok" ? 3 : 2);
        return rank(a.status) - rank(b.status);
      });
  }, [rows, filter, query]);

  return (
    <div className="space-y-4">
      {counts.problem > 0 && filter !== "problem" && (
        <button
          type="button"
          onClick={() => setFilter("problem")}
          className="w-full text-left rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-3 hover:bg-destructive/15 transition-colors"
        >
          <AlertTriangle className="size-5 text-destructive shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-bold text-destructive">
              {counts.problem} anúncio{counts.problem > 1 ? "s" : ""} precisam de atenção
            </div>
            <div className="text-xs text-destructive/80 mt-0.5">
              Promoção fake caiu, desconto divergente ou promoção indevida no ML. Clique para ver a lista.
            </div>
          </div>
          <span className="text-xs font-semibold text-destructive underline">Ver pendências →</span>
        </button>
      )}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-[18px] font-bold tracking-tight">Monitor de Promoções</CardTitle>
              <p className="text-[13px] text-muted-foreground mt-1">
                Compara sua promoção fake configurada no anúncio com o que está publicado no ML.
                {lastRefresh && <> · Última atualização: {new Date(lastRefresh).toLocaleString("pt-BR")}</>}
              </p>
            </div>
            <Button onClick={refreshFromML} disabled={refreshing} size="sm">
              <RefreshCw className={cn("size-4 mr-2", refreshing && "animate-spin")} />
              {refreshing ? "Atualizando..." : "Atualizar agora"}
            </Button>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap items-center">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>Todos ({counts.total})</FilterChip>
            <FilterChip active={filter === "ok"} onClick={() => setFilter("ok")} tone="ok">
              <CheckCircle2 className="size-3 mr-1" />OK ({counts.ok})
            </FilterChip>
            <FilterChip active={filter === "problem"} onClick={() => setFilter("problem")} tone="alert">
              <AlertTriangle className="size-3 mr-1" />Problemas ({counts.problem})
            </FilterChip>
            <FilterChip active={filter === "deal"} onClick={() => setFilter("deal")} tone="info">
              <Tag className="size-3 mr-1" />Em evento ML ({counts.deal})
            </FilterChip>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar título ou MLB..." className="pl-8 h-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {rows.length === 0
                ? "Nenhum anúncio com ml_item_id ainda. Clique em Atualizar agora após vincular seus anúncios."
                : "Nada aqui com esse filtro."}
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left font-bold px-4 py-2">Anúncio</th>
                    <th className="text-right font-bold px-3 py-2">Esperado</th>
                    <th className="text-right font-bold px-3 py-2">ML "de"</th>
                    <th className="text-right font-bold px-3 py-2">ML "por"</th>
                    <th className="text-right font-bold px-3 py-2">Desc ML</th>
                    <th className="text-right font-bold px-3 py-2">Status</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const meta = STATUS_META[r.status];
                    return (
                      <tr key={r.ad_id} className="border-t border-border/60 hover:bg-muted/20">
                        <td className="px-4 py-2 max-w-[280px]">
                          <div className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                            {r.title}
                            {r.deal_ids.length > 0 && (
                              <Badge variant="outline" className="border-blue-500/40 text-blue-500 bg-blue-500/10 text-[10px] gap-1">
                                <Tag className="size-2.5" />Evento
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{r.ml_item_id}</div>
                        </td>
                        <td className="text-right px-3 py-2 tabular-nums text-muted-foreground">
                          {r.expected_discount_pct > 0 ? `${r.expected_discount_pct.toFixed(1)}%` : "—"}
                        </td>
                        <td className="text-right px-3 py-2 tabular-nums text-muted-foreground">
                          {r.original_price != null ? fmtBRL(r.original_price) : "—"}
                        </td>
                        <td className="text-right px-3 py-2 tabular-nums font-semibold">
                          {r.price != null ? fmtBRL(r.price) : "—"}
                        </td>
                        <td className="text-right px-3 py-2 tabular-nums">
                          {r.ml_discount_pct != null && r.ml_discount_pct > 0 ? `${r.ml_discount_pct.toFixed(1)}%` : "—"}
                        </td>
                        <td className="text-right px-3 py-2">
                          <Badge variant="outline" className={cn("gap-1 text-xs font-bold", meta.className)}>
                            <meta.icon className="size-3" />{meta.label}
                          </Badge>
                        </td>
                        <td className="px-2">
                          {r.ml_item_id && (
                            <a
                              href={`https://mercadolivre.com.br/p/${r.ml_item_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                              title="Abrir no ML"
                            >
                              <ExternalLink className="size-4" />
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FilterChip({
  active, onClick, children, tone,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode;
  tone?: "ok" | "alert" | "info";
}) {
  const toneClass =
    tone === "ok" ? "border-primary/50 text-primary bg-primary/10"
    : tone === "alert" ? "border-destructive/50 text-destructive bg-destructive/10"
    : tone === "info" ? "border-blue-500/50 text-blue-500 bg-blue-500/10"
    : "border-border text-muted-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-xs px-3 py-1.5 rounded-md border transition-colors flex items-center",
        active ? toneClass : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
