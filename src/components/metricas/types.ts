export interface AdCostRow {
  adId: string;
  mlItemId: string | null;
  title: string;
  sku: string | null;
  unitsSold: number;
  revenue: number;
  unitCost: number;
  marketplaceFee: number;
  shippingCost: number;
  packagingCost: number;
  transportCost: number;
  tax: number;
  finalPrice: number;
  // Totals (×unitsSold for variable costs)
  totalProductCost: number;
  totalFee: number;
  totalShipping: number;
  totalPackaging: number;
  totalTransport: number;
  totalTax: number;
  totalCost: number;
  grossProfit: number;
  margin: number; // %
}

export interface PriceSyncRow {
  adId: string;
  mlItemId: string;
  title: string;
  appPrice: number;
  mlPrice: number | null;
  diff: number;
  diffPct: number;
  status: "ok" | "warn" | "alert" | "missing";
}

export interface MonthlySalesPoint {
  month: string; // "Jan", "Fev"...
  monthKey: string; // "YYYY-MM"
  current: number; // revenue current year
  previous: number; // revenue previous year
  orders: number;
  units: number;
}

export interface TopProductRow {
  itemId: string;
  title: string;
  units: number;
  revenue: number;
  monthly: number[]; // length 12, units per month (current year)
  peakMonth: number; // 0..11
}
