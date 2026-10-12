import { InputError } from "@/lib/errors";
import { cleanText } from "@/lib/contact-input";

export const projectStatuses = [
  { value: "lead", label: "Lead" },
  { value: "quoted", label: "Quoted" },
  { value: "negotiation", label: "Negotiation" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "on-hold", label: "On hold" },
  { value: "lost", label: "Lost" },
];
export const projectStatusValues = projectStatuses.map((item) => item.value);
/** Statuses that count as an open sales lead / pipeline. */
export const openLeadStatuses = ["lead", "quoted", "negotiation"];

export const projectTypes = [
  "Building / बिल्डिंग",
  "Road & infrastructure / सड़क और इन्फ्रास्ट्रक्चर",
  "Industrial / फैक्ट्री",
  "Interior & finishing / इंटीरियर और फिनिशिंग",
  "Repair & maintenance / मरम्मत",
  "Liaisoning & approvals / अनुमति और लाइज़निंग",
  "Other / अन्य",
];

export function projectStatusLabel(value: string): string {
  return projectStatuses.find((item) => item.value === value)?.label || value;
}

function parseDate(value: unknown): Date | null {
  const text = cleanText(value, 40);
  if (!text) return null;
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? null : new Date(ms);
}

function parseMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(String(value).replace(/[,₹\s]/g, ""));
  if (!Number.isFinite(number) || number < 0 || number > 1e13) throw new InputError("Estimated value must be a positive number in rupees.");
  return Math.round(number);
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;

export function normalizeProjectInput(payload: Record<string, unknown>) {
  const title = cleanText(payload.title, 160);
  if (!title) throw new InputError("Project or lead name is required.");
  const status = projectStatusValues.includes(String(payload.status)) ? String(payload.status) : "lead";
  const clientContactId = cleanText(payload.clientContactId, 24);
  const linked = Array.isArray(payload.linkedContactIds) ? payload.linkedContactIds : [];
  const linkedContactIds = Array.from(new Set(linked.map((id) => cleanText(id, 24)).filter((id) => OBJECT_ID.test(id)))).slice(0, 60);
  return {
    title,
    clientName: cleanText(payload.clientName, 160),
    clientContactId: OBJECT_ID.test(clientContactId) ? clientContactId : "",
    linkedContactIds,
    city: cleanText(payload.city, 120),
    state: cleanText(payload.state, 120),
    projectType: cleanText(payload.projectType, 120),
    status,
    estimatedValue: parseMoney(payload.estimatedValue),
    startDate: parseDate(payload.startDate),
    endDate: parseDate(payload.endDate),
    followUpAt: parseDate(payload.followUpAt),
    source: cleanText(payload.source, 120),
    notes: cleanText(payload.notes, 6000),
  };
}
