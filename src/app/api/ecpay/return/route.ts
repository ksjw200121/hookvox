import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const redirectUrl = new URL("/payment/success", req.url);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function GET(req: Request) {
  const redirectUrl = new URL("/payment/success", req.url);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}