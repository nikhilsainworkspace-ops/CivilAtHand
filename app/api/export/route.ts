import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { categories, getFields, categoryLabel } from "@/lib/categories";
import { Contact } from "@/models/Contact";

export const runtime = "nodejs";
export const maxDuration = 30;
const baseColumns = [
  { key: "name", header: "Name" }, { key: "categoryLabel", header: "Category" }, { key: "status", header: "Status" },
  { key: "phone", header: "Phone" }, { key: "whatsapp", header: "WhatsApp" }, { key: "email", header: "Email" },
  { key: "organization", header: "Business / Company" }, { key: "city", header: "City" }, { key: "state", header: "State" },
  { key: "workingLocations", header: "Working / Delivery Locations" }, { key: "tags", header: "Tags" }, { key: "followUpAt", header: "Follow-up Date" },
  { key: "notes", header: "Notes" }, { key: "source", header: "Source" }, { key: "createdAt", header: "Created At" }, { key: "updatedAt", header: "Updated At" },
];
function cellString(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function escapeCsv(value: unknown) {
  let text = cellString(value);
  // Prevent spreadsheet formula execution when a person-controlled field begins with a formula marker.
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const filter: Record<string, any> = {};
  const category = (url.searchParams.get("category") || "").slice(0, 80);
  const status = (url.searchParams.get("status") || "").slice(0, 40);
  const query = (url.searchParams.get("q") || "").trim().slice(0, 100);
  if (category) filter.category = category;
  if (["new", "contacted", "qualified", "active", "on-hold", "closed"].includes(status)) filter.status = status;
  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const expression = new RegExp(escaped, "i");
    const detailKeys = Array.from(new Set(categories.flatMap((item) => getFields(item.id).map((field) => field.key))));
    filter.$or = [
      { name: expression }, { phone: expression }, { email: expression }, { organization: expression },
      { city: expression }, { state: expression }, { tags: expression }, { notes: expression },
      ...detailKeys.map((key) => ({ [`details.${key}`]: expression })),
    ];
  }
  try {
    await dbConnect();
    const contacts = await Contact.find(filter).sort({ updatedAt: -1 }).limit(20_000).lean();
    const customKeys = Array.from(new Set(categories.flatMap((category) => getFields(category.id).map((field) => field.key)))).filter((key) => !["fullName", "phone", "whatsapp", "email", "organization", "city", "state", "workingLocations", "notes"].includes(key));
    const customColumns = customKeys.map((key) => ({ key: `details.${key}`, header: getFields(categories.find((category) => getFields(category.id).some((field) => field.key === key))?.id || "").find((field) => field.key === key)?.label || key }));
    const columns = [...baseColumns, ...customColumns];
    const rows = contacts.map((contact) => {
      const details = (contact.details || {}) as Record<string, unknown>;
      const row: Record<string, unknown> = {
        name: contact.name, categoryLabel: categoryLabel(contact.category), status: contact.status, phone: contact.phone, whatsapp: details.whatsapp,
        email: contact.email, organization: contact.organization, city: contact.city, state: contact.state, workingLocations: details.workingLocations,
        tags: Array.isArray(contact.tags) ? contact.tags.join(", ") : "", followUpAt: contact.followUpAt, notes: contact.notes, source: contact.source,
        createdAt: contact.createdAt, updatedAt: contact.updatedAt,
      };
      for (const key of customKeys) row[`details.${key}`] = details[key];
      return row;
    });

    if (format === "csv") {
      const csv = [columns.map((col) => escapeCsv(col.header)).join(","), ...rows.map((row) => columns.map((col) => escapeCsv(row[col.key])).join(","))].join("\r\n");
      return new Response(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="civil-at-hand-contacts.csv"', "Cache-Control": "no-store" } });
    }
    const workbook = new ExcelJS.Workbook();
    workbook.creator = process.env.NEXT_PUBLIC_APP_NAME || "Civil At Hand";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("Contacts", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = columns.map((column) => ({ header: column.header, key: column.key, width: Math.min(42, Math.max(16, column.header.length + 2)) }));
    for (const row of rows) sheet.addRow(row);
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF176B59" } };
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: columns.length } };
    sheet.eachRow((row, rowNumber) => { if (rowNumber > 1 && rowNumber % 2 === 0) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F7F5" } }; }); });
    const bytes = await workbook.xlsx.writeBuffer();
    return new Response(bytes as BodyInit, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="civil-at-hand-contacts.xlsx"', "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Contact export error:", error);
    return NextResponse.json({ error: "Could not export records. Check the database connection." }, { status: 503 });
  }
}
