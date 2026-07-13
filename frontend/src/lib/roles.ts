import type { UserSession } from "@/lib/api";

/** Effective staff role; missing role defaults to admin for legacy sessions. */
export function staffRole(session: UserSession | null | undefined): "admin" | "driver" | "viewer" {
  const r = session?.role;
  if (r === "driver" || r === "viewer" || r === "admin") return r;
  return "admin";
}

export function isAdmin(session: UserSession | null | undefined): boolean {
  return staffRole(session) === "admin";
}

export function isDriver(session: UserSession | null | undefined): boolean {
  return staffRole(session) === "driver";
}

export function isViewer(session: UserSession | null | undefined): boolean {
  return staffRole(session) === "viewer";
}

/** Customers, payments, settings, subscription, dashboard quick-mark. */
export function canMutateAdmin(session: UserSession | null | undefined): boolean {
  return isAdmin(session);
}

/** Delivery mark / reorder / bulk — admin or driver; not viewer. */
export function canMutateDeliveries(session: UserSession | null | undefined): boolean {
  const r = staffRole(session);
  return r === "admin" || r === "driver";
}
