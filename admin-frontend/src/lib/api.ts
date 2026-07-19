import axios from "axios";

export const API_BASE = "/api";

export const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("mealhq_platform_token");
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
    if (err?.response?.status === 401 && typeof window !== "undefined") {
      const path = window.location.pathname;
      localStorage.removeItem("mealhq_platform_token");
      localStorage.removeItem("mealhq_platform_session");
      if (!path.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(err);
  },
);

export type PlatformSession = {
  user_type: "platform";
  user_id: string;
  email: string;
  display_name: string;
  access_token?: string;
};

export function savePlatformSession(session: PlatformSession & { access_token?: string }) {
  if (typeof window === "undefined") return;
  if (session.access_token) {
    localStorage.setItem("mealhq_platform_token", session.access_token);
  }
  localStorage.setItem(
    "mealhq_platform_session",
    JSON.stringify({
      user_type: "platform",
      user_id: session.user_id,
      email: session.email,
      display_name: session.display_name,
    }),
  );
}

export function loadPlatformSession(): PlatformSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("mealhq_platform_session");
    if (!raw) return null;
    return JSON.parse(raw) as PlatformSession;
  } catch {
    return null;
  }
}

export function clearPlatformSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("mealhq_platform_token");
  localStorage.removeItem("mealhq_platform_session");
}

/** Download a CSV from a platform export endpoint (uses bearer token). */
export async function downloadCsv(path: string, filename: string) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("mealhq_platform_token") : null;
  const res = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
