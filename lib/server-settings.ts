import { dbConnect } from "@/lib/db";
import { withDefaults, type BusinessSettings } from "@/lib/settings";
import { BusinessSetting } from "@/models/BusinessSetting";
import { Counter } from "@/models/Counter";

export async function getSettings(): Promise<BusinessSettings> {
  await dbConnect();
  const row = await BusinessSetting.findById("business").lean() as unknown as { value?: Partial<BusinessSettings> } | null;
  return withDefaults(row?.value || null);
}

export async function saveSettings(value: BusinessSettings): Promise<BusinessSettings> {
  await dbConnect();
  await BusinessSetting.findOneAndUpdate({ _id: "business" }, { $set: { value } }, { upsert: true, new: true });
  return value;
}

export type NumberKind = keyof BusinessSettings["prefixes"];

/** Allocates the next document number atomically, e.g. QT-2026-0007. Numbers restart each calendar year. */
export async function nextNumber(kind: NumberKind, settings?: BusinessSettings, now = new Date()): Promise<string> {
  const current = settings || await getSettings();
  const year = now.getFullYear();
  const counter = await Counter.findOneAndUpdate({ _id: `${kind}-${year}` }, { $inc: { seq: 1 } }, { upsert: true, new: true }).lean() as unknown as { seq: number };
  return `${current.prefixes[kind]}-${year}-${String(counter.seq).padStart(4, "0")}`;
}
