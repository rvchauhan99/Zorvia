import axios from "axios";

/** Same-origin via Next rewrite → FastAPI (cookies work without cross-origin CORS). */
export const API_BASE = "/api";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("tiffin_token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const isAuthPage =
          path.startsWith("/login") ||
          path.startsWith("/signup") ||
          path.startsWith("/consumer-signup") ||
          path.startsWith("/verify-email") ||
          path.startsWith("/forgot-password") ||
          path.startsWith("/reset-password") ||
          path.startsWith("/invite");
        localStorage.removeItem("tiffin_token");
        localStorage.removeItem("tiffin_session");
        if (!isAuthPage && (path.startsWith("/provider") || path.startsWith("/consumer"))) {
          window.location.assign("/login");
        }
      }
    } else if (status === 402) {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (path.startsWith("/provider") && !path.startsWith("/provider/subscription")) {
          window.location.assign("/provider/subscription");
        }
      }
    }
    return Promise.reject(err);
  }
);

export type StaffRole = "admin" | "driver" | "viewer";

export type UserSession = {
  user_type: "provider" | "consumer";
  user_id: string;
  tenant_id: string;
  display_name: string;
  email: string;
  phone?: string;
  access_token?: string;
  role?: StaffRole;
  must_change_password?: boolean;
};

export function saveSession(session: UserSession & { access_token?: string }) {
  if (typeof window === "undefined") return;
  if (session.access_token) {
    localStorage.setItem("tiffin_token", session.access_token);
  }
  localStorage.setItem(
    "tiffin_session",
    JSON.stringify({
      user_type: session.user_type,
      user_id: session.user_id,
      tenant_id: session.tenant_id,
      display_name: session.display_name,
      email: session.email || "",
      phone: session.phone || "",
      role: session.role,
      must_change_password: Boolean(session.must_change_password),
    })
  );
}

export function getSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem("tiffin_session");
    if (!s) return null;
    const parsed = JSON.parse(s);
    const token = localStorage.getItem("tiffin_token");
    return token ? { ...parsed, access_token: token } : parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("tiffin_token");
  localStorage.removeItem("tiffin_session");
}
