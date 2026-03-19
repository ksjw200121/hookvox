// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Transient Prisma error codes that are safe to retry
const TRANSIENT_PRISMA_CODES = new Set([
  'P1001', // Can't reach database server
  'P1008', // Operations timed out
  'P1017', // Server has closed the connection
  'P2024', // Timed out fetching a new connection from the pool
])

const TRANSIENT_MESSAGE_PATTERNS = [
  "Can't reach database server",
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ECONNRESET',
  'Connection pool timeout',
]

function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: string }).code
  if (code && TRANSIENT_PRISMA_CODES.has(code)) return true
  const msg = String((error as Error).message || '')
  return TRANSIENT_MESSAGE_PATTERNS.some((p) => msg.includes(p))
}

/**
 * Execute a Prisma operation with automatic retry on transient connection errors.
 * Retries up to `maxRetries` times with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 300
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < maxRetries && isTransientError(err)) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      throw err
    }
  }
  throw lastError
}
