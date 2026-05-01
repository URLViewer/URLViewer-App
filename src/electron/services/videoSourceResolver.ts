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
    return { status: "invalid", reason: "invalid-url" };
  }
  const reachable = await probeUrlReachability(normalizedUrl, timeoutMs);
  if (!reachable) {
    return { status: "invalid", reason: "network" };
  }

  return {
    status: "valid",
    normalizedUrl,
    validatedAt: new Date().toISOString(),
  };
}

async function probeUrlReachability(url: string, timeoutMs: number): Promise<boolean> {
  const boundedTimeoutMs = Math.max(1000, timeoutMs);

  const tryHead = await probeOnce(url, boundedTimeoutMs, {
    method: "HEAD",
    headers: {
      Accept: "*/*",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  if (tryHead === "ok") {
    return true;
  }

  // 一部サーバーは HEAD を拒否するため GET でフォールバックする。
  if (tryHead === "method-not-allowed") {
    const tryGet = await probeOnce(url, boundedTimeoutMs, {
      method: "GET",
      headers: {
        Accept: "*/*",
        Range: "bytes=0-0",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    return tryGet === "ok";
  }

  return false;
}

type ProbeResult = "ok" | "method-not-allowed" | "failed";

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
      return "ok";
    }
    if (response.status === 304) {
      return "ok";
    }
    if (response.status === 405 || response.status === 501) {
      return "method-not-allowed";
    }
    return "failed";
  } catch {
    return "failed";
  } finally {
    clearTimeout(timeoutId);
  }
}
