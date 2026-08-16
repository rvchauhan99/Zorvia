"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { UploadSimple, EnvelopeSimple, WhatsappLogo, Trash, ImageSquare } from "@phosphor-icons/react";
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
  const [isDragging, setIsDragging] = useState(false);
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

  async function handleFile(file: File) {
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

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

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

      <div
        className={`card-tinted p-6 flex flex-col gap-5 border-2 border-dashed transition-colors duration-200 ${
          isDragging ? "border-primary bg-primary/5" : "border-brand-border/80"
        }`}
        data-testid="menu-upload-section"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl text-neutral-900">Upload menu</h2>
            <p className="text-sm text-muted-foreground mt-1">JPEG, PNG, or WebP · max 5MB · becomes the current menu for customers</p>
          </div>
          <label className="flex flex-col gap-1.5 w-full sm:w-64 shrink-0">
            <span className="label-overline text-muted-foreground/80">Label (optional)</span>
            <input
              data-testid="menu-label-input"
              className="w-full rounded-xl border border-brand-border bg-white px-3 h-11 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="e.g. Jul 21 or Weekend special"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
        </div>
        
        <div className="flex flex-col items-center justify-center p-6 border border-brand-border/50 rounded-2xl bg-white/50 border-dashed min-h-[140px]">
          <div className="p-3 bg-brand-surface rounded-full mb-3 text-primary">
            <UploadSimple size={24} />
          </div>
          <p className="text-sm font-medium mb-1">Drag and drop your image here</p>
          <p className="text-xs text-muted-foreground mb-4">or click to browse from your device</p>
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
              className="pill-btn btn-primary shadow-sm hover:-translate-y-0.5 transition-transform h-11 px-6 cursor-pointer disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {uploading ? "Uploading…" : "Browse files"}
            </button>
          </div>
        </div>
      </div>

      {current && (
        <div className="card-tinted p-5 sm:p-6 flex flex-col gap-5 border border-brand-border" data-testid="menu-current-section">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                <ImageSquare size={20} weight="duotone" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg sm:text-xl text-neutral-900">Current menu</h2>
                <p className="text-sm text-muted-foreground mt-0.5" data-testid="menu-current-label">
                  {current.label || "Active menu shown to customers"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="menu-notify-email"
                disabled={busyId === current.id + ":email"}
                onClick={() => void notifyEmail(current)}
                className="pill-btn btn-outline gap-2 h-10 text-sm cursor-pointer hover:bg-brand-surface hover:border-brand-border/80 transition-colors"
              >
                <EnvelopeSimple size={16} />
                Notify by email
              </button>
              {waEnabled ? (
                <button
                  type="button"
                  data-testid="menu-share-whatsapp"
                  disabled={busyId === current.id + ":wa" || alreadyShared(current)}
                  onClick={() => void shareWhatsApp(current)}
                  className="pill-btn btn-primary gap-2 h-10 text-sm cursor-pointer shadow-sm disabled:opacity-60 hover:-translate-y-0.5 transition-transform disabled:hover:translate-y-0"
                >
                  <WhatsappLogo size={16} />
                  {alreadyShared(current) ? "WhatsApp shared" : "Share via WhatsApp"}
                </button>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => openViewer(current)}
            className="group relative block w-full cursor-pointer rounded-2xl border border-brand-border bg-brand-surface/30 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300"
            aria-label={`View full menu image: ${current.label || "Current menu"}`}
          >
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors z-10 pointer-events-none flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm text-neutral-900 px-4 py-2 rounded-full font-medium shadow-lg transform translate-y-4 group-hover:translate-y-0 duration-300 ease-out">
                Click to enlarge
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.image_url}
              alt={current.label}
              data-testid="menu-current-image"
              className="w-full max-h-[500px] object-contain group-hover:scale-[1.01] transition-transform duration-500"
            />
          </button>
        </div>
      )}

      <div className="card-tinted p-4 sm:p-6 flex flex-col gap-5 border border-brand-border/60" data-testid="menu-history-section">
        <div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-neutral-900">History</h2>
          <p className="text-sm text-muted-foreground mt-1">Previous uploads. The newest is always the current menu for customers.</p>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : menus.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="menu-empty">
            No menus yet. Upload your first menu above.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3">
            {menus.map((m) => (
              <li
                key={m.id}
                data-testid={`menu-row-${m.id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 py-3 bg-white border border-brand-border/60 rounded-xl hover:-translate-y-[2px] hover:shadow-md transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => openViewer(m)}
                  className="shrink-0 cursor-pointer rounded-lg border border-brand-border/60 p-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm group"
                  aria-label={`View full menu image: ${m.label || "Menu"}`}
                  data-testid={`menu-history-thumb-${m.id}`}
                >
                  <div className="relative w-16 h-16">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.image_url} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                </button>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-neutral-900 truncate">{m.label || "Untitled"}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">
                    {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                    {m.share_status ? ` · ${m.share_status}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid={`menu-email-${m.id}`}
                    className="pill-btn btn-outline gap-1.5 h-9 text-xs cursor-pointer hover:bg-brand-surface transition-colors"
                    onClick={() => void notifyEmail(m)}
                  >
                    <EnvelopeSimple size={14} /> Email
                  </button>
                  {waEnabled ? (
                    <button
                      type="button"
                      data-testid={`menu-wa-${m.id}`}
                      className="pill-btn btn-outline gap-1.5 h-9 text-xs cursor-pointer disabled:opacity-60 hover:bg-brand-surface transition-colors"
                      disabled={alreadyShared(m)}
                      onClick={() => void shareWhatsApp(m)}
                    >
                      <WhatsappLogo size={14} /> {alreadyShared(m) ? "Shared" : "WhatsApp"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    data-testid={`menu-delete-${m.id}`}
                    className="icon-btn icon-btn-danger ml-1"
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
