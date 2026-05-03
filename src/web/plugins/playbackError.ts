import type { PlaybackFailure } from "@web/plugins/types";

export function classifyHtmlMediaError(
  error: MediaError | null | undefined,
): PlaybackFailure {
  if (!error) {
    return { kind: "unknown" };
  }

  const detail = `HTMLMediaError code=${error.code}${error.message ? ` message=${error.message}` : ""}`;

  switch (error.code) {
    case MediaError.MEDIA_ERR_NETWORK:
      return withFailureDetail("access-error", detail);
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
    case MediaError.MEDIA_ERR_DECODE:
      return withFailureDetail("not-playable", detail);
    default:
      return withFailureDetail("unknown", detail);
  }
}

function withFailureDetail(
  kind: "access-error" | "not-playable" | "unknown",
  detail: string,
): PlaybackFailure {
  return {
    kind,
    detail,
  } as PlaybackFailure;
}
