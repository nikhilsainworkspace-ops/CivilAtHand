import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { dbConnect } from "@/lib/db";
import { InputError } from "@/lib/errors";
import { normalizeTaskInput } from "@/lib/tasks";
import { Task } from "@/models/Task";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    await dbConnect();
    const tasks = await Task.find().sort({ status: 1, dueAt: 1, priority: -1, updatedAt: -1 }).limit(3000).lean();
    return NextResponse.json({ tasks }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Task list error:", error);
    return NextResponse.json({ error: "Could not load tasks. Check the database connection." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    const normalized = normalizeTaskInput((await request.json()) as Record<string, unknown>);
    await dbConnect();
    const task = await Task.create(normalized);
    await audit(request, "task-created", normalized.title.slice(0, 80));
    return NextResponse.json({ task: task.toObject() }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Task create error:", error);
    return NextResponse.json({ error: "Could not create this task." }, { status: 503 });
  }
}
