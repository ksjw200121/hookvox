import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest } from "@/lib/usage-checker";

export type AdminUserRow = {
  id: string;
  supabaseId: string;
  email: string | null;
  name: string | null;
  role: string | null;
};

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function normalizeId(value: string) {
  return String(value || "").trim();
}

export async function getAdminUserFromRequest(
  req: Request
): Promise<{
  supabaseUserId: string | null;
  user: AdminUserRow | null;
}> {
  const supabaseUserId = await getUserIdFromRequest(req);

  if (!supabaseUserId) {
    return {
      supabaseUserId: null,
      user: null,
    };
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, supabaseId, email, name, role")
    .eq("supabaseId", normalizeId(supabaseUserId))
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load admin user: ${error.message}`);
  }

  return {
    supabaseUserId,
    user: (data as AdminUserRow | null) || null,
  };
}

export async function assertAdmin(req: Request): Promise<
  | {
      ok: true;
      supabaseUserId: string;
      user: AdminUserRow;
    }
  | {
      ok: false;
      status: number;
      error: string;
    }
> {
  const { supabaseUserId, user } = await getAdminUserFromRequest(req);

  if (!supabaseUserId) {
    return {
      ok: false,
      status: 401,
      error: "未登入",
    };
  }

  if (!user) {
    return {
      ok: false,
      status: 403,
      error: "找不到使用者資料",
    };
  }

  if (String(user.role || "").toUpperCase() !== "ADMIN") {
    return {
      ok: false,
      status: 403,
      error: "沒有權限",
    };
  }

  return {
    ok: true,
    supabaseUserId,
    user,
  };
}