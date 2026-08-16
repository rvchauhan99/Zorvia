"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { UploadSimple, EnvelopeSimple, WhatsappLogo, Trash } from "@phosphor-icons/react";
import MenuImageLightbox from "@/components/MenuImageLightbox";
import Link from "next/link";

type MenuDoc = {
  id: string;
  image_url: string;
  label: string;
  created_at?: string;
  emailed_at?: string | null;
  shared_at?: string | null;
  share_status?: string;
  share_stats?: Record<string, number | boolean>;
};

type Viewing = { url: string; label: string };

type WaBilling = {
  balance_cad: number;
  cost_per_msg_cad: number;
  low_balance?: boolean;
};

function errDetail(err: any, fallback: string): string {
  const d = err?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (d && typeof d === "object" && d.message) return String(d.message);
  return fallback;
}

function alreadyShared(menu: MenuDoc): boolean {
  const sent = Number(menu.share_stats?.wa_sent || 0);
  return menu.share_status === "shared" && sent > 0;
}

export default function PosterTab({
  waEnabled,
  weeklyInUse = false,
}: {
  waEnabled: boolean;
  weeklyInUse?: boolean;
}) {
  const [menus, setMenus] = useState<MenuDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const [waBilling, setWaBilling] = useState<WaBilling | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data }, billingRes] = await Promise.all([
        api.get("/menus"),
        waEnabled
          ? api.get("/providers/me/whatsapp-billing").catch(() => null)
          : Promise.resolve(null),
      ]);
      setMenus(Array.isArray(data) ? data : []);
      if (billingRes?.data) {
        setWaBilling({
          balance_cad: Number(billingRes.data.balance_cad || 0),
          cost_per_msg_cad: Number(billingRes.data.cost_per_msg_cad || 0.1),
          low_balance: !!billingRes.data.low_balance,
        });
      } else {
        setWaBilling(null);
      }
    } catch {
      toast.error("Failed to load menus");
      setMenus([]);
    } finally {
      setLoading(false);
    }
  }, [waEnabled]);

  useEffect(() => {
    void load();
  }, [load]);

  function openViewer(menu: MenuDoc) {
    if (!menu.image_url) return;
    setViewing({ url: menu.image_url, label: menu.label || "Menu" });
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (label.trim()) fd.append("label", label.trim());
      const { data } = await api.post("/menus", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Menu uploaded");
      setLabel("");
      if (fileRef.current) fileRef.current.value = "";
      setMenus((prev) => [data, ...prev.filter((m) => m.id !== data.id)]);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function notifyEmail(menu: MenuDoc) {
    setBusyId(menu.id + ":email");
    try {
      const { data } = await api.post(`/menus/${menu.id}/notify`);
      toast.success(`Email: ${data.sent} sent` + (data.failed ? `, ${data.failed} failed` : ""));
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Email notify failed");
    } finally {
      setBusyId(null);
    }
  }

  async function shareWhatsApp(menu: MenuDoc) {
    if (alreadyShared(menu)) {
      toast.message("WhatsApp was already shared for this menu (one share per menu)");
      return;
    }
    setBusyId(menu.id + ":wa");
    try {
      const { data } = await api.post(`/menus/${menu.id}/share`);
      if (data.message) {
        toast.message(data.message);
      } else {
        const cost =
          data.usage?.deducted_cad != null ? ` · CAD ${Number(data.usage.deducted_cad).toFixed(2)}` : "";
        toast.success(
          `WhatsApp: ${data.sent} sent` + (data.failed ? `, ${data.failed} failed` : "") + cost,
        );
      }
      await load();
    } catch (err: any) {
      const d = err?.response?.data?.detail;
      if (err?.response?.status === 402 && d?.code === "whatsapp_credit_required") {
        toast.error(
          `Need CAD ${Number(d.estimated_cad || 0).toFixed(2)} credit (balance CAD ${Number(d.balance_cad || 0).toFixed(2)})`,
        );
      } else {
        toast.error(errDetail(err, "WhatsApp share failed"));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function removeMenu(menu: MenuDoc) {
    if (!confirm("Delete this menu?")) return;
    try {
      await api.delete(`/menus/${menu.id}`);
      toast.success("Deleted");
      setMenus((prev) => prev.filter((m) => m.id !== menu.id));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Delete failed");
    }
  }

  const current = menus[0];

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {weeklyInUse ? (
        <p
          className="text-sm rounded-xl border border-brand-border bg-brand-surface px-3 py-2.5"
          data-testid="menu-poster-weekly-note"
        >
          Customers see your weekly dishes in the app. This picture is for email / WhatsApp share
          and history.
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        {waEnabled
          ? "Upload anytime. Customers see the latest menu in the app; notify by email or WhatsApp. Past uploads stay in History. WhatsApp is prepaid (not in your subscription) and can be shared once per menu after a successful send."
          : "Upload anytime. Customers see the latest menu in the app; notify by email. Past uploads stay in History."}
      </p>

      {waEnabled && waBilling ? (
        <div
          className="rounded-xl border border-brand-border bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm"
          data-testid="menu-wa-credit-bar"
        >
          <div>
            <span className="font-medium">WhatsApp credit: </span>
            <span data-testid="menu-wa-balance">CAD {waBilling.balance_cad.toFixed(2)}</span>
            <span className="text-muted-foreground">
              {" "}
              · CAD {waBilling.cost_per_msg_cad.toFixed(2)}/msg
            </span>
            {waBilling.low_balance ? (
              <span className="text-amber-800 ml-2">Low balance</span>
            ) : null}
          </div>
          <Link
            href="/provider/whatsapp-credit"
            className="text-primary font-medium hover:underline"
            data-testid="menu-wa-topup-link"
          >
            Top up credit
          </Link>
        </div>
      ) : null}

      <div className="card-tinted p-4 sm:p-6 flex flex-col gap-4" data-testid="menu-upload-section">
        <div>
          <h2 className="font-display font-bold text-lg sm:text-xl">Upload menu</h2>
          <p className="text-sm text-muted-foreground mt-1">JPEG, PNG, or WebP · max 5MB · becomes the current menu for customers</p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Label (optional)</span>
          <input
            data-testid="menu-label-input"
            className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm"
            placeholder="e.g. Jul 21 or Weekend special"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            ref={fileRef}
            data-testid="menu-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onUpload}
          />
          <button
            type="button"
            data-testid="menu-upload-btn"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="pill-btn btn-primary gap-2 h-11 cursor-pointer disabled:opacity-60"
          >
            <UploadSimple size={18} />
            {uploading ? "Uploading…" : "Choose image"}
          </button>
        </div>
      </div>

      {current && (
        <div className="card-tinted p-4 sm:p-6 flex flex-col gap-4" data-testid="menu-current-section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl">Current menu</h2>
              <p className="text-sm text-muted-foreground mt-1" data-testid="menu-current-label">
                {current.label}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="menu-notify-email"
                disabled={busyId === current.id + ":email"}
                onClick={() => void notifyEmail(current)}
                className="pill-btn btn-outline gap-2 h-11 cursor-pointer"
              >
                <EnvelopeSimple size={18} />
                Notify by email
              </button>
              {waEnabled ? (
                <button
                  type="button"
                  data-testid="menu-share-whatsapp"
                  disabled={busyId === current.id + ":wa" || alreadyShared(current)}
                  onClick={() => void shareWhatsApp(current)}
                  className="pill-btn btn-primary gap-2 h-11 cursor-pointer disabled:opacity-60"
                >
                  <WhatsappLogo size={18} />
                  {alreadyShared(current) ? "WhatsApp shared" : "Share via WhatsApp"}
                </button>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => openViewer(current)}
            className="block w-full cursor-pointer rounded-xl border border-brand-border bg-white p-0 overflow-hidden hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`View full menu image: ${current.label || "Current menu"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.image_url}
              alt={current.label}
              data-testid="menu-current-image"
              className="w-full max-h-[480px] object-contain"
            />
          </button>
        </div>
      )}

      <div className="card-tinted p-4 sm:p-6 flex flex-col gap-3" data-testid="menu-history-section">
        <div>
          <h2 className="font-display font-bold text-lg sm:text-xl">History</h2>
          <p className="text-sm text-muted-foreground mt-1">Previous uploads. The newest is always the current menu for customers.</p>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : menus.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="menu-empty">
            No menus yet. Upload your first menu above.
          </p>
        ) : (
          <ul className="divide-y divide-brand-border border border-brand-border rounded-xl overflow-hidden">
            {menus.map((m) => (
              <li
                key={m.id}
                data-testid={`menu-row-${m.id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-white"
              >
                <button
                  type="button"
                  onClick={() => openViewer(m)}
                  className="shrink-0 cursor-pointer rounded-lg border border-brand-border p-0 overflow-hidden hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`View full menu image: ${m.label || "Menu"}`}
                  data-testid={`menu-history-thumb-${m.id}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.image_url} alt="" className="h-16 w-16 object-cover" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{m.label}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                    {m.share_status ? ` · ${m.share_status}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid={`menu-email-${m.id}`}
                    className="pill-btn btn-outline gap-1.5 h-9 text-xs cursor-pointer"
                    onClick={() => void notifyEmail(m)}
                  >
                    <EnvelopeSimple size={14} /> Email
                  </button>
                  {waEnabled ? (
                    <button
                      type="button"
                      data-testid={`menu-wa-${m.id}`}
                      className="pill-btn btn-outline gap-1.5 h-9 text-xs cursor-pointer disabled:opacity-60"
                      disabled={alreadyShared(m)}
                      onClick={() => void shareWhatsApp(m)}
                    >
                      <WhatsappLogo size={14} /> {alreadyShared(m) ? "Shared" : "WhatsApp"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    data-testid={`menu-delete-${m.id}`}
                    className="icon-btn icon-btn-danger"
                    title="Delete"
                    onClick={() => void removeMenu(m)}
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MenuImageLightbox
        open={!!viewing}
        onClose={() => setViewing(null)}
        src={viewing?.url}
        label={viewing?.label}
      />
    </div>
  );
}
