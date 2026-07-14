export const logLevels = ["error", "warn", "info", "debug"] as const;
export type LogLevel = (typeof logLevels)[number];

type LogContext = Readonly<Record<string, unknown>>;

const priorities: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const sensitiveKey = /(?:authorization|api[_-]?key|password|secret|(?:access|bearer|refresh)[_-]?token)/i;

function errorDetails(
  error: Error,
  includeStack: boolean,
  seen: WeakSet<object>
): Record<string, unknown> {
  return {
    name: error.name,
    message: error.message,
    ...("code" in error && typeof error.code === "string" ? { code: error.code } : {}),
    ...(error.cause === undefined ? {} : { cause: safeValue(error.cause, includeStack, seen) }),
    ...(includeStack && error.stack ? { stack: error.stack } : {})
  };
}

function safeValue(value: unknown, includeStack: boolean, seen = new WeakSet<object>()): unknown {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object" && value !== null) {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    if (value instanceof Error) return errorDetails(value, includeStack, seen);
    if (Array.isArray(value)) return value.map((item) => safeValue(item, includeStack, seen));
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sensitiveKey.test(key) ? "[REDACTED]" : safeValue(item, includeStack, seen)
      ])
    );
  }
  return value;
}

const compactContext = (context: LogContext, includeStack: boolean): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(context)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, sensitiveKey.test(key) ? "[REDACTED]" : safeValue(value, includeStack)])
  );

export const configuredLogLevel = (): LogLevel => {
  const value = process.env.IMAGE_STUDIO_LOG_LEVEL?.toLowerCase() ?? "info";
  return logLevels.includes(value as LogLevel) ? (value as LogLevel) : "info";
};

export interface Logger {
  readonly child: (context: LogContext) => Logger;
  readonly error: (event: string, context?: LogContext) => void;
  readonly warn: (event: string, context?: LogContext) => void;
  readonly info: (event: string, context?: LogContext) => void;
  readonly debug: (event: string, context?: LogContext) => void;
}

export const createLogger = (scope: string, baseContext: LogContext = {}): Logger => {
  const write = (level: LogLevel, event: string, context: LogContext = {}): void => {
    const configured = configuredLogLevel();
    if (priorities[level] > priorities[configured]) return;
    const details = compactContext({ ...baseContext, ...context }, configured === "debug");
    const suffix = Object.keys(details).length === 0 ? "" : ` ${JSON.stringify(details)}`;
    process.stderr.write(`${new Date().toISOString()} ${level.toUpperCase()} ${scope}.${event}${suffix}\n`);
  };

  return {
    child: (context) => createLogger(scope, { ...baseContext, ...context }),
    error: (event, context) => write("error", event, context),
    warn: (event, context) => write("warn", event, context),
    info: (event, context) => write("info", event, context),
    debug: (event, context) => write("debug", event, context)
  };
};
