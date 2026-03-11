// src/app/api/viral-db/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { Platform } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '請先登入' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const keyword = searchParams.get('keyword') || ''
    const platform = searchParams.get('platform') as Platform | null
    const minScore = parseFloat(searchParams.get('minScore') || '0')

    const entries = await prisma.viralDatabase.findMany({
      where: {
        ...(keyword && {
          OR: [
            { caption: { contains: keyword, mode: 'insensitive' } },
            { category: { contains: keyword, mode: 'insensitive' } },
            { keywords: { hasSome: [keyword] } },
          ],
        }),
        ...(platform && { platform }),
        ...(minScore > 0 && { viralScore: { gte: minScore } }),
      },
      orderBy: { viralScore: 'desc' },
      take: 50,
    })

    return NextResponse.json({ entries })
  } catch (error) {
    return NextResponse.json({ error: '載入失敗' }, { status: 500 })
  }
}
