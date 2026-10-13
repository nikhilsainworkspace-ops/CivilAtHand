"use client";

import { useEffect, useState } from "react";
import { copyToClipboard, dateTime, jsonRequest } from "@/lib/client-api";

type Notify = (message: string, type?: "success" | "error" | "info") => void;
type Device = { _id: string; ip: string; agent: string; createdAt: string; lastSeenAt: string; current: boolean };
type Entry = { _id?: string; at: string; action: string; detail: string; ip: string; agent: string };

const ACTION_LABELS: Record<string, string> = {
  login: "Signed in", "login-failed": "Failed sign-in", logout: "Signed out", "logout-failed": "Sign-out needs attention", "contact-deleted": "Contact deleted", "contacts-bulk-deleted": "Contacts deleted (bulk)",
  "contacts-bulk-updated": "Contacts updated (bulk)", "contacts-merged": "Duplicates merged", "room-created": "Shared database created", "room-updated": "Shared database changed",
  "room-deleted": "Shared database deleted", "backup-downloaded": "Backup downloaded", "sessions-revoked": "Devices signed out", "session-revoked": "Device signed out", "data-exported": "Data exported", "data-imported": "Contacts imported", "security-setting-updated": "Security preference updated",
};

export default function SecurityPanel({ twoFactor, autoLockMinutes, onAutoLock, notify }: { twoFactor: boolean; autoLockMinutes: number; onAutoLock: (minutes: number) => void; notify: Notify }) {
  const [devices, setDevices] = useState<Device[]>([]); const [entries, setEntries] = useState<Entry[]>([]); const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<{ secret: string; url: string } | null>(null); const [code, setCode] = useState(""); const [verified, setVerified] = useState<boolean | null>(null); const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [d, a] = await Promise.all([jsonRequest("/api/security/sessions"), jsonRequest("/api/security/audit")]);
      setDevices(d.sessions || []); setEntries(a.entries || []);
    } catch (err) { notify(err instanceof Error ? err.message : "Could not load security details.", "error"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function revoke(device: Device) {
    if (device.current && !window.confirm("This is the device you are using now. Sign it out?")) return;
    try { await jsonRequest(`/api/security/sessions?id=${device._id}`, { method: "DELETE" }); notify("Device signed out."); await load(); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not sign out that device.", "error"); }
  }
  async function revokeOthers() {
    if (!window.confirm("Sign out every other phone and computer?")) return;
    try { await jsonRequest("/api/security/sessions?others=1", { method: "DELETE" }); notify("All other devices were signed out."); await load(); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not sign out the other devices.", "error"); }
  }
  async function startSetup() {
    setBusy(true); setVerified(null); setCode("");
    try { setSetup(await jsonRequest("/api/security/2fa", { method: "POST", body: JSON.stringify({ action: "generate" }) })); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not start setup.", "error"); }
    finally { setBusy(false); }
  }
  async function verify() {
    if (!setup) return; setBusy(true);
    try { const data = await jsonRequest("/api/security/2fa", { method: "POST", body: JSON.stringify({ action: "verify", secret: setup.secret, code }) }); setVerified(Boolean(data.ok)); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not check the code.", "error"); }
    finally { setBusy(false); }
  }
  const grouped = setup ? setup.secret.replace(/(.{4})/g, "$1 ").trim() : "";

  return <div className="sec-view">
    <section className="panel sec-card sec-hero"><div><p className="eyebrow">PRIVATE PORTAL</p><h2>Security centre</h2><p>This portal is for you only. Nobody can register; outsiders receive only the specific public form or limited shared data you choose to send them.</p></div>
      <ul className="sec-checks"><li className="ok">Passwords and sessions are checked on the server for every request</li><li className="ok">Sessions can be revoked, and expire when idle</li><li className="ok">Cross-site requests are blocked; failed logins are throttled</li><li className="ok">Business records are kept in MongoDB, not browser local storage</li><li className="ok">Logout clears app state, browser cache/storage and other open tabs</li><li className="ok">Sensitive dashboard and API responses disable browser caching</li><li className={twoFactor ? "ok" : "warn"}>{twoFactor ? "2-step verification is ON" : "2-step verification is OFF. Turn it on below (strongly recommended)"}</li></ul></section>
    <p className="rm-note">Shared-device reminder: downloaded exports, screenshots, clipboard history and browser-saved passwords are outside the website's control. Delete downloaded files and do not save credentials when using someone else's computer.</p>

    <div className="sec-grid">
      <section className="panel sec-card"><h3>2-step verification (authenticator app)</h3>
        {twoFactor ? <p className="rm-note">Enabled. Every sign-in needs a 6-digit code from your authenticator app. To change the key, generate a new one below and replace <code>ADMIN_TOTP_SECRET</code>. To turn it off, delete that variable and redeploy.</p> : <p className="rm-note">Adds a 6-digit code from your phone to every sign-in, so a stolen password alone cannot open your data.</p>}
        {!setup ? <button className="secondary-button" onClick={() => void startSetup()} disabled={busy}>{twoFactor ? "Create a new key" : "Set up 2-step verification"}</button> : <div className="sec-steps">
          <p><b>1.</b> In Google Authenticator / Microsoft Authenticator / Authy choose “Enter a setup key” and type this key (or tap the button on your phone):</p>
          <div className="rm-copy-row"><div><small>Setup key</small><code className="rm-passcode">{grouped}</code></div><button className="secondary-button" onClick={async () => notify((await copyToClipboard(setup.secret)) ? "Key copied." : "Copy was blocked.", "info")}>Copy</button></div>
          <a className="secondary-button sec-open" href={setup.url}>Open in authenticator app</a>
          <p><b>2.</b> Type the 6-digit code it shows, to prove it works:</p>
          <div className="sec-verify"><input inputMode="numeric" maxLength={6} value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setVerified(null); }} placeholder="123456" aria-label="6-digit code" /><button className="primary-button" onClick={() => void verify()} disabled={busy || code.length !== 6}>Check</button>{verified === true ? <span className="sec-ok">✓ Correct</span> : verified === false ? <span className="sec-bad">Not correct. Try the newest code.</span> : null}</div>
          <p><b>3.</b> In Vercel → Settings → Environment Variables add <code>ADMIN_TOTP_SECRET</code> with the setup key (no spaces), then Redeploy. From then on, sign-in asks for the code.</p>
          <p className="rm-note">Keep a copy of the key somewhere safe. If you lose both the phone and the key, remove the variable in Vercel to get back in.</p>
        </div>}
      </section>

      <section className="panel sec-card"><h3>Auto-lock &amp; backup</h3>
        <label className="field-wrap"><span>Sign out automatically after no activity for</span><select value={autoLockMinutes} onChange={(e) => onAutoLock(Number(e.target.value))}><option value={5}>5 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={0}>Never (not recommended)</option></select></label>
        <p className="rm-note">This preference is saved in MongoDB, not in this browser, so it follows you across devices. The server also expires idle sessions after <code>ADMIN_IDLE_MINUTES</code> (default 60 minutes) and absolute sessions after <code>ADMIN_SESSION_HOURS</code> (default 24 hours). Existing Vercel values override these defaults. Choose 5–15 minutes on shared computers; “Never” disables only the browser timer and is not recommended.</p>
        <div className="sec-backup"><a className="primary-button" href="/api/backup">Download full backup (JSON)</a><p className="rm-note">Includes contacts, projects, rates, links metadata, tasks and private notes. It contains sensitive data, so store it safely and delete the downloaded copy from shared computers.</p></div>
      </section>
    </div>

    <section className="panel sec-card"><div className="sec-head"><h3>Signed-in devices</h3><button className="secondary-button" onClick={() => void revokeOthers()} disabled={devices.length < 2}>Sign out all other devices</button></div>
      {loading ? <span className="spinner" /> : devices.length ? <ul className="rm-log">{devices.map((d) => <li key={d._id}><b>{d.agent || "Unknown device"}{d.current ? " (this device)" : ""}</b><span>Last active {dateTime(d.lastSeenAt)}</span><small>Signed in {dateTime(d.createdAt)} · {d.ip}</small><button className="secondary-button sec-small" onClick={() => void revoke(d)}>Sign out</button></li>)}</ul> : <p className="rm-note">No active sessions.</p>}</section>

    <section className="panel sec-card"><div className="sec-head"><h3>Activity log</h3><button className="secondary-button" onClick={() => void load()}>Refresh</button></div>
      {entries.length ? <div className="table-scroll"><table className="contacts-table"><thead><tr><th>WHEN</th><th>WHAT</th><th>DETAIL</th><th>FROM</th></tr></thead><tbody>{entries.map((e, i) => <tr key={e._id || i}><td>{dateTime(e.at)}</td><td><span className={e.action === "login-failed" ? "sec-bad" : ""}>{ACTION_LABELS[e.action] || e.action}</span></td><td>{e.detail || "—"}</td><td>{e.agent || "—"}{e.ip ? ` · ${e.ip}` : ""}</td></tr>)}</tbody></table></div> : <p className="rm-note">Nothing recorded yet. Sign-ins, deletions, exports and shared links appear here for 180 days.</p>}</section>
  </div>;
}
