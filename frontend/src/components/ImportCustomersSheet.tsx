"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DownloadSimple, UploadSimple, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import AppSheet from "@/components/AppSheet";
import SearchableSelect from "@/components/SearchableSelect";
import { api } from "@/lib/api";
import {
  IMPORT_POLICY_OPTIONS,
  type ImportBillingPolicy,
  downloadSampleCsv,
  downloadProvinceCityMasterCsv,
  importJobWsUrl,
} from "@/lib/customer-import";

type JobSnapshot = {
  id?: string;
  status?: string;
  total?: number;
  processed?: number;
  created?: number;
  geocoded?: number;
  route_placed?: number;
  route_skipped?: number;
  successes?: { index: number; name: string; id?: string }[];
  errors?: { index: number; error: string }[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onFinished: () => void;
  /** Kitchen Settings default — applied each time the sheet opens. */
  defaultPolicy?: ImportBillingPolicy;
};

function StepCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-brand-border bg-white p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold inline-flex items-center justify-center shrink-0">
          {step}
        </span>
        <h3 className="font-display font-bold text-base text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function ImportCustomersSheet({
  open,
  onClose,
  onFinished,
  defaultPolicy = "per_meal",
}: Props) {
  const [policy, setPolicy] = useState<ImportBillingPolicy>(defaultPolicy);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobSnapshot | null>(null);
  const [uploading, setUploading] = useState(false);
  const [liveNames, setLiveNames] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wasOpenRef = useRef(false);
  const pollFailRef = useRef(0);
  const finishedToastRef = useRef(false);

  const policyMeta = IMPORT_POLICY_OPTIONS.find((p) => p.value === policy);

  function stopWatching() {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    }
  }

  // Reset policy when sheet opens; clear job/watchers only when closing.
  // Do NOT stopWatching on defaultPolicy changes (settings load mid-import).
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setPolicy(defaultPolicy);
      finishedToastRef.current = false;
    }
    if (!open && wasOpenRef.current) {
      stopWatching();
      setJobId(null);
      setJob(null);
      setLiveNames([]);
      setUploading(false);
      pollFailRef.current = 0;
      finishedToastRef.current = false;
    }
    wasOpenRef.current = open;
  }, [open, defaultPolicy]);

  useEffect(() => {
    return () => stopWatching();
  }, []);

  function applySnapshot(snap: JobSnapshot) {
    setJob((prev) => {
      const merged: JobSnapshot = {
        ...(prev || {}),
        ...snap,
        total: snap.total ?? prev?.total,
        processed: snap.processed ?? prev?.processed,
        created: snap.created ?? prev?.created,
        errors: snap.errors ?? prev?.errors,
        successes: snap.successes ?? prev?.successes,
      };
      return merged;
    });
    if (Array.isArray(snap.successes) && snap.successes.length) {
      setLiveNames(snap.successes.slice(-8).map((s) => s.name).filter(Boolean));
    }
  }

  function notifyFinished(status: string, created?: number) {
    if (finishedToastRef.current) return;
    finishedToastRef.current = true;
    if (status === "completed") {
      toast.success(`Imported ${created || 0} customer(s)`);
      onFinished();
    } else if (status === "failed") {
      toast.error("Import failed");
    }
  }

  function startPolling(id: string) {
    if (pollRef.current) return; // already polling
    pollFailRef.current = 0;
    const tick = async () => {
      try {
        const { data } = await api.get(`/customers/import/${id}`);
        pollFailRef.current = 0;
        applySnapshot(data);
        if (data.status === "completed" || data.status === "failed") {
          stopWatching();
          notifyFinished(data.status, data.created);
        }
      } catch {
        pollFailRef.current += 1;
        if (pollFailRef.current >= 8) {
          stopWatching();
          toast.error("Lost connection to import progress — refresh the customer list");
        }
      }
    };
    void tick();
    pollRef.current = window.setInterval(() => void tick(), 700);
  }

  /** Optional live updates; polling is the source of truth. */
  function startWs(id: string) {
    const token = typeof window !== "undefined" ? localStorage.getItem("tiffin_token") || "" : "";
    if (!token) return;
    const url = importJobWsUrl(id, token);
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      return;
    }
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "row_ok" && msg.name) {
          setLiveNames((prev) => [...prev.slice(-7), msg.name]);
          setJob((j) => ({
            ...(j || {}),
            processed: msg.processed ?? j?.processed,
            total: msg.total ?? j?.total,
            created: msg.created ?? j?.created,
            errors: j?.errors,
          }));
        } else if (msg.type === "row_err") {
          setJob((j) => ({
            ...(j || {}),
            processed: msg.processed ?? j?.processed,
            total: msg.total ?? j?.total,
            created: msg.created ?? j?.created,
            errors: [...(j?.errors || []), { index: msg.index, error: msg.error }],
          }));
        } else if (msg.type === "progress" || msg.type === "done") {
          applySnapshot(msg);
          if (msg.type === "done" || msg.status === "completed" || msg.status === "failed") {
            stopWatching();
            notifyFinished(msg.status === "failed" ? "failed" : "completed", msg.created);
          }
        }
      } catch {
        /* ignore bad frames */
      }
    };
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setLiveNames([]);
    setJob(null);
    setJobId(null);
    finishedToastRef.current = false;
    stopWatching();
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("billing_policy", policy);
      const { data } = await api.post("/customers/import", fd, { timeout: 60_000 });
      const id = typeof data?.job_id === "string" ? data.job_id : "";
      if (!id) {
        toast.error("Import started but no job id was returned");
        return;
      }
      setJobId(id);
      setJob({
        id,
        status: "pending",
        total: typeof data.total === "number" ? data.total : 0,
        processed: 0,
        created: 0,
        errors: [],
        successes: [],
      });
      startPolling(id);
      startWs(id);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(
        detail ||
          (err?.code === "ECONNABORTED" ? "Import request timed out" : "Import failed to start"),
      );
    } finally {
      setUploading(false);
    }
  }

  async function downloadErrors() {
    if (!jobId) return;
    try {
      const { data } = await api.get(`/customers/import/${jobId}/errors.csv`, {
        responseType: "blob",
      });
      const blob = new Blob([data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mealhq-import-errors.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Could not download errors");
    }
  }

  const running = job && job.status !== "completed" && job.status !== "failed";
  const done = job?.status === "completed" || job?.status === "failed";
  const errorCount = job?.errors?.length || 0;
  const pct =
    job && job.total
      ? Math.min(100, Math.round(((job.processed || 0) / job.total) * 100))
      : 0;
  const policyLocked = !!jobId && !done;

  return (
    <AppSheet
      open={open}
      onClose={() => {
        if (running) {
          toast.message("Import continues in the background — refresh the list when finished");
        }
        onClose();
      }}
      title="Import customers"
      size="4xl"
      closeTestId="import-customers-sheet-close"
    >
      <div className="flex flex-col gap-5 pb-6" data-testid="import-customers-sheet">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Follow the steps below. Lunch and dinner quantities are separate columns — leave a qty at 0 to
          skip that meal slot.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StepCard step={1} title="Choose billing policy">
            <SearchableSelect
              testid="import-policy"
              value={policy}
              onChange={(v) => setPolicy(v as ImportBillingPolicy)}
              options={IMPORT_POLICY_OPTIONS.map((p) => ({ value: p.value, label: p.label }))}
              placeholder="Select policy…"
              disabled={policyLocked}
            />
            {policyMeta ? (
              <p className="text-xs text-muted-foreground">{policyMeta.hint}</p>
            ) : null}
            <p className="text-xs text-primary font-medium" data-testid="import-policy-matches-settings">
              Matches kitchen Settings by default — you can change it for this import.
            </p>
          </StepCard>

          <StepCard step={2} title="Download sample CSV">
            <p className="text-sm text-muted-foreground">
              Download the template for <span className="font-medium text-foreground">{policyMeta?.label}</span>,
              fill your rows, then save as CSV. Use exact <code className="text-[11px]">province</code> and{" "}
              <code className="text-[11px]">city</code> values from the master list.
            </p>
            <div className="flex flex-wrap gap-2 self-start">
              <button
                type="button"
                data-testid="download-sample-csv"
                onClick={() => {
                  downloadSampleCsv(policy);
                  toast.success("Sample CSV downloaded");
                }}
                className="pill-btn btn-outline h-11 px-4 gap-2 cursor-pointer inline-flex items-center"
              >
                <DownloadSimple size={16} />
                Download {policyMeta?.label || ""} sample
              </button>
              <button
                type="button"
                data-testid="download-province-city-master"
                onClick={() => {
                  downloadProvinceCityMasterCsv();
                  toast.success("Province & city list downloaded");
                }}
                className="pill-btn btn-outline h-11 px-4 gap-2 cursor-pointer inline-flex items-center"
              >
                <DownloadSimple size={16} />
                Download province & city list
              </button>
            </div>
          </StepCard>

          <StepCard step={3} title="Upload filled CSV">
            <button
              type="button"
              data-testid="import-customers-btn"
              disabled={uploading || !!running}
              onClick={() => fileRef.current?.click()}
              className="pill-btn btn-primary h-11 px-5 gap-2 cursor-pointer inline-flex items-center disabled:opacity-60 self-start"
            >
              <UploadSimple size={16} />
              {uploading ? "Starting…" : running ? "Importing…" : "Upload CSV"}
            </button>
            <input
              ref={fileRef}
              data-testid="import-customers-input"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => void onFile(e)}
              disabled={uploading || !!running}
            />
            <div className="rounded-xl border border-brand-border bg-brand-surface/40 px-3 py-3 text-xs text-muted-foreground space-y-1.5 max-h-40 sm:max-h-48 overflow-y-auto">
              <p className="font-medium text-foreground text-sm">CSV tips</p>
              <p>
                <code className="text-[11px]">lunch_qty</code> /{" "}
                <code className="text-[11px]">dinner_qty</code> — 0 or blank turns a slot off; at least one ≥ 1.
              </p>
              <p>
                <code className="text-[11px]">driver_name</code> — required; must match a driver in Settings →
                staff (case-insensitive, e.g. <code className="text-[11px]">Driver1</code> /{" "}
                <code className="text-[11px]">DRIVER1</code>). Stop sequence is applied automatically (best route
                gap).
              </p>
              <p>
                <code className="text-[11px]">meal_type</code> — Settings name or id (case-insensitive:{" "}
                <code className="text-[11px]">Jain</code> / <code className="text-[11px]">jain</code> /{" "}
                <code className="text-[11px]">JAIN</code>). Blank = Regular. Unknown type fails the row.
              </p>
              <p>
                <code className="text-[11px]">city</code> / <code className="text-[11px]">province</code> —
                case-insensitive against the Canada master (
                <code className="text-[11px]">toronto</code> → Toronto,{" "}
                <code className="text-[11px]">ontario</code> → ON). Unknown province fails the row.
              </p>
              <p>
                Phone and email must be unique in this kitchen — a row fails if either already exists (or
                repeats earlier in the same file).
              </p>
              <p>
                Address must geocode successfully (or provide <code className="text-[11px]">lat</code>/
                <code className="text-[11px]">lng</code>). Failed geocode or unknown driver → row error.
              </p>
              {policy === "per_meal" ? (
                <p>
                  <code className="text-[11px]">delivery_days</code> — 0=Mon … 6=Sun, e.g.{" "}
                  <code className="text-[11px]">0,1,2,3,4</code>.
                </p>
              ) : (
                <>
                  <p className="font-medium text-foreground text-sm pt-1">How to fill collection fields</p>
                  <p>
                    <code className="text-[11px]">monthly_plan</code> — required:{" "}
                    <code className="text-[11px]">Mon-Fri</code> or{" "}
                    <code className="text-[11px]">Mon-Sat</code>. Delivery days come from that plan.
                    Plan fee comes from Settings — do not type dollars in the CSV.
                  </p>
                  <p>
                    <code className="text-[11px]">payment_collection_day</code> — day of month (1–31),
                    or leave blank to use kitchen default from Settings.
                  </p>
                  <p>
                    <code className="text-[11px]">last_collection_status</code> —{" "}
                    <code className="text-[11px]">collected</code> = last collection already taken →
                    balance ~$0; next renew on the upcoming collection day.{" "}
                    <code className="text-[11px]">pending</code> (or blank) = last collection still
                    open (this or previous month) → due on that last collection date (overdue if that
                    day already passed).
                  </p>
                </>
              )}
              <p>
                <code className="text-[11px]">joining_date</code> — sample uses{" "}
                <code className="text-[11px]">yyyy-mm-dd</code>; other common date formats are accepted
                on import.
              </p>
              <p>Do not put billing_policy in the file — it is set in step 1.</p>
            </div>
          </StepCard>

          <StepCard step={4} title="Live progress">
            {!job ? (
              <p className="text-sm text-muted-foreground">
                After you upload, progress, successes, and errors appear here.
              </p>
            ) : (
              <div
                className="rounded-xl border border-brand-border bg-brand-surface/30 p-4 flex flex-col gap-3"
                data-testid="import-progress"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-bold text-base">
                    {done
                      ? job.status === "completed"
                        ? "Import complete"
                        : "Import failed"
                      : "Importing…"}
                  </span>
                  <span className="text-sm text-muted-foreground" data-testid="import-progress-counts">
                    {job.processed || 0} / {job.total || 0}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-brand-surface overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${pct}%` }}
                    data-testid="import-progress-bar"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle size={16} weight="fill" />
                    <span data-testid="import-created-count">{job.created || 0} created</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-700">
                    <WarningCircle size={16} weight="fill" />
                    <span data-testid="import-error-count">{errorCount} errors</span>
                  </div>
                </div>
                {liveNames.length ? (
                  <div>
                    <span className="label-overline">Recent successes</span>
                    <ul className="mt-1 text-sm space-y-0.5" data-testid="import-success-list">
                      {liveNames.map((n, i) => (
                        <li key={`${n}-${i}`} className="truncate">
                          {n}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {done && errorCount > 0 ? (
                  <button
                    type="button"
                    data-testid="download-import-errors"
                    onClick={() => void downloadErrors()}
                    className="pill-btn btn-outline h-10 px-4 gap-2 cursor-pointer inline-flex items-center self-start"
                  >
                    <DownloadSimple size={16} />
                    Download error CSV
                  </button>
                ) : null}
                {done && errorCount > 0 && job.errors ? (
                  <div className="max-h-40 overflow-y-auto text-xs space-y-1" data-testid="import-error-list">
                    {job.errors.slice(0, 20).map((e) => (
                      <p key={e.index} className="text-destructive">
                        Row {e.index + 1}: {e.error}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </StepCard>
        </div>
      </div>
    </AppSheet>
  );
}
