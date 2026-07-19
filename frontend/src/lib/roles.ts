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

/** Post-login / landing home for a provider staff session. Drivers only use deliveries. */
export function providerAppHome(session: UserSession | null | undefined): string {
  return isDriver(session) ? "/provider/deliveries" : "/provider";
}

/**
 * Safe destination after auth. Drivers are never sent to dashboard/admin routes
 * (those APIs are role-gated and would toast errors).
 */
export function resolveAppHome(
  session: UserSession | null | undefined,
  next: string | null = null,
): string {
  if (!session) return "/login";
  if (session.user_type === "consumer") {
    return next?.startsWith("/consumer") ? next : "/consumer";
  }
  if (isDriver(session)) {
    return next?.startsWith("/provider/deliveries") ? next : "/provider/deliveries";
  }
  if (next && (next.startsWith("/provider") || next.startsWith("/consumer"))) {
    return next;
  }
  return "/provider";
}
