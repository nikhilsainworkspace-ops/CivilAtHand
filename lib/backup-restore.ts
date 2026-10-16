import mongoose from "mongoose";
import { InputError } from "@/lib/errors";
import { normalizePrivateNoteInput } from "@/lib/private-notes";
import { dbConnect } from "@/lib/db";
import { Contact } from "@/models/Contact";
import { Project } from "@/models/Project";
import { Rate } from "@/models/Rate";
import { Task } from "@/models/Task";
import { PrivateNote } from "@/models/PrivateNote";
import { NoteAsset } from "@/models/NoteAsset";
import { AdminPreference } from "@/models/AdminPreference";

const MAX_COLLECTION_RECORDS = 5000;
const OBJECT_ID = /^[a-f\d]{24}$/i;
type RecordObject = Record<string, unknown> & { _id?: unknown };
type CollectionSpec = { key: string; label: string; Model: mongoose.Model<Record<string, unknown>>; fields: string[]; max: number };
const COLLECTIONS: CollectionSpec[] = [
  { key: "contacts", label: "contacts", Model: Contact as unknown as mongoose.Model<Record<string, unknown>>, max: 5000, fields: ["category", "name", "firstName", "lastName", "jobTitle", "birthday", "phoneLabel", "emailLabel", "phoneNumbers", "emailAddresses", "isTeamMember", "teamRole", "teamDepartment", "phone", "email", "organization", "city", "state", "status", "source", "linkId", "tags", "notes", "followUpAt", "details", "rating", "flag", "shareConsent", "lastContactedAt", "interactions", "createdAt", "updatedAt"] },
  { key: "projects", label: "projects", Model: Project as unknown as mongoose.Model<Record<string, unknown>>, max: 3000, fields: ["title", "clientName", "clientContactId", "linkedContactIds", "city", "state", "projectType", "status", "estimatedValue", "billedAmount", "receivedAmount", "startDate", "endDate", "followUpAt", "source", "notes", "createdAt", "updatedAt"] },
  { key: "rates", label: "rates", Model: Rate as unknown as mongoose.Model<Record<string, unknown>>, max: 5000, fields: ["item", "group", "spec", "unit", "rate", "supplierName", "supplierContactId", "city", "state", "validTill", "notes", "createdAt", "updatedAt"] },
  { key: "tasks", label: "tasks", Model: Task as unknown as mongoose.Model<Record<string, unknown>>, max: 3000, fields: ["title", "description", "status", "priority", "dueAt", "relatedKind", "relatedId", "assignedContactId", "createdAt", "updatedAt"] },
  { key: "privateNotes", label: "private notes", Model: PrivateNote as unknown as mongoose.Model<Record<string, unknown>>, max: 5000, fields: ["title", "content", "tags", "pinned", "archived", "favorite", "folder", "category", "projectId", "dueAt", "deletedAt", "history", "createdAt", "updatedAt"] },
];

export type ValidatedWorkspaceBackup = {
  collections: Record<string, { _id: string; fields: Record<string, unknown> }[]>;
  noteAssets: { _id: string; fields: Record<string, unknown> }[];
  adminPreference: { autoLockMinutes: number } | null;
  counts: Record<string, number>;
  invalid: string[];
};
function objectRecord(value: unknown): value is RecordObject { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function projectFields(record: RecordObject, fields: string[]) {
  const result: Record<string, unknown> = {};
  for (const field of fields) if (record[field] !== undefined) result[field] = record[field];
  return result;
}
function validImageBytes(data: Buffer, mimeType: string): boolean {
  if (mimeType === "image/png") return data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/jpeg") return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mimeType === "image/gif") return data.length >= 6 && ["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString("ascii"));
  if (mimeType === "image/webp") return data.length >= 12 && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

export async function validateWorkspaceBackup(backup: unknown): Promise<ValidatedWorkspaceBackup> {
  if (!objectRecord(backup) || backup.app !== "civil-at-hand" || ![3, 4].includes(Number(backup.version))) throw new InputError("Choose a valid Civil At Hand JSON backup (version 3 or 4).");
  const collections: ValidatedWorkspaceBackup["collections"] = {};
  const counts: Record<string, number> = {};
  const invalid: string[] = [];
  for (const spec of COLLECTIONS) {
    const raw = backup[spec.key];
    if (raw === undefined) { collections[spec.key] = []; counts[spec.key] = 0; continue; }
    if (!Array.isArray(raw)) throw new InputError(`Backup field “${spec.key}” must be a list.`);
    if (raw.length > spec.max) throw new InputError(`Backup contains too many ${spec.label} (maximum ${spec.max.toLocaleString()}).`);
    const rows: { _id: string; fields: Record<string, unknown> }[] = [];
    for (let index = 0; index < raw.length; index++) {
      const item = raw[index];
      if (!objectRecord(item) || typeof item._id !== "string" || !OBJECT_ID.test(item._id)) { invalid.push(`${spec.label} #${index + 1}: missing or invalid record ID`); continue; }
      const fields = projectFields(item, spec.fields);
      if (spec.key === "privateNotes") {
        try { Object.assign(fields, normalizePrivateNoteInput(fields)); } catch (error) { invalid.push(`private notes #${index + 1}: ${error instanceof Error ? error.message : "invalid note"}`); continue; }
      } else if (spec.key === "tasks" && (typeof fields.title !== "string" || !String(fields.title).trim())) { invalid.push(`tasks #${index + 1}: missing title`); continue; }
      else if (spec.key === "projects" && (typeof fields.title !== "string" || !String(fields.title).trim())) { invalid.push(`projects #${index + 1}: missing title`); continue; }
      else if (spec.key === "contacts" && (typeof fields.name !== "string" || !String(fields.name).trim() || typeof fields.category !== "string")) { invalid.push(`contacts #${index + 1}: missing name or category`); continue; }
      else if (spec.key === "rates" && (typeof fields.item !== "string" || !String(fields.item).trim() || !Number.isFinite(Number(fields.rate)))) { invalid.push(`rates #${index + 1}: missing item or invalid rate`); continue; }
      try { await new spec.Model({ _id: item._id, ...fields }).validate(); }
      catch (error) { invalid.push(`${spec.label} #${index + 1}: ${error instanceof Error ? error.message : "validation failed"}`); continue; }
      rows.push({ _id: item._id, fields });
    }
    collections[spec.key] = rows; counts[spec.key] = rows.length;
  }
  const rawPreferences = backup.adminPreferences === undefined ? [] : backup.adminPreferences;
  let adminPreference: { autoLockMinutes: number } | null = null;
  if (!Array.isArray(rawPreferences)) throw new InputError("Backup field “adminPreferences” must be a list.");
  if (rawPreferences.length > 1) invalid.push("admin preferences: expected at most one workspace preference record");
  if (rawPreferences.length) {
    const item = rawPreferences[0];
    if (!objectRecord(item) || item._id !== "admin" || ![0, 5, 15, 30, 60].includes(Number(item.autoLockMinutes))) invalid.push("admin preferences #1: invalid workspace preference record");
    else adminPreference = { autoLockMinutes: Number(item.autoLockMinutes) };
  }
  const rawAssets = backup.noteAssets === undefined ? [] : backup.noteAssets;
  if (!Array.isArray(rawAssets)) throw new InputError("Backup field “noteAssets” must be a list.");
  if (rawAssets.length > MAX_COLLECTION_RECORDS) throw new InputError("Backup contains too many note images.");
  const noteAssets: ValidatedWorkspaceBackup["noteAssets"] = [];
  for (let index = 0; index < rawAssets.length; index++) {
    const asset = rawAssets[index];
    if (!objectRecord(asset) || typeof asset._id !== "string" || !OBJECT_ID.test(asset._id) || typeof asset.noteId !== "string" || !OBJECT_ID.test(asset.noteId)) { invalid.push(`note image #${index + 1}: invalid image or note ID`); continue; }
    if (!Array.isArray(backup.privateNotes) || !(backup.privateNotes as Record<string, unknown>[]).some((note) => String(note?._id || "") === asset.noteId)) invalid.push(`note image #${index + 1}: attached note is missing from the backup`);
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(String(asset.mimeType)) || typeof asset.dataBase64 !== "string") { invalid.push(`note image #${index + 1}: unsupported image data`); continue; }
    if (asset.dataBase64.length > 2_800_000) { invalid.push(`note image #${index + 1}: encoded data exceeds the 2 MB limit`); continue; }
    const data = Buffer.from(asset.dataBase64, "base64");
    if (!data.length || data.length > 2 * 1024 * 1024 || data.toString("base64").replace(/=+$/, "") !== asset.dataBase64.replace(/=+$/, "") || !validImageBytes(data, String(asset.mimeType))) { invalid.push(`note image #${index + 1}: invalid, mismatched or oversized image data`); continue; }
    noteAssets.push({ _id: asset._id, fields: { noteId: asset.noteId, filename: String(asset.filename || "note-image").replace(/[\\/\r\n\0]/g, "-").slice(0, 180), mimeType: asset.mimeType, size: data.length, data, createdAt: asset.createdAt, updatedAt: asset.updatedAt } });
  }
  counts.noteAssets = noteAssets.length;
  counts.adminPreferences = adminPreference ? 1 : 0;
  return { collections, noteAssets, adminPreference, counts, invalid };
}

export async function applyWorkspaceBackup(checked: ValidatedWorkspaceBackup): Promise<Record<string, number>> {
  await dbConnect();
  const outcomes: Record<string, number> = {};
  for (const spec of COLLECTIONS) {
    const rows = checked.collections[spec.key] || [];
    if (!rows.length) { outcomes[spec.key] = 0; continue; }
    const operations = rows.map((row) => ({ updateOne: { filter: { _id: new mongoose.Types.ObjectId(row._id) }, update: { $set: row.fields, $setOnInsert: { _id: new mongoose.Types.ObjectId(row._id) } }, upsert: true } }));
    const result = await spec.Model.bulkWrite(operations as never[]);
    outcomes[spec.key] = result.upsertedCount + result.modifiedCount;
  }
  if (checked.noteAssets.length) {
    const operations = checked.noteAssets.map((asset) => ({ updateOne: { filter: { _id: new mongoose.Types.ObjectId(asset._id) }, update: { $set: asset.fields, $setOnInsert: { _id: new mongoose.Types.ObjectId(asset._id) } }, upsert: true } }));
    const result = await NoteAsset.bulkWrite(operations as never[]);
    outcomes.noteAssets = result.upsertedCount + result.modifiedCount;
  } else outcomes.noteAssets = 0;
  if (checked.adminPreference) {
    await AdminPreference.findOneAndUpdate({ _id: "admin" }, { $set: checked.adminPreference, $setOnInsert: { _id: "admin" } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    outcomes.adminPreferences = 1;
  } else outcomes.adminPreferences = 0;
  return outcomes;
}

export function workspaceBackupWarnings(checked: ValidatedWorkspaceBackup) {
  const warnings = ["Restore is merge-only: it updates or adds records by their original ID and does not delete records absent from the backup.", "Public form tokens, private share tokens, and shared database row snapshots are deliberately not restored. Recreate any links you need to keep sharing."];
  if (checked.invalid.length) warnings.push(`${checked.invalid.length} record(s) failed validation. Fix the source backup before restoring.`);
  return warnings;
}
