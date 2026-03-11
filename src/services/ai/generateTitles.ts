// src/services/ai/generateTitles.ts
import OpenAI from 'openai'
import { getTitleGenerationPrompt } from '@/prompts/index'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface TitleResult {
  title: string
  category: string
  emotionTrigger: string
  estimatedCTR: number
}

export async function generateTitles(topic: string): Promise<TitleResult[]> {
  const prompt = getTitleGenerationPrompt({
  industry: "GENERAL",
  topic,
  targetAudience: "",
})

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('AI 回應為空')

  const parsed = JSON.parse(content)
  return parsed.titles as TitleResult[]
}
