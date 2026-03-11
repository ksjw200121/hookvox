// src/services/ai/analyzeContent.ts
import OpenAI from 'openai'
import { getAnalyzeContentPrompt } from '@/prompts/index'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ContentData {
  caption: string
  likes: number
  comments: number
  views: number
}

export interface AnalysisResult {
  targetAudience: string
  viralReasons: string[]
  hookType: string
  emotionType: string
  structureBreakdown: { opening: string; middle: string; ending: string }
  painPoints: string[]
  ctaType: string
  category: string
  hookStrength: number
  topicRelevance: number
  clarityScore: number
  emotionalPull: number
  ctaStrength: number
  viralScore: number
  summary: string
}

export async function analyzeContent(data: ContentData): Promise<AnalysisResult> {
  const prompt = getAnalyzeContentPrompt({ transcript: data.caption })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('AI 回應為空')

  return JSON.parse(content) as AnalysisResult
}
