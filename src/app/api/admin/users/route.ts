import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-auth";
import { getAdminUsersList } from "@/lib/admin-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const adminCheck = await assertAdmin(req);

    if (!adminCheck.ok) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const data = await getAdminUsersList({
      q: searchParams.get("q"),
      plan: searchParams.get("plan"),
      subscriptionStatus: searchParams.get("subscriptionStatus"),
      accountStatus: searchParams.get("accountStatus"),
      role: searchParams.get("role"),
      createdFrom: searchParams.get("createdFrom"),
      createdTo: searchParams.get("createdTo"),
      limit: Number(searchParams.get("limit") || 100),
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("admin users route error:", err);
    return NextResponse.json(
      { error: "讀取使用者清單失敗" },
      { status: 500 }
    );
  }
}
