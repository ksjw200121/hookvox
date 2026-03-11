export type ParsedUrlResult = {
  platform: "instagram" | "tiktok" | "youtube" | "unknown";
  title: string;
  description: string;
  author: string;
  thumbnail: string;
  resolvedText: string;
  rawMeta: Record<string, string>;
};

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
  const matches = Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  const collected: string[] = [];

  for (const m of matches) {
    try {
      const raw = m[1]?.trim();
      if (!raw) continue;

      const parsed = JSON.parse(raw);

      const walk = (obj: any) => {
        if (!obj || typeof obj !== "object") return;

        if (typeof obj.caption === "string") collected.push(obj.caption);
        if (typeof obj.description === "string") collected.push(obj.description);
        if (typeof obj.name === "string") collected.push(obj.name);
        if (typeof obj.text === "string") collected.push(obj.text);
        if (typeof obj.headline === "string") collected.push(obj.headline);

        for (const key of Object.keys(obj)) {
          const value = obj[key];
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
  const platform = detectPlatform(url);

  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
      "accept-language": "zh-TW,zh;q=0.9,en;q=0.8",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      referer: "https://www.google.com/",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`?¡æ?è®€?–ç¶²?€?§å®¹ï¼ŒHTTP ${res.status}`);
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
