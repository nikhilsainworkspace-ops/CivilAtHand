import { adminHandler, json } from "@/lib/api-helpers";
import { averageRates, stockBalanceRows } from "@/lib/stock-server";

export const runtime = "nodejs";

export const GET = adminHandler("Stock balance error", async () => {
  const [balances, rates] = await Promise.all([stockBalanceRows(), averageRates()]);
  return json({ balances, averageRates: Object.fromEntries(rates) });
});
