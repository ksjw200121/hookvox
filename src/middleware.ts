import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(_request: NextRequest) {
  // 直接放行，不做 auth session refresh。
  // 原先的 createMiddlewareClient + getSession() 會用 cookie 刷新 session，
  // 但前端 Supabase client 用 localStorage 存 token，兩者衝突會導致登出。
  // Auth refresh 由前端 authFetch 的 token retry 機制處理即可。
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
