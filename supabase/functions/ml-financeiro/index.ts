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
          const basePayments = order.payments || [];

          // Buscar detalhes completos de cada payment
          const paymentDetails = await Promise.all(
            basePayments.map(async (p: any) => {
              if (!p.id) return p;
              try {
                const payRes = await fetch(`${BASE}/collections/notifications/${p.id}`, { headers });
                if (payRes.ok) {
                  const payData = await payRes.json();
                  return { ...p, ...(payData.collection || payData) };
                }
              } catch { /* ignore */ }
              return p;
            })
          );
          const payments = paymentDetails;

          let shipment: any = null;
          if (order.shipping?.id) {
            const shipRes = await fetch(`${BASE}/shipments/${order.shipping.id}`, { headers });
            if (shipRes.ok) shipment = await shipRes.json();
          }

          const grossAmount = order.total_amount || 0;
          const originalPrice = order.order_items?.[0]?.original_price || grossAmount;
          const salePrice = order.order_items?.[0]?.unit_price || grossAmount;
          const fakeDiscount = originalPrice - salePrice;

          const mlFee = payments.reduce((sum: number, p: any) => {
            const direct = Math.abs(Number(p.marketplace_fee) || 0);
            const fromDetails = Array.isArray(p.fee_details)
              ? p.fee_details.reduce(
                  (s: number, f: any) => s + Math.abs(Number(f.amount) || 0),
                  0
                )
              : 0;
            return sum + (direct || fromDetails);
          }, 0);

          const orderFees = Array.isArray(order.order_fees) ? order.order_fees : [];
          const orderFeeTotal = orderFees.reduce(
            (s: number, f: any) => s + Math.abs(Number(f.value || f.amount) || 0),
            0
          );
          const totalMlFee = mlFee || orderFeeTotal;
          const shippingCost = Math.abs(Number(order.shipping?.cost) || 0);
          const netAmount = grossAmount - totalMlFee - shippingCost;

          const orderIndex = orders.indexOf(order);
          if (orderIndex === 0) {
            console.log("Payment sample:", JSON.stringify(payments[0], null, 2));
            console.log("Order fees:", JSON.stringify(order.order_fees, null, 2));
            console.log("Computed mlFee:", totalMlFee, "shipping:", shippingCost);
          }

          const mainPayment = payments[0] || {};
          const releaseDate = mainPayment.money_release_date || null;
          const releaseStatus =
            mainPayment.money_release_status ||
            (mainPayment.status === "approved"
              ? "pending"
              : mainPayment.status === "cancelled"
              ? "cancelled"
              : "pending");


          if (orderIndex < 3) {
            console.log(`=== ORDER ${order.id} ===`);
            console.log("order.status:", order.status);
            console.log("order.date_created:", order.date_created);
            console.log("order.payments raw:", JSON.stringify(order.payments, null, 2));
            console.log("paymentDetails[0]:", JSON.stringify(paymentDetails[0], null, 2));
            console.log("release_date encontrada:", releaseDate);
            console.log("release_status encontrado:", releaseStatus);
            console.log("computedReleaseStatus:", computedReleaseStatus);
            if (orderIndex === 0) {
              const allKeys = paymentDetails[0] ? Object.keys(paymentDetails[0]) : [];
              console.log("Campos disponíveis no payment:", allKeys.join(", "));
            }
          }



          return {
            order_id: order.id,
            order_number: `#${order.id}`,
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
            ml_fee: totalMlFee,
            shipping_cost: shippingCost,
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
      let movRes = await fetch(movUrl, { headers });
      let movData: any;
      if (!movRes.ok) {
        const altUrl = `${BASE}/users/${sellerId}/movements?date_from=${date_from}&date_to=${date_to}`;
        const altRes = await fetch(altUrl, { headers });
        movData = await altRes.json();
      } else {
        movData = await movRes.json();
      }

      const raw = movData.results || movData.movements || [];
      const movements = raw.map((m: any) => ({
        id: String(m.id || m.movement_id || crypto.randomUUID()),
        date: m.date || m.date_created,
        type: m.type || m.movement_type || "other",
        description: m.description || m.reason || m.type || "—",
        amount: Number(m.amount ?? m.net_credited_amount ?? 0),
        reference_id: m.reference_id || m.source_id || null,
        status: m.status || "settled",
        currency_id: m.currency_id || "BRL",
      }));

      return new Response(
        JSON.stringify({ movements, paging: movData.paging || { total: movements.length } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_balance") {
      const balRes = await fetch(`${BASE}/account/balance?user_id=${sellerId}`, { headers });
      const balData = await balRes.json();
      const available = Number(balData.available_balance ?? balData.available ?? 0);
      const unavailable = Number(balData.unavailable_balance ?? balData.unavailable ?? 0);
      const balance = {
        available,
        unavailable,
        total: Number(balData.total) || available + unavailable,
        currency: balData.currency_id || "BRL",
      };
      return new Response(JSON.stringify(balance), {
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
