import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();

  // Refresh Supabase auth session on every navigation request.
  // This keeps the auth cookie/token fresh and prevents mobile WebViews
  // from holding stale tokens that cause intermittent 401 errors.
  try {
    const supabase = createMiddlewareClient({ req: request, res });
    await supabase.auth.getSession();
  } catch {
    // Non-fatal: if session refresh fails, continue with existing token.
    // The client-side authFetch retry will handle expired tokens.
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
