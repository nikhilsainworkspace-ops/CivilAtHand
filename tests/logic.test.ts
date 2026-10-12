import test from "node:test";
import assert from "node:assert/strict";
import { phoneKey, emailKey, findMatches, duplicateGroups, duplicateIdSet } from "@/lib/duplicates";
import { bucketFollowUps, addDays, dateKey, collectFollowUps } from "@/lib/followups";
import { parseCsv, escapeCsv, unprotectCell } from "@/lib/csv";
import { normalizeContactInput } from "@/lib/contact-input";
import { normalizeProjectInput } from "@/lib/projects";
import { InputError } from "@/lib/errors";
import { buildReport } from "@/lib/reports";
import { formatINR } from "@/lib/format";

test("phoneKey compares the last 10 digits and ignores short numbers", () => {
  assert.equal(phoneKey("+91 98765-43210"), "9876543210");
  assert.equal(phoneKey("098765 43210"), "9876543210");
  assert.equal(phoneKey("12345"), "");
  assert.equal(emailKey("  Test@Example.COM "), "test@example.com");
});

test("findMatches finds same phone or email, and can ignore the record being edited", () => {
  const list = [
    { _id: "1", phone: "+91 98765 43210", email: "" },
    { _id: "2", phone: "", email: "a@b.com" },
    { _id: "3", phone: "9999999999", email: "z@z.com" },
  ];
  assert.deepEqual(findMatches(list, "9876543210", "").map((x) => x._id), ["1"]);
  assert.deepEqual(findMatches(list, "", "A@B.com").map((x) => x._id), ["2"]);
  assert.deepEqual(findMatches(list, "9876543210", "", "1"), []);
  assert.deepEqual(findMatches(list, "", ""), []);
});

test("duplicateGroups links records through phone or email", () => {
  const list = [
    { _id: "1", phone: "9876543210", email: "x@x.com" },
    { _id: "2", phone: "+919876543210", email: "" },
    { _id: "3", phone: "", email: "x@x.com" },
    { _id: "4", phone: "9000000000", email: "" },
  ];
  const groups = duplicateGroups(list);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].map((x) => x._id).sort(), ["1", "2", "3"]);
  assert.equal(duplicateIdSet(list).has("4"), false);
});

test("follow-ups are bucketed by calendar day", () => {
  const now = new Date(2026, 9, 12, 15, 0, 0); // 12 Oct 2026, local time
  const today = dateKey(now);
  assert.equal(today, "2026-10-12");
  assert.equal(addDays(today, 7), "2026-10-19");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  const items = [
    { kind: "contact" as const, id: "a", title: "A", subtitle: "", date: "2026-10-11T00:00:00.000Z" },
    { kind: "contact" as const, id: "b", title: "B", subtitle: "", date: "2026-10-12T00:00:00.000Z" },
    { kind: "project" as const, id: "c", title: "C", subtitle: "", date: "2026-10-19T00:00:00.000Z" },
    { kind: "project" as const, id: "d", title: "D", subtitle: "", date: "2026-10-20T00:00:00.000Z" },
  ];
  const b = bucketFollowUps(items, now);
  assert.deepEqual([b.overdue, b.today, b.week, b.later].map((l) => l.map((i) => i.id)), [["a"], ["b"], ["c"], ["d"]]);
});

test("collectFollowUps skips closed contacts and finished projects", () => {
  const items = collectFollowUps(
    [{ _id: "1", name: "A", followUpAt: "2026-10-12", status: "closed" }, { _id: "2", name: "B", followUpAt: "2026-10-12", status: "new" }],
    [{ _id: "3", title: "P", followUpAt: "2026-10-12", status: "completed" }, { _id: "4", title: "Q", followUpAt: "2026-10-12", status: "lead" }],
  );
  assert.deepEqual(items.map((i) => i.id), ["2", "4"]);
});

test("CSV parse/escape round-trips, including formula protection", () => {
  const text = 'Name,Notes\r\n"Sharma, R","line1\nline2 ""quoted"""\r\n+919876543210,ok\r\n';
  const rows = parseCsv(text);
  assert.deepEqual(rows[0], ["Name", "Notes"]);
  assert.deepEqual(rows[1], ["Sharma, R", 'line1\nline2 "quoted"']);
  assert.equal(escapeCsv("=SUM(A1)"), "'=SUM(A1)");
  assert.equal(escapeCsv("+919876543210"), "'+919876543210");
  assert.equal(escapeCsv('a,"b"'), '"a,""b"""');
  assert.equal(unprotectCell(escapeCsv("+919876543210")), "+919876543210");
  assert.equal(unprotectCell("'normal"), "'normal");
});

test("normalizeContactInput validates required fields and keeps details", () => {
  const ok = normalizeContactInput({ category: "manpower-supplier", details: { fullName: " Ramesh ", phone: "98765 43210", city: "Jaipur", state: "Rajasthan", workerTypes: "Welders", teamSize: "10–20 people / 10–20 लोग" }, tags: "urgent, trusted", followUpAt: "2026-11-01" });
  assert.equal(ok.name, "Ramesh");
  assert.equal(ok.city, "Jaipur");
  assert.deepEqual(ok.tags, ["urgent", "trusted"]);
  assert.equal(ok.followUpAt?.toISOString().slice(0, 10), "2026-11-01");
  assert.throws(() => normalizeContactInput({ category: "nope", details: {} }), InputError);
  assert.throws(() => normalizeContactInput({ category: "manpower-supplier", details: { fullName: "X", city: "a", state: "b" } }), /phone number or email/);
  assert.throws(() => normalizeContactInput({ category: "manpower-supplier", details: { fullName: "X", phone: "1" } }), /required fields/);
});

test("normalizeProjectInput cleans values and rejects bad ones", () => {
  const p = normalizeProjectInput({ title: " G+3 Building ", status: "quoted", estimatedValue: "₹25,00,000", clientContactId: "507f1f77bcf86cd799439011", linkedContactIds: ["507f1f77bcf86cd799439011", "bad", "507f1f77bcf86cd799439011"], followUpAt: "2026-10-20" });
  assert.equal(p.title, "G+3 Building");
  assert.equal(p.estimatedValue, 2500000);
  assert.deepEqual(p.linkedContactIds, ["507f1f77bcf86cd799439011"]);
  assert.equal(normalizeProjectInput({ title: "x", status: "weird" }).status, "lead");
  assert.equal(normalizeProjectInput({ title: "x" }).estimatedValue, null);
  assert.throws(() => normalizeProjectInput({ title: "" }), InputError);
  assert.throws(() => normalizeProjectInput({ title: "x", estimatedValue: "-5" }), InputError);
  assert.throws(() => normalizeProjectInput({ title: "x", estimatedValue: "abc" }), InputError);
});

test("buildReport totals contacts, pipeline and overdue follow-ups", () => {
  const now = new Date(2026, 9, 12);
  const r = buildReport(
    [{ category: "vendor-supplier", status: "new", state: "Punjab", createdAt: "2026-10-01T12:00:00Z", followUpAt: "2026-10-01" }, { category: "vendor-supplier", status: "active", state: "Punjab", source: "public-link", createdAt: "2026-09-02T12:00:00Z" }],
    [{ status: "lead", estimatedValue: 1000000, followUpAt: "2026-10-05" }, { status: "ongoing", estimatedValue: 5000000 }, { status: "lost", estimatedValue: 700000, followUpAt: "2026-09-01" }],
    [{ _id: "l", title: "Vendors", active: true, submissions: 2 }],
    now,
  );
  assert.equal(r.totalContacts, 2);
  assert.deepEqual(r.byState, [{ key: "Punjab", count: 2 }]);
  assert.equal(r.openLeads, 1);
  assert.equal(r.pipelineValue, 1000000);
  assert.equal(r.ongoingValue, 5000000);
  assert.equal(r.followUpsOverdueContacts, 1);
  assert.equal(r.followUpsOverdueProjects, 1); // lost project is excluded
  assert.equal(r.addedPerMonth.at(-1)?.count, 1);
  assert.equal(r.addedPerMonth.at(-2)?.count, 1);
  assert.equal(r.linkRows[0].submissions, 2);
});

test("formatINR uses lakh / crore", () => {
  assert.equal(formatINR(2500000), "₹25 L");
  assert.equal(formatINR(12500000), "₹1.25 Cr");
  assert.equal(formatINR(45000), "₹45,000");
  assert.equal(formatINR(null), "—");
});
