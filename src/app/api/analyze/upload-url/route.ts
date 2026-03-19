import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest } from "@/lib/usage-checker";
import { assertRateLimit, getAnalyzeRateLimit } from "@/lib/security-guard";

export const runtime = "nodejs";

const ANALYZE_UPLOADS_BUCKET = "analyze-uploads";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function inferExtension(fileName: string, contentType: string) {
  const trimmedName = String(fileName || "").trim();
  const lastDot = trimmedName.lastIndexOf(".");
  if (lastDot > 0 && lastDot < trimmedName.length - 1) {
    return trimmedName.slice(lastDot).toLowerCase();
  }

  const type = String(contentType || "").toLowerCase();
  if (type.includes("webm")) return ".webm";
  if (type.includes("mpeg") || type.includes("mp3")) return ".mp3";
  if (type.includes("mp4") || type.includes("m4v") || type.includes("hevc") || type.includes("h265")) return ".mp4";
  if (type.includes("wav")) return ".wav";
  if (type.includes("ogg")) return ".ogg";
  if (type.includes("flac")) return ".flac";
  if (type.startsWith("audio/")) return ".mp3";
  return ".mp4";
}

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const rate = await assertRateLimit({
      req,
      userId,
      routeKey: "analyze-upload-url",
      limit: Math.max(getAnalyzeRateLimit(), 10),
      windowMinutes: 1,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "操作太頻繁，請稍後再試" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const fileName = String(body?.fileName || "video").trim();
    const contentType = String(body?.contentType || "").trim();

    const base = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = inferExtension(base, contentType);
    const lastDot = base.lastIndexOf(".");
    const baseName = lastDot > 0 ? base.slice(0, lastDot) : base;
    const safeName = (baseName.slice(0, 80 - ext.length) || "video") + ext;
    const storagePath = `${userId}/${Date.now()}-${safeName}`;

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.storage
      .from(ANALYZE_UPLOADS_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "無法建立上傳連結，請稍後再試" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      storagePath,
      signedUrl: (data as any).signedUrl || (data as any).signedURL || null,
      token: (data as any).token || null,
      path: (data as any).path || storagePath,
    });
  } catch (error: any) {
    console.error("analyze upload-url error:", error);
    return NextResponse.json(
      { error: error?.message || "無法建立上傳連結" },
      { status: 500 }
    );
  }
}
