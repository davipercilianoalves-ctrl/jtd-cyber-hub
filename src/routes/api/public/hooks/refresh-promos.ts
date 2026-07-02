// Endpoint público chamado pelo pg_cron horário.
// Itera todos os ml_tokens, puxa anúncios do ML e atualiza promo_snapshots.
// Autenticação: header `apikey` com a anon key do Supabase (padrão pg_cron).

import { createFileRoute } from "@tanstack/react-router";

const TOLERANCE = 1;

type Status = "ok" | "missing_fake" | "wrong_discount" | "unexpected_promo" | "no_ml";

function computeStatus(expected: number, price: number | null, original: number | null): { status: Status; discount: number | null } {
  if (price == null) return { status: "no_ml", discount: null };
  const hasReal = original != null && original > price;
  const realPct = hasReal ? ((original! - price) / original!) * 100 : 0;
  if (expected > 0) {
    if (!hasReal) return { status: "missing_fake", discount: 0 };
    return { status: Math.abs(realPct - expected) <= TOLERANCE ? "ok" : "wrong_discount", discount: realPct };
  }
  if (hasReal) return { status: "unexpected_promo", discount: realPct };
  return { status: "ok", discount: 0 };
}

async function refreshMlToken(supabaseAdmin: any, token: any) {
  const refreshRes = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ML_CLIENT_ID!,
      client_secret: process.env.ML_CLIENT_SECRET!,
      refresh_token: token.refresh_token,
    }),
  });
  const data = await refreshRes.json();
  if (!data.access_token) return token.access_token;
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await supabaseAdmin.from("ml_tokens").update({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
  }).eq("id", token.id);
  return data.access_token;
}

export const Route = createFileRoute("/api/public/hooks/refresh-promos")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: tokens } = await supabaseAdmin.from("ml_tokens").select("*");
        if (!tokens?.length) {
          return Response.json({ ok: true, users: 0, updated: 0 });
        }

        let totalUpdated = 0;
        const results: any[] = [];

        for (const token of tokens) {
          const userId = token.owner_id;
          if (!userId) continue;

          const { data: ads } = await supabaseAdmin
            .from("ads")
            .select("id, ml_item_id, fake_discount")
            .eq("user_id", userId)
            .not("ml_item_id", "is", null);
          if (!ads?.length) continue;

          const isExpired = new Date(token.expires_at) < new Date();
          const accessToken = isExpired ? await refreshMlToken(supabaseAdmin, token) : token.access_token;

          for (let i = 0; i < ads.length; i += 20) {
            const chunk = ads.slice(i, i + 20);
            const ids = chunk.map((a: any) => a.ml_item_id).join(",");
            const url = `https://api.mercadolibre.com/items?ids=${ids}&attributes=id,price,original_price,deal_ids`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (!res.ok) continue;
            const arr = await res.json();

            const upserts = chunk.map((ad: any) => {
              const found = Array.isArray(arr) ? arr.find((x: any) => x?.body?.id === ad.ml_item_id) : null;
              const body = found?.body;
              const price = body?.price ?? null;
              const original = body?.original_price ?? null;
              const deal_ids = body?.deal_ids ?? [];
              const expectedPct = Number(ad.fake_discount ?? 0);
              const { status, discount } = computeStatus(expectedPct, price, original);
              return {
                user_id: userId,
                ml_item_id: ad.ml_item_id,
                ad_id: ad.id,
                price, original_price: original,
                ml_discount_pct: discount,
                expected_discount_pct: expectedPct,
                deal_ids,
                has_fake_promo_expected: expectedPct > 0,
                status,
                checked_at: new Date().toISOString(),
              };
            });

            const { error } = await supabaseAdmin
              .from("promo_snapshots")
              .upsert(upserts, { onConflict: "user_id,ml_item_id" });
            if (!error) totalUpdated += upserts.length;
          }
          results.push({ userId, ads: ads.length });
        }

        return Response.json({ ok: true, users: results.length, updated: totalUpdated, results });
      },
    },
  },
});
