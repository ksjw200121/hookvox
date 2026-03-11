import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

export async function downloadPublicVideo(url: string) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "viralscript-"));
  const outputTemplate = path.join(tempDir, "video.%(ext)s");

  try {
    await execFileAsync(
      "./yt-dlp.exe",
      [
        "--no-playlist",
        "--no-warnings",
        "-f",
        "mp4/best",
        "-o",
        outputTemplate,
        url,
      ],
      {
        windowsHide: true,
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