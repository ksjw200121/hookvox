export type ParsedUrlResult = {
  platform: "instagram" | "tiktok" | "youtube" | "unknown";
  title: string;
  description: string;
  author: string;
  thumbnail: string;
  resolvedText: string;
  rawMeta: Record<string, string>;
};

function assertSafePublicUrl(input: string) {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    throw new Error("網址格式錯誤");
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("僅支援 http/https 網址");
  }

  const hostname = (u.hostname || "").toLowerCase();
  if (!hostname) {
    throw new Error("網址格式錯誤");
  }

  // Block obvious SSRF targets early
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "0.0.0.0" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    throw new Error("不支援此網址");
  }

  // Allow-list only known public platforms to avoid SSRF abuse
  const allowedHosts = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "instagram.com",
    "www.instagram.com",
    "tiktok.com",
    "www.tiktok.com",
    "vm.tiktok.com",
  ]);

  if (!allowedHosts.has(hostname)) {
    throw new Error("目前僅支援 YouTube / IG / TikTok 網址");
  }

  return u;
}

function detectPlatform(url: string): ParsedUrlResult["platform"] {
  const u = url.toLowerCase();
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  return "unknown";
}

function cleanText(input: string) {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMeta(html: string, key: string) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${key}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${key}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }
  return "";
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? cleanText(match[1]) : "";
}

function extractJsonLdText(html: string) {
  const matches = Array.from(
    html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  );
  const collected: string[] = [];
  for (const m of matches) {
    try {
      const raw = m[1]?.trim();
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const walk = (obj: unknown) => {
        if (!obj || typeof obj !== "object") return;
        const o = obj as Record<string, unknown>;
        if (typeof o.caption === "string") collected.push(o.caption);
        if (typeof o.description === "string") collected.push(o.description);
        if (typeof o.name === "string") collected.push(o.name);
        if (typeof o.text === "string") collected.push(o.text);
        if (typeof o.headline === "string") collected.push(o.headline);
        for (const key of Object.keys(o)) {
          const value = o[key];
          if (Array.isArray(value)) value.forEach(walk);
          else if (value && typeof value === "object") walk(value);
        }
      };
      walk(parsed);
    } catch {
      // ignore broken json
    }
  }
  return cleanText(collected.join(" "));
}

function pickFirst(...values: Array<string | undefined | null>) {
  for (const value of values) {
    if (value && cleanText(value)) return cleanText(value);
  }
  return "";
}

export async function parsePublicUrl(url: string): Promise<ParsedUrlResult> {
  const safeUrl = assertSafePublicUrl(url);
  const platform = detectPlatform(url);

  if (platform === "unknown") {
    throw new Error("不支援的網址");
  }

  // 設定 15 秒超時，避免伺服器端 fetch 卡死
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let res: Response;
  try {
    res = await fetch(safeUrl.toString(), {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        "accept-language": "zh-TW,zh;q=0.9,en;q=0.8",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        referer: "https://www.google.com/",
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (fetchErr: unknown) {
    clearTimeout(timeout);
    const msg = (fetchErr as Error)?.name === "AbortError"
      ? "網址解析超時，請確認網址可正常訪問"
      : "無法連線到目標網站，請確認網址正確並稍後再試";
    throw new Error(msg);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`無法取得網頁，HTTP ${res.status}`);
  }

  const html = await res.text();

  const ogTitle = extractMeta(html, "og:title");
  const ogDescription = extractMeta(html, "og:description");
  const ogImage = extractMeta(html, "og:image");
  const twitterTitle = extractMeta(html, "twitter:title");
  const twitterDescription = extractMeta(html, "twitter:description");
  const descriptionMeta = extractMeta(html, "description");
  const siteName = extractMeta(html, "og:site_name");
  const authorMeta = extractMeta(html, "author");
  const titleTag = extractTitle(html);
  const jsonLdText = extractJsonLdText(html);

  const title = pickFirst(ogTitle, twitterTitle, titleTag);
  const description = pickFirst(ogDescription, twitterDescription, descriptionMeta);
  const author = pickFirst(authorMeta, siteName);
  const thumbnail = pickFirst(ogImage);
  const resolvedText = pickFirst(description, jsonLdText);

  return {
    platform,
    title,
    description,
    author,
    thumbnail,
    resolvedText,
    rawMeta: {
      ogTitle,
      ogDescription,
      ogImage,
      twitterTitle,
      twitterDescription,
      descriptionMeta,
      titleTag,
      jsonLdText,
    },
  };
}