import { supabase } from "@/lib/supabase";

/**
 * 若 API 回 401，導向登入頁並帶上 return URL。
 * 用在需要登入的 fetch 後，例如：const res = await fetch(...); if (handle401(res)) return;
 */
export function handle401(res: Response): boolean {
  if (res.status === 401 && typeof window !== "undefined") {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?redirect=${returnTo}`;
    return true;
  }
  return false;
}

/**
 * Get auth header with retry. Mobile WebViews occasionally return empty session
 * on first read — we retry once with refreshSession() after a short delay.
 */
export async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }

  // Mobile WebView occasionally returns empty session on first read.
  // Small delay gives storage/cookie layer time to initialize.
  await new Promise((r) => setTimeout(r, 120));

  const { data: refreshed } = await supabase.auth.refreshSession();
  if (refreshed?.session?.access_token) {
    return { Authorization: `Bearer ${refreshed.session.access_token}` };
  }

  // Last resort: try getSession one more time (covers race where refresh
  // triggered by another tab has just completed).
  const { data: { session: retrySession } } = await supabase.auth.getSession();
  if (retrySession?.access_token) {
    return { Authorization: `Bearer ${retrySession.access_token}` };
  }

  return {};
}

/**
 * Authenticated fetch with automatic 401 retry.
 * On first 401, refreshes the session token and retries once.
 * Returns the Response (caller should check .ok / .status as usual).
 */
export async function authFetch(
  url: string,
  init?: RequestInit & { skipRetry?: boolean }
): Promise<Response> {
  const authHeader = await getAuthHeader();
  const headers = { ...authHeader, ...(init?.headers || {}) };

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401 && !init?.skipRetry) {
    // Token may have expired between getAuthHeader and the request arriving.
    // Refresh and retry once.
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed?.session?.access_token) {
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${refreshed.session.access_token}`,
      };
      return fetch(url, { ...init, headers: retryHeaders });
    }
  }

  return res;
}
