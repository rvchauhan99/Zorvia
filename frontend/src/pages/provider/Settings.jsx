import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function Settings() {
  const [prov, setProv] = useState(null);
  const [saving, setSaving] = useState(false);
  const input = "h-11 px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none";

  useEffect(() => { api.get("/providers/me").then(({ data }) => setProv(data)); }, []);

  if (!prov) return <div className="text-muted-foreground">Loading…</div>;

  function upd(k, v) {
    setProv((p) => ({ ...p, [k]: v }));
  }
  function updSettings(k, v) {
    setProv((p) => ({ ...p, settings: { ...p.settings, [k]: v } }));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        name: prov.name,
        address: prov.address,
        interac_email: prov.interac_email,
        meal_price_default: Number(prov.meal_price_default),
        cutoff_hours: Number(prov.settings?.cutoff_hours),
        timezone: prov.settings?.timezone,
      };
      const { data } = await api.patch("/providers/me", payload);
      setProv(data);
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in-up max-w-3xl">
      <div>
        <span className="label-overline">Configuration</span>
        <h1 className="font-display font-black text-3xl sm:text-4xl mt-1">Settings</h1>
      </div>

      <div className="card-tinted p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="label-overline">Signup code</div>
            <div className="font-mono font-semibold text-lg">{prov.signup_code}</div>
          </div>
          <button data-testid="copy-code-settings" onClick={() => { navigator.clipboard.writeText(prov.signup_code); toast.success("Copied"); }} className="pill-btn btn-outline">Copy</button>
        </div>
        <p className="text-xs text-muted-foreground">Share this with consumers to let them sign themselves up. You approve them from the Customers page.</p>
      </div>

      <div className="card-tinted p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Business name</span>
          <input data-testid="s-name" className={input} value={prov.name || ""} onChange={(e) => upd("name", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Interac payment email</span>
          <input data-testid="s-interac" type="email" className={input} value={prov.interac_email || ""} onChange={(e) => upd("interac_email", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="label-overline">Address</span>
          <input data-testid="s-address" className={input} value={prov.address || ""} onChange={(e) => upd("address", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Default meal price (CAD)</span>
          <input data-testid="s-price" type="number" step="0.5" className={input} value={prov.meal_price_default} onChange={(e) => upd("meal_price_default", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Cancellation cutoff (h)</span>
          <input data-testid="s-cutoff" type="number" className={input} value={prov.settings?.cutoff_hours ?? 4} onChange={(e) => updSettings("cutoff_hours", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Timezone</span>
          <select data-testid="s-tz" className={input} value={prov.settings?.timezone || "America/Toronto"} onChange={(e) => updSettings("timezone", e.target.value)}>
            <option value="America/Toronto">America/Toronto</option>
            <option value="America/Vancouver">America/Vancouver</option>
            <option value="America/Edmonton">America/Edmonton</option>
            <option value="America/Winnipeg">America/Winnipeg</option>
            <option value="America/Halifax">America/Halifax</option>
            <option value="America/St_Johns">America/St_Johns</option>
          </select>
        </label>
        <div className="sm:col-span-2 flex justify-end">
          <button data-testid="s-save" disabled={saving} onClick={save} className="pill-btn btn-primary disabled:opacity-60">
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
