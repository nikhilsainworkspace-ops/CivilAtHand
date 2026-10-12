import { openLeadStatuses } from "@/lib/projects";
import { dateKey } from "@/lib/followups";

type C = { category: string; status: string; state?: string; city?: string; source?: string; createdAt?: string; followUpAt?: string | null };
type P = { status: string; estimatedValue: number | null; followUpAt?: string | null };
type L = { _id: string; title: string; active: boolean; submissions: number };

export type Count = { key: string; count: number };

function tally(values: string[]): Count[] {
  const map = new Map<string, number>();
  for (const value of values) map.set(value, (map.get(value) || 0) + 1);
  return Array.from(map, ([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function buildReport(contacts: C[], projects: P[], links: L[], now: Date = new Date()) {
  const today = dateKey(now);
  const months: { key: string; label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }), count: 0 });
  }
  for (const c of contacts) {
    const month = months.find((m) => c.createdAt && dateKey(new Date(c.createdAt)).startsWith(m.key));
    if (month) month.count += 1;
  }
  const projectRows = ["lead", "quoted", "negotiation", "ongoing", "completed", "on-hold", "lost"].map((status) => {
    const list = projects.filter((p) => p.status === status);
    return { status, count: list.length, value: list.reduce((sum, p) => sum + (p.estimatedValue || 0), 0) };
  });
  const open = projects.filter((p) => openLeadStatuses.includes(p.status));
  return {
    totalContacts: contacts.length,
    byCategory: tally(contacts.map((c) => c.category)),
    byStatus: tally(contacts.map((c) => c.status)),
    byState: tally(contacts.map((c) => (c.state || "").trim()).filter(Boolean)).slice(0, 8),
    bySource: tally(contacts.map((c) => c.source || "manual")),
    addedPerMonth: months,
    followUpsOverdueContacts: contacts.filter((c) => c.followUpAt && c.followUpAt.slice(0, 10) < today).length,
    followUpsOverdueProjects: projects.filter((p) => p.followUpAt && p.followUpAt.slice(0, 10) < today && !["completed", "lost"].includes(p.status)).length,
    projectRows,
    totalProjects: projects.length,
    openLeads: open.length,
    pipelineValue: open.reduce((sum, p) => sum + (p.estimatedValue || 0), 0),
    ongoingValue: projects.filter((p) => p.status === "ongoing").reduce((sum, p) => sum + (p.estimatedValue || 0), 0),
    wonProjects: projects.filter((p) => p.status === "ongoing" || p.status === "completed").length,
    lostProjects: projects.filter((p) => p.status === "lost").length,
    linkRows: links.filter((l) => l.submissions > 0).sort((a, b) => b.submissions - a.submissions).slice(0, 8),
  };
}
