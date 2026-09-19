import 'server-only'
import { isProduction } from '@/env'
import { redact } from './redact'

/**
 * Structured, redacted logging.
 *
 * Every log line is JSON with a request id. Context objects pass through
 * redact() so that a careless `logger.info('x', { user })` cannot spill a
 * password hash or an encrypted phone blob into the log stream.
 *
 * There is deliberately no helper that logs a whole request body. On card
 * and auth endpoints that is exactly the mistake the PRD forbids, and the
 * easiest way to not make it is to not provide the tool.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogContext = Record<string, unknown>

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const MIN_LEVEL: LogLevel = isProduction ? 'info' : 'debug'

function emit(level: LogLevel, message: string, context?: LogContext): void {
  if (LEVEL_RANK[level] < LEVEL_RANK[MIN_LEVEL]) return

  const line = {
    level,
    time: new Date().toISOString(),
    message,
    ...(context ? { context: redact(context) } : {}),
  }

  const serialized = JSON.stringify(line)
  if (level === 'error' || level === 'warn') {
    console.error(serialized)
  } else {
    console.log(serialized)
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) =>
    emit('debug', message, context),
  info: (message: string, context?: LogContext) =>
    emit('info', message, context),
  warn: (message: string, context?: LogContext) =>
    emit('warn', message, context),
  error: (message: string, context?: LogContext) =>
    emit('error', message, context),
}

/** Creates a logger bound to a request id, so lines can be correlated. */
export function requestLogger(requestId: string) {
  const withRequest = (context?: LogContext): LogContext => ({
    requestId,
    ...context,
  })

  return {
    debug: (message: string, context?: LogContext) =>
      emit('debug', message, withRequest(context)),
    info: (message: string, context?: LogContext) =>
      emit('info', message, withRequest(context)),
    warn: (message: string, context?: LogContext) =>
      emit('warn', message, withRequest(context)),
    error: (message: string, context?: LogContext) =>
      emit('error', message, withRequest(context)),
  }
}

export type RequestLogger = ReturnType<typeof requestLogger>
