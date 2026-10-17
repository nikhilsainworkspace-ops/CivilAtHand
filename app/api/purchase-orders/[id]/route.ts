import { purchaseOrderRoutes } from "@/lib/routes/purchase-orders";

export const runtime = "nodejs";
export const { GET, PUT, DELETE } = purchaseOrderRoutes.item;
