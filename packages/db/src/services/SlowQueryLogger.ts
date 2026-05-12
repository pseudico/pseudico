export type SlowQueryLogEntry = {
  label: string;
  elapsedMs: number;
  thresholdMs: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type SlowQueryLogSink = (entry: SlowQueryLogEntry) => void;

export type QueryTimerClock = {
  now: () => Date;
  monotonicNow: () => number;
};

const DEFAULT_SLOW_QUERY_THRESHOLD_MS = 75;

export class SlowQueryLogger {
  private readonly clock: QueryTimerClock;
  private readonly sink: SlowQueryLogSink;
  private readonly thresholdMs: number;

  constructor(input: {
    thresholdMs?: number;
    clock?: Partial<QueryTimerClock>;
    sink?: SlowQueryLogSink;
  } = {}) {
    this.thresholdMs = normalizeThreshold(input.thresholdMs);
    this.clock = {
      now: input.clock?.now ?? (() => new Date()),
      monotonicNow:
        input.clock?.monotonicNow ??
        (() =>
          typeof performance === "undefined" ? Date.now() : performance.now())
    };
    this.sink = input.sink ?? defaultSlowQuerySink;
  }

  time<TValue>(
    label: string,
    operation: () => TValue,
    metadata?: Record<string, unknown>
  ): TValue {
    validateLabel(label);
    const start = this.clock.monotonicNow();

    try {
      return operation();
    } finally {
      this.recordIfSlow(label, this.clock.monotonicNow() - start, metadata);
    }
  }

  async timeAsync<TValue>(
    label: string,
    operation: () => Promise<TValue>,
    metadata?: Record<string, unknown>
  ): Promise<TValue> {
    validateLabel(label);
    const start = this.clock.monotonicNow();

    try {
      return await operation();
    } finally {
      this.recordIfSlow(label, this.clock.monotonicNow() - start, metadata);
    }
  }

  private recordIfSlow(
    label: string,
    elapsedMs: number,
    metadata?: Record<string, unknown>
  ): void {
    if (elapsedMs < this.thresholdMs) {
      return;
    }

    this.sink({
      label,
      elapsedMs: Number(elapsedMs.toFixed(3)),
      thresholdMs: this.thresholdMs,
      timestamp: this.clock.now().toISOString(),
      ...(metadata === undefined ? {} : { metadata })
    });
  }
}

function normalizeThreshold(thresholdMs: number | undefined): number {
  if (
    thresholdMs === undefined ||
    !Number.isFinite(thresholdMs) ||
    thresholdMs <= 0
  ) {
    return DEFAULT_SLOW_QUERY_THRESHOLD_MS;
  }

  return thresholdMs;
}

function validateLabel(label: string): void {
  if (label.trim().length === 0) {
    throw new Error("Slow query label must be a non-empty string.");
  }
}

function defaultSlowQuerySink(entry: SlowQueryLogEntry): void {
  // Keep diagnostics local to the running desktop process. The app can provide
  // its own sink later to persist these to a workspace diagnostics table/file.
  console.warn(
    `[local-work-os:slow-query] ${entry.label} took ${entry.elapsedMs}ms (threshold ${entry.thresholdMs}ms)`,
    entry.metadata ?? {}
  );
}
