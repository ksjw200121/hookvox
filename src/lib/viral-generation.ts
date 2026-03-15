import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export type GeneratedAnalysis = {
  scripts?: any[];
  titles?: any;
  ideas?: any[];
  storyboard?: any[];
  generatedAt?: string;
  updatedAt?: string;
};

export type ViralAnalysisJson = Record<string, any> & {
  generated?: GeneratedAnalysis;
};

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export function getClaudeModel() {
  return "claude-haiku-4-5-20251001";
}

export function normalizeAnalysis(input: unknown): ViralAnalysisJson {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  return input as ViralAnalysisJson;
}

export function getGeneratedContent(
  analysis: unknown
): GeneratedAnalysis {
  const normalized = normalizeAnalysis(analysis);
  if (
    normalized.generated &&
    typeof normalized.generated === "object" &&
    !Array.isArray(normalized.generated)
  ) {
    return normalized.generated;
  }
  return {};
}

export function mergeGeneratedContent(
  analysis: unknown,
  patch: Partial<GeneratedAnalysis>
): ViralAnalysisJson {
  const normalized = normalizeAnalysis(analysis);
  const currentGenerated = getGeneratedContent(normalized);
  const now = new Date().toISOString();

  return {
    ...normalized,
    generated: {
      ...currentGenerated,
      ...patch,
      generatedAt: currentGenerated.generatedAt || now,
      updatedAt: now,
    },
  };
}

export async function callClaudeJson(prompt: string, maxTokens = 3000) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY 尚未設定");
  }

  const response = await anthropic.messages.create({
    model: getClaudeModel(),
    max_tokens: maxTokens,
    temperature: 0.7,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Claude 沒有回傳內容");
  }

  const parsed = extractJson(text);

  if (!parsed) {
    throw new Error("Claude 回傳內容不是合法 JSON");
  }

  return parsed;
}

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");

    if (first === -1 || last === -1 || last <= first) {
      return null;
    }

    const jsonText = text.slice(first, last + 1);

    try {
      return JSON.parse(jsonText);
    } catch {
      return null;
    }
  }
}

export async function findUserViralEntry(params: {
  userId: string;
  viralId?: string | null;
  videoUrl?: string | null;
}) {
  const { userId, viralId, videoUrl } = params;

  if (viralId) {
    return prisma.viralDatabase.findFirst({
      where: {
        id: viralId,
        userId,
      },
    });
  }

  if (videoUrl) {
    return prisma.viralDatabase.findFirst({
      where: {
        userId,
        videoUrl,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  return null;
}