// src/services/ai/generateScripts.ts
import OpenAI from 'openai'
import { getScriptGenerationPrompt } from '@/prompts/index'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ScriptResult {
  hook: string
  body: string
  caption: string
  cta: string
  shootingTips: string
}

export const SCRIPT_STYLES = [
  { key: 'EDUCATIONAL', label: '教育型', emoji: '📚', description: '分享知識，建立專業形象' },
  { key: 'CONTROVERSIAL', label: '爭議型', emoji: '🔥', description: '挑戰常識，引發討論' },
  { key: 'FEAR', label: '恐懼型', emoji: '⚠️', description: '點出風險，製造危機感' },
  { key: 'STORY', label: '故事型', emoji: '📖', description: '真實故事，情感共鳴' },
  { key: 'CASUAL', label: '白話型', emoji: '💬', description: '輕鬆對話，親切自然' },
  { key: 'EXPERT', label: '專家型', emoji: '🎯', description: '展示專業，建立權威' },
]

export async function generateScripts(topic: string, analysisData?: object): Promise<Record<string, ScriptResult>> {
  const styles = ['EDUCATIONAL', 'CONTROVERSIAL', 'FEAR', 'STORY', 'CASUAL', 'EXPERT']
  
  const results: Record<string, ScriptResult> = {}
  
  // Generate all 6 scripts in parallel
  await Promise.all(
    styles.map(async (style) => {
      const prompt = getScriptGenerationPrompt(topic, style, analysisData)
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      })
      const content = response.choices[0]?.message?.content
      if (content) {
        results[style] = JSON.parse(content) as ScriptResult
      }
    })
  )

  return results
}
