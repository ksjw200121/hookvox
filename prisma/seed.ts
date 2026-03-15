// prisma/seed.ts
import { PrismaClient, Platform, Plan, ScriptStyle, UsageAction } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@viralscript.ai' },
    update: {},
    create: {
      email: 'demo@viralscript.ai',
      name: '示範用戶',
      supabaseId: 'demo-supabase-id',
      subscription: {
        create: {
          plan: Plan.CREATOR,
          status: 'ACTIVE',
        }
      }
    }
  })

  console.log('✅ Created demo user:', user.email)

  // Create example viral content
  const content = await prisma.content.create({
    data: {
      userId: user.id,
      url: 'https://www.instagram.com/reel/example123',
      platform: Platform.INSTAGRAM,
      caption: '很多人不知道，遺產稅最高要繳40%！你家的資產有保護好嗎？今天分享3個合法節稅方式👇',
      likes: 15420,
      comments: 892,
      views: 287000,
    }
  })

  // Create analysis for the content
  await prisma.contentAnalysis.create({
    data: {
      contentId: content.id,
      targetAudience: '35-55歲有資產的中產階級、小企業主、有繼承需求的家庭',
      viralReasons: ['觸發財務恐懼', '提供實用解決方案', '數字衝擊（40%）', '緊迫感'],
      hookType: '恐懼型Hook',
      emotionType: '恐懼 + 希望',
      structureBreakdown: {
        opening: '數字震撼 - 40%衝擊',
        middle: '問題放大 + 解決方案預告',
        ending: 'CTA引導互動'
      },
      painPoints: ['不了解遺產稅率', '擔心家族財富流失', '不知道合法節稅方式'],
      ctaType: '留言互動型',
      category: '財務規劃',
      hookStrength: 9.2,
      topicRelevance: 8.8,
      clarityScore: 8.5,
      emotionalPull: 9.0,
      ctaStrength: 8.3,
      viralScore: 8.76,
    }
  })

  // Create example scripts
  await prisma.script.create({
    data: {
      userId: user.id,
      contentId: content.id,
      topic: '遺產稅節稅規劃',
      style: ScriptStyle.FEAR,
      hook: '你知道嗎？台灣遺產稅最高40%，你努力一輩子的財富，有可能一半都要繳給政府！',
      body: `【問題放大】
很多人以為遺產稅跟自己無關，但你知道嗎？只要名下有房產、存款超過1333萬，你就需要認真考慮這個問題了。

【核心內容】
今天分享三個合法的節稅方式：

第一：善用每年贈與免稅額度
每人每年可以贈與244萬免稅，夫妻合計488萬，長期規劃下來效果驚人。

第二：保險規劃
善用人壽保險的受益人指定，可以有效轉移資產，且不計入遺產總額。

第三：信託規劃
透過家族信託，不只節稅，還能確保財富按照你的意願傳承。

【總結】
節稅規劃越早做越好，現在就開始了解，保護你辛苦累積的財富。`,
      caption: '你知道遺產稅最高40%嗎？分享3個合法節稅方式，保護你的家族財富💰 #遺產稅 #節稅規劃 #財富傳承 #理財',
      cta: '如果你想了解更多節稅方式，在留言區打「想了解」，我會私訊你詳細資料！',
      shootingTips: '建議在辦公室或書房拍攝，穿著專業正式，搭配數字文字圖表，增加可信度。開頭可以用「震驚表情」搭配數字字幕製造衝擊感。',
    }
  })

  // Create viral database entries (ViralDatabase: userId, videoUrl, transcript, analysis)
  await prisma.viralDatabase.create({
    data: {
      userId: user.id,
      videoUrl: 'https://www.instagram.com/reel/example123',
      transcript: '很多人不知道，遺產稅最高要繳40%！你家的資產有保護好嗎？今天分享3個合法節稅方式。',
      analysis: {
        platform: 'INSTAGRAM',
        caption: '很多人不知道，遺產稅最高要繳40%！你家的資產有保護好嗎？',
        likes: 15420,
        comments: 892,
        views: 287000,
        viralScore: 8.76,
        category: '財務規劃',
        keywords: ['遺產稅', '節稅', '財富傳承', '理財'],
      },
    }
  })

  await prisma.viralDatabase.create({
    data: {
      userId: user.id,
      videoUrl: 'https://www.tiktok.com/@example/video/123456',
      transcript: '月薪3萬也能買房？分享我用這個方法3年存到頭期款的真實經歷。',
      analysis: {
        platform: 'TIKTOK',
        caption: '月薪3萬也能買房？分享我用這個方法3年存到頭期款的真實經歷',
        likes: 28900,
        comments: 1560,
        views: 520000,
        viralScore: 9.1,
        category: '房地產',
        keywords: ['買房', '存錢', '頭期款', '理財'],
      },
    }
  })

  console.log('✅ Seed data created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
