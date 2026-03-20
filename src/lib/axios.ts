import axios from "axios";

import { clearSession, getSessionKey } from "@/lib/storage";

export const api = axios.create({
  baseURL: "/api/proxy",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const sessionKey = getSessionKey();
  if (sessionKey) {
    config.headers["x-session-key"] = sessionKey;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      clearSession();
      window.location.href = "/login";
    }

    if (!error?.response) {
      const code = String(error?.code || "");
      if (code === "ECONNABORTED") {
        error.message = "Request timed out. Backend may be waking up, please retry.";
      } else if (code.length > 0) {
        error.message = `Network issue (${code}). Please check internet/backend and retry.`;
      } else {
        error.message = "Network issue. Please check internet/backend and retry.";
      }
    }

    return Promise.reject(error);
  },
);
