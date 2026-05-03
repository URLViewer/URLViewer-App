export type VideoPlaybackTrace = {
  capturedAt: string;
  url: string;
  method: string;
  phase: "completed" | "failed";
  statusCode?: number;
  error?: string;
  resourceType?: string;
  fromCache?: boolean;
  referrer?: string;
  responseHeaders?: Record<string, string>;
};

const TRACE_CAPACITY = 200;

const traceByUrl = new Map<string, VideoPlaybackTrace>();
const traceOrder: string[] = [];

function canonicalUrl(input: string): string {
  try {
    const parsed = new URL(input);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return input;
  }
}

function stripQuery(input: string): string {
  try {
    const parsed = new URL(input);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return input;
  }
}

function toHeaderRecord(headers?: Record<string, string | string[]>): Record<string, string> | undefined {
  if (!headers) {
    return undefined;
  }
  const entries = Object.entries(headers);
  if (entries.length === 0) {
    return undefined;
  }
  return Object.fromEntries(entries.map(([key, value]) => [key, Array.isArray(value) ? value.join("; ") : value]));
}

function touchTraceOrder(key: string): void {
  const existingIndex = traceOrder.indexOf(key);
  if (existingIndex >= 0) {
    traceOrder.splice(existingIndex, 1);
  }
  traceOrder.push(key);
  while (traceOrder.length > TRACE_CAPACITY) {
    const removed = traceOrder.shift();
    if (!removed) {
      continue;
    }
    traceByUrl.delete(removed);
  }
}

function storeTrace(url: string, trace: VideoPlaybackTrace): void {
  const normalized = canonicalUrl(url);
  const noQuery = stripQuery(url);
  traceByUrl.set(normalized, trace);
  touchTraceOrder(normalized);
  if (noQuery !== normalized) {
    traceByUrl.set(noQuery, trace);
    touchTraceOrder(noQuery);
  }
}

export function recordPlaybackTraceCompleted(params: {
  url: string;
  method: string;
  statusCode: number;
  resourceType?: string;
  fromCache?: boolean;
  referrer?: string;
  responseHeaders?: Record<string, string | string[]>;
}): void {
  storeTrace(params.url, {
    capturedAt: new Date().toISOString(),
    url: params.url,
    method: params.method,
    phase: "completed",
    statusCode: params.statusCode,
    resourceType: params.resourceType,
    fromCache: params.fromCache,
    referrer: params.referrer,
    responseHeaders: toHeaderRecord(params.responseHeaders),
  });
}

export function recordPlaybackTraceFailed(params: {
  url: string;
  method: string;
  error: string;
  resourceType?: string;
  referrer?: string;
}): void {
  storeTrace(params.url, {
    capturedAt: new Date().toISOString(),
    url: params.url,
    method: params.method,
    phase: "failed",
    error: params.error,
    resourceType: params.resourceType,
    referrer: params.referrer,
  });
}

export function getPlaybackTrace(url: string): VideoPlaybackTrace | null {
  const normalized = canonicalUrl(url);
  const noQuery = stripQuery(url);
  return traceByUrl.get(normalized) ?? traceByUrl.get(noQuery) ?? null;
}
