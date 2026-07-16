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
    <div data-testid={testid} className="card-tinted card-tinted-hover p-3.5 sm:p-5 flex flex-col gap-2 sm:gap-3 min-h-[108px] sm:min-h-[132px]">
      <div className="flex items-center justify-between gap-3">
        <span className="label-overline">{label}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneCls}`} data-testid={`${testid}-delta`}>
          {fmtDelta(kpi)}
        </span>
      </div>
      <div className="font-display font-black text-2xl sm:text-3xl leading-none">{value}</div>
      {hint ? <div className="text-xs sm:text-sm text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
