import { Contact } from "@/models/Contact";
import { findMatches } from "@/lib/duplicates";

export type DuplicateSummary = { _id: string; name: string; phone: string; email: string; category: string };

/** Existing contacts that share this phone number or email. Call dbConnect() first. */
export async function findDuplicateContacts(phone: string, email: string, excludeId?: string): Promise<DuplicateSummary[]> {
  const rows = (await Contact.find({}, { name: 1, phone: 1, email: 1, category: 1 }).lean()) as unknown as { _id: unknown; name?: string; phone?: string; email?: string; category?: string }[];
  const list = rows.map((row) => ({ _id: String(row._id), name: row.name || "", phone: row.phone || "", email: row.email || "", category: row.category || "" }));
  return findMatches(list, phone, email, excludeId).slice(0, 5);
}
