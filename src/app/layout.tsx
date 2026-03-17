// src/app/layout.tsx
import type { Metadata } from 'next'
import { Noto_Sans_TC } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-noto',
})

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hookvox-1yib.vercel.app'

export const metadata: Metadata = {
  title: 'Hookvox - 爆款腳本生成器',
  description: '用 AI 分析爆款內容，一鍵生成短影音腳本，讓你的貼文快速爆紅',
  keywords: '爆款腳本, AI腳本, 短影音, Instagram, TikTok, 爆款分析, Hookvox',
  openGraph: {
    title: 'Hookvox - 爆款腳本生成器',
    description: '用 AI 分析爆款內容，一鍵生成短影音腳本，讓你的貼文快速爆紅',
    url: siteUrl,
    siteName: 'Hookvox',
    locale: 'zh_TW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hookvox - 爆款腳本生成器',
    description: '用 AI 分析爆款內容，一鍵生成短影音腳本，讓你的貼文快速爆紅',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className={`${notoSansTC.variable} font-sans bg-dark-900 text-white antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
