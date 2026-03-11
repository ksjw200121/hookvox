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
你是一位短影音內容企劃顧問。
請根據以下爆款分析結果，延伸出 20 個可以拍的新內容方向。
請用繁體中文，風格要適合台灣短影音市場。

請只輸出 JSON，格式如下：
{
  "ideas": [
    {
      "title": "",
      "hookStyle": "",
      "emotion": "",
      "shootingSuggestion": ""
    }
  ]
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
          content: "你是短影音內容企劃顧問，只能輸出合法 JSON。",
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
      ideas: parsed.ideas || [],
    });
  } catch (error: any) {
    console.error("ideas api error:", error);
    return NextResponse.json(
      { error: error?.message || "內容方向生成失敗" },
      { status: 500 }
    );
  }
}