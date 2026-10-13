"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { ContactRecord, ProjectRecord, TaskRecord } from "@/lib/types";
import { escapeCsv } from "@/lib/csv";

type TaskForm = {
  title: string;
  description: string;
  status: TaskRecord["status"];
  priority: TaskRecord["priority"];
  dueAt: string;
  related: string;
};

type Filter = "open" | "all" | "done" | "overdue";
type Props = {
  tasks: TaskRecord[];
  contacts: ContactRecord[];
  projects: ProjectRecord[];
  onChanged: () => Promise<void>;
  notify: (message: string, type?: "success" | "error" | "info") => void;
};

const blankForm: TaskForm = { title: "", description: "", status: "todo", priority: "normal", dueAt: "", related: "none:" };
const statusLabels: Record<TaskRecord["status"], string> = { todo: "To do", "in-progress": "In progress", done: "Completed", cancelled: "Cancelled" };
const priorityLabels: Record<TaskRecord["priority"], string> = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };
function localDate(value?: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No due date" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function isoDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function isOverdue(task: TaskRecord) {
  if (!task.dueAt || task.status === "done" || task.status === "cancelled") return false;
  return new Date(task.dueAt).getTime() < new Date(new Date().toDateString()).getTime();
}

export default function TasksPanel({ tasks, contacts, projects, onChanged, notify }: Props) {
  const [filter, setFilter] = useState<Filter>("open");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(blankForm);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => tasks.filter((task) => {
    const matchesFilter = filter === "all" || (filter === "open" && task.status !== "done" && task.status !== "cancelled") || (filter === "done" && task.status === "done") || (filter === "overdue" && isOverdue(task));
    const contact = task.relatedKind === "contact" ? contacts.find((item) => item._id === task.relatedId) : undefined;
    const project = task.relatedKind === "project" ? projects.find((item) => item._id === task.relatedId) : undefined;
    const haystack = `${task.title} ${task.description} ${contact?.name || ""} ${project?.title || ""}`.toLowerCase();
    return matchesFilter && haystack.includes(search.trim().toLowerCase());
  }).sort((a, b) => {
    const overdueDiff = Number(isOverdue(b)) - Number(isOverdue(a));
    if (overdueDiff) return overdueDiff;
    const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 };
    const priorityDiff = priorityRank[a.priority] - priorityRank[b.priority];
    if (priorityDiff) return priorityDiff;
    if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  }), [tasks, contacts, projects, filter, search]);

  const openCount = tasks.filter((task) => task.status !== "done" && task.status !== "cancelled").length;
  const overdueCount = tasks.filter(isOverdue).length;
  const doneCount = tasks.filter((task) => task.status === "done").length;

  function startNew() { setEditingId(null); setForm(blankForm); }
  function startEdit(task: TaskRecord) {
    setEditingId(task._id);
    setForm({ title: task.title, description: task.description || "", status: task.status, priority: task.priority, dueAt: isoDate(task.dueAt), related: `${task.relatedKind || "none"}:${task.relatedId || ""}` });
  }
  function update<K extends keyof TaskForm>(key: K, value: TaskForm[K]) { setForm((current) => ({ ...current, [key]: value })); }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) { notify("Enter a task title.", "error"); return; }
    const [relatedKind, relatedId = ""] = form.related.split(":");
    const payload = { title: form.title, description: form.description, status: form.status, priority: form.priority, dueAt: form.dueAt || null, relatedKind, relatedId };
    setSaving(true);
    try {
      const response = await fetch(editingId ? `/api/tasks/${editingId}` : "/api/tasks", { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save the task.");
      notify(editingId ? "Task updated." : "Task created.");
      startNew();
      await onChanged();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save the task.", "error");
    } finally { setSaving(false); }
  }

  async function updateStatus(task: TaskRecord, status: TaskRecord["status"]) {
    try {
      const response = await fetch(`/api/tasks/${task._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }), cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update the task.");
      notify(status === "done" ? "Task marked complete." : "Task status updated.");
      await onChanged();
    } catch (error) { notify(error instanceof Error ? error.message : "Could not update the task.", "error"); }
  }

  async function remove(task: TaskRecord) {
    if (!window.confirm(`Delete task “${task.title}”? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/tasks/${task._id}`, { method: "DELETE", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete the task.");
      notify("Task deleted.");
      if (editingId === task._id) startNew();
      await onChanged();
    } catch (error) { notify(error instanceof Error ? error.message : "Could not delete the task.", "error"); }
  }

  function linkedLabel(task: TaskRecord) {
    if (task.relatedKind === "contact") return contacts.find((contact) => contact._id === task.relatedId)?.name || "Contact no longer available";
    if (task.relatedKind === "project") return projects.find((project) => project._id === task.relatedId)?.title || "Project no longer available";
    return "No linked record";
  }

  function exportCsv() {
    const rows: unknown[][] = [["Title", "Description", "Status", "Priority", "Due date", "Related type", "Related record", "Created", "Updated"]];
    for (const task of filtered) rows.push([task.title, task.description, statusLabels[task.status], priorityLabels[task.priority], task.dueAt || "", task.relatedKind, linkedLabel(task), task.createdAt, task.updatedAt]);
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `civil-at-hand-tasks-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    notify(`Exported ${filtered.length} task(s) to CSV.`);
  }

  return <div className="tasks-view">
    <section className="tasks-summary-grid" aria-label="Task summary">
      <article><span>OPEN TASKS</span><strong>{openCount}</strong><small>To do or in progress</small></article>
      <article className={overdueCount ? "tasks-summary-alert" : ""}><span>OVERDUE</span><strong>{overdueCount}</strong><small>Need attention</small></article>
      <article><span>COMPLETED</span><strong>{doneCount}</strong><small>Finished tasks</small></article>
    </section>

    <section className="panel task-editor-panel">
      <div className="panel-heading"><div><h2>{editingId ? "Update task" : "Create a task"}</h2><p>Record site visits, quotations, document collection, payment follow-ups and other work.</p></div>{editingId ? <button className="secondary-button" type="button" onClick={startNew}>Cancel edit</button> : null}</div>
      <form className="task-form" onSubmit={save}>
        <label className="field-wrap"><span>Task title *</span><input required maxLength={160} value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Send revised quotation to client" /></label>
        <label className="field-wrap"><span>Priority</span><select value={form.priority} onChange={(event) => update("priority", event.target.value as TaskForm["priority"])}>{Object.entries(priorityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="field-wrap"><span>Due date</span><input type="date" value={form.dueAt} onChange={(event) => update("dueAt", event.target.value)} /></label>
        <label className="field-wrap"><span>Status</span><select value={form.status} onChange={(event) => update("status", event.target.value as TaskForm["status"])}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="field-wrap"><span>Link to a contact or project</span><select value={form.related} onChange={(event) => update("related", event.target.value)}><option value="none:">None</option><optgroup label="Contacts">{contacts.map((contact) => <option key={contact._id} value={`contact:${contact._id}`}>{contact.name || "Unnamed contact"}</option>)}</optgroup><optgroup label="Projects">{projects.map((project) => <option key={project._id} value={`project:${project._id}`}>{project.title}</option>)}</optgroup></select></label>
        <label className="field-wrap task-description"><span>Notes / checklist details</span><textarea maxLength={2400} rows={3} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="What needs to happen? Details, documents needed, or the next action…" /></label>
        <div className="task-form-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save task" : "Add task"}</button>{!editingId ? <button className="secondary-button" type="button" onClick={() => setForm(blankForm)}>Clear form</button> : null}</div>
      </form>
    </section>

    <section className="panel task-list-panel">
      <div className="panel-heading task-list-heading"><div><h2>Your task list</h2><p>{tasks.length} saved task{tasks.length === 1 ? "" : "s"} · sorted to bring urgent and overdue work to the top</p></div><div className="task-list-tools"><button className="secondary-button" type="button" onClick={exportCsv}>Export CSV</button><button className="secondary-button" type="button" onClick={() => void onChanged()}>Refresh</button></div></div>
      <div className="task-list-toolbar"><div className="task-filter-tabs" role="group" aria-label="Filter tasks">{([ ["open", "Open"], ["overdue", `Overdue${overdueCount ? ` (${overdueCount})` : ""}`], ["done", "Completed"], ["all", "All tasks"] ] as [Filter, string][]).map(([value, label]) => <button key={value} type="button" className={filter === value ? "task-filter-active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div><input aria-label="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks…" /></div>
      {filtered.length ? <div className="task-list">{filtered.map((task) => <article key={task._id} className={`task-item ${isOverdue(task) ? "task-item-overdue" : ""} ${task.status === "done" ? "task-item-done" : ""}`}>
        <button type="button" className={`task-check ${task.status === "done" ? "task-check-done" : ""}`} onClick={() => void updateStatus(task, task.status === "done" ? "todo" : "done")} aria-label={task.status === "done" ? `Reopen ${task.title}` : `Complete ${task.title}`} title={task.status === "done" ? "Reopen task" : "Mark complete"}>{task.status === "done" ? "✓" : ""}</button>
        <div className="task-item-main"><div className="task-item-title-row"><h3>{task.title}</h3><span className={`task-priority priority-${task.priority}`}>{priorityLabels[task.priority]}</span><span className={`task-status status-${task.status}`}>{statusLabels[task.status]}</span></div>{task.description ? <p className="task-item-description">{task.description}</p> : null}<div className="task-item-meta"><span className={isOverdue(task) ? "task-due-overdue" : ""}>◷ {isOverdue(task) ? `Overdue · ${localDate(task.dueAt)}` : localDate(task.dueAt)}</span><span>↗ {linkedLabel(task)}</span></div></div>
        <div className="task-item-actions"><button type="button" className="secondary-button" onClick={() => startEdit(task)}>Edit</button>{task.status === "todo" ? <button type="button" className="secondary-button" onClick={() => void updateStatus(task, "in-progress")}>Start</button> : null}<button type="button" className="task-delete-button" onClick={() => void remove(task)} aria-label={`Delete ${task.title}`} title="Delete task">×</button></div>
      </article>)}</div> : <div className="task-empty"><span>✓</span><h3>{search || filter !== "open" ? "No tasks found" : "You are all caught up"}</h3><p>{search ? "Try another search term." : filter === "overdue" ? "There are no overdue tasks right now." : filter === "done" ? "Completed tasks will appear here." : "Add a task above to plan site work, quotes, documents and customer follow-ups."}</p></div>}
    </section>
  </div>;
}
