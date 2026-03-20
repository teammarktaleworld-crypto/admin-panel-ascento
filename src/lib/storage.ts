import { SESSION_COOKIE, SESSION_KEY_STORAGE } from "@/lib/constants";

export function getSessionKey(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(SESSION_KEY_STORAGE) || "";
}

export function setSessionKey(sessionKey: string): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(SESSION_KEY_STORAGE, sessionKey);
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=86400; samesite=lax`;
}

export function clearSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(SESSION_KEY_STORAGE);
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
