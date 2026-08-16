"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ForkKnife } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin } from "@/lib/roles";
import { fetchWhatsappFeaturesEnabled } from "@/lib/whatsapp-features";
import PosterTab from "./_components/PosterTab";
import ItemsTab from "./_components/ItemsTab";
import WeeklyMenuTab from "./_components/WeeklyMenuTab";

type Tab = "poster" | "items" | "plan";

const VALID_TABS: Tab[] = ["poster", "items", "plan"];

const TAB_LABELS: Record<Tab, string> = {
  poster: "Menu picture",
  items: "Items",
  plan: "Weekly menu",
};

function ProviderMenuInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const canMutate = canMutateAdmin(session);
  const [waEnabled, setWaEnabled] = useState(false);
  const [tab, setTab] = useState<Tab>(() => {
    const raw = searchParams.get("tab");
    return VALID_TABS.includes(raw as Tab) ? (raw as Tab) : "poster";
  });
  const [planVersion, setPlanVersion] = useState(0);

  useEffect(() => {
    void fetchWhatsappFeaturesEnabled().then(setWaEnabled);
  }, []);

  useEffect(() => {
    const raw = searchParams.get("tab");
    if (VALID_TABS.includes(raw as Tab)) setTab(raw as Tab);
  }, [searchParams]);

  const selectTab = (next: Tab) => {
    setTab(next);
    router.replace(next === "poster" ? "/provider/menu" : `/provider/menu?tab=${next}`, {
      scroll: false,
    });
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 animate-fade-in-up" data-testid="provider-menu-page">
      <div>
        <span className="label-overline">Kitchen</span>
        <h1 className="font-display font-black text-xl sm:text-2xl mt-0.5 flex items-center gap-2">
          <ForkKnife size={26} weight="duotone" className="text-primary" />
          Menu
        </h1>
      </div>

      <div
        className="flex gap-2 overflow-x-auto snap-x -mx-1 px-1 pb-1"
        role="tablist"
        aria-label="Menu sections"
      >
        {VALID_TABS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            data-testid={`menu-tab-${value}`}
            onClick={() => selectTab(value)}
            className={`snap-start shrink-0 px-3.5 h-11 min-h-[44px] rounded-full text-sm font-medium border cursor-pointer transition-colors ${
              tab === value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white border-brand-border hover:bg-brand-surface"
            }`}
          >
            {TAB_LABELS[value]}
          </button>
        ))}
      </div>

      {tab === "poster" ? <PosterTab waEnabled={waEnabled} /> : null}
      {tab === "items" ? (
        <ItemsTab canMutate={canMutate} onItemsChanged={() => setPlanVersion((v) => v + 1)} />
      ) : null}
      {tab === "plan" ? <WeeklyMenuTab key={planVersion} canMutate={canMutate} /> : null}
    </div>
  );
}

export default function ProviderMenuPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
      <ProviderMenuInner />
    </Suspense>
  );
}
