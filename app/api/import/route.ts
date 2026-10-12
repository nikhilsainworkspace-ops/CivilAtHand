import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { categories, contactStatuses, getFields } from "@/lib/categories";
import { cleanText } from "@/lib/contact-input";
import { Contact } from "@/models/Contact";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_DATA_ROWS = 1000;
const MAX_REPORTED_ERRORS = 20;

type ImportRow = { line: number; cells: string[] };
type PreparedContact = {
  category: string;
  name: string;
  phone: string;
  email: string;
  organization: string;
  city: string;
  state: string;
  status: string;
  source: "import";
  linkId: string;
  tags: string[];
  notes: string;
  followUpAt: Date | null;
  details: Record<string, string>;
};

function normalizeHeader(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function digits(value: string) { return value.replace(/\D/g, ""); }
function emailKey(value: string) { return value.trim().toLowerCase(); }
function rowIsEmpty(row: string[]) { return row.every((cell) => !cell.trim()); }

function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function cellText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object.text === "string") return object.text;
    if (Array.isArray(object.richText)) return object.richText.map((part) => cellText((part as Record<string, unknown>).text)).join("");
    if ("result" in object) return cellText(object.result);
    if (typeof object.hyperlink === "string") return object.hyperlink;
    return "";
  }
  return String(value).trim();
}

async function readRows(fileName: string, bytes: Buffer): Promise<string[][]> {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "csv") return parseCsv(new TextDecoder("utf-8").decode(bytes));
  if (extension !== "xlsx") throw new Error("Please upload a .csv or .xlsx file. Older .xls files are not supported; save them as .xlsx first.");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The Excel workbook has no worksheet to import.");
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    for (let column = 1; column <= sheet.columnCount; column += 1) cells.push(cellText(row.getCell(column).value));
    rows.push(cells);
  });
  return rows;
}

function buildHeaderLookup(headers: string[], values: string[]) {
  const lookup = new Map<string, string>();
  headers.forEach((header, index) => {
    const key = normalizeHeader(header);
    if (key && (!lookup.has(key) || !lookup.get(key)) && values[index]) lookup.set(key, values[index].trim());
  });
  return (aliases: string[]) => {
    for (const alias of aliases) {
      const value = lookup.get(normalizeHeader(alias));
      if (value) return value.trim();
    }
    return "";
  };
}

function parseStatus(value: string) {
  const key = normalizeHeader(value);
  const found = contactStatuses.find((item) => normalizeHeader(item.value) === key || normalizeHeader(item.label) === key);
  return found?.value || "new";
}

function parseCategory(value: string) {
  const key = normalizeHeader(value);
  return categories.find((item) => normalizeHeader(item.id) === key || normalizeHeader(item.label) === key);
}

function prepareRow(headers: string[], values: string[], line: number): { contact?: PreparedContact; error?: string } {
  const get = buildHeaderLookup(headers, values);
  const categoryValue = get(["Category", "categoryId", "Contact category", "Category ID"]);
  const category = parseCategory(categoryValue);
  if (!category) return { error: categoryValue ? `Unknown category "${categoryValue}".` : "Category is blank." };

  const details: Record<string, string> = {};
  for (const field of getFields(category.id)) {
    // Export workbooks use one display label per unique field key. Include that key's
    // labels from every category so those shared columns round-trip correctly.
    const aliases = [field.key, field.label, ...categories.flatMap((item) => getFields(item.id).filter((other) => other.key === field.key).map((other) => other.label))];
    if (field.key === "fullName") aliases.push("Name", "Full Name");
    if (field.key === "phone") aliases.push("Phone", "Phone number", "Mobile", "Mobile number");
    if (field.key === "whatsapp") aliases.push("WhatsApp", "WhatsApp number");
    if (field.key === "email") aliases.push("Email", "Email address");
    if (field.key === "organization") aliases.push("Business / Company", "Company", "Business name");
    if (field.key === "workingLocations") aliases.push("Working / Delivery Locations", "Working / supply locations");
    if (field.key === "notes") aliases.push("Notes", "Additional notes");
    details[field.key] = cleanText(get(aliases), field.key === "notes" ? 6000 : 2000);
  }

  const name = cleanText(get(["Name", "Full Name", "fullName"]) || details.fullName, 160);
  const phone = cleanText(get(["Phone", "Phone number", "Mobile", "Mobile number"]) || details.phone, 40);
  const email = cleanText(get(["Email", "Email address"]) || details.email, 180).toLowerCase();
  if (!name) return { error: "Name is required." };
  if (!phone && !email) return { error: "Add a phone number or email address." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email address does not look valid." };

  details.fullName = name;
  details.phone = phone;
  details.email = email;
  details.organization = cleanText(get(["Business / Company", "Business or company name", "organization", "Company"]) || details.organization, 180);
  details.city = cleanText(get(["City", "city"]) || details.city, 120);
  details.state = cleanText(get(["State", "state"]) || details.state, 120);
  details.whatsapp = cleanText(get(["WhatsApp", "WhatsApp number"]) || details.whatsapp, 40);
  details.workingLocations = cleanText(get(["Working / Delivery Locations", "Working / supply locations", "workingLocations"]) || details.workingLocations, 2000);
  details.notes = cleanText(get(["Notes", "Additional notes"]) || details.notes, 6000);

  const rawFollowUp = get(["Follow-up Date", "Follow Up Date", "followUpAt"]);
  const parsedFollowUp = rawFollowUp ? new Date(rawFollowUp) : null;
  const followUpAt = parsedFollowUp && !Number.isNaN(parsedFollowUp.getTime()) ? parsedFollowUp : null;
  const tags = cleanText(get(["Tags", "tags"]), 1000).split(/[,;|]/).map((tag) => tag.trim().slice(0, 40)).filter(Boolean).slice(0, 30);

  return { contact: {
    category: category.id,
    name,
    phone,
    email,
    organization: details.organization,
    city: details.city,
    state: details.state,
    status: parseStatus(get(["Status", "Relationship status"])),
    source: "import",
    linkId: "",
    tags,
    notes: details.notes,
    followUpAt,
    details,
  } };
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Choose a CSV or Excel (.xlsx) file to import." }, { status: 400 });
    }
    if (file.size <= 0) return NextResponse.json({ error: "The selected file is empty." }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "The file is too large. The maximum upload size is 4 MB." }, { status: 413 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const rows = await readRows(file.name, bytes);
    const usableRows = rows.filter((row) => !rowIsEmpty(row));
    if (usableRows.length < 2) return NextResponse.json({ error: "The file needs a header row and at least one contact row." }, { status: 400 });
    if (usableRows.length - 1 > MAX_DATA_ROWS) return NextResponse.json({ error: `Import up to ${MAX_DATA_ROWS} contacts at a time. Split this file into smaller files and try again.` }, { status: 413 });

    const headers = usableRows[0].map((cell) => cell.trim());
    if (!headers.some((header) => ["name", "fullname"].includes(normalizeHeader(header))) || !headers.some((header) => ["category", "categoryid", "contactcategory"].includes(normalizeHeader(header)))) {
      return NextResponse.json({ error: "Required columns are missing. Include at least Name and Category. The easiest template is an Excel/CSV export from Civil At Hand." }, { status: 400 });
    }

    const prepared: PreparedContact[] = [];
    const rowErrors: { row: number; message: string }[] = [];
    let invalid = 0;
    for (let index = 1; index < usableRows.length; index += 1) {
      const result = prepareRow(headers, usableRows[index], index + 1);
      if (result.contact) prepared.push(result.contact);
      else {
        invalid += 1;
        if (rowErrors.length < MAX_REPORTED_ERRORS) rowErrors.push({ row: index + 1, message: result.error || "Could not read this row." });
      }
    }

    await dbConnect();
    const existing = await Contact.find({}, { phone: 1, email: 1 }).lean();
    const seenPhones = new Set(existing.map((contact) => digits(String(contact.phone || ""))).filter(Boolean));
    const seenEmails = new Set(existing.map((contact) => emailKey(String(contact.email || ""))).filter(Boolean));
    const toInsert: PreparedContact[] = [];
    let duplicates = 0;
    for (const contact of prepared) {
      const phone = digits(contact.phone);
      const email = emailKey(contact.email);
      if ((phone && seenPhones.has(phone)) || (email && seenEmails.has(email))) { duplicates += 1; continue; }
      toInsert.push(contact);
      if (phone) seenPhones.add(phone);
      if (email) seenEmails.add(email);
    }

    let created = 0;
    if (toInsert.length) {
      const result = await Contact.insertMany(toInsert, { ordered: true });
      created = result.length;
    }
    return NextResponse.json({
      ok: true,
      created,
      duplicates,
      failed: invalid,
      errors: rowErrors,
      message: `Imported ${created} contact(s), skipped ${duplicates} duplicate(s), and found ${invalid} invalid row(s).`,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not import this file.";
    console.error("Contact import error:", error);
    if (/zip|central directory|unexpected end|file signature|corrupt|invalid workbook/i.test(message)) {
      return NextResponse.json({ error: "This Excel file could not be read. Open it in Excel or LibreOffice and save it again as .xlsx, or use CSV." }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not import contacts. Check the file format and database connection, then try again." }, { status: 503 });
  }
}
