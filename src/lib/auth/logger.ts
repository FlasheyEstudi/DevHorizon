// =============================================================================
// logger.ts — Structured, allow-listed auth event logger.
//
// Per design §3 / spec REQ-G2: stdout JSON-lines with NO PII.
//
// Allow-listed keys: event, userId, ts, ip. Any other key passed in `data`
// is dropped silently. This is the single source of truth for "who did what
// when" in the auth flow; downstream observability can grep stdout.
// =============================================================================

const ALLOWED_KEYS = new Set(['event', 'userId', 'ts', 'ip'] as const);

type AllowedKey = 'event' | 'userId' | 'ts' | 'ip';

export interface AuthEvent {
  event: string;
  userId?: string;
  ts?: number;
  ip?: string;
}

/**
 * Write one JSON line to stdout. Keys outside the allow-list are dropped.
 * No email, password, token, or full PB record leaves this function.
 */
export function logAuthEvent(event: string, data: Partial<AuthEvent> = {}): void {
  const line: Record<string, string | number> = { event };
  for (const key of ALLOWED_KEYS as Set<AllowedKey>) {
    if (key === 'event') continue; // already set from positional arg
    const value = data[key];
    if (value !== undefined && value !== null && value !== '') {
      line[key] = value;
    }
  }
  if (typeof line.ts !== 'number') {
    line.ts = Date.now();
  }
  console.log(JSON.stringify(line));
}
