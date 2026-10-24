import { invoiceRoutes } from "@/lib/routes/invoices";

export const runtime = "nodejs";
export const { GET, POST } = invoiceRoutes.list;
