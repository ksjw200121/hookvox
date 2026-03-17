import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  // Some browsers request /favicon.ico specifically. Redirect to the app icon.
  return NextResponse.redirect(new URL("/icon", req.url), 307);
}

