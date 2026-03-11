import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const analysis = body?.analysis;
    const transcript = String(body?.transcript || "");
    const url = String(body?.url || "");

    if (!analysis) {
      return NextResponse.json(
        { error: "缺少分析結果" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY 尚未設定" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
你是一位專業短影音標題策劃師。
請根據以下爆款分析與內容，產生適合 IG Reels / TikTok 的爆款標題。
請用繁體中文。
每個標題都要短、狠、容易懂。

請只輸出 JSON，格式如下：
{
  "education": ["", "", "", ""],
  "controversial": ["", "", "", ""],
  "fear": ["", "", "", ""],
  "story": ["", "", "", ""],
  "simple": ["", "", "", ""]
}

原始影片字幕/內容：
${transcript}

分析結果：
${JSON.stringify(analysis)}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "你是專業短影音標題策劃師，只能輸出合法 JSON。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      success: true,
      url,
      titles: parsed,
    });
  } catch (error: any) {
    console.error("titles api error:", error);
    return NextResponse.json(
      { error: error?.message || "標題生成失敗" },
      { status: 500 }
    );
  }
}