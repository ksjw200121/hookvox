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
你是一位專業短影音腳本總編輯。
請根據以下爆款分析結果，為同主題產生 6 種不同風格的短影音腳本。
請使用繁體中文。
不能抄原文，要重寫，但要保留原本爆款結構優勢。

請只輸出 JSON，格式如下：
{
  "scripts": [
    {
      "versionType": "教育型",
      "hook": "",
      "shortScript": "",
      "caption": "",
      "cta": "",
      "shootingSuggestion": ""
    }
  ]
}

固定要輸出 6 種：
教育型
爭議型
恐懼型
故事型
白話型
專家型

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
          content: "你是專業短影音腳本編輯，只能輸出合法 JSON。",
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
      scripts: parsed.scripts || [],
    });
  } catch (error: any) {
    console.error("scripts api error:", error);
    return NextResponse.json(
      { error: error?.message || "腳本生成失敗" },
      { status: 500 }
    );
  }
}