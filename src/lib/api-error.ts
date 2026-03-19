/**
 * Shared API error sanitization utility.
 * Prevents leaking internal error details (DB connection strings, stack traces, etc.)
 * to the client while still returning useful status codes.
 */

export type SanitizedError = {
  message: string;
  status: number;
};

const DB_CONNECTIVITY_PATTERNS = [
  "Can't reach database server",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ECONNRESET",
  "P1001", // Prisma: can't reach database
  "P1008", // Prisma: operation timed out
  "P1017", // Prisma: server closed the connection
  "P2024", // Prisma: connection pool timeout
];

/**
 * Sanitize an error for API response. Returns a user-friendly message
 * and appropriate HTTP status code. Never exposes raw error details.
 */
export function sanitizeApiError(
  error: unknown,
  fallbackMessage = "伺服器暫時忙碌，請稍後再試"
): SanitizedError {
  const raw = String((error as Error)?.message || "");

  const isDbIssue = DB_CONNECTIVITY_PATTERNS.some((p) => raw.includes(p));
  if (isDbIssue) {
    return {
      message: "資料庫暫時無法連線，請稍後再試",
      status: 503,
    };
  }

  return {
    message: fallbackMessage,
    status: 500,
  };
}
