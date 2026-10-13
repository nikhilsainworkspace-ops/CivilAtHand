"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { PrivateNoteRecord } from "@/lib/types";

type ToastType = "success" | "error" | "info";
type Props = {
  notes: PrivateNoteRecord[];
  onChanged: () => Promise<void>;
  notify: (message: string, type?: ToastType) => void;
};
type Filter = "all" | "pinned" | "archived";

function dateLabel(value?: string | null) {
  if (!value) return "Not saved yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
async function sendNoteRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { ...(init?.headers || {}), ...(init?.body ? { "Content-Type": "application/json" } : {}) },
  });
  const data = await response.json().catch(() => ({})) as { error?: string; note?: PrivateNoteRecord };
  if (response.status === 401) window.dispatchEvent(new Event("cah-unauthorized"));
  if (!response.ok) throw new Error(data.error || "The note could not be saved. Please try again.");
  return data;
}

export default function PrivateNotesPanel({ notes, onChanged, notify }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [pinned, setPinned] = useState(false);
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const visibleNotes = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return notes.filter((note) => {
      if (filter === "archived" && !note.archived) return false;
      if (filter !== "archived" && note.archived) return false;
      if (filter === "pinned" && !note.pinned) return false;
      if (!q) return true;
      return [note.title, note.content, ...(note.tags || [])].some((value) => value.toLocaleLowerCase().includes(q));
    }).sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes, search, filter]);

  function resetEditor() {
    setEditingId(null); setTitle(""); setContent(""); setTagsInput(""); setPinned(false); setArchived(false);
  }
  function startNew() {
    resetEditor();
    setFilter("all");
    setSearch("");
    document.getElementById("private-note-title")?.focus();
  }
  function startEdit(note: PrivateNoteRecord) {
    setEditingId(note._id); setTitle(note.title); setContent(note.content); setTagsInput((note.tags || []).join(", ")); setPinned(note.pinned); setArchived(note.archived);
    if (note.archived) setFilter("archived");
    document.getElementById("private-note-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) { notify("Add a title for your note.", "error"); return; }
    setSaving(true);
    try {
      const payload = { title, content, tags: tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean), pinned, archived };
      await sendNoteRequest(editingId ? `/api/notes/${editingId}` : "/api/notes", { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) });
      await onChanged();
      notify(editingId ? "Private note updated in your database." : "Private note saved to your database.");
      resetEditor();
    } catch (error) { notify(error instanceof Error ? error.message : "Could not save this note.", "error"); }
    finally { setSaving(false); }
  }

  async function toggleNote(note: PrivateNoteRecord, action: "pinned" | "archived", value: boolean) {
    setActionId(note._id);
    try {
      await sendNoteRequest(`/api/notes/${note._id}`, { method: "PATCH", body: JSON.stringify({ action, value }) });
      if (editingId === note._id && action === "archived" && value) resetEditor();
      await onChanged();
      const message = action === "pinned" ? (value ? "Note pinned to the top." : "Note unpinned.") : (value ? "Note archived. You can restore it any time." : "Note restored to your notes.");
      notify(message);
    } catch (error) { notify(error instanceof Error ? error.message : "Could not update this note.", "error"); }
    finally { setActionId(null); }
  }

  async function remove(note: PrivateNoteRecord) {
    if (!window.confirm(`Permanently delete “${note.title}”? This cannot be undone.`)) return;
    setActionId(note._id);
    try {
      await sendNoteRequest(`/api/notes/${note._id}`, { method: "DELETE" });
      if (editingId === note._id) resetEditor();
      await onChanged();
      notify("Private note permanently deleted.");
    } catch (error) { notify(error instanceof Error ? error.message : "Could not delete this note.", "error"); }
    finally { setActionId(null); }
  }

  async function copyNote(note: PrivateNoteRecord) {
    try {
      await navigator.clipboard.writeText(`${note.title}\n\n${note.content}${note.tags?.length ? `\n\nTags: ${note.tags.join(", ")}` : ""}`);
      notify("Note copied to clipboard.");
    } catch { notify("Clipboard access was blocked by your browser.", "error"); }
  }

  function downloadMarkdown() {
    if (!visibleNotes.length) { notify("There are no notes in this view to export.", "info"); return; }
    const body = visibleNotes.map((note) => `# ${note.title}\n\n${note.content || "_(No body text)_"}\n\n${note.tags?.length ? `**Tags:** ${note.tags.join(", ")}\n\n` : ""}**Pinned:** ${note.pinned ? "Yes" : "No"}  \n**Archived:** ${note.archived ? "Yes" : "No"}  \n**Last updated:** ${dateLabel(note.updatedAt)}\n`).join("\n---\n\n");
    const blob = new Blob([`# Civil At Hand — Private Notes Export\n\nExported ${dateLabel(new Date().toISOString())}\n\n---\n\n${body}`], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `civil-at-hand-private-notes-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    notify(`Exported ${visibleNotes.length} note(s) as Markdown.`);
  }

  const activeNotes = notes.filter((note) => !note.archived).length;
  const pinnedNotes = notes.filter((note) => !note.archived && note.pinned).length;
  const archivedNotes = notes.filter((note) => note.archived).length;

  return <div className="private-notes-view">
    <section className="notes-intro-strip">
      <div className="notes-intro-icon" aria-hidden="true">✎</div>
      <div className="notes-intro-copy"><span>PRIVATE WORKSPACE</span><strong>Your own notes, saved in MongoDB</strong><p>Keep internal reminders, draft ideas, meeting notes and checklists here. Only a signed-in admin can use these notes; they are not part of public share links.</p></div>
      <button className="primary-button" type="button" onClick={startNew}>＋ New note</button>
    </section>

    <section className="notes-stats-grid" aria-label="Note summary">
      <article><span>ACTIVE NOTES</span><strong>{activeNotes}</strong><small>Saved and ready to search</small></article>
      <article><span>PINNED</span><strong>{pinnedNotes}</strong><small>Kept at the top</small></article>
      <article><span>ARCHIVED</span><strong>{archivedNotes}</strong><small>Hidden, but restorable</small></article>
    </section>

    <section className="panel notes-editor-panel" id="private-note-editor">
      <div className="panel-heading"><div><h2>{editingId ? "Edit private note" : "Create a private note"}</h2><p>Changes are saved to the database only when you press Save note.</p></div>{editingId ? <button className="secondary-button" type="button" onClick={resetEditor}>Cancel edit</button> : null}</div>
      <form className="private-note-form" onSubmit={save}>
        <label className="field-wrap"><span>Note title *</span><input id="private-note-title" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Meeting with the steel supplier" /></label>
        <label className="field-wrap"><span>Tags (comma separated)</span><input maxLength={350} value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder="e.g. supplier, urgent, site A" aria-describedby="note-tags-help"/><small id="note-tags-help">Up to 10 tags, each 30 characters or fewer.</small></label>
        <label className="field-wrap private-note-body"><span>Note / details</span><textarea maxLength={20000} rows={7} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write your reminder, meeting summary, checklist, ideas or anything you need to remember…" /></label>
        <div className="private-note-options"><label><input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} /> Pin this note</label><label><input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} /> Save directly to archive</label><span>{content.length.toLocaleString()} / 20,000 characters</span></div>
        <div className="private-note-form-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Save note"}</button><button className="secondary-button" type="button" onClick={resetEditor} disabled={saving}>Clear form</button></div>
      </form>
    </section>

    <section className="panel notes-list-panel">
      <div className="panel-heading notes-list-heading"><div><h2>Saved notes</h2><p>{visibleNotes.length} shown · Notes remain in your database after refresh or sign-out.</p></div><button className="secondary-button" type="button" onClick={downloadMarkdown}>Export Markdown</button></div>
      <div className="notes-toolbar"><div className="notes-filter-tabs" role="group" aria-label="Filter notes">{([ ["all", `Active (${activeNotes})`], ["pinned", `Pinned (${pinnedNotes})`], ["archived", `Archived (${archivedNotes})`] ] as [Filter, string][]).map(([value, label]) => <button type="button" key={value} className={filter === value ? "notes-filter-active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, text or tags…" aria-label="Search private notes"/><button className="secondary-button" type="button" onClick={() => void onChanged()}>Refresh</button></div>
      {visibleNotes.length ? <div className="private-notes-grid">{visibleNotes.map((note) => <article className={`private-note-card ${note.pinned ? "private-note-pinned" : ""} ${note.archived ? "private-note-archived" : ""}`} key={note._id}>
        <div className="private-note-card-top"><div className="private-note-flags">{note.pinned ? <span className="private-note-flag">Pinned</span> : null}{note.archived ? <span className="private-note-flag archived-flag">Archived</span> : null}</div><span className="private-note-edited">Updated {dateLabel(note.updatedAt)}</span></div>
        <h3>{note.title}</h3><p className="private-note-preview">{note.content.trim() ? note.content : "No body text. Edit this note to add details."}</p>
        {note.tags?.length ? <div className="private-note-tags">{note.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : <div className="private-note-tags note-tags-empty"><span>No tags</span></div>}
        <div className="private-note-card-actions"><button className="secondary-button" type="button" onClick={() => startEdit(note)}>Edit</button><button className="secondary-button" type="button" onClick={() => void copyNote(note)}>Copy</button><button className="secondary-button" type="button" disabled={actionId === note._id} onClick={() => void toggleNote(note, "pinned", !note.pinned)}>{note.pinned ? "Unpin" : "Pin"}</button><button className="secondary-button" type="button" disabled={actionId === note._id} onClick={() => void toggleNote(note, "archived", !note.archived)}>{note.archived ? "Restore" : "Archive"}</button><button className="private-note-delete" type="button" disabled={actionId === note._id} onClick={() => void remove(note)} aria-label={`Delete note ${note.title}`} title="Delete note">×</button></div>
      </article>)}</div> : <div className="notes-empty"><span aria-hidden="true">✎</span><h3>{search ? "No matching notes" : filter === "pinned" ? "No pinned notes" : filter === "archived" ? "Your archive is empty" : "Your private notebook is ready"}</h3><p>{search ? "Try a different word or search a tag." : filter === "archived" ? "Archived notes stay in the database until you restore or delete them." : filter === "pinned" ? "Pin important notes to keep them easy to find." : "Create a note for internal reminders, meeting summaries, site observations or ideas."}</p><button className="primary-button" type="button" onClick={startNew}>Create a note</button></div>}
      <p className="private-notes-footnote">Private notes are protected by the admin session and are not shown on public forms or shared database links. Avoid storing passwords, OTP seeds, API keys or payment-card information in note text.</p>
    </section>
  </div>;
}
