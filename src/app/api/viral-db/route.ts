// src/app/api/viral-db/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '').trim()
    const supabaseAdmin = getSupabaseAdmin()
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: '未登入' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const keyword = searchParams.get('keyword') || ''
    const platform = searchParams.get('platform') || null
    const minScore = parseFloat(searchParams.get('minScore') || '0')

    let query = supabaseAdmin
      .from('ViralDatabase')
      .select('*')
      .order('viralScore', { ascending: false })
      .limit(50)

    if (keyword) {
      query = query.or(`caption.ilike.%${keyword}%,category.ilike.%${keyword}%`)
    }
    if (platform) {
      query = query.eq('platform', platform)
    }
    if (minScore > 0) {
      query = query.gte('viralScore', minScore)
    }

    const { data: entries } = await query

    return NextResponse.json({ entries: entries || [] })
  } catch (error) {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}