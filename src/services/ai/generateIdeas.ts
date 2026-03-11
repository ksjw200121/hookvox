// src/services/ai/generateIdeas.ts
import OpenAI from 'openai'
import { getIdeaGenerationPrompt } from '@/prompts/index'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface IdeaResult {
  title: string
  hook: string
  emotionTrigger: string
  shootingTip: string
  difficulty: string
  viralPotential: number
}

export async function generateIdeas(topic: string): Promise<IdeaResult[]> {
  const prompt = getIdeaGenerationPrompt(topic)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('AI 回應為空')

  const parsed = JSON.parse(content)
  return parsed.ideas as IdeaResult[]
}
