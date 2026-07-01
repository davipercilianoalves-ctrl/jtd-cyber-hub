import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function translateShipmentStatus(status: string | null, substatus: string | null): string {
  if (!status) return "—";
  const statusMap: Record<string, string> = {
    delivered: "Entregue",
    shipped: "Em trânsito",
    ready_to_ship: "Pronto para envio",
    pending: "Aguardando postagem",
    handling: "Em preparação",
    not_delivered: "Não entregue",
    cancelled: "Cancelado",
    returning: "Em devolução",
    returned: "Devolvido",
  };
  const substatusMap: Record<string, string> = {
    delivered_to_buyer: "Entregue ao comprador",
    waiting_for_pickup: "Aguardando retirada",
    picked_up: "Coletado",
    in_hub: "No centro de distribuição",
    out_for_delivery: "Saiu para entrega",
    returning_to_sender: "Retornando ao remetente",
  };
  if (substatus && substatusMap[substatus]) return substatusMap[substatus];
  return statusMap[status] || status;
}


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
                const payRes = await fetch(`${BASE}/payments/${p.id}`, { headers });
                if (payRes.ok) {
                  const payData = await payRes.json();
                  return { ...p, ...payData };
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

          const mainPayment = payments[0] || {};
          const orderIndex = orders.indexOf(order);

          // ML fee — multiple sources
          const mlFeeFromPayment = Math.abs(Number(mainPayment.marketplace_fee) || 0);
          const mlFeeFromDetails = Array.isArray(mainPayment.fee_details)
            ? mainPayment.fee_details.reduce(
                (s: number, f: any) => s + Math.abs(Number(f.amount) || 0), 0
              )
            : 0;
          const mlFeeFromOrderFees = (order.order_fees || []).reduce(
            (s: number, f: any) => s + Math.abs(Number(f.value || f.amount) || 0), 0
          );
          const totalMlFee = mlFeeFromPayment || mlFeeFromDetails || mlFeeFromOrderFees;

          // Shipping — multiple sources
          const shippingCost = Math.abs(
            Number(mainPayment.shipping_cost) ||
            Number(order.shipping?.cost) ||
            Number(shipment?.shipping_option?.cost) ||
            0
          );

          // Net amount
          const netFromApi = mainPayment.net_received_amount
            ? Number(mainPayment.net_received_amount)
            : null;
          const netCalculated = grossAmount - totalMlFee - shippingCost;
          const netAmount = netFromApi ?? netCalculated;

          const shipmentStatus = shipment?.status || order.shipping?.status || null;
          const shipmentSubstatus = shipment?.substatus || null;

          // Release date — NEVER use date_approved as fallback
          const estimatedDeliveryDate =
            shipment?.shipping_option?.estimated_delivery_time?.date ||
            shipment?.shipping_option?.estimated_delivery_final?.date ||
            shipment?.shipping_option?.estimated_delivery?.date ||
            null;

          const realReleaseDate = mainPayment.money_release_date || null;
          let estimatedReleaseDate: string | null = null;
          if (!realReleaseDate && estimatedDeliveryDate) {
            const d = new Date(estimatedDeliveryDate);
            d.setDate(d.getDate() + 7);
            estimatedReleaseDate = d.toISOString();
          }
          const releaseDate = realReleaseDate || estimatedReleaseDate;

          // Release status — based ONLY on money_release_status
          let releaseStatus: string;
          if (mainPayment.money_release_status === "released") {
            releaseStatus = "released";
          } else if (mainPayment.money_release_status === "pending") {
            releaseStatus = "pending";
          } else if (mainPayment.money_release_status) {
            releaseStatus = mainPayment.money_release_status;
          } else if (mainPayment.status === "cancelled") {
            releaseStatus = "cancelled";
          } else {
            releaseStatus = "pending";
          }

          if (orderIndex < 3) {
            console.log(`=== PAYMENT COMPLETO ORDER ${order.id} ===`);
            console.log(JSON.stringify(mainPayment, null, 2));
            console.log(`=== ORDER COMPLETA ${order.id} ===`);
            console.log("order.shipping:", JSON.stringify(order.shipping, null, 2));
            console.log("order.order_fees:", JSON.stringify(order.order_fees, null, 2));
            console.log("order.total_amount:", order.total_amount);
            console.log("order.paid_amount:", order.paid_amount);
            console.log("order.amount_paid:", order.amount_paid);
            console.log(`[ORDER ${order.id}] shipping sources:`, {
              payment_shipping: mainPayment.shipping_cost,
              order_shipping_cost: order.shipping?.cost,
              shipment_cost: shipment?.shipping_option?.cost,
              final: shippingCost,
            });
            console.log(`[ORDER ${order.id}] fee sources:`, {
              payment_marketplace_fee: mainPayment.marketplace_fee,
              fee_details_count: mainPayment.fee_details?.length,
              fee_details_total: mlFeeFromDetails,
              order_fees_total: mlFeeFromOrderFees,
              final: totalMlFee,
            });
            console.log(`[ORDER ${order.id}] net:`, {
              gross: grossAmount,
              mlFee: totalMlFee,
              shipping: shippingCost,
              net_from_api: netFromApi,
              net_calculated: netCalculated,
              final: netAmount,
            });
            console.log(`[ORDER ${order.id}] release:`, {
              money_release_date: mainPayment.money_release_date,
              date_approved: mainPayment.date_approved,
              estimated_delivery: estimatedDeliveryDate,
              estimated_release: estimatedReleaseDate,
              final: releaseDate,
            });
            console.log(`[ORDER ${order.id}] release_status:`, {
              money_release_status: mainPayment.money_release_status,
              shipment_status: shipmentStatus,
              final_release_status: releaseStatus,
            });
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
            shipment_status: translateShipmentStatus(shipmentStatus, shipmentSubstatus),
            shipment_status_raw: shipmentStatus,
            shipment_substatus: shipmentSubstatus,

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
