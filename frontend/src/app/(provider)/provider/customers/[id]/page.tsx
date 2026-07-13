"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, PencilSimple } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin } from "@/lib/roles";
import { fmtCAD, fmtDate, WEEKDAYS, todayISO } from "@/lib/format";
import StatusPill from "@/components/StatusPill";

type Tab = "overview" | "deliveries" | "payments" | "pauses" | "notes";

function tabBtn(active: boolean, label: string, onClick: () => void, testid: string) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className={`px-4 h-10 rounded-full text-sm font-medium border cursor-pointer transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-white border-brand-border hover:bg-brand-surface"
      }`}
    >
      {label}
    </button>
  );
}

export default function CustomerDetail() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { session } = useAuth();
  const canMutate = canMutateAdmin(session);
  const [tab, setTab] = useState<Tab>("overview");
  const [c, setC] = useState<any>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  async function load() {
    try {
      const { data } = await api.get(`/customers/${id}`);
      setC(data);
      setNotesDraft(data.notes || "");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Customer not found");
      router.push("/provider/customers");
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function saveNotes() {
    if (!canMutate) return;
    setSavingNotes(true);
    try {
      await api.patch(`/customers/${id}`, { notes: notesDraft });
      toast.success("Notes saved");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally {
      setSavingNotes(false);
    }
  }

  if (!c) return <div className="text-muted-foreground">Loading…</div>;

  const isPaused = (c.pauses || []).some((p: any) => p.start <= todayISO() && todayISO() <= p.end);

  return (
    <div className="flex flex-col gap-5 animate-fade-in-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href="/provider/customers"
            data-testid="customer-back"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft size={14} /> Customers
          </Link>
          <h1 className="font-display font-black text-3xl sm:text-4xl" data-testid="customer-detail-name">{c.name}</h1>
          <div className="mt-2 flex gap-1 flex-wrap">
            {c.pending_approval ? <span className="text-[10px] uppercase tracking-widest bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">Pending</span> : null}
            {c.rejected ? <span className="text-[10px] uppercase tracking-widest bg-red-100 text-red-900 px-2 py-0.5 rounded-full">Rejected</span> : null}
            {isPaused ? <span className="text-[10px] uppercase tracking-widest bg-sky-100 text-sky-900 px-2 py-0.5 rounded-full">Paused</span> : null}
            {!c.active ? <span className="text-[10px] uppercase tracking-widest bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded-full">Inactive</span> : null}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="label-overline">Outstanding</div>
          <div className={`font-display font-black text-2xl ${c.outstanding > 0 ? "text-primary" : ""}`}>{fmtCAD(c.outstanding || 0)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabBtn(tab === "overview", "Overview", () => setTab("overview"), "ctab-overview")}
        {tabBtn(tab === "deliveries", "Deliveries", () => setTab("deliveries"), "ctab-deliveries")}
        {tabBtn(tab === "payments", "Payments", () => setTab("payments"), "ctab-payments")}
        {tabBtn(tab === "pauses", "Pauses", () => setTab("pauses"), "ctab-pauses")}
        {tabBtn(tab === "notes", "Notes", () => setTab("notes"), "ctab-notes")}
      </div>

      {tab === "overview" ? (
        <div className="card-tinted p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="label-overline">Phone</div>
            <div className="text-sm">{c.phone || "—"}</div>
          </div>
          <div>
            <div className="label-overline">Email</div>
            <div className="text-sm break-all">{c.email || "—"}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="label-overline">Address</div>
            <div className="text-sm">{c.address}{c.apartment ? `, ${c.apartment}` : ""}{c.postal_code ? ` · ${c.postal_code}` : ""}</div>
          </div>
          <div>
            <div className="label-overline">Meal price</div>
            <div className="font-medium">{fmtCAD(c.meal_price)}</div>
          </div>
          <div>
            <div className="label-overline">Delivery sequence</div>
            <div className="font-medium font-mono">{c.delivery_sequence != null ? c.delivery_sequence : "—"}</div>
          </div>
          <div>
            <div className="label-overline">Assigned driver</div>
            <div className="text-sm">{c.driver_name || "Unassigned"}</div>
          </div>
          <div>
            <div className="label-overline">Delivery days</div>
            <div className="flex gap-0.5 mt-1">
              {WEEKDAYS.map((d) => (
                <span
                  key={d.i}
                  className={`w-7 h-7 rounded-full text-[10px] font-medium inline-flex items-center justify-center ${
                    (c.delivery_days || []).includes(d.i) ? "bg-primary text-primary-foreground" : "bg-brand-surface text-muted-foreground"
                  }`}
                >
                  {d.s[0]}
                </span>
              ))}
            </div>
          </div>
          {c.reject_reason ? (
            <div className="sm:col-span-2">
              <div className="label-overline">Reject reason</div>
              <div className="text-sm">{c.reject_reason}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "deliveries" ? (
        <div className="card-tinted overflow-hidden">
          <ul className="divide-y divide-brand-border">
            {(c.deliveries || []).length === 0 ? (
              <li className="p-6 text-center text-sm text-muted-foreground">No deliveries yet.</li>
            ) : (
              (c.deliveries || []).map((d: any) => (
                <li key={d.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-medium">{fmtDate(d.delivery_date)}</div>
                    <div className="text-xs text-muted-foreground">{fmtCAD(d.meal_price)}</div>
                  </div>
                  <StatusPill status={d.status} />
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {tab === "payments" ? (
        <div className="card-tinted overflow-hidden">
          <ul className="divide-y divide-brand-border">
            {(c.payments || []).length === 0 ? (
              <li className="p-6 text-center text-sm text-muted-foreground">No payments yet.</li>
            ) : (
              (c.payments || []).map((p: any) => (
                <li key={p.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{fmtCAD(p.amount)}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{p.reference}</div>
                  </div>
                  <StatusPill status={p.status} />
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {tab === "pauses" ? (
        <div className="card-tinted overflow-hidden">
          <ul className="divide-y divide-brand-border">
            {(c.pauses || []).length === 0 ? (
              <li className="p-6 text-center text-sm text-muted-foreground">No pause windows.</li>
            ) : (
              (c.pauses || []).map((p: any, i: number) => (
                <li key={`${p.start}-${p.end}-${i}`} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{fmtDate(p.start)} → {fmtDate(p.end)}</div>
                    <div className="text-xs text-muted-foreground">{p.start} – {p.end}</div>
                  </div>
                  {p.start <= todayISO() && todayISO() <= p.end ? (
                    <span className="text-[10px] uppercase tracking-widest bg-sky-100 text-sky-900 px-2 py-0.5 rounded-full">Active</span>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {tab === "notes" ? (
        <div className="card-tinted p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <PencilSimple size={16} />
            <span className="font-display font-bold text-lg">Notes</span>
          </div>
          <textarea
            data-testid="customer-notes"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            readOnly={!canMutate}
            disabled={!canMutate}
            className="min-h-[140px] w-full px-4 py-3 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all disabled:opacity-80"
            placeholder="Dietary preferences, gate code, etc."
          />
          {canMutate ? (
            <button
              data-testid="customer-notes-save"
              disabled={savingNotes}
              onClick={saveNotes}
              className="pill-btn btn-primary self-end disabled:opacity-60 cursor-pointer"
            >
              {savingNotes ? "Saving…" : "Save notes"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
