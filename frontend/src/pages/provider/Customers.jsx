import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, MagnifyingGlass, PencilSimple, Trash, PauseCircle, PlayCircle, CheckCircle } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { fmtCAD, WEEKDAYS, todayISO } from "@/lib/format";

const empty = {
  name: "", email: "", phone: "", address: "", apartment: "", postal_code: "",
  notes: "", delivery_days: [0,1,2,3,4], meal_price: "",
};

export default function Customers() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [pauseTarget, setPauseTarget] = useState(null);
  const [pauseRange, setPauseRange] = useState({ start: todayISO(), end: todayISO() });

  const input = "h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none";

  async function load() {
    const { data } = await api.get(`/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    setItems(data);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);

  function openCreate() { setEditing(null); setForm(empty); setShowForm(true); }
  function openEdit(c) {
    setEditing(c);
    setForm({
      name: c.name, email: c.email || "", phone: c.phone || "", address: c.address || "",
      apartment: c.apartment || "", postal_code: c.postal_code || "", notes: c.notes || "",
      delivery_days: c.delivery_days || [], meal_price: c.meal_price ?? "",
    });
    setShowForm(true);
  }

  function toggleDay(i) {
    setForm((f) => ({ ...f, delivery_days: f.delivery_days.includes(i) ? f.delivery_days.filter((d) => d !== i) : [...f.delivery_days, i] }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.meal_price === "" || payload.meal_price === null) delete payload.meal_price;
      else payload.meal_price = Number(payload.meal_price);
      if (!payload.email) delete payload.email;
      if (editing) {
        await api.patch(`/customers/${editing.id}`, payload);
        toast.success("Customer updated");
      } else {
        await api.post("/customers", payload);
        toast.success("Customer added");
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(c) {
    if (!window.confirm(`Delete ${c.name}? This cannot be undone.`)) return;
    await api.delete(`/customers/${c.id}`);
    toast.success("Deleted");
    load();
  }

  async function approve(c) {
    await api.post(`/customers/${c.id}/approve`);
    toast.success("Approved");
    load();
  }

  async function submitPause(e) {
    e.preventDefault();
    try {
      await api.post(`/customers/${pauseTarget.id}/pause`, pauseRange);
      toast.success(`${pauseTarget.name} paused`);
      setPauseTarget(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    }
  }

  async function resume(c) {
    await api.post(`/customers/${c.id}/resume`);
    toast.success("Resumed");
    load();
  }

  const isPaused = (c) => (c.pauses || []).some((p) => p.start <= todayISO() && todayISO() <= p.end);

  return (
    <div className="flex flex-col gap-5 animate-fade-in-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="label-overline">CRM</span>
          <h1 className="font-display font-black text-3xl sm:text-4xl mt-1">Customers</h1>
        </div>
        <button data-testid="add-customer-btn" onClick={openCreate} className="pill-btn btn-primary gap-2">
          <Plus size={16} weight="bold" /> Add customer
        </button>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <div className="flex-1 relative">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input data-testid="customers-search" placeholder="Search name, phone, email or postal…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full h-11 pl-9 pr-3 rounded-xl bg-white border border-brand-border outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
      </div>

      <div className="card-tinted overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-surface">
            <tr className="text-left">
              <th className="px-4 py-3 label-overline">Name</th>
              <th className="px-4 py-3 label-overline hidden md:table-cell">Contact</th>
              <th className="px-4 py-3 label-overline hidden lg:table-cell">Days</th>
              <th className="px-4 py-3 label-overline">Price</th>
              <th className="px-4 py-3 label-overline">Outstanding</th>
              <th className="px-4 py-3 label-overline text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {items.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No customers yet. Add your first one to get started.</td></tr>
            ) : items.map((c) => (
              <tr key={c.id} data-testid={`customer-row-${c.id}`} className="hover:bg-brand-surface/60">
                <td className="px-4 py-3">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.address} {c.apartment ? `· ${c.apartment}` : ""}</div>
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {c.pending_approval ? <span className="text-[10px] uppercase tracking-widest bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">Pending approval</span> : null}
                    {isPaused(c) ? <span className="text-[10px] uppercase tracking-widest bg-sky-100 text-sky-900 px-2 py-0.5 rounded-full">Paused</span> : null}
                    {!c.active ? <span className="text-[10px] uppercase tracking-widest bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded-full">Inactive</span> : null}
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                  <div>{c.phone || "—"}</div>
                  <div className="text-xs">{c.email || ""}</div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="flex gap-0.5">
                    {WEEKDAYS.map((d) => (
                      <span key={d.i} className={`w-6 h-6 rounded-full text-[10px] font-medium inline-flex items-center justify-center ${
                        (c.delivery_days || []).includes(d.i) ? "bg-primary text-primary-foreground" : "bg-brand-surface text-muted-foreground"
                      }`}>{d.s[0]}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">{fmtCAD(c.meal_price)}</td>
                <td className={`px-4 py-3 font-semibold ${c.outstanding > 0 ? "text-primary" : "text-muted-foreground"}`}>{fmtCAD(c.outstanding || 0)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end items-center gap-1">
                    {c.pending_approval ? (
                      <button data-testid={`approve-${c.id}`} onClick={() => approve(c)} className="p-2 rounded-full hover:bg-brand-surface text-secondary" title="Approve"><CheckCircle size={18} /></button>
                    ) : null}
                    {isPaused(c) ? (
                      <button data-testid={`resume-${c.id}`} onClick={() => resume(c)} className="p-2 rounded-full hover:bg-brand-surface text-secondary" title="Resume"><PlayCircle size={18} /></button>
                    ) : (
                      <button data-testid={`pause-${c.id}`} onClick={() => setPauseTarget(c)} className="p-2 rounded-full hover:bg-brand-surface" title="Pause"><PauseCircle size={18} /></button>
                    )}
                    <button data-testid={`edit-${c.id}`} onClick={() => openEdit(c)} className="p-2 rounded-full hover:bg-brand-surface" title="Edit"><PencilSimple size={18} /></button>
                    <button data-testid={`delete-${c.id}`} onClick={() => remove(c)} className="p-2 rounded-full hover:bg-brand-surface text-destructive" title="Delete"><Trash size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit form */}
      {showForm ? (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-2xl">{editing ? "Edit customer" : "Add customer"}</h3>
              <button type="button" data-testid="close-customer-form" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Name</span>
                <input required data-testid="cf-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Phone</span>
                <input data-testid="cf-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Email</span>
                <input type="email" data-testid="cf-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Meal price (CAD)</span>
                <input type="number" step="0.5" data-testid="cf-price" value={form.meal_price} onChange={(e) => setForm({ ...form, meal_price: e.target.value })} className={input} placeholder="Uses default if empty" />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="label-overline">Address</span>
                <input data-testid="cf-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Apartment</span>
                <input data-testid="cf-apt" value={form.apartment} onChange={(e) => setForm({ ...form, apartment: e.target.value })} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-overline">Postal code</span>
                <input data-testid="cf-postal" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value.toUpperCase() })} className={`${input} uppercase`} />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="label-overline">Notes</span>
                <textarea data-testid="cf-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-[70px] px-4 py-3 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" placeholder="Dietary preferences, gate code, etc." />
              </label>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <span className="label-overline">Delivery days</span>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => {
                    const on = form.delivery_days.includes(d.i);
                    return (
                      <button
                        type="button"
                        key={d.i}
                        data-testid={`cf-day-${d.s}`}
                        onClick={() => toggleDay(d.i)}
                        className={`px-4 h-10 rounded-full border text-sm font-medium ${on ? "bg-primary text-primary-foreground border-primary" : "bg-white border-brand-border text-foreground hover:bg-brand-surface"}`}
                      >
                        {d.s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <button data-testid="cf-save" disabled={saving} className="pill-btn btn-primary h-12 disabled:opacity-60">
              {saving ? "Saving..." : (editing ? "Save changes" : "Add customer")}
            </button>
          </form>
        </div>
      ) : null}

      {/* Pause modal */}
      {pauseTarget ? (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setPauseTarget(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submitPause} className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 flex flex-col gap-4">
            <h3 className="font-display font-bold text-2xl">Pause {pauseTarget.name}</h3>
            <p className="text-sm text-muted-foreground">Deliveries during this range will be skipped and no outstanding will accrue.</p>
            <label className="flex flex-col gap-1.5">
              <span className="label-overline">From</span>
              <input required type="date" data-testid="pause-start" value={pauseRange.start} onChange={(e) => setPauseRange({ ...pauseRange, start: e.target.value })} className={input} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label-overline">To</span>
              <input required type="date" data-testid="pause-end" value={pauseRange.end} onChange={(e) => setPauseRange({ ...pauseRange, end: e.target.value })} className={input} />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPauseTarget(null)} className="pill-btn btn-outline flex-1">Cancel</button>
              <button data-testid="pause-confirm" className="pill-btn btn-primary flex-1">Confirm pause</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
