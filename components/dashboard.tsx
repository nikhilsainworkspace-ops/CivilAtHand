"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type CSSProperties, type ReactNode } from "react";
import { categories, contactStatuses, getFields, categoryLabel, type FormField } from "@/lib/categories";
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
type Tab = "overview" | "followups" | "tasks" | "notes" | "contacts" | "projects" | "rates" | "rooms" | "reports" | "links" | "security" | "settings";

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
        <form onSubmit={submit} className="login-form"><label className="field-wrap"><span>Username</span><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your admin username" autoComplete="username" required /></label><label className="field-wrap"><span>Password</span><div className="password-wrap"><input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" type={showPassword ? "text" : "password"} autoComplete="current-password" required /><button className="show-password" type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div></label>{twoFactor ? <label className="field-wrap"><span>6-digit code from your authenticator app</span><input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required /></label> : null}<button className="primary-button login-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Unlock dashboard"}<Icon name="arrow" /></button></form>
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

function ContactModal({ initial, onClose, onSave, saving }: { initial: ContactRecord | null; onClose: () => void; onSave: (payload: Record<string, unknown>) => Promise<void>; saving: boolean }) {
  const [category, setCategory] = useState(initial?.category || "manpower-supplier");
  const [details, setDetails] = useState<Record<string, string>>(initial?.details || {});
  const [status, setStatus] = useState(initial?.status || "new");
  const [tags, setTags] = useState((initial?.tags || []).join(", "));
  const [followUpAt, setFollowUpAt] = useState(initial?.followUpAt ? initial.followUpAt.substring(0, 10) : "");
  const [rating, setRating] = useState(String(initial?.rating || 0)); const [flag, setFlag] = useState(initial?.flag || ""); const [shareConsent, setShareConsent] = useState(initial?.shareConsent || "");
  const [formError, setFormError] = useState("");
  useEffect(() => { setCategory(initial?.category || "manpower-supplier"); setDetails(initial?.details || {}); setStatus(initial?.status || "new"); setTags((initial?.tags || []).join(", ")); setFollowUpAt(initial?.followUpAt ? initial.followUpAt.substring(0, 10) : ""); setRating(String(initial?.rating || 0)); setFlag(initial?.flag || ""); setShareConsent(initial?.shareConsent || ""); }, [initial]);
  function update(key: string, value: string) { setDetails((current) => ({ ...current, [key]: value })); }
  async function submit(event: FormEvent) { event.preventDefault(); setFormError(""); try { await onSave({ category, details, status, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), followUpAt: followUpAt || null, rating: Number(rating), flag, shareConsent }); } catch (error) { setFormError(error instanceof Error ? error.message : "Could not save this record."); } }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card record-modal" role="dialog" aria-modal="true" aria-labelledby="record-modal-title"><div className="modal-head"><div><p className="eyebrow">CONTACT RECORD</p><h2 id="record-modal-title">{initial ? "Edit details" : "Add a new contact"}</h2><p>Keep all the information you may need for your next project.</p></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
    <form onSubmit={submit} className="record-form"><label className="field-wrap field-full"><span>Network category / संपर्क का प्रकार *</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
      <div className="form-grid admin-form-grid">{getFields(category).map((field) => <label className={`field-wrap ${field.type === "textarea" ? "field-full" : ""}`} key={`${category}-${field.key}`}><span>{field.label}{field.required ? <b className="required-star"> *</b> : null}</span><FieldControl field={field} value={details[field.key] || ""} onChange={(value) => update(field.key, value)} /></label>)}</div>
      <div className="form-grid admin-form-grid meta-fields"><label className="field-wrap"><span>Relationship status</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{contactStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="field-wrap"><span>Follow-up date</span><input type="date" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} /></label><label className="field-wrap field-full"><span>Tags (comma-separated)</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="e.g. urgent, trusted, north India" /></label><label className="field-wrap"><span>Your rating</span><select value={rating} onChange={(event) => setRating(event.target.value)}><option value="0">Not rated</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}{"☆".repeat(5 - n)} ({n})</option>)}</select></label><label className="field-wrap"><span>Flag</span><select value={flag} onChange={(event) => setFlag(event.target.value)}><option value="">None</option><option value="preferred">Preferred / trusted</option><option value="avoid">Avoid / unreliable</option></select></label><label className="field-wrap field-full"><span>May this contact be shared with clients?</span><select value={shareConsent} onChange={(event) => setShareConsent(event.target.value)}><option value="">Not recorded (will not be shared by default)</option><option value="yes">Yes, they agreed</option><option value="no">No, never share</option></select></label></div>
      {initial ? <InteractionLog contactId={initial._id} /> : null}
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}<div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : initial ? "Save changes" : "Save contact"}<Icon name="check" /></button></div>
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
  useEffect(() => { try { const saved = window.localStorage.getItem("cah-autolock"); const value = Number(saved); if (saved !== null && [0, 5, 15, 30, 60].includes(value)) setAutoLock(value); } catch { /* storage blocked: keep the default */ } }, []);
  useEffect(() => {
    const onUnauthorized = () => { setNotes([]); setSession((current) => current && current.authenticated ? { ...current, authenticated: false } : current); };
    window.addEventListener("cah-unauthorized", onUnauthorized);
    return () => window.removeEventListener("cah-unauthorized", onUnauthorized);
  }, []);
  useEffect(() => {
    if (!session?.authenticated || autoLock === 0) return;
    const mark = () => { lastActivity.current = Date.now(); };
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((name) => window.addEventListener(name, mark, { passive: true }));
    lastActivity.current = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - (lastActivity.current ?? 0) > autoLock * 60_000) { window.clearInterval(timer); void logout().then(() => setToast({ type: "info", message: "Signed out automatically after a period of inactivity." })); }
    }, 15_000);
    return () => { window.clearInterval(timer); events.forEach((name) => window.removeEventListener(name, mark)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.authenticated, autoLock]);
  const [modalContact, setModalContact] = useState<ContactRecord | null | "new">(null);
  const [linkModal, setLinkModal] = useState(false);
  const [search, setSearch] = useState(""); const [appliedSearch, setAppliedSearch] = useState(""); const [filterCategory, setFilterCategory] = useState(""); const [filterStatus, setFilterStatus] = useState("");

  const notify = useCallback((message: string, type: Toast["type"] = "success") => setToast({ message, type }), []);
  const loadData = useCallback(async (showError = true) => {
    try {
      const [contactData, linkData, projectData, roomData, rateData, healthData, taskData, noteData] = await Promise.all([
        jsonRequest("/api/contacts?limit=5000"), jsonRequest("/api/links"), jsonRequest("/api/projects").catch(() => ({ projects: [] })), jsonRequest("/api/rooms").catch(() => ({ rooms: [] })), jsonRequest("/api/rates").catch(() => ({ rates: [] })), jsonRequest("/api/health").catch((error) => ({ database: "error", message: error.message })), jsonRequest("/api/tasks").catch(() => ({ tasks: [] })), jsonRequest("/api/notes"),
      ]);
      setContacts(contactData.contacts || []); setLinks(linkData.links || []); setProjects(projectData.projects || []); setRooms(roomData.rooms || []); setRates(rateData.rates || []); setHealth(healthData); setTasks(taskData.tasks || []); setNotes(noteData.notes || []);
    } catch (error) { if (showError) notify(error instanceof Error ? error.message : "Could not load the dashboard.", "error"); }
  }, [notify]);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" }).then((res) => res.json()).then((data: Session) => { if (active) { setSession(data); if (data.authenticated) void loadData(); } }).catch(() => { if (active) setSession({ authenticated: false, configured: false, appName: brandName }); });
    return () => { active = false; };
  }, [loadData]);

  async function login(username: string, password: string, code: string) {
    try { await jsonRequest("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password, code }) }); lastActivity.current = Date.now(); setSession((current) => ({ authenticated: true, configured: true, appName: brandName, twoFactor: current?.twoFactor })); setToast(null); setTab("overview"); await loadData(); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not sign in.", "error"); throw error; }
  }
  async function logout() { try { await jsonRequest("/api/auth/logout", { method: "POST" }); } finally { setSession((current) => current ? { ...current, authenticated: false } : current); setContacts([]); setLinks([]); setProjects([]); setRooms([]); setRates([]); setTasks([]); setNotes([]); setSelectedIds([]); setRoomCreate(null); setMergeOpen(false); setToast(null); } }

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
    const q = appliedSearch.toLowerCase();
    const values = [contact.name, contact.phone, contact.email, contact.organization, contact.city, contact.state, ...(contact.tags || []), ...Object.values(contact.details || {})];
    const matchSearch = !q || values.some((value) => String(value || "").toLowerCase().includes(q));
    const matchDuplicate = !onlyDuplicates || duplicateIds.has(contact._id);
    return matchCategory && matchStatus && matchSearch && matchDuplicate;
  }), [contacts, filterCategory, filterStatus, appliedSearch, onlyDuplicates, duplicateIds]);
  const counts = useMemo(() => ({ total: contacts.length, new: contacts.filter((item) => item.status === "new").length, active: contacts.filter((item) => item.status === "active" || item.status === "qualified").length, followUps: contacts.filter((item) => item.followUpAt && item.status !== "closed" && item.followUpAt.slice(0, 10) <= dateKey(new Date())).length + projects.filter((item) => item.followUpAt && !["completed", "lost"].includes(item.status) && item.followUpAt.slice(0, 10) <= dateKey(new Date())).length, links: links.filter((item) => item.active && (!item.expiresAt || new Date(item.expiresAt).getTime() > Date.now())).length }), [contacts, links, projects]);
  const categoryCounts = useMemo(() => categories.map((category) => ({ ...category, count: contacts.filter((item) => item.category === category.id).length })), [contacts]);
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
      <div className="sidebar-section-label">WORKSPACE</div><nav className="sidebar-nav" aria-label="Main navigation">{([ ["overview", "Overview"], ["followups", "Follow-ups"], ["tasks", "Task planner"], ["notes", "Private notes"], ["contacts", "Contact database"], ["projects", "Projects & leads"], ["rates", "Rate book"], ["rooms", "Shared databases"], ["reports", "Reports"], ["links", "Public form links"], ["security", "Security"], ["settings", "Settings"] ] as [Tab, string][]).map(([value, label]) => <button className={`nav-item ${tab === value ? "nav-item-active" : ""}`} key={value} onClick={() => setTab(value)}><Icon name={value === "rates" ? "database" : value === "rooms" ? "share" : value === "security" ? "lock" : value === "contacts" ? "contacts" : value === "links" ? "links" : value === "settings" ? "settings" : value === "followups" || value === "tasks" ? "calendar" : value === "notes" ? "note" : value === "projects" ? "briefcase" : value === "reports" ? "chart" : "overview"} /><span>{label}</span>{value === "contacts" && contacts.length > 0 ? <small>{contacts.length}</small> : value === "links" && links.length > 0 ? <small>{links.length}</small> : value === "projects" && projects.length > 0 ? <small>{projects.length}</small> : value === "rooms" && rooms.length > 0 ? <small>{rooms.length}</small> : value === "rates" && rates.length > 0 ? <small>{rates.length}</small> : value === "followups" && counts.followUps > 0 ? <small className="nav-alert">{counts.followUps}</small> : value === "tasks" && tasks.filter((task) => task.status !== "done" && task.status !== "cancelled" && task.dueAt && new Date(task.dueAt).getTime() < new Date(new Date().toDateString()).getTime()).length > 0 ? <small className="nav-alert">{tasks.filter((task) => task.status !== "done" && task.status !== "cancelled" && task.dueAt && new Date(task.dueAt).getTime() < new Date(new Date().toDateString()).getTime()).length}</small> : value === "notes" && notes.some((note) => !note.archived) ? <small>{notes.filter((note) => !note.archived).length}</small> : null}</button>)}</nav>
      <div className="sidebar-spacer" /><div className="sidebar-tip"><span className="tip-spark">✳</span><strong>Keep it organised</strong><p>Save every useful relationship. Your next project may start here.</p><button onClick={() => { setTab("contacts"); setModalContact("new"); }}>+ Add a contact</button></div>
      <div className="sidebar-user"><span className="user-avatar">{initials(brandName)}</span><div><strong>Workspace admin</strong><small>Private access</small></div><button onClick={logout} title="Sign out" aria-label="Sign out"><Icon name="logout" /></button></div>
    </aside>

    <div className="main-column"><header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="crumb-divider">/</span><strong>{tabMeta[tab].title}</strong></div><div className="topbar-actions"><span className="connected-indicator"><i /> PRIVATE</span><button className={`secondary-button privacy-toggle ${privacy ? "dup-toggle-on" : ""}`} onClick={() => setPrivacy((value) => !value)} aria-pressed={privacy} title="Blur phone numbers and emails while someone is looking at your screen">{privacy ? "Show numbers" : "Hide numbers"}</button><button className="topbar-add" onClick={() => { setModalContact("new"); }}><Icon name="plus" /><span>Add contact</span></button><button className="mobile-logout" onClick={logout} aria-label="Sign out"><Icon name="logout" /></button></div></header>
      <section className="content-area" data-print-title={`${brandName} · ${tabMeta[tab].title}`}>
        <div className="page-heading"><div><div className="heading-date">CIVIL WORKS NETWORK <span>·</span> PERSONAL CRM</div><h1>{tabMeta[tab].title}</h1><p>{tabMeta[tab].subtitle}</p></div>{tab === "projects" ? <div className="heading-tools"><button className="secondary-button" onClick={() => window.print()}><Icon name="download" /> Save PDF</button><button className="primary-button" onClick={() => setModalProject("new")}><Icon name="plus" /> Add project / lead</button></div> : tab === "reports" || tab === "followups" ? <button className="secondary-button" onClick={() => window.print()}><Icon name="download" /> Save PDF</button> : tab === "contacts" ? <div className="heading-tools"><button className="secondary-button" onClick={() => window.print()}><Icon name="download" /> Save PDF</button><button className="primary-button" onClick={() => setModalContact("new")}><Icon name="plus" /> Add contact</button></div> : tab === "rooms" ? <button className="primary-button" onClick={() => setRoomCreate({ contactIds: [] })}><Icon name="plus" /> Share a database</button> : tab === "links" ? <button className="primary-button" onClick={() => setLinkModal(true)}><Icon name="plus" /> Create link</button> : tab === "overview" ? <button className="primary-button" onClick={() => { setTab("links"); setLinkModal(true); }}><Icon name="plus" /> Collect details</button> : null}</div>
        {toast && tab !== "overview" && tab !== "contacts" && tab !== "projects" && tab !== "followups" ? <div className={`toast page-toast toast-${toast.type}`} role="status">{toast.message}<button onClick={() => setToast(null)} aria-label="Dismiss">×</button></div> : null}

        {tab === "overview" ? <div className="overview-view">
          <div className="welcome-strip"><div><span className="welcome-overline">YOUR CIVIL NETWORK AT A GLANCE</span><h2>Good work starts with <em>good connections.</em></h2><p>Everything you collect is saved to your private database and ready when a project comes up.</p><div className="welcome-actions"><button className="welcome-primary" onClick={() => { setTab("contacts"); setModalContact("new"); }}>Add a contact <Icon name="arrow" /></button><button className="welcome-secondary" onClick={() => { setTab("links"); setLinkModal(true); }}>Create a public form</button></div></div><div className="welcome-art" aria-hidden="true"><div className="art-circle art-circle-back"/><div className="art-building"><span/><span/><span/><span/><b/></div><div className="art-orbit orbit-a"/><div className="art-orbit orbit-b"/><div className="art-dot dot-a"/><div className="art-dot dot-b"/><div className="art-dot dot-c"/></div></div>
          <div className="stats-grid"><article className="stat-card"><div className="stat-top"><span className="stat-icon sage"><Icon name="contacts" /></span><span className="stat-context">ALL RECORDS</span></div><strong className="stat-value">{counts.total}</strong><span className="stat-label">Total contacts</span><span className="stat-foot">Across all network categories</span></article><article className="stat-card"><div className="stat-top"><span className="stat-icon amber"><span>✳</span></span><span className="stat-context">NEEDS ATTENTION</span></div><strong className="stat-value">{counts.new}</strong><span className="stat-label">New enquiries</span><span className="stat-foot">Review and follow up</span></article><article className="stat-card"><div className="stat-top"><span className="stat-icon blue"><Icon name="users" /></span><span className="stat-context">IN PROGRESS</span></div><strong className="stat-value">{counts.active}</strong><span className="stat-label">Qualified / active</span><span className="stat-foot">Potential or ongoing relationships</span></article><article className="stat-card"><div className="stat-top"><span className="stat-icon violet"><Icon name="links" /></span><span className="stat-context">SHARED FORMS</span></div><strong className="stat-value">{counts.links}</strong><span className="stat-label">Active share links</span><span className="stat-foot">Ready to collect details</span></article></div>
          <div className="overview-grid"><section className="panel category-panel"><div className="panel-heading"><div><h2>Network categories</h2><p>See where your contacts are coming from.</p></div><button className="text-action" onClick={() => setTab("contacts")}>View database <span>→</span></button></div><div className="category-list">{categoryCounts.map((category) => { const total = Math.max(counts.total, 1); const percent = counts.total ? Math.round(category.count / total * 100) : 0; return <button className="category-row" key={category.id} onClick={() => { setFilterCategory(category.id); setTab("contacts"); }}><span className={`category-monogram mono-${category.id}`}>{category.short.split(/[ /]/).map((x) => x[0]).join("").slice(0, 2).toUpperCase()}</span><span className="category-info"><strong>{category.label}</strong><small>{category.description}</small><span className="mini-progress"><i style={{ width: `${percent}%` }} /></span></span><span className="category-count">{category.count}</span><span className="category-chevron">›</span></button>; })}</div></section>
            <section className="panel recent-panel"><div className="panel-heading"><div><h2>Recently updated</h2><p>Your latest network activity.</p></div><button className="icon-button subtle" onClick={() => loadData()} aria-label="Refresh records">↻</button></div>{contacts.length ? <div className="recent-list">{contacts.slice(0, 6).map((contact) => <button className="recent-row" key={contact._id} onClick={() => { setTab("contacts"); setModalContact(contact); }}><span className={`contact-avatar avatar-${categories.findIndex((item) => item.id === contact.category) % 5}`}>{initials(contact.name)}</span><span className="recent-person"><strong>{contact.name}</strong><small>{contact.organization || categoryLabel(contact.category)}</small></span><span className="recent-meta"><StatusPill status={contact.status} /><small>{relativeDate(contact.updatedAt)}</small></span></button>)}<button className="recent-view-all" onClick={() => setTab("contacts")}>View all contacts <Icon name="arrow" /></button></div> : <div className="empty-state compact-empty"><span className="empty-icon"><Icon name="contacts" /></span><h3>Your network starts here</h3><p>Add your first contact manually or share a public form to collect details.</p><button className="secondary-button" onClick={() => { setTab("contacts"); setModalContact("new"); }}>Add first contact</button></div>}
            <div className="followup-card"><span className="followup-icon"><Icon name="calendar" /></span><div><strong>{counts.followUps ? `${counts.followUps} follow-up${counts.followUps > 1 ? "s" : ""} due or overdue` : "Stay ahead of follow-ups"}</strong><p>{counts.followUps ? "Open the Follow-ups list to call, message or reschedule." : "Set a follow-up date inside any contact or project."}</p></div><button onClick={() => setTab("followups")}>Review <span>→</span></button></div></section></div>
          <div className="ov-projects"><div><strong>Projects & leads</strong><p>{projects.filter((p) => ["lead", "quoted", "negotiation"].includes(p.status)).length} open leads · {projects.filter((p) => p.status === "ongoing").length} ongoing · {projects.length} total</p></div><button className="secondary-button" onClick={() => setTab("projects")}>Open projects</button><button className="primary-button" onClick={() => { setTab("projects"); setModalProject("new"); }}>Add lead</button></div>
          <div className="task-overview-strip"><div className="task-overview-icon">✓</div><div className="task-overview-copy"><span>WORK QUEUE</span><strong>{tasks.filter((task) => task.status !== "done" && task.status !== "cancelled").length} open tasks to manage</strong><p>{tasks.filter((task) => task.status !== "done" && task.status !== "cancelled" && task.dueAt && new Date(task.dueAt).getTime() < new Date(new Date().toDateString()).getTime()).length ? `${tasks.filter((task) => task.status !== "done" && task.status !== "cancelled" && task.dueAt && new Date(task.dueAt).getTime() < new Date(new Date().toDateString()).getTime()).length} overdue · prioritise these first.` : "Track site visits, quotations, paperwork and client actions separately from follow-up reminders."}</p></div><button className="secondary-button" onClick={() => setTab("tasks")}>Open task planner <span>→</span></button></div>
          <div className="bottom-note"><span>✦</span><p><strong>Your data, your control.</strong> Contacts are stored in your MongoDB database. Public form links collect details but never expose your contact list.</p><button onClick={() => setTab("settings")}>Workspace details <span>→</span></button></div>
        </div> : null}

        {tab === "contacts" ? <section className="panel database-panel"><div className="database-toolbar"><form className="search-form" onSubmit={applyFilters}><span className="search-icon"><Icon name="search" /></span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, company, city…" aria-label="Search contacts" /><button type="submit">Search</button></form><div className="database-actions"><label className="filter-control"><Icon name="filter" /><select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)} aria-label="Filter by category"><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><select className="filter-control status-filter" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{contactStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><button className={`secondary-button dup-toggle ${onlyDuplicates ? "dup-toggle-on" : ""}`} type="button" onClick={() => setOnlyDuplicates((v) => !v)} disabled={!duplicateIds.size && !onlyDuplicates} title="Show contacts that share a phone number or email">Duplicates ({duplicateIds.size})</button>{onlyDuplicates && duplicateIds.size ? <button className="primary-button" type="button" onClick={() => setMergeOpen(true)}>Merge duplicates…</button> : null}<input ref={importInputRef} className="hidden-file-input" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importContacts} aria-label="Choose a CSV or Excel file to import" /><button className="secondary-button import-trigger" type="button" onClick={() => importInputRef.current?.click()} disabled={importing} title="Import CSV or Excel contacts; duplicates by phone or email are skipped"><Icon name="upload" /> {importing ? "Importing…" : "Import"}</button><a className="secondary-button import-trigger" href="/api/export?scope=template&format=xlsx" title="A blank Excel file with the right column names">Template</a><div className="export-menu"><button className="secondary-button export-trigger"><Icon name="download" /> Export <span>⌄</span></button><div className="export-options"><a href={`/api/export?format=xlsx${exportFilterQuery}`}><span className="export-file-icon">X</span><span><strong>Excel workbook</strong><small>.xlsx · {hasActiveExportFilters ? "Current filters" : "Full database"}</small></span></a><a href={`/api/export?format=csv${exportFilterQuery}`}><span className="export-file-icon csv-file">≡</span><span><strong>CSV file</strong><small>.csv · {hasActiveExportFilters ? "Current filters" : "Full database"}</small></span></a><button onClick={() => window.print()}><span className="export-file-icon pdf-file">P</span><span><strong>Save as PDF</strong><small>Print / Save PDF</small></span></button></div></div><button className="primary-button compact-add" onClick={() => setModalContact("new")}><Icon name="plus" /> Add</button></div></div>
          <div className="table-summary"><span><strong>{filteredContacts.length}</strong> record{filteredContacts.length === 1 ? "" : "s"}{(filterCategory || filterStatus || appliedSearch || onlyDuplicates) ? " match your filters" : " in your current view"}</span><div><span className="summary-dot" /> MongoDB synced on refresh</div></div>
          {selectedIds.length ? <div className="bulk-bar" role="region" aria-label="Bulk actions"><strong>{selectedIds.length} selected</strong>
            <select aria-label="Set status for selected" defaultValue="" onChange={(event) => { const value = event.target.value; event.target.value = ""; if (value) void bulk("status", value); }}><option value="">Set status…</option>{contactStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <select aria-label="Sharing consent for selected" defaultValue="" onChange={(event) => { const value = event.target.value; event.target.value = ""; if (value) void bulk("consent", value === "clear" ? "" : value); }}><option value="">Sharing consent…</option><option value="yes">Agreed to be shared</option><option value="no">Never share</option><option value="clear">Not recorded</option></select>
            <select aria-label="Flag selected" defaultValue="" onChange={(event) => { const value = event.target.value; event.target.value = ""; if (value) void bulk("flag", value === "clear" ? "" : value); }}><option value="">Flag…</option><option value="preferred">Preferred</option><option value="avoid">Avoid</option><option value="clear">Clear flag</option></select>
            <button className="secondary-button" type="button" onClick={() => { const tag = window.prompt("Tag to add to the selected contacts:"); if (tag && tag.trim()) void bulk("add-tag", tag.trim()); }}>+ Tag</button>
            <button className="primary-button" type="button" onClick={() => { setRoomCreate({ contactIds: selectedIds }); setTab("rooms"); }}>Share selected…</button>
            <button className="secondary-button bulk-delete" type="button" onClick={() => void bulk("delete")}>Delete</button>
            <button className="icon-button" type="button" onClick={() => setSelectedIds([])} aria-label="Clear selection">×</button></div> : null}
          {filteredContacts.length ? <div className="table-scroll"><table className="contacts-table"><thead><tr><th className="select-col"><input type="checkbox" checked={allShownSelected} onChange={toggleAllShown} aria-label="Select all shown contacts" /></th><th>CONTACT</th><th>CATEGORY</th><th>PHONE / EMAIL</th><th>LOCATION</th><th>STATUS</th><th>UPDATED</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filteredContacts.map((contact, index) => <tr key={contact._id} className={selectedIds.includes(contact._id) ? "row-selected" : ""}><td className="select-col"><input type="checkbox" checked={selectedIds.includes(contact._id)} onChange={() => toggleOne(contact._id)} aria-label={`Select ${contact.name}`} /></td><td><div className="table-person"><span className={`contact-avatar avatar-${index % 5}`}>{initials(contact.name)}</span><span><strong>{contact.name || "Unnamed contact"}{duplicateIds.has(contact._id) ? <span className="dup-badge" title="Another contact has the same phone or email">Duplicate?</span> : null}{contact.flag === "avoid" ? <span className="dup-badge flag-avoid">Avoid</span> : contact.flag === "preferred" ? <span className="dup-badge flag-pref">Preferred</span> : null}{contact.rating ? <span className="rt-stars" title={`${contact.rating} of 5`}>{"★".repeat(contact.rating)}</span> : null}</strong><small>{contact.organization || contact.details?.supplierType || contact.details?.contractorType || "Individual / business"}</small></span></div></td><td><span className="category-tag">{categoryLabel(contact.category)}</span></td><td><div className="contact-methods">{contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : <span className="muted-cell">No phone</span>}{contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}</div></td><td><span className="location-cell">{[contact.city, contact.state].filter(Boolean).join(", ") || "—"}</span></td><td><StatusPill status={contact.status} /></td><td><span className="updated-cell">{relativeDate(contact.updatedAt)}</span>{contact.followUpAt ? <small className={`fu-chip ${contact.followUpAt.slice(0, 10) < dateKey(new Date()) && contact.status !== "closed" ? "fu-chip-late" : ""}`}>Follow-up {dateOnly(contact.followUpAt)}</small> : null}</td><td><div className="row-actions"><button className="icon-button row-edit" onClick={() => setModalContact(contact)} title="View / edit" aria-label={`Edit ${contact.name}`}><Icon name="edit" /></button><button className="icon-button row-more" onClick={() => openWhatsApp(contact.details?.whatsapp || contact.phone, `Hello ${contact.name}, contacting you regarding ${categoryLabel(contact.category)}.`)} title="Message this contact" aria-label={`Message ${contact.name} on WhatsApp`}>◉</button><button className="icon-button row-share" onClick={() => shareContact(contact)} title="Share contact details on WhatsApp" aria-label={`Share details for ${contact.name}`}><Icon name="share" /></button><button className="icon-button row-mail" onClick={() => emailContactSummary(contact)} title="Email contact details" aria-label={`Email details for ${contact.name}`}><Icon name="mail" /></button><button className="icon-button row-delete" onClick={() => deleteContact(contact)} title="Delete record" aria-label={`Delete ${contact.name}`}><Icon name="trash" /></button></div></td></tr>)}</tbody></table></div> : <div className="empty-state"><span className="empty-icon"><Icon name="search" /></span><h3>{contacts.length ? "No records match these filters" : "Your contact database is ready"}</h3><p>{contacts.length ? "Try another search term or clear one of the filters." : "Add a contact yourself, or create a share link so a supplier or contractor can fill in their own details."}</p><div className="empty-actions">{contacts.length ? <button className="secondary-button" onClick={() => { setSearch(""); setAppliedSearch(""); setFilterCategory(""); setFilterStatus(""); setOnlyDuplicates(false); }}>Clear filters</button> : <><button className="secondary-button" onClick={() => setModalContact("new")}>Add contact</button><button className="primary-button" onClick={() => { setTab("links"); setLinkModal(true); }}>Create a share form</button></>}</div></div>}
          <div className="database-footer"><span>Personal database · Visible only after admin sign-in</span><span>Up to 5,000 records are loaded at a time</span></div>
        </section> : null}

        {toast && (tab === "projects" || tab === "followups") ? <div className={`toast page-toast toast-${toast.type}`} role="status">{toast.message}<button onClick={() => setToast(null)} aria-label="Dismiss">×</button></div> : null}
        {tab === "followups" ? <FollowUpsPanel contacts={contacts} projects={projects} onOpen={openFollowUp} onUpdate={updateFollowUp} onWhatsApp={openWhatsApp} /> : null}
        {tab === "tasks" ? <TasksPanel tasks={tasks} contacts={contacts} projects={projects} onChanged={() => loadData(false)} notify={notify} /> : null}
        {tab === "notes" ? <PrivateNotesPanel notes={notes} onChanged={() => loadData(false)} notify={notify} /> : null}
        {tab === "projects" ? <ProjectsPanel projects={projects} contacts={contacts} onEdit={(project) => setModalProject(project)} onDelete={deleteProject} onStatus={changeProjectStatus} /> : null}
        {tab === "rates" ? <RatesPanel rates={rates} contacts={contacts} onChanged={() => loadData(false)} notify={notify} /> : null}
        {tab === "rooms" ? <RoomsPanel rooms={rooms} contacts={contacts} rates={rates} creating={roomCreate} onCloseCreate={() => setRoomCreate(null)} onChanged={() => loadData(false)} notify={notify} ownerName={brandName} /> : null}
        {mergeOpen ? <MergeModal contacts={contacts} onClose={() => setMergeOpen(false)} onDone={() => loadData(false)} notify={notify} /> : null}
        {tab === "security" ? <SecurityPanel twoFactor={Boolean(session.twoFactor)} autoLockMinutes={autoLock} onAutoLock={(minutes) => { setAutoLock(minutes); try { window.localStorage.setItem("cah-autolock", String(minutes)); } catch { /* ignore */ } }} notify={notify} /> : null}
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
    {modalContact ? <ContactModal key={modalContact === "new" ? "new-contact" : modalContact._id} initial={modalContact === "new" ? null : modalContact} onClose={() => setModalContact(null)} onSave={saveContact} saving={saving} /> : null}
    {modalProject ? <ProjectModal key={modalProject === "new" ? "new-project" : modalProject._id} initial={modalProject === "new" ? null : modalProject} contacts={contacts} onClose={() => setModalProject(null)} onSave={saveProject} saving={savingProject} /> : null}
    {linkModal ? <LinkModal onClose={() => setLinkModal(false)} onCreate={createLink} busy={busy} /> : null}
  </main>;
}
