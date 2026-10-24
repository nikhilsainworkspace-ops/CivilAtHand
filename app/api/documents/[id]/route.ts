import { documentRoutes } from "@/lib/routes/documents";

export const runtime = "nodejs";
export const { GET, PUT, PATCH, DELETE } = documentRoutes.item;
