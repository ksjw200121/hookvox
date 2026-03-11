// src/app/api/usage/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { getTodayUsage, getUserPlan, PLAN_LIMITS } from '@/lib/usage'
import { UsageAction } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '請先登入' }, { status: 401 })

    let dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: { supabaseId: user.id, email: user.email!, subscription: { create: {} } },
      })
    }

    const plan = await getUserPlan(dbUser.id)
    const limits = PLAN_LIMITS[plan]

    const [analyzeUsed, scriptUsed, titleUsed, ideaUsed] = await Promise.all([
      getTodayUsage(dbUser.id, UsageAction.ANALYZE),
      getTodayUsage(dbUser.id, UsageAction.GENERATE_SCRIPT),
      getTodayUsage(dbUser.id, UsageAction.GENERATE_TITLES),
      getTodayUsage(dbUser.id, UsageAction.GENERATE_IDEAS),
    ])

    const recentContents = await prisma.content.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { analysis: true },
    })

    return NextResponse.json({
      plan,
      usage: {
        analyze: { used: analyzeUsed, limit: limits.ANALYZE },
        script: { used: scriptUsed, limit: limits.GENERATE_SCRIPT },
        titles: { used: titleUsed, limit: limits.GENERATE_TITLES },
        ideas: { used: ideaUsed, limit: limits.GENERATE_IDEAS },
      },
      recentContents,
    })
  } catch (error) {
    return NextResponse.json({ error: '載入失敗' }, { status: 500 })
  }
}
