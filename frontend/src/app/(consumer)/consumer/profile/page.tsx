"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtCAD, WEEKDAYS, todayISO } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { SignOut, DownloadSimple } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ImageSourceField from "@/components/ImageSourceField";
import { PageLoader } from "@/components/loaders";
import { scheduleSummaryLabel } from "@/components/MealScheduleFields";
import { CA_PROVINCES } from "@/lib/ca-provinces";
import SearchableSelect from "@/components/SearchableSelect";

function toCSV(rows: any[]) {
  if (!rows || !rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r[k])).join(","))].join("\n");
}

export default function ConsumerProfile() {
  const [me, setMe] = useState<any>(null);
  const [form, setForm] = useState({
    phone: "", address: "", apartment: "", city: "", province: "ON", postal_code: "", delivery_days: [] as number[],
  });
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const { logout } = useAuth();
  const router = useRouter();
  const input = "h-11 w-full px-4 rounded-xl bg-white border border-brand-border focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all";

  async function load() {
    const [{ data }, { data: me }] = await Promise.all([
      api.get("/consumer/me"),
      api.get("/auth/me"),
    ]);
    setMe(data);
    setHasPassword(!!me?.has_password);
    const c = data.customer || {};
    setForm({
      phone: c.phone || "",
      address: c.address || "",
      apartment: c.apartment || "",
      city: c.city || "",
      province: c.province || "ON",
      postal_code: c.postal_code || "",
      delivery_days: c.delivery_days || [],
    });
  }

  useEffect(() => { load(); }, []);

  function toggleDay(i: number) {
    setForm((f) => ({
      ...f,
      delivery_days: f.delivery_days.includes(i)
        ? f.delivery_days.filter((d) => d !== i)
        : [...f.delivery_days, i],
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch("/consumer/me/profile", {
        phone: form.phone,
        address: form.address,
        apartment: form.apartment,
        city: form.city,
        province: form.province,
        postal_code: form.postal_code,
        delivery_days: form.delivery_days,
      });
      toast.success("Profile updated");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarPick(file: File | null) {
    if (!file) return;
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post("/consumer/me/avatar", fd);
      toast.success("Profile picture updated");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    try {
      await api.delete("/consumer/me/avatar");
      toast.success("Profile picture removed");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    setPwBusy(true);
    try {
      const body: { new_password: string; current_password?: string } = {
        new_password: pwForm.new_password,
      };
      if (hasPassword) body.current_password = pwForm.current_password;
      await api.post("/auth/change-password", body);
      toast.success(hasPassword ? "Password updated" : "Password set — you can sign in with email too");
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      setHasPassword(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to change password");
    } finally {
      setPwBusy(false);
    }
  }

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

  if (!me) return <PageLoader testid="consumer-profile-loader" />;
  const c = me.customer || {};

  return (
    <div className="flex flex-col gap-3 animate-fade-in-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="label-overline">Account</span>
          <h1 className="font-display font-black text-xl sm:text-2xl mt-1">Profile</h1>
        </div>
        <button
          data-testid="download-statement"
          onClick={downloadStatement}
          className="pill-btn btn-outline gap-2 shrink-0 cursor-pointer hover:bg-brand-surface"
        >
          <DownloadSimple size={16} /> Statement
        </button>
      </div>

      <div className="card-tinted p-4 flex flex-col gap-3" data-testid="avatar-section">
        <ImageSourceField
          label="Profile picture"
          optional
          onChange={onAvatarPick}
          disabled={avatarBusy}
          testid="avatar"
          uploadInputTestId="avatar-input"
          previewShape="circle"
          remotePreviewUrl={c.avatar_url || null}
          showClear={false}
        />
        {c.avatar_url ? (
          <button type="button" data-testid="avatar-remove" disabled={avatarBusy} onClick={removeAvatar} className="text-sm text-destructive hover:underline cursor-pointer text-left disabled:opacity-60 self-start">
            Remove photo
          </button>
        ) : null}
      </div>

      <form onSubmit={save} className="card-tinted p-4 flex flex-col gap-3">
        <div>
          <div className="label-overline">Name</div>
          <div className="font-medium">{c.name}</div>
        </div>
        <div>
          <div className="label-overline">Email</div>
          <div className="text-sm break-all">{c.email || me.account.email}</div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Phone</span>
          <input data-testid="profile-phone" className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Street address</span>
          <input data-testid="profile-address" className={input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Apartment</span>
            <input data-testid="profile-apt" className={input} value={form.apartment} onChange={(e) => setForm({ ...form, apartment: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">City</span>
            <input data-testid="profile-city" className={input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Province</span>
            <SearchableSelect
              testid="profile-province"
              inputClassName={input}
              value={form.province || "ON"}
              onChange={(v) => setForm({ ...form, province: v })}
              options={CA_PROVINCES.map((p) => ({ value: p.code, label: `${p.code} — ${p.name}` }))}
              placeholder="Search province…"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Postal code</span>
            <input data-testid="profile-postal" className={`${input} uppercase`} value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value.toUpperCase() })} />
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <span className="label-overline">Delivery days</span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => {
              const on = form.delivery_days.includes(d.i);
              return (
                <button
                  type="button"
                  key={d.i}
                  data-testid={`profile-day-${d.s}`}
                  onClick={() => toggleDay(d.i)}
                  className={`px-4 h-11 min-h-[44px] rounded-full border text-sm font-medium cursor-pointer transition-colors ${
                    on ? "bg-primary text-primary-foreground border-primary" : "bg-white border-brand-border text-foreground hover:bg-brand-surface"
                  }`}
                >
                  {d.s}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label-overline">Price per meal</div>
            <div className="font-medium">{fmtCAD(c.meal_price)} <span className="text-sm text-muted-foreground font-normal">{scheduleSummaryLabel(c.meal_schedule)}</span></div>
          </div>
          <div>
            <div className="label-overline">Provider</div>
            <div className="font-medium">{me.provider?.name}</div>
          </div>
        </div>
        <button data-testid="profile-save" type="submit" disabled={saving} className="pill-btn btn-primary h-12 disabled:opacity-60 cursor-pointer">
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>

      <form onSubmit={changePassword} className="card-tinted p-4 flex flex-col gap-3" data-testid="change-password-section">
        <h2 className="font-display font-bold text-xl">{hasPassword ? "Change password" : "Set password"}</h2>
        {!hasPassword ? (
          <p className="text-sm text-muted-foreground">You signed in with Google. Set a password to also use email login.</p>
        ) : null}
        {hasPassword ? (
          <label className="flex flex-col gap-1.5">
            <span className="label-overline">Current password</span>
            <input data-testid="pw-current" type="password" required className={input} value={pwForm.current_password} onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} />
          </label>
        ) : null}
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">New password</span>
          <input data-testid="pw-new" type="password" required minLength={6} className={input} value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Confirm new password</span>
          <input data-testid="pw-confirm" type="password" required minLength={6} className={input} value={pwForm.confirm_password} onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })} />
        </label>
        <button data-testid="pw-submit" type="submit" disabled={pwBusy} className="pill-btn btn-outline h-11 cursor-pointer disabled:opacity-60">
          {pwBusy ? (hasPassword ? "Updating…" : "Setting…") : (hasPassword ? "Update password" : "Set password")}
        </button>
      </form>

      <button data-testid="profile-logout" onClick={() => { void logout().then(() => router.push("/login")); }} className="pill-btn btn-outline-danger gap-2 self-start cursor-pointer">
        <SignOut size={16} /> Sign out
      </button>
    </div>
  );
}
