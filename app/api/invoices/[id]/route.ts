import { invoiceRoutes } from "@/lib/routes/invoices";

export const runtime = "nodejs";
export const { GET, PUT, DELETE } = invoiceRoutes.item;
