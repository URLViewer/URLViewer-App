import type { LibrarySortKey, SortOrder, VideoItem } from "@shared/types";

const NAME_COLLATOR = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });

export function sortVideos(videos: VideoItem[], key: LibrarySortKey, order: SortOrder): VideoItem[] {
  if (key === "added") {
    return order === "asc" ? [...videos] : [...videos].reverse();
  }

  const next = [...videos];
  next.sort((a, b) => {
    if (key === "name") {
      const compared = NAME_COLLATOR.compare(a.label, b.label);
      return order === "asc" ? compared : -compared;
    }

    const aDuration = a.durationSeconds;
    const bDuration = b.durationSeconds;
    const aMissing = !Number.isFinite(aDuration);
    const bMissing = !Number.isFinite(bDuration);

    if (aMissing && bMissing) {
      const compared = NAME_COLLATOR.compare(a.label, b.label);
      return order === "asc" ? compared : -compared;
    }
    if (aMissing) {
      return 1;
    }
    if (bMissing) {
      return -1;
    }

    const compared = (aDuration as number) - (bDuration as number);
    return order === "asc" ? compared : -compared;
  });

  return next;
}
