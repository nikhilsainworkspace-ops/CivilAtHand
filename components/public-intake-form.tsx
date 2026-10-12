"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import type { FormField } from "@/lib/categories";

type FormInfo = { title: string; category: string; categoryLabel: string; description: string; fields: FormField[] };
type BrandInfo = { name: string; tagline: string; color: string; logoUrl: string };

export default function PublicIntakeForm({ token }: { token: string }) {
  const [form, setForm] = useState<FormInfo | null>(null);
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    fetch(`/api/public/${token}`, { cache: "no-store" }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "This form is unavailable.");
      if (live) { setForm(data.form); setBrand(data.brand); }
    }).catch((err: Error) => { if (live) setError(err.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [token]);

  function change(key: string, value: string) { setValues((previous) => ({ ...previous, [key]: value })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!form) return;
    setSending(true); setError("");
    try {
      const response = await fetch(`/api/public/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ details: values, website: values.__website || "" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Please check your details and try again.");
      setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not submit the form. Please try again."); }
    finally { setSending(false); }
  }

  const pageStyle = { "--brand": brand?.color || "#176b59" } as CSSProperties;
  return <main className="public-shell" style={pageStyle}>
    <div className="public-top"><div className="public-brand">
      {brand?.logoUrl ? <img src={brand.logoUrl} alt={`${brand.name} logo`} className="public-logo-image" /> : <span className="brand-mark small-mark">⌂</span>}
      <span><strong>{brand?.name || "Civil At Hand"}</strong><small>{brand?.tagline || "Your civil works network, organised."}</small></span>
    </div><span className="secure-note"><span className="secure-dot" /> Public form</span></div>

    {loading ? <section className="public-card loading-card"><span className="spinner" /><p>Opening form…</p></section> : error && !form ? <section className="public-card error-card"><div className="status-illustration">!</div><h1>Form unavailable</h1><p>{error}</p><p className="muted">Please contact the person who shared this link and ask for an active form.</p><p className="muted">कृपया लिंक भेजने वाले व्यक्ति से नया या चालू फ़ॉर्म माँगें।</p></section> : done ? <section className="public-card success-card"><div className="status-illustration success-illustration">✓</div><p className="eyebrow">DETAILS RECEIVED</p><h1>Thank you! / धन्यवाद!</h1><p>Your details have been submitted successfully. The team will review your information and contact you if there is a suitable opportunity.</p><p className="muted">आपकी जानकारी सफलतापूर्वक भेज दी गई है। उपयुक्त अवसर होने पर टीम आपसे संपर्क करेगी।</p><div className="success-foot">You may now close this page.</div></section> : form ? <>
      <section className="public-intro"><span className="eyebrow">CIVIL WORKS NETWORK</span><h1>{form.title}</h1><p>{form.description}</p><div className="form-type-pill">{form.categoryLabel}</div></section>
      <form className="public-card public-form" onSubmit={submit}>
        <div className="form-heading"><div><h2>Share your details / अपनी जानकारी भरें</h2><p>Fields marked * are required. / * वाले फ़ील्ड भरना ज़रूरी है।</p></div><span className="form-step">FORM 01</span></div>
        <div className="form-grid">
          {form.fields.map((field) => <label className={`field-wrap ${field.type === "textarea" ? "field-full" : ""}`} key={field.key}>
            <span>{field.label}{field.required ? <b className="required-star"> *</b> : null}</span>
            {field.type === "textarea" ? <textarea required={field.required} rows={3} value={values[field.key] || ""} placeholder={field.placeholder || "Type here / यहाँ लिखें"} onChange={(event) => change(field.key, event.target.value)} maxLength={field.key === "notes" ? 6000 : 2000} /> : field.type === "select" ? <select required={field.required} value={values[field.key] || ""} onChange={(event) => change(field.key, event.target.value)}><option value="">Choose an option / विकल्प चुनें</option>{(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input required={field.required} type={field.type === "email" ? "email" : field.type === "tel" ? "tel" : field.type === "url" ? "url" : "text"} value={values[field.key] || ""} placeholder={field.placeholder || "Enter here / यहाँ लिखें"} onChange={(event) => change(field.key, event.target.value)} maxLength={field.key === "notes" ? 6000 : 2000} autoComplete={field.key === "email" ? "email" : field.key === "phone" ? "tel" : "on"} />}
          </label>)}
          <label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={values.__website || ""} onChange={(event) => change("__website", event.target.value)} /></label>
        </div>
        {error ? <div role="alert" className="form-error">{error}</div> : null}
        <div className="form-consent"><span className="consent-check">✓</span><p>By submitting, you agree that these details may be used to contact you about relevant civil-work opportunities. / फ़ॉर्म भेजकर आप संबंधित काम के लिए संपर्क किए जाने की सहमति देते हैं।</p></div>
        <button className="primary-button submit-button" type="submit" disabled={sending}>{sending ? "Submitting… / भेज रहे हैं…" : "Submit details / जानकारी भेजें"}<span>↗</span></button>
        <p className="privacy-foot">Your information is shared with the network owner, not displayed publicly.</p>
      </form>
    </> : null}
    <footer className="public-footer"><span>Built for civil works & project networks</span><span>{brand?.name || "Civil At Hand"} · Secure intake</span></footer>
  </main>;
}
