import { NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { toFile } from "openai/uploads";
import { cleanupDownloadedVideo, downloadPublicVideo } from "@/lib/video-downloader";
import { getUserIdFromRequest, checkUsageLimit, logUsage } from "@/lib/usage-checker";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANALYSIS_SYSTEM_PROMPT = `ä½ æ˜¯ä¸€?‹ç?ç©¶é??°ç£ 500+ ?‹ç?æ¬¾çŸ­å½±éŸ³?„å…§å®¹ç??¥å¸«??ä½ ç?å·¥ä??¯æ??å?ç¨¿æ?è§?ˆ°?Œæ?ä¸€?¥è©±?ºä?éº¼æ??ˆã€ï?å¹«åŠ©?µä??…è?è£½ç?æ¬¾é?è¼¯ã€?
å°é€å?ç¨¿å?ä»¥ä??­æ­¥é©Ÿå??ï?

æ­¥é?ä¸€ï¼šé??´å¥è§??
ç¬¬ä??¥è©±èªªä?ä»€éº¼ï?
?™å¥è©±å??‚å??°ä?å¹¾ä»¶äº‹ï?è®“äºº?¥é?è­°é??è??®æ??—çœ¾è¦ºå??Œé€™åœ¨èªªæ??ï?
å±¬æ–¼?ªç¨®?‹å ´æ¨¡å?ï¼Ÿå?è©±æ???/ ?ªè??ªè? / ?¸å?è¡æ? / ?å¸¸è­?/ èº«ä»½èªå?

æ­¥é?äºŒï?è­°é??‡å??¾é????™æ”¯å½±ç??¨è?ä»€éº¼è­°é¡Œï?
?®æ??—çœ¾?¯èª°ï¼Ÿä??¨ä?éº¼ç?æ´»å ´?¯ä?æ»‘åˆ°?™æ”¯å½±ç?ï¼??—çœ¾?‹åˆ°ç¬¬ä??¥è©±ï¼Œå?è£¡åœ¨?³ä?éº¼ï?ï¼ˆç”¨ç¬¬ä?äººç¨±?Œæ??¯â‹¯?é??Ÿï?è¦æ??·é??Ÿæ´»?´æ™¯ï¼?00å­—ä»¥ä¸Šï?

æ­¥é?ä¸‰ï??…ç?å¼§ç?
å¾ä?éº¼æ?ç·’é?å§‹ï?ï¼ˆç„¦??/ å¥½å? / ä¸è???/ ?¤æ€?/ èªå?ï¼?è½‰æ?é»åœ¨?ªè£¡ï¼Ÿæ€éº¼?¨é€²ï?
çµå°¾è®“è??¾å¸¶èµ°ä?éº¼æ?è¦ºï?

æ­¥é??›ï?çµæ?å°æ?
?æ®µå°æ?ï¼šHook ???›é??¾å¤§ ??è½‰æ? ??è§?±º?¹å? ??CTA
æ¨™å‡ºæ¯æ®µ?„å??‡ä?ç½?
æ­¥é?äº”ï??¯è?è£½å…¬å¼æ????Šæ??Ÿé?è¼¯æ??‰æ?ï¼?[?…ç?è§¸ç™¼] + [?·é??´æ™¯?–æ•¸å­—] + [è½‰æ??‹æ?] + [CTAé¡å?]

æ­¥é??­ï?æ³•è?å®‰å…¨æª¢æŸ¥ + ?§å®¹?†é?

contentCategory ?†é?è¦å?ï¼ˆåª?½é¸ä¸€?‹ï?ï¼?- EDUCATIONALï¼šæ?ä¾›è?è¨Šã€çŸ¥è­˜ã€æ??½ï?ä¿éšª/?¿ä»²/ç¾æ¥­/?¥èº«/é£Ÿè?/?…é?/?¢å?/?–å??™å­¸ï¼?- COMEDYï¼šæ?ç¬‘ã€æ•´?±ã€Meme?ç„¡?˜é ­
- DAILY_LIFEï¼šç?ç²¹è??„æ—¥å¸¸ç?æ´»ï?æ²’æ?å¯¦ç”¨è³‡è?
- WORK_DIARYï¼šå·¥ä½œæ—¥å¸¸vlogï¼Œæ??‰æ?ä¾›çŸ¥è­˜æ??€??
è¼¸å‡ºç´?JSONï¼Œæ ¼å¼å?ä¸‹ï?ä¸è??‰å…¶ä»–æ?å­—ï?

{
  "contentCategory": "EDUCATIONAL",
  "coreTopic": "?™æ”¯å½±ç??¨è?ä»€éº¼ï?ä¸€?¥è©±ï¼?,
  "targetAudience": "?®æ??—çœ¾?è¿°ï¼ˆå¹´é½¡ã€èº«ä»½ã€æ­£?¨ç…©?±ä?éº¼ï?",
  "summary": "2-3?¥è©±èªªæ??™ç??„æ ¸å¿ƒæ??Ÿé?è¼?,
  "hook": "ç¬¬ä??¥è©±?Ÿæ?",
  "hookModel": "å°è©±æ¼”æˆ² / ?ªè??ªè? / ?¸å?è¡æ? / ?å¸¸è­?/ èº«ä»½èªå?",
  "openingDoubleDuty": "?™å¥è©±å?ä½•å??‚é?é¡Œå?è®“å??¾è¦ºå¾—è??ªå·±?‰é?",
  "emotion": "ä¸»è??…ç?",
  "emotionArc": {
    "start": "èµ·å??…ç?",
    "turning": "è½‰æ?é»?,
    "end": "çµå°¾?…ç?"
  },
  "viralReasons": ["?†ç??Ÿå?1", "?†ç??Ÿå?2", "?†ç??Ÿå?3"],
  "painPoints": ["?›é?1ï¼ˆæ??´æ™¯?Ÿï?", "?›é?2", "?›é?3"],
  "ctaType": "CTAé¡å?èªªæ?",
  "combinedFormula": "[?…ç?è§¸ç™¼] + [?´æ™¯/?¸å?] + [è½‰æ??‹æ?] + [CTAé¡å?]",
  "keyInsights": ["?œéµæ´å?1", "?œéµæ´å?2", "?œéµæ´å?3"],
  "legalIssues": []
}`

function extractTextFromClaude(content: Anthropic.Messages.Message["content"]): string {
  return content
    .filter((block) => block.type === "text")
    .map((block) => (block as Anthropic.Messages.TextBlock).text)
    .join("\n");
}

function safeParseJson(raw: string) {
  try { return JSON.parse(raw.trim()); } catch {}
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  }
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
}

export async function POST(req: Request) {
  let tempDir = "";
  try {
    // ?€?€ 1. é©—è??»å…¥ ?€?€
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "è«‹å??»å…¥" }, { status: 401 });
    }

    // ?€?€ 2. æª¢æŸ¥ä½¿ç”¨æ¬¡æ•¸ ?€?€
    const usage = await checkUsageLimit(userId);
    if (!usage.allowed) {
      return NextResponse.json({
        error: `?è²»?ˆæ??ˆé???${usage.limit} æ¬¡ï??¬æ?å·²ä½¿??${usage.used} æ¬¡ã€‚å?ç´?Pro ?³å¯?¡é?ä½¿ç”¨ï¼`,
        limitReached: true,
        upgradeRequired: true,
        used: usage.used,
        limit: usage.limit,
      }, { status: 403 });
    }
    const publicUserId = (usage as any).publicUserId ?? userId;

    // ?€?€ 3. ?ºæœ¬é©—è? ?€?€
    const body = await req.json();
    const url = String(body?.url || "").trim();

    if (!url) return NextResponse.json({ error: "ç¼ºå?ç¶²å?" }, { status: 400 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY å°šæœªè¨­å?" }, { status: 500 });
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "ANTHROPIC_API_KEY å°šæœªè¨­å?" }, { status: 500 });

    // ?€?€ 4. ?†æ??è¼¯ ?€?€
    const downloaded = await downloadPublicVideo(url);
    tempDir = downloaded.tempDir;

    const uploadedFile = await toFile(downloaded.buffer, downloaded.fileName, { type: "video/mp4" });
    const transcription = await openai.audio.transcriptions.create({ file: uploadedFile, model: "whisper-1" });
    const transcript = transcription.text?.trim();

    if (!transcript) return NextResponse.json({ error: "Whisper æ²’æ??å?è½‰å‡º?å?ç¨? }, { status: 500 });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: [{ type: "text", text: ANALYSIS_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `ä»¥ä??¯å½±?‡é€å?ç¨¿ï?è«‹å??ï?\n\n${transcript}` }],
    });

    const text = extractTextFromClaude(response.content);
    let analysis: Record<string, unknown>;
    try {
      analysis = safeParseJson(text);
    } catch {
      return NextResponse.json({ error: "Claude ?†æ??å‚³ä¸æ˜¯?ˆæ? JSON", raw: text }, { status: 500 });
    }

    // ?€?€ 5. ?†æ??å??è??„æ¬¡???€?€
    await logUsage(publicUserId, "ANALYZE");

    return NextResponse.json({
      success: true,
      transcript,
      analysis,
      usage: { used: null, limit: 3, isPro: (usage as any).isPro },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("analyze error:", err);
    return NextResponse.json({ error: err?.message || "?†æ?å¤±æ?" }, { status: 500 });
  } finally {
    if (tempDir) await cleanupDownloadedVideo(tempDir);
  }
}
