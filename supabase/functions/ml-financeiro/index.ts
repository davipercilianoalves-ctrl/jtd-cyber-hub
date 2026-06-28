import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    const { data: { user } } = await supabase.auth.getUser(
      authHeader?.replace("Bearer ", "") ?? ""
    );
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const { data: tokenData } = await supabase
      .from("ml_tokens")
      .select("access_token, user_id, refresh_token")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!tokenData?.access_token) {
      return new Response(
        JSON.stringify({ error: "ML não conectado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, params } = await req.json();
    const headers = {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json",
    };
    const BASE = "https://api.mercadolibre.com";
    const sellerId = tokenData.user_id;

    if (action === "get_orders") {
      const { date_from, date_to, offset = 0, limit = 50 } = params || {};

      const ordersUrl = `${BASE}/orders/search?seller=${sellerId}&order.date_created.from=${date_from}&order.date_created.to=${date_to}&offset=${offset}&limit=${limit}&sort=date_desc`;
      const ordersRes = await fetch(ordersUrl, { headers });
      const ordersData = await ordersRes.json();
      const orders = ordersData.results || [];

      const enriched = await Promise.all(
        orders.map(async (order: any) => {
          const payments = order.payments || [];

          let shipment: any = null;
          if (order.shipping?.id) {
            const shipRes = await fetch(`${BASE}/shipments/${order.shipping.id}`, { headers });
            if (shipRes.ok) shipment = await shipRes.json();
          }

          const grossAmount = order.total_amount || 0;
          const originalPrice = order.order_items?.[0]?.original_price || grossAmount;
          const salePrice = order.order_items?.[0]?.unit_price || grossAmount;
          const fakeDiscount = originalPrice - salePrice;

          const mlFee = payments.reduce(
            (sum: number, p: any) => sum + (p.marketplace_fee || 0),
            0
          );
          const netAmount = grossAmount - Math.abs(mlFee);

          const mainPayment = payments[0] || {};
          const releaseDate = mainPayment.money_release_date || null;
          const releaseStatus =
            mainPayment.money_release_status ||
            (mainPayment.status === "approved" ? "pending" : mainPayment.status);

          return {
            order_id: order.id,
            payment_id: mainPayment.id || null,
            items: (order.order_items || []).map((item: any) => ({
              id: item.item?.id,
              title: item.item?.title,
              quantity: item.quantity,
              unit_price: item.unit_price,
              original_price: item.original_price || item.unit_price,
              variation: item.item?.variation_attributes || [],
            })),
            buyer: {
              id: order.buyer?.id,
              name: order.buyer?.nickname || "—",
              full_name: `${order.buyer?.first_name || ""} ${order.buyer?.last_name || ""}`.trim(),
            },
            shipping_address: shipment
              ? {
                  street: shipment.receiver_address?.street_name,
                  number: shipment.receiver_address?.street_number,
                  city: shipment.receiver_address?.city?.name,
                  state: shipment.receiver_address?.state?.name,
                  zip: shipment.receiver_address?.zip_code,
                }
              : null,
            date_created: order.date_created,
            date_closed: order.date_closed,
            release_date: releaseDate,
            gross_amount: grossAmount,
            original_price: originalPrice,
            sale_price: salePrice,
            fake_discount: fakeDiscount,
            fake_discount_pct:
              originalPrice > 0 ? ((fakeDiscount / originalPrice) * 100).toFixed(1) : "0",
            ml_fee: Math.abs(mlFee),
            net_amount: netAmount,
            order_status: order.status,
            payment_status: mainPayment.status || "unknown",
            release_status: releaseStatus,
            shipment_status: shipment?.status || order.shipping?.status || null,
            shipment_substatus: shipment?.substatus || null,
            bank_reference: {
              payment_id: mainPayment.id,
              net_amount: netAmount,
              release_date: releaseDate,
              release_status: releaseStatus,
            },
          };
        })
      );

      return new Response(
        JSON.stringify({
          orders: enriched,
          paging: ordersData.paging || { total: 0, offset: 0, limit: 50 },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_movements") {
      const { date_from, date_to, offset = 0, limit = 50 } = params || {};
      const movUrl = `${BASE}/account/movements/search?user_id=${sellerId}&date_from=${date_from}&date_to=${date_to}&offset=${offset}&limit=${limit}`;
      const movRes = await fetch(movUrl, { headers });
      const movData = await movRes.json();
      return new Response(JSON.stringify(movData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_balance") {
      const balRes = await fetch(`${BASE}/account/balance?user_id=${sellerId}`, { headers });
      const balData = await balRes.json();
      return new Response(JSON.stringify(balData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Ação não reconhecida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
