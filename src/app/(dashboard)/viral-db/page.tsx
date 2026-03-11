'use client'
// src/app/(dashboard)/viral-db/page.tsx
import { useState, useEffect } from 'react'

interface ViralEntry {
  id: string
  url: string
  platform: string
  caption: string
  likes: number
  comments: number
  views: number
  viralScore: number
  category: string
  createdAt: string
}

const PLATFORM_ICONS: Record<string, string> = {
  INSTAGRAM: '📸',
  TIKTOK: '🎵',
  YOUTUBE_SHORTS: '▶️',
}

const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  YOUTUBE_SHORTS: 'YouTube Shorts',
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

export default function ViralDbPage() {
  const [entries, setEntries] = useState<ViralEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [platform, setPlatform] = useState('')
  const [minScore, setMinScore] = useState('')

  const loadEntries = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (keyword) params.set('keyword', keyword)
    if (platform) params.set('platform', platform)
    if (minScore) params.set('minScore', minScore)

    const res = await fetch(`/api/viral-db?${params}`)
    const data = await res.json()
    setEntries(data.entries || [])
    setLoading(false)
  }

  useEffect(() => { loadEntries() }, [])

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black mb-2">爆款資料庫</h1>
        <p className="text-white/40">搜尋並瀏覽所有分析過的爆款貼文，建立你的靈感素材庫</p>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadEntries()}
            className="flex-1 bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-brand-500/50 text-sm transition-colors"
            placeholder="搜尋關鍵字..."
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500/50 transition-colors"
          >
            <option value="">所有平台</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="TIKTOK">TikTok</option>
            <option value="YOUTUBE_SHORTS">YouTube Shorts</option>
          </select>
          <select
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className="bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500/50 transition-colors"
          >
            <option value="">所有分數</option>
            <option value="9">9分以上</option>
            <option value="8">8分以上</option>
            <option value="7">7分以上</option>
          </select>
          <button
            onClick={loadEntries}
            className="bg-brand-500 hover:bg-brand-400 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors whitespace-nowrap"
          >
            🔍 搜尋
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-dark-700 rounded-2xl shimmer" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-xl font-bold mb-2">資料庫是空的</h3>
          <p className="text-white/40 text-sm">開始分析貼文，爆款資料庫就會自動建立</p>
        </div>
      ) : (
        <div className="space-y-3 animate-slide-up">
          <p className="text-white/30 text-sm">{entries.length} 筆爆款貼文</p>
          {entries.map((e) => (
            <div key={e.id} className="glass rounded-xl p-5 hover:border-white/15 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-dark-600 flex items-center justify-center text-xl flex-shrink-0">
                  {PLATFORM_ICONS[e.platform]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 line-clamp-2 leading-relaxed mb-2">{e.caption || e.url}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/35">
                    <span>{PLATFORM_LABELS[e.platform]}</span>
                    {e.category && <span className="bg-white/5 px-2 py-0.5 rounded-full">{e.category}</span>}
                    <span>👍 {formatNumber(e.likes || 0)}</span>
                    <span>💬 {formatNumber(e.comments || 0)}</span>
                    {e.views && <span>👁 {formatNumber(e.views)}</span>}
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">查看原文 →</a>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className={`text-2xl font-black ${e.viralScore >= 9 ? 'text-brand-400' : e.viralScore >= 8 ? 'text-yellow-400' : 'text-white/50'}`}>
                    {e.viralScore?.toFixed(1)}
                  </div>
                  <div className="text-xs text-white/25">爆款分</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
