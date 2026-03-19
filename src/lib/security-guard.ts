import { prisma } from "@/lib/prisma";

export type GuardAction =
  | "ANALYZE"
  | "GENERATE_SCRIPT"
  | "GENERATE_IDEAS"
  | "GENERATE_ANGLE_SCRIPT";

type RateLimitInput = {
  req: Request;
  userId?: string | null;
  routeKey: string;
  limit: number;
  windowMinutes: number;
};

const ACTION_COSTS: Record<GuardAction, number> = {
  ANALYZE: 0.03,
  GENERATE_SCRIPT: 0.01,
  GENERATE_IDEAS: 0.002,
  GENERATE_ANGLE_SCRIPT: 0.01,
};

function getEnvNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp.trim();
  }

  return "unknown";
}

function getWindowStartIso(windowMinutes: number) {
  const now = new Date();
  const ms = windowMinutes * 60 * 1000;
  const rounded = Math.floor(now.getTime() / ms) * ms;
  return new Date(rounded).toISOString();
}

function getMetricDateValue() {
  const today = new Date().toISOString().slice(0, 10);
  return new Date(`${today}T00:00:00.000Z`);
}

export async function assertRateLimit({
  req,
  userId,
  routeKey,
  limit,
  windowMinutes,
}: RateLimitInput): Promise<
  | { allowed: true; count: number; remaining: number }
  | { allowed: false; message: string; count: number; remaining: number }
> {
  const ip = resolveClientIp(req);
  const scope = userId || ip;
  const windowStart = getWindowStartIso(windowMinutes);
  const key = `${routeKey}:${scope}:${windowStart}`;

  const result = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO request_guards ("key", user_id, ip, route, window_start, count, created_at, updated_at)
    VALUES (${key}, ${userId || null}, ${ip}, ${routeKey}, ${new Date(windowStart)}, 1, NOW(), NOW())
    ON CONFLICT ("key")
    DO UPDATE SET
      count = request_guards.count + 1,
      updated_at = NOW()
    RETURNING count
  `;
  const nextCount = Number(result[0]?.count || 0);

  if (nextCount > limit) {
    return {
      allowed: false,
      message: "RATE_LIMIT_EXCEEDED",
      count: nextCount,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    count: nextCount,
    remaining: Math.max(limit - nextCount, 0),
  };
}

export async function assertCostGuard(
  action: GuardAction
): Promise<
  | {
      allowed: true;
      todayCost: number;
      hardLimit: number;
      softLimit: number;
      estimatedNextCost: number;
    }
  | {
      allowed: false;
      message: string;
      todayCost: number;
      hardLimit: number;
      softLimit: number;
      estimatedNextCost: number;
    }
> {
  const enabled = (process.env.AI_COST_GUARD_ENABLED || "true") === "true";
  const softLimit = getEnvNumber("AI_COST_SOFT_LIMIT_USD", 20);
  const hardLimit = getEnvNumber("AI_COST_HARD_LIMIT_USD", 30);
  const estimatedNextCost = ACTION_COSTS[action];

  if (!enabled) {
    return {
      allowed: true,
      todayCost: 0,
      hardLimit,
      softLimit,
      estimatedNextCost,
    };
  }

  const data = await prisma.system_runtime_metrics.findUnique({
    where: {
      metric_date: getMetricDateValue(),
    },
    select: {
      estimated_cost_usd: true,
      hard_locked: true,
    },
  });

  const todayCost = Number(data?.estimated_cost_usd || 0);
  const hardLocked = Boolean(data?.hard_locked);

  if (hardLocked || todayCost + estimatedNextCost > hardLimit) {
    return {
      allowed: false,
      message: "AI_COST_HARD_LIMIT_REACHED",
      todayCost,
      hardLimit,
      softLimit,
      estimatedNextCost,
    };
  }

  return {
    allowed: true,
    todayCost,
    hardLimit,
    softLimit,
    estimatedNextCost,
  };
}

export async function recordEstimatedCost(action: GuardAction) {
  const enabled = (process.env.AI_COST_GUARD_ENABLED || "true") === "true";
  if (!enabled) return;

  const hardLimit = getEnvNumber("AI_COST_HARD_LIMIT_USD", 30);
  const deltaCost = ACTION_COSTS[action];
  const analyzeDelta = action === "ANALYZE" ? 1 : 0;
  const generateDelta = action === "ANALYZE" ? 0 : 1;

  await prisma.$executeRaw`
    INSERT INTO system_runtime_metrics (
      metric_date,
      analyze_count,
      generate_count,
      estimated_cost_usd,
      hard_locked,
      created_at,
      updated_at
    )
    VALUES (
      ${getMetricDateValue()},
      ${analyzeDelta},
      ${generateDelta},
      ${deltaCost},
      ${deltaCost >= hardLimit},
      NOW(),
      NOW()
    )
    ON CONFLICT (metric_date)
    DO UPDATE SET
      analyze_count = system_runtime_metrics.analyze_count + ${analyzeDelta},
      generate_count = system_runtime_metrics.generate_count + ${generateDelta},
      estimated_cost_usd = system_runtime_metrics.estimated_cost_usd + ${deltaCost},
      hard_locked = (system_runtime_metrics.estimated_cost_usd + ${deltaCost}) >= ${hardLimit},
      updated_at = NOW()
  `;
}

export function getAnalyzeRateLimit() {
  return getEnvNumber("RATE_LIMIT_ANALYZE_PER_MIN", 6);
}

export function getGenerateRateLimit() {
  return getEnvNumber("RATE_LIMIT_GENERATE_PER_MIN", 8);
}