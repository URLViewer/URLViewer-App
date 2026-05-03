import type { VideoSourceValidateResult } from "@shared/types";

export function normalizeVideoSourceUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function validateVideoSourceUrl(
  url: string,
  timeoutMs: number,
): Promise<VideoSourceValidateResult> {
  const normalizedUrl = normalizeVideoSourceUrl(url);
  if (!normalizedUrl) {
    return { status: "invalid", reason: "invalid-url", detail: "invalid URL format" };
  }
  const probe = await probeUrlReachability(normalizedUrl, timeoutMs);
  if (!probe.reachable) {
    return { status: "invalid", reason: "network", detail: probe.detail };
  }

  return {
    status: "valid",
    normalizedUrl,
    validatedAt: new Date().toISOString(),
  };
}

async function probeUrlReachability(
  url: string,
  timeoutMs: number,
): Promise<{ reachable: boolean; detail: string }> {
  const boundedTimeoutMs = Math.max(1000, timeoutMs);
  const head = await probeOnce(url, boundedTimeoutMs, {
    method: "HEAD",
    headers: {
      Accept: "*/*",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  if (head.kind === "ok") {
    return { reachable: true, detail: `strategy=head ${formatProbeResult("HEAD", head)}` };
  }

  // 一部サーバーは HEAD を拒否するため GET でフォールバックする。
  if (head.kind === "method-not-allowed") {
    const get = await probeOnce(url, boundedTimeoutMs, {
      method: "GET",
      headers: {
        Accept: "*/*",
        Range: "bytes=0-0",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    if (get.kind === "ok") {
      return {
        reachable: true,
        detail: `strategy=head-fallback HEAD status=${head.status} -> ${formatProbeResult("GET", get)}`,
      };
    }
    return {
      reachable: false,
      detail: `strategy=head-fallback HEAD status=${head.status} -> ${formatProbeResult("GET", get)}`,
    };
  }

  return {
    reachable: false,
    detail: `strategy=head ${formatProbeResult("HEAD", head)}`,
  };
}

type ProbeResult =
  | { kind: "ok"; status: number }
  | { kind: "method-not-allowed"; status: number }
  | { kind: "failed"; status?: number; error?: string };

async function probeOnce(
  url: string,
  timeoutMs: number,
  init: RequestInit,
): Promise<ProbeResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
    });

    if (response.status >= 200 && response.status < 300) {
      return { kind: "ok", status: response.status };
    }
    if (response.status === 304) {
      return { kind: "ok", status: response.status };
    }
    if (response.status === 405 || response.status === 501) {
      return { kind: "method-not-allowed", status: response.status };
    }
    return { kind: "failed", status: response.status };
  } catch (error) {
    if (error instanceof Error) {
      return {
        kind: "failed",
        error: error.name === "AbortError" ? `timeout(${timeoutMs}ms)` : error.message,
      };
    }
    return { kind: "failed", error: "unknown-error" };
  } finally {
    clearTimeout(timeoutId);
  }
}

function formatProbeResult(method: "HEAD" | "GET", result: ProbeResult): string {
  if (result.kind === "ok") {
    return `${method} status=${result.status}`;
  }
  if (result.kind === "method-not-allowed") {
    return `${method} status=${result.status} (method-not-allowed)`;
  }
  if (typeof result.status === "number") {
    return `${method} status=${result.status}`;
  }
  if (result.error) {
    return `${method} error=${result.error}`;
  }
  return `${method} failed`;
}
