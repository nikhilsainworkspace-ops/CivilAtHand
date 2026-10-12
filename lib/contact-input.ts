import { getCategory, getFields } from "@/lib/categories";

export function cleanText(value: unknown, max = 2000): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(/\u0000/g, "").trim().slice(0, max);
}

export function normalizeContactInput(payload: Record<string, unknown>) {
  const category = cleanText(payload.category, 80);
  const definition = getCategory(category);
  if (!definition) throw new Error("Choose a valid civil-work category.");
  const inputDetails = (payload.details && typeof payload.details === "object" && !Array.isArray(payload.details)) ? payload.details as Record<string, unknown> : {};
  const details: Record<string, string> = {};
  for (const item of getFields(category)) details[item.key] = cleanText(inputDetails[item.key], item.key === "notes" ? 6000 : 2000);
  const name = cleanText(details.fullName || payload.name, 160);
  const phone = cleanText(details.phone || payload.phone, 40);
  const email = cleanText(details.email || payload.email, 180).toLowerCase();
  if (!name) throw new Error("Name is required.");
  if (!phone && !email) throw new Error("Please provide a phone number or email address.");
  const missing = getFields(category).filter((item) => item.required && !cleanText(details[item.key])).map((item) => item.label);
  if (missing.length) throw new Error(`Please complete required fields: ${missing.join(", ")}`);
  const tags = Array.isArray(payload.tags) ? payload.tags.map((tag) => cleanText(tag, 40)).filter(Boolean).slice(0, 30) : cleanText(payload.tags, 500).split(",").map((tag) => tag.trim().slice(0, 40)).filter(Boolean).slice(0, 30);
  const validStatuses = ["new", "contacted", "qualified", "active", "on-hold", "closed"];
  const status = validStatuses.includes(String(payload.status)) ? String(payload.status) : "new";
  const followUp = cleanText(payload.followUpAt, 40);
  const followUpAt = followUp && !Number.isNaN(Date.parse(followUp)) ? new Date(followUp) : null;
  return {
    category,
    name,
    phone,
    email,
    organization: cleanText(details.organization, 180),
    city: cleanText(details.city, 120),
    state: cleanText(details.state, 120),
    status,
    source: payload.source === "public-link" ? "public-link" : "manual",
    linkId: cleanText(payload.linkId, 120),
    tags,
    notes: cleanText(details.notes || payload.notes, 6000),
    followUpAt,
    details,
  };
}
