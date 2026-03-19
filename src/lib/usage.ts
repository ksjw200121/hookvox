// src/lib/usage.ts
import { prisma } from './prisma'
import { Plan, UsageAction } from '@prisma/client'

export const PLAN_LIMITS: Record<Plan, Record<UsageAction, number>> = {
  FREE: {
    ANALYZE: 3,
    GENERATE_SCRIPT: 3,
    GENERATE_TITLES: 3,
    GENERATE_IDEAS: 3,
  },
  CREATOR: {
    ANALYZE: 50,
    GENERATE_SCRIPT: 50,
    GENERATE_TITLES: 50,
    GENERATE_IDEAS: 50,
  },
  PRO: {
    ANALYZE: 200,
    GENERATE_SCRIPT: 200,
    GENERATE_TITLES: 200,
    GENERATE_IDEAS: 200,
  },
  FLAGSHIP: {
    ANALYZE: 500,
    GENERATE_SCRIPT: 500,
    GENERATE_TITLES: 500,
    GENERATE_IDEAS: 500,
  },
}

export async function getUserPlan(userId: string): Promise<Plan> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })
  return subscription?.plan ?? Plan.FREE
}

export async function getTodayUsage(userId: string, action: UsageAction): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const count = await prisma.usageLog.count({
    where: {
      userId,
      action,
      createdAt: { gte: today, lt: tomorrow },
    },
  })
  return count
}

export async function checkUsageLimit(userId: string, action: UsageAction): Promise<{
  allowed: boolean
  used: number
  limit: number
  plan: Plan
}> {
  const plan = await getUserPlan(userId)
  const used = await getTodayUsage(userId, action)
  const limit = PLAN_LIMITS[plan][action]

  return {
    allowed: used < limit,
    used,
    limit,
    plan,
  }
}

export async function recordUsage(userId: string, action: UsageAction): Promise<void> {
  await prisma.usageLog.create({
    data: { userId, action },
  })
}

// 無限版專用：按天計算，一天上限30次
export async function checkUnlimitedPlanUsage(userId: string): Promise<{
  allowed: boolean
  used: number
  limit: number
}> {
  const limit = 30  // NT$4,999 方案一天30次
  const used = await getTodayUsage(userId, UsageAction.GENERATE_SCRIPT)
  return {
    allowed: used < limit,
    used,
    limit,
  }
}

export async function checkIpRateLimit(ip: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const count = await prisma.ipUsage.count({
    where: {
      ip,
      createdAt: { gte: today, lt: tomorrow },
    },
  });

  return count < 20;
}

export async function recordIpCall(ip: string): Promise<void> {
  await prisma.ipUsage.create({
    data: { ip },
  });
}