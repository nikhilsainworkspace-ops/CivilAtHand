"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type CSSProperties, type ReactNode } from "react";
import { categories, contactStatuses, getFields, categoryLabel, type FormField } from "@/lib/categories";
import { clearBrowserAppState } from "@/lib/client-api";
import { brand } from "@/lib/brand";
import { dateKey, type FollowUpItem } from "@/lib/followups";
import { duplicateIdSet } from "@/lib/duplicates";
import { shortDate as dateOnly } from "@/lib/format";
import type { ContactRecord, ProjectRecord, RateRecord, RoomRecord, ShareLinkRecord, TaskRecord, PrivateNoteRecord } from "@/lib/types";
import FollowUpsPanel from "@/components/followups-panel";
import ProjectsPanel, { ProjectModal } from "@/components/projects-panel";
import ReportsPanel from "@/components/reports-panel";
import RoomsPanel from "@/components/rooms-panel";
import RatesPanel from "@/components/rates-panel";
import SecurityPanel from "@/components/security-panel";
import MergeModal from "@/components/merge-modal";
import InteractionLog from "@/components/interaction-log";
import TasksPanel from "@/components/tasks-panel";
import PrivateNotesPanel from "@/components/private-notes-panel";

type Session = { authenticated: boolean; configured: boolean; appName: string; twoFactor?: boolean };
type Toast = { type: "success" | "error" | "info"; message: string };
type Tab = "overview" | "followups" | "tasks" | "notes" | "contacts" | "team" | "projects" | "rates" | "rooms" | "reports" | "links" | "security" | "settings";
type GlobalSearchResult =
  | { kind: "contact"; id: string; title: string; subtitle: string; record: ContactRecord }
  | { kind: "project"; id: string; title: string; subtitle: string; record: ProjectRecord }
  | { kind: "task"; id: string; title: string; subtitle: string; record: TaskRecord }
  | { kind: "note"; id: string; title: string; subtitle: string; record: PrivateNoteRecord }
  | { kind: "rate"; id: string; title: string; subtitle: string; record: RateRecord }
  | { kind: "room"; id: string; title: string; subtitle: string; record: RoomRecord }
  | { kind: "link"; id: string; title: string; subtitle: string; record: ShareLinkRecord };
const taskPriorityLabels: Record<TaskRecord["priority"], string> = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };
const taskStatusLabels: Record<TaskRecord["status"], string> = { todo: "Pending", "in-progress": "In progress", done: "Completed", cancelled: "Cancelled" };

const brandName = brand.name;
const brandTagline = brand.tagline;
const brandLogo = brand.logoUrl;
const brandColor = brand.color;

class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown>) { super(message); this.status = status; this.data = data; }
}

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { ...(init?.headers || {}), ...(init?.body ? { "Content-Type": "application/json" } : {}) }, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && !url.startsWith("/api/auth/")) window.dispatchEvent(new Event("cah-unauthorized"));
  if (!response.ok) throw new ApiError(data.error || "Something went wrong. Please try again.", response.status, data);
  return data;
}
function siteBase() {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
  return (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");
}
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "C"; }
function shortDate(value?: string | null) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
function relativeDate(value?: string) { if (!value) return "No date"; const date = new Date(value); if (Number.isNaN(date.getTime())) return "No date"; const diff = Math.max(0, Date.now() - date.getTime()); if (diff < 60000) return "Just now"; if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`; if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`; if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`; return shortDate(value); }
function statusLabel(status: string) { return contactStatuses.find((item) => item.value === status)?.label || status; }
function StatusPill({ status }: { status: string }) { return <span className={`status-pill status-${status}`}>{statusLabel(status)}</span>; }
function BrandMark({ large = false }: { large?: boolean }) { return brandLogo ? <img className={large ? "brand-logo-large" : "brand-logo"} src={brandLogo} alt={`${brandName} logo`} /> : <span className={`brand-mark ${large ? "large-mark" : ""}`} aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M4 25h24M7 25V13l9-7 9 7v12M12 25v-8h8v8" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 13h2m6 0h2" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/></svg></span>; }
function Icon({ name }: { name: "overview" | "contacts" | "links" | "settings" | "search" | "plus" | "download" | "external" | "edit" | "trash" | "copy" | "check" | "lock" | "logout" | "database" | "users" | "calendar" | "arrow" | "filter" | "share" | "mail" | "upload" | "briefcase" | "chart" | "note" }) {
  const paths: Record<string, ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    contacts: <><path d="M16 20c0-3-2.5-5-6-5s-6 2-6 5v1h12z"/><circle cx="10" cy="8" r="4"/><path d="M16 4.5a4 4 0 0 1 0 7.5M18 15c2.8.4 4 2.1 4 4.3V21h-4"/></>,
    links: <><path d="M10 13a5 5 0 0 0 7.1 0l2.8-2.8a5 5 0 0 0-7.1-7.1L11.2 4.7"/><path d="M14 11a5 5 0 0 0-7.1 0l-2.8 2.8a5 5 0 0 0 7.1 7.1l1.6-1.6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2L5.7 12l1.4-2.4 1.7.6a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.9z" transform="translate(-1 -1) scale(1.08)"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.5 4.5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>, download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M4 17v4h16v-4"/></>, external: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></>,
    edit: <><path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20z"/></>, trash: <><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/></>, copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>, check: <path d="m5 12 4 4L19 6"/>, lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></>, logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>, database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></>, users: <><circle cx="9" cy="8" r="3.5"/><path d="M2 20v-1a7 7 0 0 1 14 0v1M16 5.5a3.5 3.5 0 0 1 0 6.8M18 15a5.2 5.2 0 0 1 4 5"/></>, calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>, arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>, filter: <><path d="M3 5h18M6 12h12M10 19h4"/></>, share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></>, mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>, upload: <><path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 16v4h16v-4"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></>, chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>, note: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h6"/></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function LoginScreen({ configured, twoFactor, onLogin, toast, clearToast }: { configured: boolean; twoFactor: boolean; onLogin: (user: string, pass: string, code: string) => Promise<void>; toast: Toast | null; clearToast: () => void }) {
  const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [showPassword, setShowPassword] = useState(false); const [code, setCode] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); try { await onLogin(username, password, code); } catch { /* toast is set by parent */ } finally { setBusy(false); } }
  return <main className="login-shell" style={{ "--brand": brandColor } as CSSProperties}>
    <div className="login-background"><span className="grid-lines" /><span className="orb orb-one" /><span className="orb orb-two" /></div>
    <div className="login-brand"><BrandMark large /><div><strong>{brandName}</strong><small>{brandTagline}</small></div></div>
    <div className="login-layout">
      <section className="login-copy"><span className="eyebrow light-eyebrow">PRIVATE WORKSPACE · CIVIL INDUSTRY</span><h1>Your network.<br /><em>Under control.</em></h1><p>One calm place to organise manpower, suppliers, contractors, clients and the relationships that keep projects moving.</p>
        <div className="login-highlights"><div><span className="highlight-icon">01</span><span><strong>One reliable database</strong><small>Search, update and export your network.</small></span></div><div><span className="highlight-icon">02</span><span><strong>Easy public intake forms</strong><small>Share a link. Get structured details back.</small></span></div><div><span className="highlight-icon">03</span><span><strong>Designed for civil work</strong><small>Built around the people and resources you need.</small></span></div></div>
      </section>
      <section className="login-card"><div className="login-card-icon"><Icon name="lock" /></div><p className="eyebrow">ADMIN ACCESS</p><h2>Welcome back</h2><p className="login-subtitle">Sign in to open your private management panel.</p>
        {toast ? <div className={`toast toast-${toast.type}`} role="alert">{toast.message}<button onClick={clearToast} aria-label="Dismiss message">×</button></div> : null}
        {!configured ? <div className="config-warning"><strong>One-time setup required</strong><p>Add <code>ADMIN_USERNAME</code>, <code>ADMIN_PASSWORD</code>, and a unique 32+ character <code>ADMIN_SESSION_SECRET</code> in Vercel Environment Variables, along with MongoDB settings. See README.md.</p></div> : null}
        <form onSubmit={submit} className="login-form" autoComplete="off"><label className="field-wrap"><span>Username</span><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your admin username" autoComplete="off" required /></label><label className="field-wrap"><span>Password</span><div className="password-wrap"><input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" type={showPassword ? "text" : "password"} autoComplete="off" required /><button className="show-password" type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div></label>{twoFactor ? <label className="field-wrap"><span>6-digit code from your authenticator app</span><input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" autoComplete="off" maxLength={6} required /></label> : null}<button className="primary-button login-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Unlock dashboard"}<Icon name="arrow" /></button></form>
        <div className="login-card-footer"><Icon name="lock" /><span>Private access · Server-checked session{twoFactor ? " · 2-step verification" : ""}</span></div>
      </section>
    </div>
    <footer className="login-footer"><span>© {new Date().getFullYear()} {brandName}</span><span>Made for civil engineering professionals</span><span>Personal management workspace</span></footer>
  </main>;
}

function FieldControl({ field, value, onChange }: { field: FormField; value: string; onChange: (value: string) => void }) {
  if (field.type === "textarea") return <textarea rows={3} value={value || ""} required={field.required} placeholder={field.placeholder || "Enter details"} onChange={(event) => onChange(event.target.value)} maxLength={field.key === "notes" ? 6000 : 2000} />;
  if (field.type === "select") return <select value={value || ""} required={field.required} onChange={(event) => onChange(event.target.value)}><option value="">Select…</option>{(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  const type = field.type === "email" ? "email" : field.type === "tel" ? "tel" : field.type === "url" ? "url" : "text";
  return <input type={type} value={value || ""} required={field.required} placeholder={field.placeholder || "Enter details"} onChange={(event) => onChange(event.target.value)} maxLength={field.key === "notes" ? 6000 : 2000} />;
}

function ContactModal({ initial, onClose, onSave, saving, defaultTeam = false }: { initial: ContactRecord | null; onClose: () => void; onSave: (payload: Record<string, unknown>) => Promise<void>; saving: boolean; defaultTeam?: boolean }) {
  type PhoneLabel = "Mobile" | "Work" | "Home" | "Main" | "Other";
  type EmailLabel = "Work" | "Home" | "Other";
  type PhoneDraft = { label: PhoneLabel; number: string };
  type EmailDraft = { label: EmailLabel; value: string };
  const splitName = (name: string) => { const parts = String(name || "").trim().split(/\s+/).filter(Boolean); return { first: parts[0] || "", last: parts.length > 1 ? parts.slice(1).join(" ") : "" }; };
  const initialSplit = splitName(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "general-contact");
  const [details, setDetails] = useState<Record<string, string>>(initial?.details || {});
  const [firstName, setFirstName] = useState(initial?.firstName || initialSplit.first);
  const [lastName, setLastName] = useState(initial?.lastName || initialSplit.last);
  const [organization, setOrganization] = useState(initial?.organization || initial?.details?.organization || "");
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle || "");
  const [phone, setPhone] = useState(initial?.phone || initial?.details?.phone || "");
  const [phoneLabel, setPhoneLabel] = useState<PhoneLabel>((initial?.phoneLabel as PhoneLabel) || "Mobile");
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneDraft[]>((initial?.phoneNumbers || []).map((p) => ({ label: p.label, number: p.number })));
  const [email, setEmail] = useState(initial?.email || initial?.details?.email || "");
  const [emailLabel, setEmailLabel] = useState<EmailLabel>((initial?.emailLabel as EmailLabel) || "Work");
  const [emailAddresses, setEmailAddresses] = useState<EmailDraft[]>((initial?.emailAddresses || []).map((e) => ({ label: e.label, value: e.value })));
  const [birthday, setBirthday] = useState((initial?.birthday || "").slice(0, 10));
  const [city, setCity] = useState(initial?.city || initial?.details?.city || "");
  const [stateName, setStateName] = useState(initial?.state || initial?.details?.state || "");
  const [contactNotes, setContactNotes] = useState(initial?.notes || initial?.details?.notes || "");
  const [isTeamMember, setIsTeamMember] = useState(Boolean(initial?.isTeamMember || (!initial && defaultTeam)));
  const [teamRole, setTeamRole] = useState(initial?.teamRole || "");
  const [teamDepartment, setTeamDepartment] = useState(initial?.teamDepartment || "");
  const [status, setStatus] = useState(initial?.status || "new");
  const [tags, setTags] = useState((initial?.tags || []).join(", "));
  const [followUpAt, setFollowUpAt] = useState(initial?.followUpAt ? initial.followUpAt.substring(0, 10) : "");
  const [rating, setRating] = useState(String(initial?.rating || 0));
  const [flag, setFlag] = useState(initial?.flag || "");
  const [shareConsent, setShareConsent] = useState(initial?.shareConsent || "");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const fallback = splitName(initial?.name || "");
    setCategory(initial?.category || "general-contact"); setDetails(initial?.details || {});
    setFirstName(initial?.firstName || fallback.first); setLastName(initial?.lastName || fallback.last);
    setOrganization(initial?.organization || initial?.details?.organization || ""); setJobTitle(initial?.jobTitle || "");
    setPhone(initial?.phone || initial?.details?.phone || ""); setPhoneLabel((initial?.phoneLabel as PhoneLabel) || "Mobile");
    setPhoneNumbers((initial?.phoneNumbers || []).map((p) => ({ label: p.label, number: p.number })));
    setEmail(initial?.email || initial?.details?.email || ""); setEmailLabel((initial?.emailLabel as EmailLabel) || "Work"); setEmailAddresses((initial?.emailAddresses || []).map((e) => ({ label: e.label, value: e.value })));
    setBirthday((initial?.birthday || "").slice(0, 10)); setCity(initial?.city || initial?.details?.city || ""); setStateName(initial?.state || initial?.details?.state || "");
    setContactNotes(initial?.notes || initial?.details?.notes || ""); setIsTeamMember(Boolean(initial?.isTeamMember || (!initial && defaultTeam))); setTeamRole(initial?.teamRole || ""); setTeamDepartment(initial?.teamDepartment || "");
    setStatus(initial?.status || "new"); setTags((initial?.tags || []).join(", ")); setFollowUpAt(initial?.followUpAt ? initial.followUpAt.substring(0, 10) : "");
    setRating(String(initial?.rating || 0)); setFlag(initial?.flag || ""); setShareConsent(initial?.shareConsent || "");
  }, [initial, defaultTeam]);
  function update(key: string, value: string) { setDetails((current) => ({ ...current, [key]: value })); }
  function updatePhone(index: number, key: "label" | "number", value: string) { setPhoneNumbers((current) => current.map((item, i) => i === index ? { ...item, [key]: value } as PhoneDraft : item)); }
  function updateEmail(index: number, key: "label" | "value", value: string) { setEmailAddresses((current) => current.map((item, i) => i === index ? { ...item, [key]: value } as EmailDraft : item)); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setFormError("");
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
    if (!fullName) { setFormError("Please enter a first name or surname."); return; }
    if (!phone.trim() && !email.trim() && !phoneNumbers.some((item) => item.number.trim()) && !emailAddresses.some((item) => item.value.trim())) { setFormError("Add at least one phone number or email address."); return; }
    const mergedDetails = { ...details, fullName, phone: phone.trim(), email: email.trim(), organization: organization.trim(), city: city.trim(), state: stateName.trim(), notes: contactNotes, jobTitle: jobTitle.trim(), birthday };
    try {
      await onSave({ category, details: mergedDetails, name: fullName, firstName: firstName.trim(), lastName: lastName.trim(), organization, jobTitle, phone, phoneLabel, phoneNumbers, email, emailLabel, emailAddresses, birthday, city, state: stateName, notes: contactNotes, isTeamMember, teamRole, teamDepartment, status, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), followUpAt: followUpAt || null, rating: Number(rating), flag, shareConsent });
    } catch (error) { setFormError(error instanceof Error ? error.message : "Could not save this record."); }
  }
  const standardKeys = new Set(["fullName", "phone", "email", "organization", "city", "state", "notes"]);
  const specialtyFields = getFields(category).filter((field) => !standardKeys.has(field.key));

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card record-modal contact-google-modal" role="dialog" aria-modal="true" aria-labelledby="record-modal-title"><div className="modal-head"><div><p className="eyebrow">CONTACTS · PRIVATE DATABASE</p><h2 id="record-modal-title">{initial ? "Edit contact" : "Create a contact"}</h2><p>Save phone numbers, emails, labels and team details in your MongoDB database.</p></div><button className="icon-button" onClick={onClose} aria-label="Close" type="button">×</button></div>
    <form onSubmit={submit} className="record-form contact-google-form">
      <section className="contact-form-section"><div className="contact-section-title"><span className="contact-section-mark">01</span><div><h3>Contact information</h3><p>Start with the person's name and the best way to reach them.</p></div></div>
        <div className="form-grid admin-form-grid">
          <label className="field-wrap"><span>First name *</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={80} autoComplete="given-name" placeholder="e.g. Rahul" required /></label>
          <label className="field-wrap"><span>Surname</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={80} autoComplete="family-name" placeholder="e.g. Sharma" /></label>
          <label className="field-wrap"><span>Company / organisation</span><input value={organization} onChange={(event) => setOrganization(event.target.value)} maxLength={180} autoComplete="organization" placeholder="Company or business name" /></label>
          <label className="field-wrap"><span>Job title</span><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} maxLength={120} placeholder="e.g. Site Engineer, Owner" /></label>
          <div className="contact-labeled-value"><label className="field-wrap"><span>Phone number</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} autoComplete="tel" placeholder="+91 98765 43210" /></label><label className="field-wrap label-select-wrap"><span>Label</span><select value={phoneLabel} onChange={(event) => setPhoneLabel(event.target.value as PhoneLabel)}><option>Mobile</option><option>Work</option><option>Home</option><option>Main</option><option>Other</option></select></label></div>
          <div className="contact-labeled-value"><label className="field-wrap"><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={180} autoComplete="email" placeholder="name@company.com" /></label><label className="field-wrap label-select-wrap"><span>Label</span><select value={emailLabel} onChange={(event) => setEmailLabel(event.target.value as EmailLabel)}><option>Work</option><option>Home</option><option>Other</option></select></label></div>
          <label className="field-wrap"><span>Birthday</span><input type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} /></label>
          <label className="field-wrap"><span>City</span><input value={city} onChange={(event) => setCity(event.target.value)} maxLength={120} autoComplete="address-level2" placeholder="City" /></label>
          <label className="field-wrap"><span>State / region</span><input value={stateName} onChange={(event) => setStateName(event.target.value)} maxLength={120} autoComplete="address-level1" placeholder="State" /></label>
        </div>
      </section>

      <section className="contact-form-section"><div className="contact-section-title"><span className="contact-section-mark">02</span><div><h3>More ways to reach them</h3><p>Optional additional phone numbers and email addresses.</p></div></div>
        <div className="contact-repeat-list">{phoneNumbers.map((item, index) => <div className="contact-repeat-row" key={`phone-${index}`}><label className="field-wrap"><span>Phone label</span><select value={item.label} onChange={(event) => updatePhone(index, "label", event.target.value as PhoneLabel)}><option>Mobile</option><option>Work</option><option>Home</option><option>Main</option><option>Other</option></select></label><label className="field-wrap contact-repeat-value"><span>Phone number</span><input type="tel" value={item.number} onChange={(event) => updatePhone(index, "number", event.target.value)} maxLength={40} placeholder="Additional number" /></label><button type="button" className="contact-remove-row" onClick={() => setPhoneNumbers((current) => current.filter((_, i) => i !== index))} aria-label={`Remove additional phone ${index + 1}`}>×</button></div>)}
          <button type="button" className="contact-add-row" onClick={() => setPhoneNumbers((current) => current.length < 10 ? [...current, { label: "Work", number: "" }] : current)} disabled={phoneNumbers.length >= 10}>＋ Add another phone</button>
        </div>
        <div className="contact-repeat-list">{emailAddresses.map((item, index) => <div className="contact-repeat-row" key={`email-${index}`}><label className="field-wrap"><span>Email label</span><select value={item.label} onChange={(event) => updateEmail(index, "label", event.target.value as EmailLabel)}><option>Work</option><option>Home</option><option>Other</option></select></label><label className="field-wrap contact-repeat-value"><span>Email address</span><input type="email" value={item.value} onChange={(event) => updateEmail(index, "value", event.target.value)} maxLength={180} placeholder="another@email.com" /></label><button type="button" className="contact-remove-row" onClick={() => setEmailAddresses((current) => current.filter((_, i) => i !== index))} aria-label={`Remove additional email ${index + 1}`}>×</button></div>)}
          <button type="button" className="contact-add-row" onClick={() => setEmailAddresses((current) => current.length < 10 ? [...current, { label: "Work", value: "" }] : current)} disabled={emailAddresses.length >= 10}>＋ Add another email</button>
        </div>
      </section>

      <section className="contact-form-section"><div className="contact-section-title"><span className="contact-section-mark">03</span><div><h3>Team and labels</h3><p>Organise your team directory and quickly find contacts later.</p></div></div>
        <label className="contact-team-toggle"><input type="checkbox" checked={isTeamMember} onChange={(event) => setIsTeamMember(event.target.checked)} /><span><strong>Add to Team directory</strong><small>This person will also appear in the dedicated Team panel.</small></span></label>
        {isTeamMember ? <div className="form-grid admin-form-grid"><label className="field-wrap"><span>Team role</span><input value={teamRole} onChange={(event) => setTeamRole(event.target.value)} maxLength={120} placeholder="e.g. Project Manager" /></label><label className="field-wrap"><span>Department / team</span><input value={teamDepartment} onChange={(event) => setTeamDepartment(event.target.value)} maxLength={120} placeholder="e.g. Site Operations" /></label></div> : null}
        <div className="form-grid admin-form-grid meta-fields"><label className="field-wrap field-full"><span>Labels / tags (comma-separated)</span><input value={tags} onChange={(event) => setTags(event.target.value)} maxLength={500} placeholder="e.g. trusted, Delhi, concrete, urgent" /><small>Use labels like Google Contacts to group people. Labels are private to your workspace.</small></label><label className="field-wrap"><span>Contact type</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label className="field-wrap"><span>Relationship status</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{contactStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="field-wrap"><span>Follow-up date</span><input type="date" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} /></label><label className="field-wrap"><span>Your rating</span><select value={rating} onChange={(event) => setRating(event.target.value)}><option value="0">Not rated</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}{"☆".repeat(5 - n)} ({n})</option>)}</select></label><label className="field-wrap"><span>Flag</span><select value={flag} onChange={(event) => setFlag(event.target.value)}><option value="">None</option><option value="preferred">Preferred / trusted</option><option value="avoid">Avoid / unreliable</option></select></label><label className="field-wrap field-full"><span>May this contact be shared with clients?</span><select value={shareConsent} onChange={(event) => setShareConsent(event.target.value)}><option value="">Not recorded</option><option value="yes">Yes, they agreed</option><option value="no">No, never share</option></select></label></div>
      </section>

      {specialtyFields.length ? <details className="contact-specialty-details"><summary>Business-specific details <span>Optional fields for civil work contacts</span></summary><div className="form-grid admin-form-grid">{specialtyFields.map((field) => <label className={`field-wrap ${field.type === "textarea" ? "field-full" : ""}`} key={`${category}-${field.key}`}><span>{field.label}{field.required ? <b className="required-star"> *</b> : null}</span><FieldControl field={field} value={details[field.key] || ""} onChange={(value) => update(field.key, value)} /></label>)}</div></details> : null}
      <section className="contact-form-section"><div className="contact-section-title"><span className="contact-section-mark">04</span><div><h3>Private notes</h3><p>Keep details that help you remember the relationship. These are not shared by default.</p></div></div><label className="field-wrap"><span>Notes</span><textarea rows={4} value={contactNotes} onChange={(event) => setContactNotes(event.target.value)} maxLength={6000} placeholder="Meeting context, preferences, useful details…" /></label></section>
      {initial ? <InteractionLog contactId={initial._id} /> : null}
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}<div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving to database…" : initial ? "Save changes" : "Save contact"}<Icon name="check" /></button></div>
    </form></section></div>;
}

function LinkModal({ onClose, onCreate, busy }: { onClose: () => void; onCreate: (title: string, category: string, expiryDays: number) => Promise<void>; busy: boolean }) {
  const [title, setTitle] = useState("Manpower supplier enquiry"); const [category, setCategory] = useState("manpower-supplier"); const [expiry, setExpiry] = useState("0"); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setError(""); try { await onCreate(title, category, Number(expiry)); } catch (err) { setError(err instanceof Error ? err.message : "Could not create link."); } }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="link-modal-title"><div className="modal-head"><div><p className="eyebrow">PUBLIC INTAKE</p><h2 id="link-modal-title">Create a share link</h2><p>Anyone with the link can submit this form. Your records stay private.</p></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div><form className="record-form" onSubmit={submit}><label className="field-wrap"><span>Link name / purpose</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Vendor registration – Jaipur" required maxLength={160} /></label><label className="field-wrap"><span>Form category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="field-wrap"><span>Link expiry</span><select value={expiry} onChange={(event) => setExpiry(event.target.value)}><option value="0">Never (until I pause or delete it)</option><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="365">1 year</option></select></label>{error ? <p role="alert" className="form-error">{error}</p> : null}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Creating…" : "Create link"}<Icon name="arrow" /></button></div></form></section></div>;
}

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [navFilter, setNavFilter] = useState("");
  const sidebarNavRef = useRef<HTMLElement | null>(null);
  const sidebarNavItems: [Tab, string][] = [
    ["overview", "Overview"], ["followups", "Follow-ups"], ["tasks", "Task planner"], ["notes", "Private notes"],
    ["contacts", "Contact database"], ["team", "Team directory"], ["projects", "Projects & leads"], ["rates", "Rate book"], ["rooms", "Shared databases"],
    ["reports", "Reports"], ["links", "Public form links"], ["security", "Security"], ["settings", "Settings"],
  ];
  const visibleSidebarNavItems = sidebarNavItems.filter(([, label]) => label.toLowerCase().includes(navFilter.trim().toLowerCase()));
  const scrollSidebarNav = (direction: -1 | 1) => {
    const nav = sidebarNavRef.current;
    if (!nav) return;
    const horizontal = window.matchMedia("(max-width: 820px)").matches;
    nav.scrollBy({ left: horizontal ? direction * 190 : 0, top: horizontal ? 0 : direction * 190, behavior: "smooth" });
  };
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => sidebarNavRef.current?.querySelector<HTMLElement>(".nav-item-active")?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" }));
    return () => window.cancelAnimationFrame(frame);
  }, [tab, navFilter]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [links, setLinks] = useState<ShareLinkRecord[]>([]);
  const [health, setHealth] = useState<{ database: string; databaseName?: string; message?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [notes, setNotes] = useState<PrivateNoteRecord[]>([]);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);
  const [modalProject, setModalProject] = useState<ProjectRecord | null | "new">(null);
  const [savingProject, setSavingProject] = useState(false);
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [rates, setRates] = useState<RateRecord[]>([]);
  const [roomCreate, setRoomCreate] = useState<{ contactIds: string[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [autoLock, setAutoLock] = useState(15);
  const lastActivity = useRef(Date.now());
  const lastServerTouch = useRef(Date.now());
  useEffect(() => {
    const onUnauthorized = () => {
      clearClientWorkspaceState();
      clearBrowserAppState();
      setSession((current) => current ? { ...current, authenticated: false } : current);
    };
    window.addEventListener("cah-unauthorized", onUnauthorized);
    return () => window.removeEventListener("cah-unauthorized", onUnauthorized);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- the reset uses stable React setters only.
  useEffect(() => {
    if (!session?.authenticated) return;
    let checking = false;
    const checkSession = async () => {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin", headers: { "Cache-Control": "no-store" } });
        const current = await response.json() as Session;
        if (!current.authenticated) {
          clearClientWorkspaceState();
          clearBrowserAppState();
          setSession(current);
        }
      } catch { /* A temporary network issue must not erase the current work view; each API still checks auth. */ }
      finally { checking = false; }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void checkSession(); };
    const timer = window.setInterval(() => void checkSession(), 60_000);
    window.addEventListener("pageshow", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pageshow", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session?.authenticated]); // eslint-disable-line react-hooks/exhaustive-deps -- the reset uses stable React setters only.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("cah-session");
    channel.addEventListener("message", (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === "logout") {
        clearClientWorkspaceState();
        clearBrowserAppState();
        setSession((current) => current ? { ...current, authenticated: false } : current);
      }
    });
    return () => channel.close();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- event handler uses stable React setters only.
  useEffect(() => {
    if (!session?.authenticated) return;
    const mark = () => {
      const now = Date.now();
      lastActivity.current = now;
      // Only genuine page interaction sends a throttled heartbeat. The periodic status probe does not keep
      // an unattended session alive, but someone actively working in client-side forms does not expire mid-edit.
      if (now - lastServerTouch.current > 4 * 60_000) {
        lastServerTouch.current = now;
        void fetch("/api/auth/activity", { method: "POST", cache: "no-store", credentials: "same-origin" })
          .then((response) => { if (response.status === 401) window.dispatchEvent(new Event("cah-unauthorized")); })
          .catch(() => undefined);
      }
    };
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((name) => window.addEventListener(name, mark, { passive: true }));
    lastActivity.current = Date.now();
    lastServerTouch.current = Date.now();
    let timer: number | null = null;
    if (autoLock !== 0) {
      timer = window.setInterval(() => {
        if (Date.now() - (lastActivity.current ?? 0) > autoLock * 60_000) {
          if (timer !== null) window.clearInterval(timer);
          void logout().then((confirmed) => { if (confirmed) setToast({ type: "info", message: "Signed out automatically after a period of inactivity." }); });
        }
      }, 15_000);
    }
    return () => {
      if (timer !== null) window.clearInterval(timer);
      events.forEach((name) => window.removeEventListener(name, mark));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.authenticated, autoLock]);
  const [modalContact, setModalContact] = useState<ContactRecord | null | "new">(null);
  const [linkModal, setLinkModal] = useState(false);
  const [search, setSearch] = useState(""); const [appliedSearch, setAppliedSearch] = useState(""); const [filterCategory, setFilterCategory] = useState(""); const [filterStatus, setFilterStatus] = useState("");
  const [globalSearch, setGlobalSearch] = useState(""); const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const globalSearchInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    function handleWorkspaceShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setGlobalSearchOpen(true);
        window.setTimeout(() => globalSearchInputRef.current?.focus(), 0);
      }
    }
    window.addEventListener("keydown", handleWorkspaceShortcut);
    return () => window.removeEventListener("keydown", handleWorkspaceShortcut);
  }, []);

  function clearClientWorkspaceState() {
    setContacts([]); setLinks([]); setHealth(null); setBusy(false); setImporting(false); setSaving(false);
    setProjects([]); setTasks([]); setNotes([]); setFocusedTaskId(null); setFocusedNoteId(null);
    setModalProject(null); setSavingProject(false); setOnlyDuplicates(false); setRooms([]); setRates([]);
    setRoomCreate(null); setSelectedIds([]); setMergeOpen(false); setPrivacy(false); setModalContact(null);
    setLinkModal(false); setSearch(""); setAppliedSearch(""); setFilterCategory(""); setFilterStatus("");
    setGlobalSearch(""); setGlobalSearchOpen(false); setNavFilter(""); setTab("overview"); setToast(null);
    setAutoLock(15);
    if (importInputRef.current) importInputRef.current.value = "";
  }

  const notify = useCallback((message: string, type: Toast["type"] = "success") => setToast({ message, type }), []);
  const clearFocusedTask = useCallback(() => setFocusedTaskId(null), []);
  const clearFocusedNote = useCallback(() => setFocusedNoteId(null), []);
  const loadData = useCallback(async (showError = true) => {
    try {
      const [contactData, linkData, projectData, roomData, rateData, healthData, taskData, noteData, trashNoteData, preferenceData] = await Promise.all([
        jsonRequest("/api/contacts?limit=5000"), jsonRequest("/api/links"), jsonRequest("/api/projects").catch(() => ({ projects: [] })), jsonRequest("/api/rooms").catch(() => ({ rooms: [] })), jsonRequest("/api/rates").catch(() => ({ rates: [] })), jsonRequest("/api/health").catch((error) => ({ database: "error", message: error.message })), jsonRequest("/api/tasks").catch(() => ({ tasks: [] })), jsonRequest("/api/notes"), jsonRequest("/api/notes?view=trash").catch(() => ({ notes: [] })), jsonRequest("/api/security/preferences").catch(() => ({ autoLockMinutes: 15 })),
      ]);
      setContacts(contactData.contacts || []); setLinks(linkData.links || []); setProjects(projectData.projects || []); setRooms(roomData.rooms || []); setRates(rateData.rates || []); setHealth(healthData); setTasks(taskData.tasks || []); setNotes([...(noteData.notes || []), ...(trashNoteData.notes || [])]);
      const storedAutoLock = Number(preferenceData.autoLockMinutes);
      setAutoLock([0, 5, 15, 30, 60].includes(storedAutoLock) ? storedAutoLock : 15);
    } catch (error) { if (showError) notify(error instanceof Error ? error.message : "Could not load the dashboard.", "error"); }
  }, [notify]);

  useEffect(() => {
    let active = true;
    // Remove legacy app-prefixed storage from earlier builds before showing the workspace.
    clearBrowserAppState();
    fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin", headers: { "Cache-Control": "no-store" } }).then((res) => res.json()).then((data: Session) => { if (active) { setSession(data); if (data.authenticated) void loadData(); } }).catch(() => { if (active) { clearClientWorkspaceState(); setSession({ authenticated: false, configured: false, appName: brandName }); } });
    return () => { active = false; };
  }, [loadData]);

  async function login(username: string, password: string, code: string) {
    try {
      await jsonRequest("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password, code }) });
      const freshSession = await jsonRequest("/api/auth/session") as Session;
      lastActivity.current = Date.now();
      lastServerTouch.current = Date.now();
      setSession(freshSession);
      setToast(null); setTab("overview");
      await loadData();
    } catch (error) { notify(error instanceof Error ? error.message : "Could not sign in.", "error"); throw error; }
  }
  async function saveAutoLockPreference(minutes: number) {
    const previous = autoLock;
    setAutoLock(minutes);
    try {
      await jsonRequest("/api/security/preferences", { method: "PATCH", body: JSON.stringify({ autoLockMinutes: minutes }) });
      notify("Auto-lock preference saved to your database.");
    } catch (error) {
      setAutoLock(previous);
      notify(error instanceof Error ? error.message : "Could not save the auto-lock preference.", "error");
    }
  }
  async function logout(): Promise<boolean> {
    let serverConfirmed = false;
    let warning = "";
    try {
      await jsonRequest("/api/auth/logout", { method: "POST" });
      serverConfirmed = true;
    } catch {
      warning = "This browser's workspace has been cleared, but the server did not confirm sign-out. Reconnect and sign out again before leaving this device.";
    } finally {
      clearClientWorkspaceState();
      clearBrowserAppState();
      setSession((current) => current ? { ...current, authenticated: false } : current);
      try { const channel = new BroadcastChannel("cah-session"); channel.postMessage({ type: "logout" }); channel.close(); } catch { /* BroadcastChannel is optional. */ }
    }
    if (warning) setToast({ type: "error", message: warning });
    return serverConfirmed;
  }

  async function saveContact(payload: Record<string, unknown>) {
    setSaving(true);
    try {
      const isNew = modalContact === "new";
      const endpoint = isNew ? "/api/contacts" : `/api/contacts/${(modalContact as ContactRecord)._id}`;
      try {
        await jsonRequest(endpoint, { method: isNew ? "POST" : "PUT", body: JSON.stringify(payload) });
      } catch (error) {
        if (error instanceof ApiError && error.status === 409 && Array.isArray(error.data.duplicates)) {
          const found = (error.data.duplicates as { name: string; phone: string; email: string }[]).map((d) => `• ${d.name} (${[d.phone, d.email].filter(Boolean).join(", ")})`).join("\n");
          if (!window.confirm(`Possible duplicate found:\n${found}\n\nSave this contact anyway?`)) throw new Error("Not saved. This looks like a duplicate of an existing contact — open that contact instead, or change the phone/email.");
          await jsonRequest(endpoint, { method: isNew ? "POST" : "PUT", body: JSON.stringify({ ...payload, allowDuplicate: true }) });
        } else throw error;
      }
      setModalContact(null); notify(isNew ? "Contact saved to your database." : "Contact details updated."); await loadData(false);
    } finally { setSaving(false); }
  }
  async function deleteContact(contact: ContactRecord) {
    if (!window.confirm(`Delete ${contact.name} from your database? This cannot be undone.`)) return;
    try { await jsonRequest(`/api/contacts/${contact._id}`, { method: "DELETE" }); notify("Contact deleted."); await loadData(false); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not delete contact.", "error"); }
  }
  async function importContacts(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/import", { method: "POST", body, cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not import this file.");
      const summary = `Import complete: ${data.created} added, ${data.duplicates} duplicates skipped, ${data.failed} row(s) need attention.`;
      notify(summary, data.failed ? "info" : "success");
      if (Array.isArray(data.errors) && data.errors.length) {
        const details = data.errors.slice(0, 8).map((item: { row: number; message: string }) => `Row ${item.row}: ${item.message}`).join("\n");
        window.alert(`${summary}\n\nReview these rows and correct the file before trying them again:\n${details}`);
      }
      await loadData(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not import this file.", "error");
    } finally {
      setImporting(false);
      input.value = "";
    }
  }
  async function saveProject(payload: Record<string, unknown>) {
    setSavingProject(true);
    try {
      const isNew = modalProject === "new";
      const endpoint = isNew ? "/api/projects" : `/api/projects/${(modalProject as ProjectRecord)._id}`;
      await jsonRequest(endpoint, { method: isNew ? "POST" : "PUT", body: JSON.stringify(payload) });
      setModalProject(null); notify(isNew ? "Project saved." : "Project updated."); await loadData(false);
    } finally { setSavingProject(false); }
  }
  async function deleteProject(project: ProjectRecord) {
    if (!window.confirm(`Delete “${project.title}”? This cannot be undone.`)) return;
    try { await jsonRequest(`/api/projects/${project._id}`, { method: "DELETE" }); notify("Project deleted."); await loadData(false); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not delete project.", "error"); }
  }
  async function changeProjectStatus(project: ProjectRecord, status: string) {
    try { await jsonRequest(`/api/projects/${project._id}`, { method: "PATCH", body: JSON.stringify({ status }) }); setProjects((current) => current.map((item) => item._id === project._id ? { ...item, status } : item)); notify("Stage updated."); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not change the stage.", "error"); }
  }
  async function updateFollowUp(item: FollowUpItem, followUpAt: string | null) {
    try {
      await jsonRequest(`/api/${item.kind === "contact" ? "contacts" : "projects"}/${item.id}`, { method: "PATCH", body: JSON.stringify({ followUpAt }) });
      notify(followUpAt ? "Follow-up moved." : "Follow-up marked as done.");
      await loadData(false);
    } catch (error) { notify(error instanceof Error ? error.message : "Could not update the follow-up.", "error"); }
  }
  function openFollowUp(item: FollowUpItem) {
    if (item.kind === "contact") { const found = contacts.find((c) => c._id === item.id); if (found) setModalContact(found); }
    else { const found = projects.find((p) => p._id === item.id); if (found) setModalProject(found); }
  }
  async function createLink(title: string, category: string, expiryDays: number) {
    setBusy(true);
    try { const data = await jsonRequest("/api/links", { method: "POST", body: JSON.stringify({ title, category, expiryDays }) }); setLinks((current) => [data.link, ...current]); setLinkModal(false); setTab("links"); notify("Share link created. Copy it to start collecting details."); }
    finally { setBusy(false); }
  }
  async function toggleLink(link: ShareLinkRecord) {
    try { await jsonRequest(`/api/links/${link._id}`, { method: "PATCH", body: JSON.stringify({ active: !link.active }) }); setLinks((current) => current.map((item) => item._id === link._id ? { ...item, active: !item.active } : item)); notify(link.active ? "Link paused. New submissions are blocked." : "Link activated."); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not update link.", "error"); }
  }
  async function renameLink(link: ShareLinkRecord) {
    const title = window.prompt("New link name", link.title); if (!title?.trim()) return;
    try { await jsonRequest(`/api/links/${link._id}`, { method: "PATCH", body: JSON.stringify({ title: title.trim() }) }); setLinks((current) => current.map((item) => item._id === link._id ? { ...item, title: title.trim() } : item)); notify("Link name updated."); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not rename link.", "error"); }
  }
  async function deleteLink(link: ShareLinkRecord) {
    if (!window.confirm(`Delete “${link.title}”? Anyone using the link will no longer be able to open it.`)) return;
    try { await jsonRequest(`/api/links/${link._id}`, { method: "DELETE" }); setLinks((current) => current.filter((item) => item._id !== link._id)); notify("Share link deleted."); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not delete link.", "error"); }
  }
  async function copyText(value: string, success = "Copied to clipboard.") {
    try { await navigator.clipboard.writeText(value); notify(success); }
    catch { notify("Clipboard access was blocked by your browser. Open the link and copy it manually.", "error"); }
  }
  function openWhatsApp(phone: string, text: string) {
    const number = phone.replace(/\D/g, ""); if (!number) { notify("No phone number has been saved for this contact.", "error"); return; }
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }
  function shareLink(link: ShareLinkRecord) { const url = link.shareUrl || `${siteBase()}/join/${link.token}`; window.open(`https://wa.me/?text=${encodeURIComponent(`${link.title}\n${url}`)}`, "_blank", "noopener,noreferrer"); }
  function contactSummary(contact: ContactRecord) {
    const lines = [`${brandName} — Contact details`, `Name: ${contact.name}`, `Category: ${categoryLabel(contact.category)}`];
    if (contact.organization) lines.push(`Business: ${contact.organization}`);
    if (contact.phone) lines.push(`Phone: ${contact.phone}`);
    if (contact.details?.whatsapp) lines.push(`WhatsApp: ${contact.details.whatsapp}`);
    if (contact.email) lines.push(`Email: ${contact.email}`);
    if (contact.city || contact.state) lines.push(`Location: ${[contact.city, contact.state].filter(Boolean).join(", ")}`);
    lines.push(`Status: ${statusLabel(contact.status)}`);
    const reserved = new Set(["fullName", "phone", "whatsapp", "email", "organization", "city", "state", "workingLocations", "notes"]);
    for (const field of getFields(contact.category)) {
      const value = contact.details?.[field.key];
      if (!reserved.has(field.key) && value) lines.push(`${field.label}: ${value}`);
    }
    if (contact.details?.workingLocations) lines.push(`Working / supply locations: ${contact.details.workingLocations}`);
    if (contact.notes) lines.push(`Notes: ${contact.notes}`);
    return lines.join("\n");
  }
  function shareContact(contact: ContactRecord) { window.open(`https://wa.me/?text=${encodeURIComponent(contactSummary(contact))}`, "_blank", "noopener,noreferrer"); }
  function emailContactSummary(contact: ContactRecord) { const subject = `${brandName} — ${contact.name}`; window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(contactSummary(contact))}`; }
  function applyFilters(event: FormEvent) { event.preventDefault(); setAppliedSearch(search.trim()); }

  const duplicateIds = useMemo(() => duplicateIdSet(contacts), [contacts]);
  const filteredContacts = useMemo(() => contacts.filter((contact) => {
    const matchCategory = !filterCategory || contact.category === filterCategory;
    const matchStatus = !filterStatus || contact.status === filterStatus;
    const matchTeamView = tab !== "team" || Boolean(contact.isTeamMember);
    const q = appliedSearch.toLowerCase();
    const values = [contact.name, contact.firstName, contact.lastName, contact.phone, ...(contact.phoneNumbers || []).map((item) => item.number), contact.email, ...(contact.emailAddresses || []).map((item) => item.value), contact.organization, contact.jobTitle, contact.teamRole, contact.teamDepartment, contact.city, contact.state, contact.birthday, ...(contact.tags || []), ...Object.values(contact.details || {})];
    const matchSearch = !q || values.some((value) => String(value || "").toLowerCase().includes(q));
    const matchDuplicate = !onlyDuplicates || duplicateIds.has(contact._id);
    return matchCategory && matchStatus && matchTeamView && matchSearch && matchDuplicate;
  }), [contacts, filterCategory, filterStatus, appliedSearch, onlyDuplicates, duplicateIds, tab]);
  const counts = useMemo(() => ({ total: contacts.length, new: contacts.filter((item) => item.status === "new").length, active: contacts.filter((item) => item.status === "active" || item.status === "qualified").length, followUps: contacts.filter((item) => item.followUpAt && item.status !== "closed" && item.followUpAt.slice(0, 10) <= dateKey(new Date())).length + projects.filter((item) => item.followUpAt && !["completed", "lost"].includes(item.status) && item.followUpAt.slice(0, 10) <= dateKey(new Date())).length, links: links.filter((item) => item.active && (!item.expiresAt || new Date(item.expiresAt).getTime() > Date.now())).length }), [contacts, links, projects]);
  const categoryCounts = useMemo(() => categories.map((category) => ({ ...category, count: contacts.filter((item) => item.category === category.id).length })), [contacts]);
  const openTasks = useMemo(() => tasks.filter((task) => task.status !== "done" && task.status !== "cancelled"), [tasks]);
  const dashboardTasks = useMemo(() => [...openTasks].sort((a, b) => {
    const dueA = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const dueB = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
    if (dueA !== dueB) return dueA - dueB;
    const rank: Record<TaskRecord["priority"], number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    return rank[a.priority] - rank[b.priority];
  }).slice(0, 6), [openTasks]);
  const overdueTaskCount = useMemo(() => openTasks.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < new Date(new Date().toDateString()).getTime()).length, [openTasks]);
  const completedTaskCount = useMemo(() => tasks.filter((task) => task.status === "done").length, [tasks]);
  const activeProjects = useMemo(() => projects.filter((project) => !["completed", "lost"].includes(project.status)), [projects]);
  const activeNotes = useMemo(() => notes.filter((note) => !note.archived && !note.deletedAt).sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [notes]);
  const globalSearchResults = useMemo<GlobalSearchResult[]>(() => {
    const query = globalSearch.trim().toLowerCase();
    if (!query) return [];
    const results: GlobalSearchResult[] = [];
    for (const contact of contacts) {
      const haystack = [contact.name, contact.firstName, contact.lastName, contact.phone, ...(contact.phoneNumbers || []).map((item) => item.number), contact.email, ...(contact.emailAddresses || []).map((item) => item.value), contact.organization, contact.jobTitle, contact.teamRole, contact.teamDepartment, contact.city, contact.state, contact.birthday, ...(contact.tags || []), ...Object.values(contact.details || {})].join(" ").toLowerCase();
      if (haystack.includes(query)) results.push({ kind: "contact", id: contact._id, title: contact.name, subtitle: `${contact.teamRole || contact.jobTitle || contact.organization || categoryLabel(contact.category)} · ${contact.city || (contact.isTeamMember ? "Team member" : "Contact")}`, record: contact });
    }
    for (const project of projects) {
      const haystack = [project.title, project.clientName, project.city, project.state, project.status, project.projectType, project.notes].join(" ").toLowerCase();
      if (haystack.includes(query)) results.push({ kind: "project", id: project._id, title: project.title, subtitle: `${project.clientName || "Project"} · ${project.city || project.status}`, record: project });
    }
    for (const task of tasks) {
      const assignee = contacts.find((contact) => contact._id === task.assignedContactId);
      const haystack = [task.title, task.description, assignee?.name, assignee?.teamRole].join(" ").toLowerCase();
      if (haystack.includes(query)) results.push({ kind: "task", id: task._id, title: task.title, subtitle: `${taskPriorityLabels[task.priority]} priority · ${taskStatusLabels[task.status]} · ${assignee?.name || "Unassigned"}`, record: task });
    }
    for (const note of activeNotes) {
      const haystack = [note.title, note.content, note.folder, note.category, ...(note.tags || [])].join(" ").toLowerCase();
      if (haystack.includes(query)) results.push({ kind: "note", id: note._id, title: note.title, subtitle: `${note.pinned ? "Pinned note" : "Private note"} · ${note.folder || "Inbox"} · Updated ${shortDate(note.updatedAt)}`, record: note });
    }
    for (const rate of rates) {
      const haystack = [rate.item, rate.group, rate.spec, rate.unit, rate.supplierName, rate.city, rate.state, rate.notes].join(" ").toLowerCase();
      if (haystack.includes(query)) results.push({ kind: "rate", id: rate._id, title: rate.item, subtitle: `${rate.group || "Rate book"} · ${rate.supplierName || rate.city || rate.unit}`, record: rate });
    }
    for (const room of rooms) {
      const haystack = [room.title, room.recipientName, room.recipientContact, room.message, room.dataset, room.status, room.paymentStatus].join(" ").toLowerCase();
      if (haystack.includes(query)) results.push({ kind: "room", id: room._id, title: room.title, subtitle: `Shared database · ${room.recipientName || room.dataset} · ${room.status}`, record: room });
    }
    for (const link of links) {
      const haystack = [link.title, link.category, link.active ? "active" : "paused", link.submissions, link.expiresAt].join(" ").toLowerCase();
      if (haystack.includes(query)) results.push({ kind: "link", id: link._id, title: link.title, subtitle: `Public form · ${link.category} · ${link.active ? "Active" : "Paused"}`, record: link });
    }
    return results.slice(0, 10);
  }, [globalSearch, contacts, projects, tasks, activeNotes, rates, rooms, links]);
  function openGlobalSearchResult(result: GlobalSearchResult) {
    setGlobalSearchOpen(false);
    setGlobalSearch("");
    if (result.kind === "contact") { setTab(result.record.isTeamMember ? "team" : "contacts"); setModalContact(result.record); return; }
    if (result.kind === "project") { setTab("projects"); setModalProject(result.record); return; }
    if (result.kind === "task") { setFocusedTaskId(result.id); setTab("tasks"); return; }
    if (result.kind === "rate") { setTab("rates"); return; }
    if (result.kind === "room") { setTab("rooms"); return; }
    if (result.kind === "link") { setTab("links"); return; }
    setFocusedNoteId(result.id); setTab("notes");
  }
  const exportParams = new URLSearchParams();
  if (filterCategory) exportParams.set("category", filterCategory);
  if (filterStatus) exportParams.set("status", filterStatus);
  if (appliedSearch) exportParams.set("q", appliedSearch);
  const exportFilterQuery = exportParams.toString() ? `&${exportParams.toString()}` : "";
  const allShownSelected = filteredContacts.length > 0 && filteredContacts.every((contact) => selectedIds.includes(contact._id));
  function toggleAllShown() { setSelectedIds(allShownSelected ? selectedIds.filter((id) => !filteredContacts.some((contact) => contact._id === id)) : Array.from(new Set([...selectedIds, ...filteredContacts.map((contact) => contact._id)]))); }
  function toggleOne(id: string) { setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }
  async function bulk(action: string, value = "") {
    if (!selectedIds.length) return;
    if (action === "delete" && !window.confirm(`Delete ${selectedIds.length} contact(s)? This cannot be undone.`)) return;
    try {
      const data = await jsonRequest("/api/contacts/bulk", { method: "POST", body: JSON.stringify({ ids: selectedIds, action, value }) });
      notify(action === "delete" ? `${data.affected} contact(s) deleted.` : `Updated ${data.affected} contact(s).`);
      setSelectedIds([]); await loadData(false);
    } catch (error) { notify(error instanceof Error ? error.message : "Could not apply this action.", "error"); }
  }
  const hasActiveExportFilters = Boolean(filterCategory || filterStatus || appliedSearch);

  if (!session) return <main className="boot-screen"><BrandMark large /><span className="spinner" /><p>Preparing your private workspace…</p></main>;
  if (!session.authenticated) return <LoginScreen configured={session.configured} twoFactor={Boolean(session.twoFactor)} onLogin={login} toast={toast} clearToast={() => setToast(null)} />;

  const tabMeta: Record<Tab, { title: string; subtitle: string }> = {
    overview: { title: "Overview", subtitle: "A clear view of the people and resources in your network." },
    followups: { title: "Follow-ups", subtitle: "Who to call or message next. Overdue and upcoming reminders in one list." },
    tasks: { title: "Task planner", subtitle: "Plan site work, quotations, document collection and business actions. Tasks stay saved in your database." },
    notes: { title: "Private notes", subtitle: "Create, organise, pin and archive your own notes. Notes are private to your signed-in admin workspace." },
    contacts: { title: "Contact database", subtitle: "Keep every supplier, contractor, partner and client in one place." },
    team: { title: "Team directory", subtitle: "Manage your staff, project teams and internal phone book in one secure place." },
    projects: { title: "Projects & leads", subtitle: "Track every enquiry from first contact to completed work." },
    rates: { title: "Rate book", subtitle: "Material, labour and equipment rates, and who quoted them." },
    rooms: { title: "Shared databases", subtitle: "Sell or share data with clients through private links that expire." },
    security: { title: "Security", subtitle: "2-step verification, signed-in devices, activity log and backups." },
    reports: { title: "Reports", subtitle: "A simple summary of your network, leads and projects. Use Save PDF to print it." },
    links: { title: "Public form links", subtitle: "Create a private-to-share link and collect structured details from anywhere." },
    settings: { title: "Workspace settings", subtitle: "Your branding, deployment settings and database health." },
  };
  return <main className={`app-shell ${privacy ? "privacy-on" : ""}`} style={{ "--brand": brandColor } as CSSProperties}>
    <aside className="sidebar"><div className="sidebar-brand"><BrandMark /><div className="brand-copy"><strong>{brandName}</strong><small>WORKSPACE</small></div></div>
      <div className="sidebar-section-label">WORKSPACE</div>
      <div className="sidebar-nav-tools">
        <label className="sidebar-nav-search"><Icon name="search" /><input type="search" value={navFilter} onChange={(event) => setNavFilter(event.target.value)} placeholder="Find a panel…" aria-label="Find a navigation panel" /></label>
        <div className="sidebar-nav-scroll-controls" aria-label="Scroll navigation">
          <button type="button" onClick={() => scrollSidebarNav(-1)} title="Scroll navigation toward the beginning" aria-label="Scroll navigation toward the beginning">↑</button>
          <button type="button" onClick={() => scrollSidebarNav(1)} title="Scroll navigation toward the end" aria-label="Scroll navigation toward the end">↓</button>
        </div>
      </div>
      <nav className="sidebar-nav" ref={sidebarNavRef} aria-label="Main navigation" tabIndex={0}>
        {visibleSidebarNavItems.map(([value, label]) => <button className={`nav-item ${tab === value ? "nav-item-active" : ""}`} key={value} aria-current={tab === value ? "page" : undefined} onClick={() => { setTab(value); setNavFilter(""); }}><Icon name={value === "rates" ? "database" : value === "rooms" ? "share" : value === "security" ? "lock" : value === "contacts" || value === "team" ? "contacts" : value === "links" ? "links" : value === "settings" ? "settings" : value === "followups" || value === "tasks" ? "calendar" : value === "notes" ? "note" : value === "projects" ? "briefcase" : value === "reports" ? "chart" : "overview"} /><span>{label}</span>{value === "contacts" && contacts.length > 0 ? <small>{contacts.length}</small> : value === "team" && contacts.filter((contact) => contact.isTeamMember).length > 0 ? <small>{contacts.filter((contact) => contact.isTeamMember).length}</small> : value === "links" && links.length > 0 ? <small>{links.length}</small> : value === "projects" && projects.length > 0 ? <small>{projects.length}</small> : value === "rooms" && rooms.length > 0 ? <small>{rooms.length}</small> : value === "rates" && rates.length > 0 ? <small>{rates.length}</small> : value === "followups" && counts.followUps > 0 ? <small className="nav-alert">{counts.followUps}</small> : value === "tasks" && overdueTaskCount > 0 ? <small className="nav-alert">{overdueTaskCount}</small> : value === "notes" && notes.some((note) => !note.archived && !note.deletedAt) ? <small>{notes.filter((note) => !note.archived && !note.deletedAt).length}</small> : null}</button>)}
        {visibleSidebarNavItems.length === 0 ? <div className="sidebar-nav-empty">No panels match “{navFilter}”. <button type="button" onClick={() => setNavFilter("")}>Clear search</button></div> : null}
      </nav>
      <div className="sidebar-spacer" /><div className="sidebar-tip"><span className="tip-spark">✳</span><strong>Keep it organised</strong><p>Save every useful relationship. Your next project may start here.</p><button onClick={() => { setTab("contacts"); setModalContact("new"); }}>+ Add a contact</button></div>
      <div className="sidebar-user"><span className="user-avatar">{initials(brandName)}</span><div><strong>Workspace admin</strong><small>Private access</small></div><button onClick={logout} title="Sign out" aria-label="Sign out"><Icon name="logout" /></button></div>
    </aside>

    <div className="main-column"><header className="topbar">
        <form className="workspace-search" role="search" onSubmit={(event) => { event.preventDefault(); setGlobalSearchOpen(true); }}>
          <span className="workspace-search-icon"><Icon name="search" /></span>
          <input ref={globalSearchInputRef} value={globalSearch} onChange={(event) => { setGlobalSearch(event.target.value); setGlobalSearchOpen(Boolean(event.target.value.trim())); }} onFocus={() => { if (globalSearch.trim()) setGlobalSearchOpen(true); }} onBlur={() => setGlobalSearchOpen(false)} onKeyDown={(event) => { if (event.key === "Escape") setGlobalSearchOpen(false); }} placeholder="Search contacts, projects, tasks, notes, rates, links…" aria-label="Search contacts, projects, tasks, notes, rates, shared databases and form links" autoComplete="off" />
          {globalSearch ? <button type="button" className="workspace-search-clear" onClick={() => { setGlobalSearch(""); setGlobalSearchOpen(false); }} aria-label="Clear search">×</button> : <span className="workspace-search-hint">Search</span>}
          {globalSearchOpen && globalSearch.trim() ? <div className="global-search-results" role="listbox" aria-label="Search results">
            {globalSearchResults.length ? globalSearchResults.map((result) => <button type="button" className="global-search-result" key={`${result.kind}-${result.id}`} onMouseDown={(event) => event.preventDefault()} onClick={() => openGlobalSearchResult(result)}>
              <span className={`global-result-icon global-result-${result.kind}`}>{result.kind === "contact" ? <Icon name="contacts" /> : result.kind === "project" ? <Icon name="briefcase" /> : result.kind === "task" ? <Icon name="calendar" /> : result.kind === "rate" || result.kind === "room" ? <Icon name="database" /> : result.kind === "link" ? <Icon name="links" /> : <Icon name="note" />}</span>
              <span className="global-result-copy"><strong>{result.title}</strong><small>{result.subtitle}</small></span><span className="global-result-type">{result.kind}</span>
            </button>) : <div className="global-search-empty"><strong>No matches found</strong><span>Try a contact, task, note, rate, shared database or form-link keyword.</span></div>}
            <div className="global-search-footer">Search across your private workspace</div>
          </div> : null}
        </form>
        <div className="topbar-actions"><span className="connected-indicator"><i /> PRIVATE</span><button className={`secondary-button privacy-toggle ${privacy ? "dup-toggle-on" : ""}`} onClick={() => setPrivacy((value) => !value)} aria-pressed={privacy} title="Blur phone numbers and emails while someone is looking at your screen">{privacy ? "Show numbers" : "Hide numbers"}</button><button className="topbar-add" onClick={() => { setTab("contacts"); setModalContact("new"); }}><Icon name="plus" /><span>Add contact</span></button><div className="topbar-profile"><span className="topbar-profile-avatar">{initials(brandName)}</span><span className="topbar-profile-copy"><strong>Workspace admin</strong><small>Administrator</small></span><button className="topbar-profile-logout" onClick={logout} title="Sign out" aria-label="Sign out"><Icon name="logout" /></button></div><button className="mobile-logout" onClick={logout} aria-label="Sign out"><Icon name="logout" /></button></div>
      </header>
      <section className="content-area" data-print-title={`${brandName} · ${tabMeta[tab].title}`}>
        <div className="page-heading"><div><div className="heading-date">CIVIL WORKS NETWORK <span>·</span> PERSONAL CRM</div><h1>{tab === "overview" ? "Welcome back, Admin!" : tabMeta[tab].title}</h1><p>{tab === "overview" ? "Here’s what’s happening with your business today." : tabMeta[tab].subtitle}</p></div>{tab === "projects" ? <div className="heading-tools"><button className="secondary-button" onClick={() => window.print()}><Icon name="download" /> Save PDF</button><button className="primary-button" onClick={() => setModalProject("new")}><Icon name="plus" /> Add project / lead</button></div> : tab === "reports" || tab === "followups" ? <button className="secondary-button" onClick={() => window.print()}><Icon name="download" /> Save PDF</button> : tab === "contacts" || tab === "team" ? <div className="heading-tools"><button className="secondary-button" onClick={() => window.print()}><Icon name="download" /> Save PDF</button><button className="primary-button" onClick={() => setModalContact("new")}><Icon name="plus" /> {tab === "team" ? "Add team member" : "Add contact"}</button></div> : tab === "rooms" ? <button className="primary-button" onClick={() => setRoomCreate({ contactIds: [] })}><Icon name="plus" /> Share a database</button> : tab === "links" ? <button className="primary-button" onClick={() => setLinkModal(true)}><Icon name="plus" /> Create link</button> : tab === "overview" ? <div className="overview-heading-actions"><span className="dashboard-date-pill"><Icon name="calendar" /><span>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</span></span><button className="primary-button" onClick={() => { setTab("links"); setLinkModal(true); }}><Icon name="plus" /> Collect details</button></div> : null}</div>
        {toast && tab !== "overview" && tab !== "contacts" && tab !== "projects" && tab !== "followups" ? <div className={`toast page-toast toast-${toast.type}`} role="status">{toast.message}<button onClick={() => setToast(null)} aria-label="Dismiss">×</button></div> : null}

        {tab === "overview" ? <div className="overview-view dashboard-overview">
          <section className="dashboard-metrics" aria-label="Workspace summary">
            <button type="button" className="dashboard-metric metric-blue" onClick={() => setTab("tasks")}><span className="metric-icon"><Icon name="calendar" /></span><span className="metric-content"><small>Total tasks</small><strong>{tasks.length}</strong><span>{openTasks.length} pending <b>·</b> {completedTaskCount} completed</span></span></button>
            <button type="button" className="dashboard-metric metric-green" onClick={() => setTab("contacts")}><span className="metric-icon"><Icon name="contacts" /></span><span className="metric-content"><small>Total contacts</small><strong>{contacts.length}</strong><span>{counts.new} new <b>·</b> {counts.active} active / qualified</span></span></button>
            <button type="button" className="dashboard-metric metric-purple" onClick={() => setTab("projects")}><span className="metric-icon"><Icon name="briefcase" /></span><span className="metric-content"><small>Total projects</small><strong>{projects.length}</strong><span>{activeProjects.length} active <b>·</b> {projects.filter((project) => project.status === "completed").length} completed</span></span></button>
            <button type="button" className="dashboard-metric metric-orange" onClick={() => setTab("notes")}><span className="metric-icon"><Icon name="note" /></span><span className="metric-content"><small>Private notes</small><strong>{activeNotes.length}</strong><span>{activeNotes.filter((note) => note.pinned).length} pinned <b>·</b> {notes.filter((note) => note.archived && !note.deletedAt).length} archived</span></span></button>
          </section>

          <div className="dashboard-main-grid">
            <section className="panel dashboard-panel upcoming-panel">
              <div className="dashboard-panel-heading"><div><span className="dashboard-section-icon section-blue"><Icon name="calendar" /></span><span><h2>Upcoming tasks</h2><p>Work that needs your attention next.</p></span></div><button type="button" className="dashboard-view-link" onClick={() => setTab("tasks")}>View all <Icon name="arrow" /></button></div>
              {dashboardTasks.length ? <div className="dashboard-table-wrap"><table className="dashboard-task-table"><thead><tr><th>Task</th><th>Priority</th><th>Due date</th><th>Status</th></tr></thead><tbody>{dashboardTasks.map((task) => {
                const relatedLabel = task.relatedKind === "contact" ? contacts.find((contact) => contact._id === task.relatedId)?.name : task.relatedKind === "project" ? projects.find((project) => project._id === task.relatedId)?.title : "Workspace task";
                const overdue = Boolean(task.dueAt && new Date(task.dueAt).getTime() < new Date(new Date().toDateString()).getTime());
                return <tr key={task._id}>
                  <td><button type="button" className="dashboard-task-main" onClick={() => setTab("tasks")}><span className="dashboard-task-type-icon"><Icon name={task.priority === "urgent" || task.priority === "high" ? "calendar" : "check"} /></span><span><strong>{task.title}</strong><small>{task.description || relatedLabel || "No extra details"}</small></span></button></td>
                  <td><span className={`dashboard-priority priority-${task.priority}`}>{taskPriorityLabels[task.priority]}</span></td>
                  <td><span className={`dashboard-due-date ${overdue ? "is-overdue" : ""}`}>{shortDate(task.dueAt)}</span>{overdue ? <small className="dashboard-overdue-caption">Overdue</small> : null}</td>
                  <td><span className={`dashboard-task-status status-${task.status}`}>{taskStatusLabels[task.status]}</span></td>
                </tr>;
              })}</tbody></table></div> : <div className="dashboard-empty"><span className="dashboard-empty-icon"><Icon name="calendar" /></span><strong>No upcoming tasks</strong><p>Create a task for a site visit, quotation, document or client follow-up.</p><button className="secondary-button" type="button" onClick={() => setTab("tasks")}>Open Task Planner <Icon name="arrow" /></button></div>}
              <div className="dashboard-panel-footer"><span><i className={overdueTaskCount ? "dashboard-dot dot-warning" : "dashboard-dot"} />{overdueTaskCount ? `${overdueTaskCount} overdue task${overdueTaskCount === 1 ? "" : "s"} need attention` : `${openTasks.length} open task${openTasks.length === 1 ? "" : "s"} in your work queue`}</span><button type="button" onClick={() => setTab("tasks")}>Manage tasks →</button></div>
            </section>

            <div className="dashboard-side-stack">
              <section className="panel dashboard-panel quick-actions-panel">
                <div className="dashboard-panel-heading"><div><span className="dashboard-section-icon section-blue"><Icon name="overview" /></span><span><h2>Quick actions</h2><p>Get common work done faster.</p></span></div></div>
                <div className="dashboard-quick-actions">
                  <button type="button" className="quick-action action-blue" onClick={() => setTab("tasks")}><span><Icon name="plus" /></span><strong>Add new task</strong></button>
                  <button type="button" className="quick-action action-purple" onClick={() => setTab("notes")}><span><Icon name="note" /></span><strong>New private note</strong></button>
                  <button type="button" className="quick-action action-green" onClick={() => { setTab("contacts"); setModalContact("new"); }}><span><Icon name="contacts" /></span><strong>Add contact</strong></button>
                  <button type="button" className="quick-action action-orange" onClick={() => { setTab("projects"); setModalProject("new"); }}><span><Icon name="briefcase" /></span><strong>Add project</strong></button>
                </div>
              </section>

              <section className="panel dashboard-panel dashboard-note-preview">
                <div className="dashboard-panel-heading"><div><span className="dashboard-section-icon section-purple"><Icon name="note" /></span><span><h2>Private notes</h2><p>Your personal reminders and ideas.</p></span></div><button type="button" className="dashboard-view-link" onClick={() => setTab("notes")}>View all <Icon name="arrow" /></button></div>
                {activeNotes.length ? <div className="dashboard-note-list">{activeNotes.slice(0, 4).map((note) => <button type="button" className="dashboard-note-row" key={note._id} onClick={() => setTab("notes")}><span className="dashboard-note-icon"><Icon name="note" /></span><span className="dashboard-note-copy"><strong>{note.title}</strong><small>{note.content.trim().replace(/\s+/g, " ") || "No note text yet"}</small></span><span className="dashboard-note-date">{shortDate(note.updatedAt)}{note.pinned ? <b title="Pinned">◆</b> : null}</span></button>)}</div> : <div className="dashboard-empty dashboard-empty-compact"><strong>Your private notebook is ready</strong><p>Keep internal reminders, meeting notes and checklists saved in MongoDB.</p><button className="secondary-button" type="button" onClick={() => setTab("notes")}>Create a note <Icon name="arrow" /></button></div>}
              </section>

              <section className="dashboard-promo-card"><div className="dashboard-promo-art" aria-hidden="true"><span className="promo-building promo-building-one"/><span className="promo-building promo-building-two"/><span className="promo-window promo-window-one"/><span className="promo-window promo-window-two"/><span className="promo-window promo-window-three"/><span className="promo-window promo-window-four"/></div><div className="dashboard-promo-copy"><span>YOUR WORKSPACE</span><h2>Build better.<br />Manage smarter.</h2><p>Contacts, tasks, projects and private notes — organised in one place.</p><button type="button" onClick={() => setTab("reports")}>Explore reports <Icon name="arrow" /></button></div></section>
            </div>
          </div>

          <div className="overview-grid dashboard-existing-grid">
            <section className="panel category-panel"><div className="panel-heading"><div><h2>Network categories</h2><p>See where your contacts are coming from.</p></div><button className="text-action" onClick={() => setTab("contacts")}>View database <span>→</span></button></div><div className="category-list">{categoryCounts.map((category) => { const total = Math.max(counts.total, 1); const percent = counts.total ? Math.round(category.count / total * 100) : 0; return <button className="category-row" key={category.id} onClick={() => { setFilterCategory(category.id); setTab("contacts"); }}><span className={`category-monogram mono-${category.id}`}>{category.short.split(/[ /]/).map((x) => x[0]).join("").slice(0, 2).toUpperCase()}</span><span className="category-info"><strong>{category.label}</strong><small>{category.description}</small><span className="mini-progress"><i style={{ width: `${percent}%` }} /></span></span><span className="category-count">{category.count}</span><span className="category-chevron">›</span></button>; })}</div></section>
            <section className="panel recent-panel"><div className="panel-heading"><div><h2>Recently updated</h2><p>Your latest network activity.</p></div><button className="icon-button subtle" onClick={() => loadData()} aria-label="Refresh records">↻</button></div>{contacts.length ? <div className="recent-list">{[...contacts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6).map((contact) => <button className="recent-row" key={contact._id} onClick={() => { setTab("contacts"); setModalContact(contact); }}><span className={`contact-avatar avatar-${categories.findIndex((item) => item.id === contact.category) % 5}`}>{initials(contact.name)}</span><span className="recent-person"><strong>{contact.name}</strong><small>{contact.organization || categoryLabel(contact.category)}</small></span><span className="recent-meta"><StatusPill status={contact.status} /><small>{relativeDate(contact.updatedAt)}</small></span></button>)}<button className="recent-view-all" onClick={() => setTab("contacts")}>View all contacts <Icon name="arrow" /></button></div> : <div className="empty-state compact-empty"><span className="empty-icon"><Icon name="contacts" /></span><h3>Your network starts here</h3><p>Add your first contact manually or share a public form to collect details.</p><button className="secondary-button" onClick={() => { setTab("contacts"); setModalContact("new"); }}>Add first contact</button></div>}
              <div className="followup-card"><span className="followup-icon"><Icon name="calendar" /></span><div><strong>{counts.followUps ? `${counts.followUps} follow-up${counts.followUps > 1 ? "s" : ""} due or overdue` : "Stay ahead of follow-ups"}</strong><p>{counts.followUps ? "Open the Follow-ups list to call, message or reschedule." : "Set a follow-up date inside any contact or project."}</p></div><button onClick={() => setTab("followups")}>Review <span>→</span></button></div>
            </section>
          </div>

          <div className="dashboard-lower-grid">
            <section className="panel dashboard-panel dashboard-activity-panel"><div className="dashboard-panel-heading"><div><span className="dashboard-section-icon section-blue"><Icon name="chart" /></span><span><h2>Recent activity</h2><p>Records changed recently.</p></span></div><button type="button" className="dashboard-view-link" onClick={() => setTab("security")}>View log <Icon name="arrow" /></button></div>
              <div className="dashboard-activity-list">
                {[
                  ...contacts.map((item) => ({ id: `contact-${item._id}`, kind: "contact" as const, title: `Contact updated · ${item.name}`, at: item.updatedAt })),
                  ...projects.map((item) => ({ id: `project-${item._id}`, kind: "project" as const, title: `Project updated · ${item.title}`, at: item.updatedAt })),
                  ...tasks.map((item) => ({ id: `task-${item._id}`, kind: "task" as const, title: `Task updated · ${item.title}`, at: item.updatedAt })),
                  ...notes.map((item) => ({ id: `note-${item._id}`, kind: "note" as const, title: `Private note updated`, at: item.updatedAt })),
                ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 5).map((item) => <div className="dashboard-activity-row" key={item.id}><span className={`activity-kind-icon activity-kind-${item.kind}`}><Icon name={item.kind === "contact" ? "contacts" : item.kind === "project" ? "briefcase" : item.kind === "task" ? "calendar" : "note"} /></span><span className="dashboard-activity-title">{item.title}</span><small>{relativeDate(item.at)}</small></div>)}
                {!contacts.length && !projects.length && !tasks.length && !notes.length ? <div className="dashboard-empty dashboard-empty-compact"><strong>No activity yet</strong><p>Add a contact, task, project or private note to get started.</p></div> : null}
              </div>
            </section>
            <section className="panel dashboard-panel dashboard-quick-stats"><div className="dashboard-panel-heading"><div><span className="dashboard-section-icon section-blue"><Icon name="chart" /></span><span><h2>Quick stats</h2><p>A quick health check of your workspace.</p></span></div></div><div className="quick-stats-list">
              <div className="quick-stat-line quick-stat-green"><span className="quick-stat-symbol"><Icon name="check" /></span><span>Completed tasks</span><strong>{completedTaskCount}</strong></div>
              <div className="quick-stat-line quick-stat-blue"><span className="quick-stat-symbol"><Icon name="calendar" /></span><span>Open tasks</span><strong>{openTasks.length}</strong></div>
              <div className="quick-stat-line quick-stat-purple"><span className="quick-stat-symbol"><Icon name="briefcase" /></span><span>Active projects</span><strong>{activeProjects.length}</strong></div>
              <div className="quick-stat-line quick-stat-orange"><span className="quick-stat-symbol"><Icon name="contacts" /></span><span>Active contacts</span><strong>{counts.active}</strong></div>
            </div></section>
            <section className="panel dashboard-panel dashboard-work-summary"><div className="dashboard-panel-heading"><div><span className="dashboard-section-icon section-orange"><Icon name="briefcase" /></span><span><h2>Projects & work queue</h2><p>Keep the next steps visible.</p></span></div></div>
              <div className="dashboard-project-summary"><div><span>Open leads</span><strong>{projects.filter((project) => ["lead", "quoted", "negotiation"].includes(project.status)).length}</strong></div><div><span>Ongoing projects</span><strong>{projects.filter((project) => project.status === "ongoing").length}</strong></div><button type="button" className="secondary-button" onClick={() => setTab("projects")}>Open projects <Icon name="arrow" /></button></div>
              <div className="task-overview-strip"><div className="task-overview-icon">✓</div><div className="task-overview-copy"><span>WORK QUEUE</span><strong>{openTasks.length} open tasks to manage</strong><p>{overdueTaskCount ? `${overdueTaskCount} overdue · prioritise these first.` : "Track site visits, quotations, paperwork and client actions."}</p></div><button className="secondary-button" onClick={() => setTab("tasks")}>Open planner <span>→</span></button></div>
              <div className="bottom-note"><span>✦</span><p><strong>Your data, your control.</strong> Contacts are stored in your MongoDB database. Public form links collect details but never expose your contact list.</p><button onClick={() => setTab("settings")}>Workspace details <span>→</span></button></div>
            </section>
          </div>
        </div> : null}

        {(tab === "contacts" || tab === "team") ? <section className="panel database-panel"><div className="contact-directory-switch"><button type="button" className={tab === "contacts" ? "active" : ""} onClick={() => setTab("contacts")}>All contacts <span>{contacts.length}</span></button><button type="button" className={tab === "team" ? "active" : ""} onClick={() => setTab("team")}>Team directory <span>{contacts.filter((contact) => contact.isTeamMember).length}</span></button></div><div className="database-toolbar"><form className="search-form" onSubmit={applyFilters}><span className="search-icon"><Icon name="search" /></span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tab === "team" ? "Search team names, roles, phone numbers…" : "Search name, phone, company, city…"} aria-label={tab === "team" ? "Search team directory" : "Search contacts"} /><button type="submit">Search</button></form><div className="database-actions"><label className="filter-control"><Icon name="filter" /><select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)} aria-label="Filter by category"><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><select className="filter-control status-filter" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{contactStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><button className={`secondary-button dup-toggle ${onlyDuplicates ? "dup-toggle-on" : ""}`} type="button" onClick={() => setOnlyDuplicates((v) => !v)} disabled={!duplicateIds.size && !onlyDuplicates} title="Show contacts that share a phone number or email">Duplicates ({duplicateIds.size})</button>{onlyDuplicates && duplicateIds.size ? <button className="primary-button" type="button" onClick={() => setMergeOpen(true)}>Merge duplicates…</button> : null}<input ref={importInputRef} className="hidden-file-input" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importContacts} aria-label="Choose a CSV or Excel file to import" /><button className="secondary-button import-trigger" type="button" onClick={() => importInputRef.current?.click()} disabled={importing} title="Import CSV or Excel contacts; duplicates by phone or email are skipped"><Icon name="upload" /> {importing ? "Importing…" : "Import"}</button><a className="secondary-button import-trigger" href="/api/export?scope=template&format=xlsx" title="A blank Excel file with the right column names">Template</a><div className="export-menu"><button className="secondary-button export-trigger"><Icon name="download" /> Export <span>⌄</span></button><div className="export-options"><a href={`/api/export?format=xlsx${exportFilterQuery}`}><span className="export-file-icon">X</span><span><strong>Excel workbook</strong><small>.xlsx · {hasActiveExportFilters ? "Current filters" : "Full database"}</small></span></a><a href={`/api/export?format=csv${exportFilterQuery}`}><span className="export-file-icon csv-file">≡</span><span><strong>CSV file</strong><small>.csv · {hasActiveExportFilters ? "Current filters" : "Full database"}</small></span></a><button onClick={() => window.print()}><span className="export-file-icon pdf-file">P</span><span><strong>Save as PDF</strong><small>Print / Save PDF</small></span></button></div></div><button className="primary-button compact-add" onClick={() => setModalContact("new")}><Icon name="plus" /> Add</button></div></div>
          <div className="table-summary"><span><strong>{filteredContacts.length}</strong> {tab === "team" ? "team member" : "contact"}{filteredContacts.length === 1 ? "" : "s"}{(filterCategory || filterStatus || appliedSearch || onlyDuplicates) ? " match your filters" : " in your current view"}</span><div><span className="summary-dot" /> MongoDB synced on refresh</div></div>
          {selectedIds.length ? <div className="bulk-bar" role="region" aria-label="Bulk actions"><strong>{selectedIds.length} selected</strong>
            <select aria-label="Set status for selected" defaultValue="" onChange={(event) => { const value = event.target.value; event.target.value = ""; if (value) void bulk("status", value); }}><option value="">Set status…</option>{contactStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <select aria-label="Sharing consent for selected" defaultValue="" onChange={(event) => { const value = event.target.value; event.target.value = ""; if (value) void bulk("consent", value === "clear" ? "" : value); }}><option value="">Sharing consent…</option><option value="yes">Agreed to be shared</option><option value="no">Never share</option><option value="clear">Not recorded</option></select>
            <select aria-label="Flag selected" defaultValue="" onChange={(event) => { const value = event.target.value; event.target.value = ""; if (value) void bulk("flag", value === "clear" ? "" : value); }}><option value="">Flag…</option><option value="preferred">Preferred</option><option value="avoid">Avoid</option><option value="clear">Clear flag</option></select>
            <button className="secondary-button" type="button" onClick={() => { const tag = window.prompt("Tag to add to the selected contacts:"); if (tag && tag.trim()) void bulk("add-tag", tag.trim()); }}>+ Tag</button>
            <button className="primary-button" type="button" onClick={() => { setRoomCreate({ contactIds: selectedIds }); setTab("rooms"); }}>Share selected…</button>
            <button className="secondary-button bulk-delete" type="button" onClick={() => void bulk("delete")}>Delete</button>
            <button className="icon-button" type="button" onClick={() => setSelectedIds([])} aria-label="Clear selection">×</button></div> : null}
          {filteredContacts.length ? <div className="table-scroll"><table className="contacts-table"><thead><tr><th className="select-col"><input type="checkbox" checked={allShownSelected} onChange={toggleAllShown} aria-label="Select all shown contacts" /></th><th>CONTACT</th><th>CATEGORY</th><th>PHONE / EMAIL</th><th>LOCATION</th><th>STATUS</th><th>UPDATED</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filteredContacts.map((contact, index) => <tr key={contact._id} className={selectedIds.includes(contact._id) ? "row-selected" : ""}><td className="select-col"><input type="checkbox" checked={selectedIds.includes(contact._id)} onChange={() => toggleOne(contact._id)} aria-label={`Select ${contact.name}`} /></td><td><div className="table-person"><span className={`contact-avatar avatar-${index % 5}`}>{initials(contact.name)}</span><span><strong>{contact.name || "Unnamed contact"}{duplicateIds.has(contact._id) ? <span className="dup-badge" title="Another contact has the same phone or email">Duplicate?</span> : null}{contact.flag === "avoid" ? <span className="dup-badge flag-avoid">Avoid</span> : contact.flag === "preferred" ? <span className="dup-badge flag-pref">Preferred</span> : null}{contact.rating ? <span className="rt-stars" title={`${contact.rating} of 5`}>{"★".repeat(contact.rating)}</span> : null}</strong><small>{contact.organization || contact.details?.supplierType || contact.details?.contractorType || (contact.isTeamMember ? "Team member" : "Individual / business")}</small>{contact.teamRole || contact.jobTitle ? <small className="contact-person-role">{[contact.teamRole, contact.jobTitle].filter(Boolean).join(" · ")}</small> : null}{contact.tags?.length ? <span className="contact-person-tags">{contact.tags.slice(0, 2).map((tag) => <i key={`${contact._id}-${tag}`}>{tag}</i>)}{contact.tags.length > 2 ? <i>+{contact.tags.length - 2}</i> : null}</span> : null}</span></div></td><td><span className="category-tag">{categoryLabel(contact.category)}</span></td><td><div className="contact-methods">{contact.phone ? <a href={`tel:${contact.phone}`} title={`${contact.phoneLabel || "Mobile"}: ${contact.phone}`}>{contact.phoneLabel && contact.phoneLabel !== "Mobile" ? `${contact.phoneLabel}: ` : ""}{contact.phone}</a> : null}{(contact.phoneNumbers || []).filter((item) => item.number && item.number !== contact.phone).slice(0, 2).map((item, phoneIndex) => <a key={`${contact._id}-phone-${phoneIndex}`} href={`tel:${item.number}`} title={`${item.label}: ${item.number}`}>{item.label}: {item.number}</a>)}{contact.email ? <a href={`mailto:${contact.email}`} title={`${contact.emailLabel || "Work"}: ${contact.email}`}>{contact.emailLabel && contact.emailLabel !== "Work" ? `${contact.emailLabel}: ` : ""}{contact.email}</a> : null}{(contact.emailAddresses || []).filter((item) => item.value && item.value.toLowerCase() !== (contact.email || "").toLowerCase()).slice(0, 1).map((item, emailIndex) => <a key={`${contact._id}-email-${emailIndex}`} href={`mailto:${item.value}`} title={item.value}>{item.label}: {item.value}</a>)}{!contact.phone && !contact.email && !(contact.phoneNumbers || []).length && !(contact.emailAddresses || []).length ? <span className="muted-cell">No phone or email</span> : null}{((contact.phoneNumbers || []).filter((item) => item.number && item.number !== contact.phone).length > 2 || (contact.emailAddresses || []).filter((item) => item.value && item.value.toLowerCase() !== (contact.email || "").toLowerCase()).length > 1) ? <small className="contact-more-methods">More saved in contact</small> : null}</div></td><td><span className="location-cell">{[contact.city, contact.state].filter(Boolean).join(", ") || "—"}</span></td><td><StatusPill status={contact.status} /></td><td><span className="updated-cell">{relativeDate(contact.updatedAt)}</span>{contact.followUpAt ? <small className={`fu-chip ${contact.followUpAt.slice(0, 10) < dateKey(new Date()) && contact.status !== "closed" ? "fu-chip-late" : ""}`}>Follow-up {dateOnly(contact.followUpAt)}</small> : null}</td><td><div className="row-actions"><button className="icon-button row-edit" onClick={() => setModalContact(contact)} title="View / edit" aria-label={`Edit ${contact.name}`}><Icon name="edit" /></button><button className="icon-button row-more" onClick={() => openWhatsApp(contact.details?.whatsapp || contact.phone, `Hello ${contact.name}, contacting you regarding ${categoryLabel(contact.category)}.`)} title="Message this contact" aria-label={`Message ${contact.name} on WhatsApp`}>◉</button><button className="icon-button row-share" onClick={() => shareContact(contact)} title="Share contact details on WhatsApp" aria-label={`Share details for ${contact.name}`}><Icon name="share" /></button><button className="icon-button row-mail" onClick={() => emailContactSummary(contact)} title="Email contact details" aria-label={`Email details for ${contact.name}`}><Icon name="mail" /></button><button className="icon-button row-delete" onClick={() => deleteContact(contact)} title="Delete record" aria-label={`Delete ${contact.name}`}><Icon name="trash" /></button></div></td></tr>)}</tbody></table></div> : <div className="empty-state"><span className="empty-icon"><Icon name="search" /></span><h3>{contacts.length ? "No records match these filters" : tab === "team" ? "Your team directory is ready" : "Your contact database is ready"}</h3><p>{contacts.length ? "Try another search term or clear one of the filters." : "Add a contact yourself, or create a share link so a supplier or contractor can fill in their own details."}</p><div className="empty-actions">{contacts.length ? <button className="secondary-button" onClick={() => { setSearch(""); setAppliedSearch(""); setFilterCategory(""); setFilterStatus(""); setOnlyDuplicates(false); }}>Clear filters</button> : <><button className="secondary-button" onClick={() => setModalContact("new")}>Add contact</button><button className="primary-button" onClick={() => { setTab("links"); setLinkModal(true); }}>Create a share form</button></>}</div></div>}
          <div className="database-footer"><span>Personal database · Visible only after admin sign-in</span><span>Up to 5,000 records are loaded at a time</span></div>
        </section> : null}

        {toast && (tab === "projects" || tab === "followups") ? <div className={`toast page-toast toast-${toast.type}`} role="status">{toast.message}<button onClick={() => setToast(null)} aria-label="Dismiss">×</button></div> : null}
        {tab === "followups" ? <FollowUpsPanel contacts={contacts} projects={projects} onOpen={openFollowUp} onUpdate={updateFollowUp} onWhatsApp={openWhatsApp} /> : null}
        {tab === "tasks" ? <TasksPanel tasks={tasks} contacts={contacts} projects={projects} onChanged={() => loadData(false)} notify={notify} focusTaskId={focusedTaskId} onFocusHandled={clearFocusedTask} /> : null}
        {tab === "notes" ? <PrivateNotesPanel notes={notes} projects={projects} tasks={tasks} onChanged={() => loadData(false)} notify={notify} focusNoteId={focusedNoteId} onFocusHandled={clearFocusedNote} /> : null}
        {tab === "projects" ? <ProjectsPanel projects={projects} contacts={contacts} onEdit={(project) => setModalProject(project)} onDelete={deleteProject} onStatus={changeProjectStatus} /> : null}
        {tab === "rates" ? <RatesPanel rates={rates} contacts={contacts} onChanged={() => loadData(false)} notify={notify} /> : null}
        {tab === "rooms" ? <RoomsPanel rooms={rooms} contacts={contacts} rates={rates} creating={roomCreate} onCloseCreate={() => setRoomCreate(null)} onChanged={() => loadData(false)} notify={notify} ownerName={brandName} /> : null}
        {mergeOpen ? <MergeModal contacts={contacts} onClose={() => setMergeOpen(false)} onDone={() => loadData(false)} notify={notify} /> : null}
        {tab === "security" ? <SecurityPanel twoFactor={Boolean(session.twoFactor)} autoLockMinutes={autoLock} onAutoLock={(minutes) => { void saveAutoLockPreference(minutes); }} notify={notify} /> : null}
        {tab === "reports" ? <ReportsPanel contacts={contacts} projects={projects} links={links} rooms={rooms} duplicateCount={duplicateIds.size} /> : null}

        {tab === "links" ? <div className="links-view"><div className="link-howto"><div className="howto-badge"><Icon name="links" /></div><div><h2>Collect details without giving dashboard access</h2><p>Make a separate form for each kind of contact. Share the link on WhatsApp, email or anywhere else. People can submit without a password; only you can view the saved records.</p></div><div className="howto-steps"><span><b>1</b> Create link</span><span><b>2</b> Share it</span><span><b>3</b> Review entries</span></div></div>
          <div className="links-section-heading"><div><h2>Your share links</h2><p>Pause a link any time. Paused or expired links stop accepting submissions.</p></div><span className="neutral-count">{links.length} total</span></div>
          {links.length ? <div className="links-grid">{links.map((link) => { const expired = Boolean(link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()); const isLive = link.active && !expired; const shareUrl = link.shareUrl || `${siteBase()}/join/${link.token}`; return <article className="share-card" key={link._id}><div className="share-card-top"><span className={`share-category-icon share-icon-${categories.findIndex((item) => item.id === link.category) % 6}`}>{initials(categoryLabel(link.category))}</span><div className="share-title"><h3>{link.title}</h3><span>{categoryLabel(link.category)}</span></div><button className="more-menu-button" title="Rename link" onClick={() => renameLink(link)}>•••</button></div><div className="share-status-line"><span className={`link-state ${isLive ? "link-live" : expired ? "link-expired" : "link-paused"}`}><i />{expired ? "Expired" : link.active ? "Active" : "Paused"}</span><span className="submission-count"><Icon name="contacts" /> {link.submissions || 0} submission{link.submissions === 1 ? "" : "s"}</span></div><div className="share-url-box"><span>{shareUrl.replace(/^https?:\/\//, "")}</span><button onClick={() => copyText(shareUrl, "Public form link copied.")} title="Copy share link" aria-label="Copy share link"><Icon name="copy" /></button></div><div className="share-expiry">{link.expiresAt ? `Expires ${shortDate(link.expiresAt)}` : "No expiry set"}<span>Created {shortDate(link.createdAt)}</span></div><div className="share-card-actions"><button className="secondary-button" onClick={() => shareLink(link)} disabled={!isLive}>Share via WhatsApp <Icon name="external" /></button><button className={`small-state-button ${isLive ? "pause-button" : "activate-button"}`} onClick={() => toggleLink(link)}>{isLive ? "Pause" : "Activate"}</button><button className="icon-button row-delete" onClick={() => deleteLink(link)} title="Delete link" aria-label="Delete link"><Icon name="trash" /></button></div></article>; })}</div> : <div className="empty-state links-empty"><span className="empty-icon"><Icon name="links" /></span><h3>No share links yet</h3><p>Create a form for manpower suppliers, vendors, subcontractors, contractors, potential clients, investors or project partners. Each link collects the correct details for its category.</p><button className="primary-button" onClick={() => setLinkModal(true)}><Icon name="plus" /> Create first share link</button></div>}
          <div className="links-security-note"><Icon name="lock" /><div><strong>Keep your dashboard private.</strong><p>The share link opens only its own form. It cannot show existing contacts, other forms or admin pages. If a link is forwarded too widely, pause or delete it here.</p></div></div>
        </div> : null}

        {tab === "settings" ? <div className="settings-view"><section className="settings-hero"><div className="settings-brand-preview" style={{ "--brand": brandColor } as CSSProperties}><BrandMark large /><span><strong>{brandName}</strong><small>{brandTagline}</small></span></div><div><span className="eyebrow">CURRENT BRAND IDENTITY</span><h2>One place. Your identity.</h2><p>Brand name, colour, logo, favicon and the canonical URL are controlled by Vercel environment variables. Update them and redeploy to apply the changes.</p></div></section><div className="settings-grid"><section className="panel settings-panel"><div className="settings-panel-heading"><span className="settings-panel-icon"><Icon name="settings" /></span><div><h3>Brand & domain</h3><p>Customise the experience without editing application code.</p></div></div><div className="env-list"><div><span>App name</span><code>NEXT_PUBLIC_APP_NAME</code><strong>{brandName}</strong></div><div><span>Tagline</span><code>NEXT_PUBLIC_APP_TAGLINE</code><strong>{brandTagline}</strong></div><div><span>Canonical URL</span><code>NEXT_PUBLIC_SITE_URL</code><strong>{process.env.NEXT_PUBLIC_SITE_URL || "Auto-detected from current domain"}</strong></div><div><span>Brand colour</span><code>NEXT_PUBLIC_BRAND_COLOR</code><strong><i className="color-swatch" style={{ background: brandColor }} /> {brandColor}</strong></div><div><span>Logo URL</span><code>NEXT_PUBLIC_BRAND_LOGO_URL</code><strong>{brandLogo || "Built-in brand mark"}</strong></div><div><span>Favicon URL</span><code>NEXT_PUBLIC_FAVICON_URL</code><strong>{process.env.NEXT_PUBLIC_FAVICON_URL || "Generated from app name and colour"}</strong></div></div><div className="settings-note"><strong>Where to change these</strong><p>Vercel → your project → Settings → Environment Variables. Save the changes and redeploy. Add your actual custom domain separately in Vercel → Settings → Domains, then set NEXT_PUBLIC_SITE_URL to that URL so generated share links use it.</p><a href="https://vercel.com/docs/projects/environment-variables" target="_blank" rel="noreferrer">Environment variable guide <Icon name="external" /></a></div></section>
          <section className="panel settings-panel"><div className="settings-panel-heading"><span className="settings-panel-icon database-icon"><Icon name="database" /></span><div><h3>Database & access</h3><p>Confirm the storage connection used by this workspace.</p></div></div><div className="health-card"><span className={`health-indicator ${health?.database === "connected" ? "health-ok" : "health-bad"}`} /><div><strong>{health?.database === "connected" ? "MongoDB connected" : health?.database === "error" ? "Database needs attention" : "Checking database…"}</strong><p>{health?.database === "connected" ? `Database: ${health.databaseName || "Configured"}` : health?.message || "The connection status will appear here."}</p></div><button className="secondary-button" onClick={async () => { setHealth(null); try { const result = await jsonRequest("/api/health"); setHealth(result); notify("Database connection is healthy."); } catch (error) { setHealth({ database: "error", message: error instanceof Error ? error.message : "Connection failed" }); notify("Database check failed.", "error"); } }}>Test connection</button></div><div className="settings-note"><strong>Required server-side variables</strong><div className="required-env"><code>MONGODB_URI</code><code>ADMIN_USERNAME</code><code>ADMIN_PASSWORD</code><code>ADMIN_SESSION_SECRET</code></div><p>Secrets are read on the server only. They are not shown in this panel and must not use the NEXT_PUBLIC_ prefix.</p></div><div className="settings-note settings-note-bottom"><strong>Backups matter</strong><p>Contact records live in MongoDB Atlas. Schedule backups in Atlas and periodically export an XLSX or CSV copy for your own records.</p><button className="text-action" onClick={() => { setTab("contacts"); }}>Export database <span>→</span></button></div></section></div>
          <section className="panel security-summary"><div className="security-shield"><Icon name="lock" /></div><div><h3>Private admin · Public forms by token</h3><p>Admin routes require a signed, HTTP-only session cookie. Login attempts are throttled using MongoDB. Intake links use 192-bit random tokens and can be paused or revoked in this panel.</p></div><span className="security-status"><i /> ACCESS CONTROL ACTIVE</span></section>
        </div> : null}
      </section>
      <footer className="app-footer"><span>© {new Date().getFullYear()} {brandName}</span><span>Personal civil network management</span><span>All records stored in your configured MongoDB</span></footer>
    </div>
    {modalContact ? <ContactModal key={modalContact === "new" ? "new-contact" : modalContact._id} initial={modalContact === "new" ? null : modalContact} onClose={() => setModalContact(null)} onSave={saveContact} saving={saving} defaultTeam={tab === "team"} /> : null}
    {modalProject ? <ProjectModal key={modalProject === "new" ? "new-project" : modalProject._id} initial={modalProject === "new" ? null : modalProject} contacts={contacts} onClose={() => setModalProject(null)} onSave={saveProject} saving={savingProject} /> : null}
    {linkModal ? <LinkModal onClose={() => setLinkModal(false)} onCreate={createLink} busy={busy} /> : null}
  </main>;
}
