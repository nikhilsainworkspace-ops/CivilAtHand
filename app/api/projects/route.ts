import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { InputError } from "@/lib/errors";
import { normalizeProjectInput } from "@/lib/projects";
import { Project } from "@/models/Project";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    await dbConnect();
    const projects = await Project.find().sort({ updatedAt: -1 }).limit(2000).lean();
    return NextResponse.json({ projects }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Project list error:", error);
    return NextResponse.json({ error: "Could not load projects. Check the database connection." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const normalized = normalizeProjectInput(payload);
    await dbConnect();
    const project = await Project.create(normalized);
    return NextResponse.json({ project: project.toObject() }, { status: 201 });
  } catch (error) {
    console.error("Project create error:", error);
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Could not save this project. Check the database connection and try again." }, { status: 503 });
  }
}
