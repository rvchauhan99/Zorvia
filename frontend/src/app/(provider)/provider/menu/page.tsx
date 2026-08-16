"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ForkKnife } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { canMutateAdmin } from "@/lib/roles";
import { fetchWhatsappFeaturesEnabled } from "@/lib/whatsapp-features";
import { api } from "@/lib/api";
import type { MenuPlan } from "@/lib/menuPlan";
import PosterTab from "./_components/PosterTab";
import ItemsTab from "./_components/ItemsTab";
import WeeklyMenuTab from "./_components/WeeklyMenuTab";

type Tab = "poster" | "items" | "plan";

const ALL_TABS: Tab[] = ["poster", "items", "plan"];

const TAB_LABELS: Record<Tab, string> = {
  poster: "Menu picture",
  items: "Items",
  plan: "Weekly menu",
};

function resolveTab(
  raw: string | null,
  configured: boolean | null,
): Tab {
  const requested = ALL_TABS.includes(raw as Tab) ? (raw as Tab) : null;
  // Poster deep link stays valid even when the chip is hidden (share from Weekly menu).
  if (requested === "poster") return "poster";
  if (requested === "items" || requested === "plan") return requested;
  if (configured === true) return "plan";
  return "poster";
}

function ProviderMenuInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const canMutate = canMutateAdmin(session);
  const [waEnabled, setWaEnabled] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [planVersion, setPlanVersion] = useState(0);
  const [tab, setTab] = useState<Tab>(() => resolveTab(searchParams.get("tab"), null));

  useEffect(() => {
    void fetchWhatsappFeaturesEnabled().then(setWaEnabled);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<MenuPlan>("/menu-plan")
      .then(({ data }) => {
        if (cancelled) return;
        setConfigured(!!data?.configured);
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planVersion]);

  useEffect(() => {
    if (configured === null) return;
    setTab(resolveTab(searchParams.get("tab"), configured));
  }, [searchParams, configured]);

  const visibleTabs = useMemo<Tab[]>(() => {
    // Until we know configured, omit Menu picture so planned kitchens do not flash it.
    if (configured !== false) return ["items", "plan"];
    return ALL_TABS;
  }, [configured]);

  const selectTab = (next: Tab) => {
    setTab(next);
    const url =
      next === "poster"
        ? configured
          ? "/provider/menu?tab=poster"
          : "/provider/menu"
        : `/provider/menu?tab=${next}`;
    router.replace(url, { scroll: false });
  };

  const refreshConfigured = () => setPlanVersion((v) => v + 1);

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
        {visibleTabs.map((value) => (
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

      {tab === "poster" ? (
        <PosterTab waEnabled={waEnabled} weeklyInUse={configured === true} />
      ) : null}
      {tab === "items" ? (
        <ItemsTab canMutate={canMutate} onItemsChanged={() => setPlanVersion((v) => v + 1)} />
      ) : null}
      {tab === "plan" ? (
        <WeeklyMenuTab
          key={planVersion}
          canMutate={canMutate}
          onPlanConfiguredChange={refreshConfigured}
        />
      ) : null}
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
