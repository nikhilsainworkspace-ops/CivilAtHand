import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { categories, getFields, categoryLabel } from "@/lib/categories";
import { cellString, escapeCsv } from "@/lib/csv";
import { projectStatusLabel } from "@/lib/projects";
import { Contact } from "@/models/Contact";
import { Project } from "@/models/Project";

export const runtime = "nodejs";
export const maxDuration = 30;

type Column = { key: string; header: string };
const baseColumns: Column[] = [
  { key: "name", header: "Name" }, { key: "categoryLabel", header: "Category" }, { key: "status", header: "Status" },
  { key: "phone", header: "Phone" }, { key: "whatsapp", header: "WhatsApp" }, { key: "email", header: "Email" },
  { key: "organization", header: "Business / Company" }, { key: "city", header: "City" }, { key: "state", header: "State" },
  { key: "workingLocations", header: "Working / Delivery Locations" }, { key: "tags", header: "Tags" }, { key: "followUpAt", header: "Follow-up Date" },
  { key: "notes", header: "Notes" }, { key: "source", header: "Source" }, { key: "createdAt", header: "Created At" }, { key: "updatedAt", header: "Updated At" },
];
const projectColumns: Column[] = [
  { key: "title", header: "Project / Lead" }, { key: "statusLabel", header: "Status" }, { key: "clientName", header: "Client" },
  { key: "projectType", header: "Type" }, { key: "city", header: "City" }, { key: "state", header: "State" },
  { key: "estimatedValue", header: "Estimated Value (INR)" }, { key: "startDate", header: "Start Date" }, { key: "endDate", header: "End Date" },
  { key: "followUpAt", header: "Follow-up Date" }, { key: "source", header: "Lead Source" }, { key: "notes", header: "Notes" },
  { key: "createdAt", header: "Created At" }, { key: "updatedAt", header: "Updated At" },
];

function fileResponse(format: "csv" | "xlsx", columns: Column[], rows: Record<string, unknown>[], baseName: string, sheetName: string) {
  if (format === "csv") {
    const csv = [columns.map((col) => escapeCsv(col.header)).join(","), ...rows.map((row) => columns.map((col) => escapeCsv(row[col.key])).join(","))].join("\r\n");
    return new Response(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${baseName}.csv"`, "Cache-Control": "no-store" } });
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = process.env.NEXT_PUBLIC_APP_NAME || "Civil At Hand";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns.map((column) => ({ header: column.header, key: column.key, width: Math.min(42, Math.max(16, column.header.length + 2)) }));
  for (const row of rows) sheet.addRow(row);
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF176B59" } };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: columns.length } };
  return workbook.xlsx.writeBuffer().then((bytes: ArrayBuffer) => new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${baseName}.xlsx"`, "Cache-Control": "no-store" } }));
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";

  if (url.searchParams.get("scope") === "projects") {
    try {
      await dbConnect();
      const projects = (await Project.find().sort({ updatedAt: -1 }).limit(5000).lean()) as unknown as Record<string, unknown>[];
      const rows = projects.map((project) => ({ ...project, statusLabel: projectStatusLabel(String(project.status || "")) }));
      return await fileResponse(format, projectColumns, rows, "civil-at-hand-projects", "Projects");
    } catch (error) {
      console.error("Project export error:", error);
      return NextResponse.json({ error: "Could not export projects. Check the database connection." }, { status: 503 });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  const category = (url.searchParams.get("category") || "").slice(0, 80);
  const status = (url.searchParams.get("status") || "").slice(0, 40);
  const query = (url.searchParams.get("q") || "").trim().slice(0, 100);
  if (category) filter.category = category;
  if (["new", "contacted", "qualified", "active", "on-hold", "closed"].includes(status)) filter.status = status;
  const detailKeys = Array.from(new Set(categories.flatMap((item) => getFields(item.id).map((field) => field.key))));
  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const expression = new RegExp(escaped, "i");
    filter.$or = [
      { name: expression }, { phone: expression }, { email: expression }, { organization: expression },
      { city: expression }, { state: expression }, { tags: expression }, { notes: expression },
      ...detailKeys.map((key) => ({ [`details.${key}`]: expression })),
    ];
  }
  try {
    await dbConnect();
    const contacts = (await Contact.find(filter).sort({ updatedAt: -1 }).limit(20_000).lean()) as unknown as Record<string, unknown>[];
    const customKeys = detailKeys.filter((key) => !["fullName", "phone", "whatsapp", "email", "organization", "city", "state", "workingLocations", "notes"].includes(key));
    const customColumns: Column[] = customKeys.map((key) => {
      const owner = categories.find((item) => getFields(item.id).some((field) => field.key === key));
      const label = owner ? getFields(owner.id).find((field) => field.key === key)?.label : "";
      return { key: `details.${key}`, header: label || key };
    });
    const columns = [...baseColumns, ...customColumns];
    const rows = contacts.map((contact) => {
      const details = (contact.details || {}) as Record<string, unknown>;
      const row: Record<string, unknown> = {
        name: contact.name, categoryLabel: categoryLabel(String(contact.category || "")), status: contact.status, phone: contact.phone, whatsapp: details.whatsapp,
        email: contact.email, organization: contact.organization, city: contact.city, state: contact.state, workingLocations: details.workingLocations,
        tags: Array.isArray(contact.tags) ? contact.tags.map((tag) => cellString(tag)).join(", ") : "", followUpAt: contact.followUpAt, notes: contact.notes, source: contact.source,
        createdAt: contact.createdAt, updatedAt: contact.updatedAt,
      };
      for (const key of customKeys) row[`details.${key}`] = details[key];
      return row;
    });
    return await fileResponse(format, columns, rows, "civil-at-hand-contacts", "Contacts");
  } catch (error) {
    console.error("Contact export error:", error);
    return NextResponse.json({ error: "Could not export records. Check the database connection." }, { status: 503 });
  }
}
