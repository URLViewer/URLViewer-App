import type { NetworkHeaderOverrideRule } from "@shared/types";

type RuleEntry = {
  rule: NetworkHeaderOverrideRule;
  refCount: number;
};

const rules = new Map<string, RuleEntry>();

function normalizeHeaders(input: Record<string, string | string[]>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key.toLowerCase(),
      Array.isArray(value) ? value.join(", ") : String(value),
    ]),
  );
}

function hostMatches(hostname: string, targets: string[]): boolean {
  const lower = hostname.toLowerCase();
  return targets.some((target) => {
    const normalized = target.toLowerCase();
    return lower === normalized || lower.endsWith(`.${normalized}`);
  });
}

export function acquireNetworkHeaderOverride(rule: NetworkHeaderOverrideRule): void {
  const existing = rules.get(rule.id);
  if (existing) {
    existing.refCount += 1;
    existing.rule = rule;
    return;
  }
  rules.set(rule.id, { rule, refCount: 1 });
}

export function releaseNetworkHeaderOverride(id: string): void {
  const existing = rules.get(id);
  if (!existing) {
    return;
  }
  existing.refCount -= 1;
  if (existing.refCount <= 0) {
    rules.delete(id);
  }
}

export function applyNetworkHeaderOverrides(
  requestUrl: string,
  requestHeaders: Record<string, string | string[]>,
): Record<string, string> {
  if (rules.size === 0) {
    return normalizeHeaders(requestHeaders);
  }

  let hostname = "";
  try {
    hostname = new URL(requestUrl).hostname;
  } catch {
    return normalizeHeaders(requestHeaders);
  }

  const matchedRules = [...rules.values()]
    .filter((entry) => hostMatches(hostname, entry.rule.hosts))
    .map((entry) => entry.rule);
  if (matchedRules.length === 0) {
    return normalizeHeaders(requestHeaders);
  }

  const headers = normalizeHeaders(requestHeaders);
  for (const rule of matchedRules) {
    for (const [key, value] of Object.entries(rule.headers)) {
      headers[key.toLowerCase()] = value;
    }
    if (!rule.preserveRange && !headers.range) {
      headers.range = "bytes=0-";
    }
  }
  return headers;
}
