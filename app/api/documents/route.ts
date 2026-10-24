import { documentRoutes } from "@/lib/routes/documents";

export const runtime = "nodejs";
export const { GET, POST } = documentRoutes.list;
