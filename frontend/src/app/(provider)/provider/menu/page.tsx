"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ForkKnife, UploadSimple, EnvelopeSimple, WhatsappLogo, Trash } from "@phosphor-icons/react";

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

export default function ProviderMenuPage() {
  const [menus, setMenus] = useState<MenuDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/menus");
      setMenus(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load menus");
      setMenus([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
    setBusyId(menu.id + ":wa");
    try {
      const { data } = await api.post(`/menus/${menu.id}/share`);
      if (data.message) {
        toast.message(data.message);
      } else {
        toast.success(`WhatsApp: ${data.sent} sent` + (data.failed ? `, ${data.failed} failed` : ""));
      }
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "WhatsApp share failed");
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
    <div className="flex flex-col gap-4 sm:gap-5 animate-fade-in-up" data-testid="provider-menu-page">
      <div>
        <span className="label-overline">Kitchen</span>
        <h1 className="font-display font-black text-2xl sm:text-3xl mt-0.5 sm:mt-1 flex items-center gap-2">
          <ForkKnife size={28} weight="duotone" className="text-primary" />
          Weekly menu
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a menu image, show it in the customer app, then notify by email and WhatsApp.
        </p>
      </div>

      <div className="card-tinted p-4 sm:p-6 flex flex-col gap-4" data-testid="menu-upload-section">
        <div>
          <h2 className="font-display font-bold text-lg sm:text-xl">Upload menu</h2>
          <p className="text-sm text-muted-foreground mt-1">JPEG, PNG, or WebP · max 5MB</p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Label (optional)</span>
          <input
            data-testid="menu-label-input"
            className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm"
            placeholder="Week of Jul 21"
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
              <button
                type="button"
                data-testid="menu-share-whatsapp"
                disabled={busyId === current.id + ":wa"}
                onClick={() => void shareWhatsApp(current)}
                className="pill-btn btn-primary gap-2 h-11 cursor-pointer"
              >
                <WhatsappLogo size={18} />
                Share via WhatsApp
              </button>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.image_url}
            alt={current.label}
            data-testid="menu-current-image"
            className="w-full max-h-[480px] object-contain rounded-xl border border-brand-border bg-white"
          />
        </div>
      )}

      <div className="card-tinted p-4 sm:p-6 flex flex-col gap-3" data-testid="menu-history-section">
        <h2 className="font-display font-bold text-lg sm:text-xl">History</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : menus.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="menu-empty">
            No menus yet. Upload your first weekly menu above.
          </p>
        ) : (
          <ul className="divide-y divide-brand-border border border-brand-border rounded-xl overflow-hidden">
            {menus.map((m) => (
              <li
                key={m.id}
                data-testid={`menu-row-${m.id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.image_url} alt="" className="h-16 w-16 object-cover rounded-lg border border-brand-border shrink-0" />
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
                  <button
                    type="button"
                    data-testid={`menu-wa-${m.id}`}
                    className="pill-btn btn-outline gap-1.5 h-9 text-xs cursor-pointer"
                    onClick={() => void shareWhatsApp(m)}
                  >
                    <WhatsappLogo size={14} /> WhatsApp
                  </button>
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
    </div>
  );
}
