import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditValue = Prisma.InputJsonValue | null | undefined;

function toJsonValue(value: AuditValue) {
  if (value === undefined) {
    return Prisma.JsonNull;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value;
}

export async function recordAdminAudit(input: {
  actorUserId?: string | null;
  targetUserId?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  reason?: string | null;
  before?: AuditValue;
  after?: AuditValue;
  meta?: AuditValue;
}) {
  await prisma.adminAuditLog.create({
    data: {
      actorUserId: input.actorUserId || null,
      targetUserId: input.targetUserId || null,
      entityType: input.entityType,
      entityId: input.entityId || null,
      action: input.action,
      reason: input.reason || null,
      beforeJson: toJsonValue(input.before),
      afterJson: toJsonValue(input.after),
      metaJson: toJsonValue(input.meta),
    },
  });
}
