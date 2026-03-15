'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ViralItem {
  id: string
  userId: string
  videoUrl: string | null
  transcript: string | null
  analysis: {
    coreTopic?: string
    hook?: string
    summary?: string
    hookModel?: string
    [key: string]: any
  } | null
  createdAt: string
}

export default function ViralDatabasePage() {
  const [items, setItems] = useState<ViralItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadItems() {
      try {
        const supabase = createClient()

        const {
          data: { session },
        } = await supabase.auth.getSession()

        const token = session?.access_token

        if (!token) {
          console.error('找不到登入 token')
          return
        }

        const res = await fetch('/api/viral-database', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const json = await res.json()

        if (!res.ok) {
          console.error('讀取爆款資料庫失敗:', json)
          return
        }

        setItems(json.items || [])
      } catch (error) {
        console.error('viral-database page error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadItems()
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-black mb-2">爆款資料庫</h1>
        <p className="text-white/40">
          查看你分析過的爆款影片，建立自己的內容靈感庫。
        </p>
      </div>

      {loading && (
        <div className="glass rounded-2xl p-6 text-white/50">
          讀取中...
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="glass rounded-2xl p-6 text-white/50">
          目前還沒有分析紀錄，先去分析一支影片吧。
        </div>
      )}

      <div className="grid gap-4">
        {items.map((item) => (
          <div key={item.id} className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm text-white/40">
                分析時間：{new Date(item.createdAt).toLocaleString()}
              </div>

              {item.videoUrl && (
                <a
                  href={item.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-400 hover:text-brand-300 text-sm font-medium break-all"
                >
                  原影片連結 →
                </a>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-sm text-white/40 mb-2">核心主題</div>
                <div className="font-bold text-lg">
                  {item.analysis?.coreTopic || '未提供'}
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-sm text-white/40 mb-2">Hook 類型</div>
                <div className="font-bold text-lg">
                  {item.analysis?.hookModel || '未提供'}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-sm text-white/40 mb-2">開頭 Hook</div>
              <div className="leading-relaxed whitespace-pre-wrap">
                {item.analysis?.hook || '未提供'}
              </div>
            </div>

            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-sm text-white/40 mb-2">分析摘要</div>
              <div className="leading-relaxed whitespace-pre-wrap">
                {item.analysis?.summary || '未提供'}
              </div>
            </div>

            <details className="rounded-xl bg-white/5 p-4">
              <summary className="cursor-pointer font-medium text-white/80">
                查看逐字稿
              </summary>
              <div className="mt-3 text-white/60 leading-relaxed whitespace-pre-wrap">
                {item.transcript || '沒有逐字稿'}
              </div>
            </details>

            <details className="rounded-xl bg-white/5 p-4">
              <summary className="cursor-pointer font-medium text-white/80">
                查看完整分析 JSON
              </summary>
              <pre className="mt-3 text-xs text-white/60 whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(item.analysis, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  )
}