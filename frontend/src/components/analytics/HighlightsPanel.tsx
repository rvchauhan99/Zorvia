import Link from "next/link";
import { ArrowRight, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import type { BusinessInsight } from "@/lib/analytics";

const toneMap: Record<BusinessInsight["severity"], string> = {
  success: "border-secondary/25 bg-secondary/10",
  info: "border-primary/20 bg-primary/10",
  warning: "border-brand-amber/35 bg-amber-50",
  danger: "border-destructive/25 bg-destructive/10",
};

export function HighlightsPanel({ highlights }: { highlights: BusinessInsight[] }) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-3" data-testid="analysis-highlights">
      {(highlights || []).slice(0, 3).map((item, idx) => {
        const content = (
          <div className={`rounded-2xl border p-4 sm:p-5 h-full flex flex-col gap-3 ${toneMap[item.severity] || toneMap.info}`}>
            <div className="flex items-start gap-3">
              {item.severity === "success" ? (
                <CheckCircle size={22} weight="fill" className="text-secondary shrink-0" />
              ) : (
                <WarningCircle size={22} weight="fill" className={item.severity === "danger" ? "text-destructive shrink-0" : "text-primary shrink-0"} />
              )}
              <div>
                <h2 className="font-display font-bold text-lg leading-tight">{item.title}</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.body}</p>
              </div>
            </div>
            {item.href ? (
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Review <ArrowRight size={14} />
              </span>
            ) : null}
          </div>
        );

        return item.href ? (
          <Link href={item.href} key={`${item.title}-${idx}`} data-testid={`insight-${idx}`}>
            {content}
          </Link>
        ) : (
          <div key={`${item.title}-${idx}`} data-testid={`insight-${idx}`}>
            {content}
          </div>
        );
      })}
    </section>
  );
}
