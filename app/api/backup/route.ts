import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { dbConnect } from "@/lib/db";
import { Contact } from "@/models/Contact";
import { DataRoom } from "@/models/DataRoom";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { PrivateNote } from "@/models/PrivateNote";
import { Rate } from "@/models/Rate";
import { ShareLink } from "@/models/ShareLink";

export const runtime = "nodejs";
export const maxDuration = 60;

/** A full JSON copy of your data. Share-link tokens, passcode hashes and data-room rows are deliberately left out. */
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    await dbConnect();
    const [contacts, projects, rates, links, rooms, tasks, privateNotes] = await Promise.all([
      Contact.find().lean(), Project.find().lean(), Rate.find().lean(),
      ShareLink.find({}, { token: 0 }).lean(), DataRoom.find({}, { token: 0, rows: 0, passcodeHash: 0, accessLog: 0 }).lean(),
      Task.find().lean(), PrivateNote.find().lean(),
    ]);
    await audit(request, "backup-downloaded", `${contacts.length} contacts, ${projects.length} projects, ${tasks.length} tasks, ${privateNotes.length} private notes`);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify({ app: "civil-at-hand", version: 3, exportedAt: new Date().toISOString(), contacts, projects, rates, formLinks: links, dataRooms: rooms, tasks, privateNotes }, null, 1), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="civil-at-hand-backup-${stamp}.json"`, "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: "Could not create the backup. Check the database connection." }, { status: 503 });
  }
}
