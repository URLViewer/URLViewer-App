import type { LibraryState, RegisterVideoSourceResult } from "@shared/types";

export type QueueStatus = "pending" | "running" | "success" | "failed";

export type QueueItem = {
  key: string;
  status: QueueStatus;
  message: string;
  updatedAt: number;
};

export type ValidationQueue = {
  active: boolean;
  total: number;
  done: number;
  success: number;
  failed: number;
  items: QueueItem[];
};

export type PendingValidationItem = {
  url: string;
  pluginId?: string;
};

export function createEmptyValidationQueue(): ValidationQueue {
  return {
    active: false,
    total: 0,
    done: 0,
    success: 0,
    failed: 0,
    items: [],
  };
}

export function parseUrlInput(input: string): string[] {
  return [...new Set(input.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean))];
}

export function createQueue(keys: string[]): ValidationQueue {
  return {
    active: true,
    total: keys.length,
    done: 0,
    success: 0,
    failed: 0,
    items: keys.map((key) => ({
      key,
      status: "pending",
      message: "待機中",
      updatedAt: Date.now(),
    })),
  };
}

export function updateQueueItem(
  queue: ValidationQueue,
  key: string,
  next: Pick<QueueItem, "status" | "message">,
): ValidationQueue {
  const items = queue.items.map((item) =>
    item.key === key
      ? {
          ...item,
          status: next.status,
          message: next.message,
          updatedAt: Date.now(),
        }
      : item,
  );

  const success = items.filter((item) => item.status === "success").length;
  const failed = items.filter((item) => item.status === "failed").length;

  return {
    ...queue,
    done: success + failed,
    success,
    failed,
    items,
  };
}

export function mergeRegisteredVideo(
  library: LibraryState,
  result: RegisterVideoSourceResult,
): LibraryState {
  if (result.status !== "registered") {
    return library;
  }

  const exists = library.videos.some((video) => video.id === result.video.id);
  if (exists) {
    return library;
  }

  return {
    ...library,
    videos: [...library.videos, result.video],
  };
}

export function queueKeyForPending(item: PendingValidationItem): string {
  return `${item.pluginId ?? "core"}:${item.url}`;
}

export function mergePendingValidations(
  current: PendingValidationItem[],
  additions: PendingValidationItem[],
): PendingValidationItem[] {
  const merged = [...current];
  const keys = new Set(current.map((item) => pendingValidationKey(item)));

  for (const item of additions) {
    const key = pendingValidationKey(item);
    if (keys.has(key)) {
      continue;
    }
    keys.add(key);
    merged.push(item);
  }

  return merged;
}

function pendingValidationKey(item: PendingValidationItem): string {
  return `${item.pluginId ?? "core"}\t${item.url}`;
}
