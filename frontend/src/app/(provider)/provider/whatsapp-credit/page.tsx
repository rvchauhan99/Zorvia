"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { fmtCAD } from "@/lib/format";
import { toast } from "sonner";
import { Copy, WhatsappLogo, Warning } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin } from "@/lib/roles";
import ImageSourceField from "@/components/ImageSourceField";
import { fetchWhatsappFeaturesEnabled } from "@/lib/whatsapp-features";

function errDetail(err: any, fallback: string): string {
  const d = err?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (d && typeof d === "object" && d.message) return String(d.message);
  return fallback;
}

export default function WhatsAppCreditPage() {
  const [data, setData] = useState<any>(null);
  const [amount, setAmount] = useState<number>(100);
  const [reference, setReference] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const { session, ready } = useAuth();

  const load = useCallback(async () => {
    const { data: billing } = await api.get("/providers/me/whatsapp-billing");
    setData(billing);
    const pkgs: number[] = billing?.packages_cad || [25, 50, 100];
    if (pkgs.includes(100)) setAmount(100);
    else if (pkgs.length) setAmount(pkgs[pkgs.length - 1]);
    return billing;
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!canMutateAdmin(session)) {
      router.replace("/provider");
      return;
    }
    let cancelled = false;
    (async () => {
      const enabled = await fetchWhatsappFeaturesEnabled();
      if (cancelled) return;
      if (!enabled) {
        router.replace("/provider/menu");
        return;
      }
      setChecking(false);
      load().catch(() => toast.error("Failed to load WhatsApp credit"));
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, session, router, load]);

  if (checking) {
    return (
      <div className="p-8 text-sm text-muted-foreground" data-testid="wa-credit-loading">
        Loading…
      </div>
    );
  }

  async function submitTopUp() {
    const ref = reference.trim();
    if (!ref) {
      toast.error("Interac reference is required");
      return;
    }
    if (!data?.platform_interac_email) {
      toast.error("Interac top-up is not configured yet. Contact MealHQ support.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("amount", String(amount));
      fd.append("reference", ref);
      if (screenshot) fd.append("screenshot", screenshot);
      await api.post("/providers/me/whatsapp-billing/top-up", fd);
      toast.success("Top-up submitted — credit is added after MealHQ verifies payment");
      setReference("");
      setScreenshot(null);
      await load();
    } catch (e: any) {
      toast.error(errDetail(e, "Top-up failed"));
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="p-8 text-sm text-muted-foreground" data-testid="wa-credit-loading">
        Loading…
      </div>
    );
  }

  const pending = data.pending_purchase;
  const packages: number[] = data.packages_cad || [25, 50, 100];

  return (
    <div className="flex flex-col gap-4 sm:gap-5 animate-fade-in-up" data-testid="wa-credit-page">
      <div>
        <span className="label-overline">Billing</span>
        <h1 className="font-display font-black text-2xl sm:text-3xl mt-0.5 sm:mt-1 flex items-center gap-2">
          <WhatsappLogo size={28} weight="duotone" className="text-primary" />
          WhatsApp credit
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prepaid credit for menu WhatsApp shares — separate from your MealHQ subscription. CAD{" "}
          {Number(data.cost_per_msg_cad || 0).toFixed(2)} per successful message.
        </p>
      </div>

      <div className="card-tinted p-4 sm:p-6" data-testid="wa-credit-balance">
        <div className="label-overline">Balance</div>
        <div className="font-display font-black text-3xl mt-1">{fmtCAD(data.balance_cad || 0)}</div>
        {data.low_balance ? (
          <p className="text-sm text-amber-800 mt-2 flex items-start gap-2">
            <Warning size={18} className="shrink-0 mt-0.5" />
            Balance is low. Top up before your next WhatsApp share.
          </p>
        ) : null}
        <Link href="/provider/menu" className="text-sm text-primary hover:underline mt-3 inline-block">
          ← Back to Menu
        </Link>
      </div>

      {pending ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
          data-testid="wa-credit-pending"
        >
          Top-up of {fmtCAD(pending.amount)} is pending review (ref{" "}
          <span className="font-mono">{pending.reference}</span>). Credit is added after approval.
        </div>
      ) : null}

      {data.platform_interac_email ? (
        <div className="card-tinted p-4 sm:p-5" data-testid="wa-credit-interac">
          <div className="label-overline">Pay via Interac e-Transfer</div>
          <div className="font-display font-bold text-lg mt-1">
            {data.platform_interac_name || "MealHQ"}
          </div>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-2 h-11 px-3 rounded-xl bg-white border border-brand-border text-sm font-mono cursor-pointer hover:bg-brand-surface"
            onClick={() => {
              void navigator.clipboard.writeText(data.platform_interac_email);
              toast.success("Copied Interac email");
            }}
          >
            {data.platform_interac_email}
            <Copy size={16} />
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            Send the package amount, then submit your Interac reference below. Credit is not added
            until MealHQ verifies payment.
          </p>
        </div>
      ) : (
        <div className="card-tinted p-4 text-sm text-muted-foreground">
          Interac top-up is not configured. Contact MealHQ support to add WhatsApp credit.
        </div>
      )}

      <div className="card-tinted p-4 sm:p-6 flex flex-col gap-4" data-testid="wa-credit-topup-form">
        <div>
          <h2 className="font-display font-bold text-lg">Top up</h2>
          <p className="text-sm text-muted-foreground mt-1">Recommended package: CAD 100.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {packages.map((p) => (
            <button
              key={p}
              type="button"
              data-testid={`wa-package-${p}`}
              disabled={!!pending || busy}
              onClick={() => setAmount(p)}
              className={`h-11 px-4 rounded-full text-sm font-semibold border cursor-pointer disabled:opacity-50 ${
                amount === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white border-brand-border"
              }`}
            >
              {fmtCAD(p)}
              {p === 100 ? " · recommended" : ""}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="label-overline">Interac reference</span>
          <input
            data-testid="wa-credit-reference"
            className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm font-mono"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={!!pending || busy || !data.platform_interac_email}
            placeholder="e-Transfer reference"
          />
        </label>
        <ImageSourceField
          label="Screenshot"
          optional
          value={screenshot}
          onChange={setScreenshot}
          disabled={!!pending || busy || !data.platform_interac_email}
        />
        <button
          type="button"
          data-testid="wa-credit-submit"
          disabled={!!pending || busy || !data.platform_interac_email}
          onClick={() => void submitTopUp()}
          className="pill-btn btn-primary h-12 w-full disabled:opacity-60 cursor-pointer"
        >
          {busy ? "Submitting…" : `Submit · ${fmtCAD(amount)}`}
        </button>
      </div>

      {(data.recent_ledger || []).length > 0 ? (
        <div className="card-tinted p-4 sm:p-6" data-testid="wa-credit-ledger">
          <h2 className="font-display font-bold text-lg mb-3">Recent activity</h2>
          <ul className="divide-y divide-brand-border border border-brand-border rounded-xl overflow-hidden">
            {data.recent_ledger.map((row: any) => (
              <li key={row.id} className="px-4 py-3 bg-white flex justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium capitalize">{row.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
                    {row.note ? ` · ${row.note}` : ""}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={row.amount_cad >= 0 ? "text-emerald-700" : "text-neutral-800"}>
                    {row.amount_cad >= 0 ? "+" : ""}
                    {fmtCAD(row.amount_cad)}
                  </div>
                  <div className="text-xs text-muted-foreground">bal {fmtCAD(row.balance_after)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
