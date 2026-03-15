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
