"use client";

import React, { createContext, useCallback, useContext, useMemo } from "react";

type ProviderSubscriptionContextValue = {
  sub: any | null;
  refreshSub: () => void;
};

const ProviderSubscriptionContext = createContext<ProviderSubscriptionContextValue>({
  sub: null,
  refreshSub: () => {},
});

export function ProviderSubscriptionProvider({
  sub,
  refreshSub,
  children,
}: {
  sub: any | null;
  refreshSub: () => void;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ sub, refreshSub }), [sub, refreshSub]);
  return (
    <ProviderSubscriptionContext.Provider value={value}>
      {children}
    </ProviderSubscriptionContext.Provider>
  );
}

export function useProviderSubscription() {
  return useContext(ProviderSubscriptionContext);
}

/** Stable no-op refresh for tests / outside shell */
export function useRefreshSubCallback(fn: () => void) {
  return useCallback(fn, [fn]);
}
