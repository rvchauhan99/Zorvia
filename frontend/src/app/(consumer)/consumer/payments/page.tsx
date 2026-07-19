"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtCAD, fmtDateTime, todayISO } from "@/lib/format";
import { toast } from "sonner";
import StatusPill from "@/components/StatusPill";
import ImageSourceField from "@/components/ImageSourceField";
import { DownloadSimple } from "@phosphor-icons/react";

function toCSV(rows: any[]) {
  if (!rows || !rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r[k])).join(","))].join("\n");
}

export default function ConsumerPayments() {
  const [me, setMe] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [form, setForm] = useState<{amount: string; reference: string; file: File | null}>({ amount: "", reference: "", file: null });
  const [submitting, setSubmitting] = useState(false);
  const input = "h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all";

  async function load() {
    const [{ data: m }, { data: p }] = await Promise.all([
      api.get("/consumer/me"), api.get("/consumer/payments"),
    ]);
    setMe(m); setPayments(p);
  }
  useEffect(() => { load(); }, []);

  async function downloadStatement() {
    try {
      const month = todayISO().slice(0, 7);
      const { data } = await api.get(`/reports/statement?month=${month}`);
      const rows = data.rows || [];
      const csv = toCSV(rows.length ? rows : [{ ...data.totals, month: data.month }]);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `statement-${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Statement downloaded");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to download statement");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || !form.reference) return toast.error("Amount and reference are required");
    if (Number(form.amount) <= 0) return toast.error("Amount must be greater than 0");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("amount", form.amount);
      fd.append("reference", form.reference);
      if (form.file) fd.append("screenshot", form.file);
      await api.post("/consumer/payments", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Payment submitted. Your provider will verify it shortly.");
      setForm({ amount: "", reference: "", file: null });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="label-overline">Interac e-Transfer</span>
          <h1 className="font-display font-black text-3xl mt-1">Payments</h1>
        </div>
        <button
          data-testid="pay-download-statement"
          onClick={downloadStatement}
          className="pill-btn btn-outline gap-2 shrink-0 cursor-pointer hover:bg-brand-surface"
        >
          <DownloadSimple size={16} /> Statement
        </button>
      </div>

      {me?.provider ? (
        <div className="card-tinted p-5">
          <div className="label-overline">Send Interac e-Transfer to</div>
          <div className="font-display font-bold text-lg mt-1">{me.provider.interac_email || "—"}</div>
          <div className="text-xs text-muted-foreground mt-1">{me.provider.name} · Outstanding: <span className="font-semibold text-primary">{fmtCAD(me.outstanding || 0)}</span></div>
        </div>
      ) : null}

      <form onSubmit={submit} className="card-tinted p-5 flex flex-col gap-4">
        <h2 className="font-display font-bold text-lg">Submit a payment reference</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Amount (CAD)</span>
            <input data-testid="pay-amount" required type="number" step="0.01" min="0.01" className={input} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Interac reference</span>
            <input data-testid="pay-reference" required className={`${input} font-mono`} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. TX-A1B2C3" />
          </label>
        </div>
        <ImageSourceField
          label="Screenshot"
          optional
          value={form.file}
          onChange={(file) => setForm({ ...form, file })}
          disabled={submitting}
          testid="pay-file"
          uploadInputTestId="pay-file"
          emptyHint="Take a photo or upload your Interac confirmation"
        />
        <button data-testid="pay-submit" disabled={submitting} className="pill-btn btn-primary h-12 disabled:opacity-60 cursor-pointer hover:bg-brand-sageDark">
          {submitting ? "Submitting…" : "Submit payment"}
        </button>
      </form>

      <section>
        <h2 className="font-display font-bold text-xl mb-3">Your submissions</h2>
        <ul className="card-tinted divide-y divide-brand-border overflow-hidden">
          {payments.length === 0 ? (
            <li className="p-6 text-center text-muted-foreground text-sm">No submissions yet.</li>
          ) : payments.map((p) => (
            <li key={p.id} data-testid={`c-pay-${p.id}`} className="p-4 flex items-center gap-3 hover:bg-brand-surface/60 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold">{fmtCAD(p.amount)}</div>
                <div className="text-xs text-muted-foreground truncate">Ref: <span className="font-mono">{p.reference}</span> · {fmtDateTime(p.submitted_at)}</div>
                {p.reject_reason ? <div className="text-xs text-destructive italic mt-0.5">"{p.reject_reason}"</div> : null}
              </div>
              <StatusPill status={p.status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
