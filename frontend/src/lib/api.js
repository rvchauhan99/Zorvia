import axios from "axios";

export const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tiffin_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      if (localStorage.getItem("tiffin_token")) {
        localStorage.removeItem("tiffin_token");
        localStorage.removeItem("tiffin_session");
      }
    } else if (status === 402) {
      // Subscription required — bounce provider to subscription screen (unless already there).
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      if (path.startsWith("/provider") && !path.startsWith("/provider/subscription")) {
        window.location.assign("/provider/subscription");
      }
    }
    return Promise.reject(err);
  }
);

export function saveSession(session) {
  localStorage.setItem("tiffin_token", session.access_token);
  localStorage.setItem(
    "tiffin_session",
    JSON.stringify({
      user_type: session.user_type,
      user_id: session.user_id,
      tenant_id: session.tenant_id,
      display_name: session.display_name,
      email: session.email,
    })
  );
}

export function getSession() {
  try {
    const s = localStorage.getItem("tiffin_session");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("tiffin_token");
  localStorage.removeItem("tiffin_session");
}
