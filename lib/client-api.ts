// Small fetch helper shared by the admin screens (browser only).
export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown>) { super(message); this.status = status; this.data = data; }
}

export async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { ...(init?.headers || {}), ...(init?.body ? { "Content-Type": "application/json" } : {}) }, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || "Something went wrong. Please try again.", response.status, data);
  return data;
}

export function dateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
