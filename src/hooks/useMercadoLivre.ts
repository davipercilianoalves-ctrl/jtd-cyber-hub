import { supabase } from '@/integrations/supabase/client';

export function useMercadoLivre() {
  async function callML(endpoint: string, method: string = 'GET', body: any = null) {
    const { data, error } = await supabase.functions.invoke('ml-proxy', {
      body: { endpoint, method, body }
    });
    if (error) throw error;
    return data;
  }

  async function getOrders(userId: string) {
    return callML(`/orders/search?seller=${userId}&sort=date_desc`);
  }

  async function getVisits(itemId: string) {
    return callML(`/visits/items?ids=${itemId}`);
  }

  async function getUserInfo(userId: string) {
    return callML(`/users/${userId}`);
  }

  return { callML, getOrders, getVisits, getUserInfo };
}
