import type { PlaybackFailure } from "@web/plugins/types";

export function classifyHtmlMediaError(
  error: MediaError | null | undefined,
): PlaybackFailure {
  if (!error) {
    return { kind: "unknown" };
  }

  switch (error.code) {
    case MediaError.MEDIA_ERR_NETWORK:
      return { kind: "access-error" };
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
    case MediaError.MEDIA_ERR_DECODE:
      return { kind: "not-playable" };
    default:
      return { kind: "unknown" };
  }
}

