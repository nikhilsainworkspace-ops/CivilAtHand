import { dbConnect } from "@/lib/db";
import { Contact } from "@/models/Contact";
import { DataRoom } from "@/models/DataRoom";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { PrivateNote } from "@/models/PrivateNote";
import { AdminPreference } from "@/models/AdminPreference";
import { Rate } from "@/models/Rate";
import { ShareLink } from "@/models/ShareLink";
import { NoteAsset } from "@/models/NoteAsset";

/** Snapshot of workspace records. Secret bearer tokens, passcode hashes and shared-room rows are intentionally excluded. */
export async function createWorkspaceBackup() {
  await dbConnect();
  const [contacts, projects, rates, links, rooms, tasks, privateNotes, adminPreferences, noteAssetDocs] = await Promise.all([
    Contact.find().lean(), Project.find().lean(), Rate.find().lean(),
    ShareLink.find({}, { token: 0 }).lean(), DataRoom.find({}, { token: 0, rows: 0, passcodeHash: 0, accessLog: 0 }).lean(),
    Task.find().lean(), PrivateNote.find().lean(), AdminPreference.find().lean(), NoteAsset.find().select("+data noteId filename mimeType size createdAt updatedAt").lean(),
  ]);
  const noteAssets = (noteAssetDocs as unknown as { _id: unknown; noteId: unknown; filename: string; mimeType: string; size: number; data: Buffer; createdAt: Date; updatedAt: Date }[]).map((asset) => ({
    _id: String(asset._id), noteId: String(asset.noteId), filename: asset.filename, mimeType: asset.mimeType, size: asset.size,
    dataBase64: Buffer.from(asset.data).toString("base64"), createdAt: asset.createdAt, updatedAt: asset.updatedAt,
  }));
  return {
    app: "civil-at-hand", version: 4, exportedAt: new Date().toISOString(), contacts, projects, rates,
    formLinks: links, dataRooms: rooms, tasks, privateNotes, noteAssets, adminPreferences,
    restoreNotes: "Merge restore does not restore public form tokens, private share tokens or shared-database row snapshots. Create new share links where needed after restoring.",
  };
}

export function workspaceBackupCounts(backup: Awaited<ReturnType<typeof createWorkspaceBackup>>) {
  return {
    contacts: backup.contacts.length, projects: backup.projects.length, rates: backup.rates.length, formLinks: backup.formLinks.length,
    dataRooms: backup.dataRooms.length, tasks: backup.tasks.length, privateNotes: backup.privateNotes.length,
    noteAssets: backup.noteAssets.length, adminPreferences: backup.adminPreferences.length,
  };
}
