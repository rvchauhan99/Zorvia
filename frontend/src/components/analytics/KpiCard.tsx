import { deltaTone, fmtDelta, type KpiValue } from "@/lib/analytics";

type Props = {
  label: string;
  value: string;
  kpi?: KpiValue;
  hint?: string;
  inverseDelta?: boolean;
  testid: string;
};

export function KpiCard({ label, value, kpi, hint, inverseDelta = false, testid }: Props) {
  const tone = deltaTone(kpi, inverseDelta);
  const toneCls =
    tone === "good"
      ? "bg-secondary/10 text-secondary"
      : tone === "bad"
      ? "bg-destructive/10 text-destructive"
      : "bg-brand-surface text-muted-foreground";

  return (
    <div data-testid={testid} className="card-tinted card-tinted-hover p-3 flex flex-col gap-1.5 sm:gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="label-overline">{label}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${toneCls}`} data-testid={`${testid}-delta`}>
          {fmtDelta(kpi)}
        </span>
      </div>
      <div className="font-display font-black text-xl sm:text-2xl leading-none">{value}</div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
