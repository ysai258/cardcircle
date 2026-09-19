import 'server-only'
import { db } from '@/db'
import { type AuditAction, auditLogs } from '@/db/schema'
import { logger } from '@/server/common/logger'
import { isForbiddenKey } from '@/server/common/redact'

/**
 * Security audit trail.
 *
 * Every write goes through this one function, which strips prohibited keys
 * from `metadata` before it reaches the database. The audit log is the one
 * place engineers habitually dump "just a bit of context", so the filter
 * lives here rather than relying on every call site to be careful.
 */

export type AuditEventInput = {
  action: AuditAction
  actorUserId?: string | null
  targetUserId?: string | null
  resourceType?: string
  resourceId?: string
  /** Non-sensitive context only. Prohibited keys are dropped, not stored. */
  metadata?: Record<string, unknown>
}

/**
 * Removes forbidden keys and anything that is not a primitive.
 *
 * Restricting to primitives is deliberate: nested objects are how a whole
 * card row or request body ends up in an audit record by accident.
 */
function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> | null {
  if (!metadata) return null

  const clean: Record<string, string | number | boolean> = {}

  for (const [key, value] of Object.entries(metadata)) {
    if (isForbiddenKey(key)) continue
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      clean[key] = value
    }
  }

  return Object.keys(clean).length > 0 ? clean : null
}

export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      targetUserId: input.targetUserId ?? null,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      metadata: sanitizeMetadata(input.metadata),
    })
  } catch (error) {
    // An audit write must never break the user-facing operation, but a
    // silent failure would be worse: log it loudly instead.
    logger.error('Failed to record audit event', {
      action: input.action,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export { sanitizeMetadata as __sanitizeMetadataForTests }
