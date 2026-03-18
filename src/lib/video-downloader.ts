import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);
const YOUTUBE_SHORTS_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

function assertSupportedVideoUrl(input: string) {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("網址格式錯誤");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("僅支援 http/https 網址");
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  if (!YOUTUBE_SHORTS_HOSTS.has(hostname) || !pathname.startsWith("/shorts/")) {
    throw new Error("目前僅支援 YouTube Shorts 網址");
  }

  return parsed.toString();
}

export async function downloadPublicVideo(url: string) {
  const safeUrl = assertSupportedVideoUrl(url);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "viralscript-"));
  const outputTemplate = path.join(tempDir, "video.%(ext)s");

  try {
    await execFileAsync(
      "./yt-dlp.exe",
      [
        "--no-playlist",
        "--no-warnings",
        "--socket-timeout",
        "15",
        "--max-filesize",
        "50M",
        "-f",
        "mp4/best",
        "-o",
        outputTemplate,
        safeUrl,
      ],
      {
        windowsHide: true,
        timeout: 60_000,
      }
    );

    const files = await fs.readdir(tempDir);
    const videoFile = files.find((file) =>
      /\.(mp4|mkv|webm|mov)$/i.test(file)
    );

    if (!videoFile) {
      throw new Error("下載失敗：找不到影片檔");
    }

    const fullPath = path.join(tempDir, videoFile);
    const buffer = await fs.readFile(fullPath);

    return {
      tempDir,
      filePath: fullPath,
      buffer,
      fileName: videoFile,
    };
  } catch (error: any) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
    throw new Error(error?.message || "yt-dlp 下載失敗");
  }
}

export async function cleanupDownloadedVideo(tempDir: string) {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}