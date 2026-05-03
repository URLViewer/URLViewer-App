import { FAVORITES_GROUP_ID } from "@shared/defaults";
import type { GroupItem, LibraryState } from "@shared/types";

const GROUP_NAME_MIN = 1;
const GROUP_NAME_MAX = 10;

function createFavoritesGroup(videoIds: string[] = []): GroupItem {
  return {
    id: FAVORITES_GROUP_ID,
    name: "お気に入り",
    videoIds,
    locked: true,
    builtin: "favorites",
  };
}

export function ensureFavoritesGroup(library: LibraryState): LibraryState {
  const explicitFavorites = library.groups.filter((group) => group.builtin === "favorites");
  const idFavorites = library.groups.filter((group) => group.id === FAVORITES_GROUP_ID);
  const favoriteCandidates = [...explicitFavorites, ...idFavorites];
  const favoriteVideoIds = [...new Set(favoriteCandidates.flatMap((group) => group.videoIds))];

  const groups = library.groups
    .filter((group) => group.id !== FAVORITES_GROUP_ID && group.builtin !== "favorites")
    .map((group) => ({ ...group, locked: Boolean(group.locked) }));

  return {
    ...library,
    groups: [createFavoritesGroup(favoriteVideoIds), ...groups],
    videos: library.videos.map((video) => ({ ...video, locked: Boolean(video.locked) })),
  };
}

export function ensureActiveTab(library: LibraryState): LibraryState {
  if (library.tabs.openVideoIds.length === 0) {
    return {
      ...library,
      tabs: { openVideoIds: [], activeVideoId: null },
    };
  }

  if (
    library.tabs.activeVideoId &&
    library.tabs.openVideoIds.includes(library.tabs.activeVideoId)
  ) {
    return library;
  }

  return {
    ...library,
    tabs: {
      ...library.tabs,
      activeVideoId: library.tabs.openVideoIds[0],
    },
  };
}

export function buildLibraryForOpenTab(
  library: LibraryState,
  videoId: string,
): LibraryState | null {
  const target = library.videos.find((video) => video.id === videoId);
  if (!target) {
    return null;
  }

  const openVideoIds = library.tabs.openVideoIds.includes(videoId)
    ? library.tabs.openVideoIds
    : [...library.tabs.openVideoIds, videoId];

  return {
    ...library,
    tabs: {
      openVideoIds,
      activeVideoId: videoId,
    },
  };
}

export function buildLibraryForCloseTab(
  library: LibraryState,
  videoId: string,
): LibraryState {
  const closingIndex = library.tabs.openVideoIds.indexOf(videoId);
  const openVideoIds = library.tabs.openVideoIds.filter((openId) => openId !== videoId);

  let nextActiveVideoId = library.tabs.activeVideoId;
  if (library.tabs.activeVideoId === videoId) {
    if (openVideoIds.length === 0) {
      nextActiveVideoId = null;
    } else {
      const nextIndex = Math.min(closingIndex, openVideoIds.length - 1);
      nextActiveVideoId = openVideoIds[nextIndex] ?? null;
    }
  } else if (nextActiveVideoId && !openVideoIds.includes(nextActiveVideoId)) {
    nextActiveVideoId = openVideoIds[0] ?? null;
  }

  return {
    ...library,
    tabs: {
      openVideoIds,
      activeVideoId: nextActiveVideoId,
    },
  };
}

export function buildLibraryForSetActiveTab(
  library: LibraryState,
  videoId: string | null,
): LibraryState {
  return {
    ...library,
    tabs: {
      ...library.tabs,
      activeVideoId: videoId,
    },
  };
}

export function buildLibraryForAddGroup(
  library: LibraryState,
  rawName: string,
): { nextLibrary: LibraryState | null; reason?: "invalid-name" | "duplicate" } {
  const normalized = normalizeGroupName(rawName);
  if (!isValidGroupName(normalized)) {
    return { nextLibrary: null, reason: "invalid-name" };
  }

  const existing = findGroupByName(library.groups, normalized);
  if (existing) {
    return { nextLibrary: null, reason: "duplicate" };
  }

  return {
    nextLibrary: {
      ...library,
      groups: [
        ...library.groups,
        { id: crypto.randomUUID(), name: normalized, videoIds: [], locked: false },
      ],
    },
  };
}

export function buildLibraryForAddGroupWithVideo(
  library: LibraryState,
  rawName: string,
  videoId: string,
): { nextLibrary: LibraryState | null; reason?: "invalid-name" } {
  const normalized = normalizeGroupName(rawName);
  if (!isValidGroupName(normalized)) {
    return { nextLibrary: null, reason: "invalid-name" };
  }

  const existing = findGroupByName(library.groups, normalized);
  const nextGroups = existing
    ? library.groups.map((group) =>
        group.id !== existing.id || group.videoIds.includes(videoId)
          ? group
          : { ...group, videoIds: [...group.videoIds, videoId] },
      )
    : [...library.groups, { id: crypto.randomUUID(), name: normalized, videoIds: [videoId], locked: false }];

  return { nextLibrary: { ...library, groups: nextGroups } };
}

export function buildLibraryForAddToGroup(
  library: LibraryState,
  groupId: string,
  videoId: string,
): LibraryState {
  const nextGroups = library.groups.map((group) => {
    if (group.id !== groupId || group.videoIds.includes(videoId)) {
      return group;
    }
    return { ...group, videoIds: [...group.videoIds, videoId] };
  });

  return { ...library, groups: nextGroups };
}

export function buildLibraryForAddToFavorites(library: LibraryState, videoId: string): LibraryState {
  return {
    ...library,
    groups: library.groups.map((group) =>
      group.builtin === "favorites" || group.id === FAVORITES_GROUP_ID
        ? {
            ...group,
            locked: true,
            builtin: "favorites",
            videoIds: group.videoIds.includes(videoId) ? group.videoIds : [...group.videoIds, videoId],
          }
        : group,
    ),
  };
}

export function buildLibraryForRemoveGroup(
  library: LibraryState,
  groupId: string,
): LibraryState {
  const target = library.groups.find((group) => group.id === groupId);
  if (!target || target.locked || target.builtin === "favorites") {
    return library;
  }

  return { ...library, groups: library.groups.filter((group) => group.id !== groupId) };
}

export function buildLibraryForRemoveGroups(
  library: LibraryState,
  groupIds: string[],
): LibraryState {
  const removeSet = new Set(groupIds);
  return {
    ...library,
    groups: library.groups.filter(
      (group) => !(removeSet.has(group.id) && !group.locked && group.builtin !== "favorites"),
    ),
  };
}

export function buildLibraryForRemoveVideo(
  library: LibraryState,
  videoId: string,
): LibraryState {
  const target = library.videos.find((video) => video.id === videoId);
  if (!target || target.locked) {
    return library;
  }

  return ensureActiveTab({
    ...library,
    videos: library.videos.filter((video) => video.id !== videoId),
    groups: pruneVideoFromGroups(library.groups, videoId),
    tabs: {
      openVideoIds: library.tabs.openVideoIds.filter((openId) => openId !== videoId),
      activeVideoId: library.tabs.activeVideoId === videoId ? null : library.tabs.activeVideoId,
    },
  });
}

export function buildLibraryForRemoveVideos(
  library: LibraryState,
  videoIds: string[],
): LibraryState {
  const removableIds = new Set(
    library.videos.filter((video) => !video.locked && videoIds.includes(video.id)).map((video) => video.id),
  );
  if (removableIds.size === 0) {
    return library;
  }

  const nextVideos = library.videos.filter((video) => !removableIds.has(video.id));
  const nextOpenVideoIds = library.tabs.openVideoIds.filter((videoId) => !removableIds.has(videoId));
  const nextActiveVideoId =
    library.tabs.activeVideoId && removableIds.has(library.tabs.activeVideoId)
      ? null
      : library.tabs.activeVideoId;

  return ensureActiveTab({
    ...library,
    videos: nextVideos,
    groups: library.groups.map((group) => ({
      ...group,
      videoIds: group.videoIds.filter((videoId) => !removableIds.has(videoId)),
    })),
    tabs: {
      openVideoIds: nextOpenVideoIds,
      activeVideoId: nextActiveVideoId,
    },
  });
}

export function buildLibraryForLockVideos(library: LibraryState, videoIds: string[]): LibraryState {
  const lockSet = new Set(videoIds);
  return {
    ...library,
    videos: library.videos.map((video) =>
      lockSet.has(video.id) ? { ...video, locked: true } : video,
    ),
  };
}

export function buildLibraryForLockGroups(library: LibraryState, groupIds: string[]): LibraryState {
  const lockSet = new Set(groupIds);
  return {
    ...library,
    groups: library.groups.map((group) =>
      lockSet.has(group.id) ? { ...group, locked: true } : group,
    ),
  };
}

export function buildLibraryForRenameVideo(
  library: LibraryState,
  videoId: string,
  label: string,
): LibraryState {
  const nextVideos = library.videos.map((video) =>
    video.id === videoId ? { ...video, label: label.trim() || video.label } : video,
  );
  return { ...library, videos: nextVideos };
}

export function buildLibraryForSetDuration(
  library: LibraryState,
  videoId: string,
  durationSeconds: number,
): LibraryState {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return library;
  }

  const nextVideos = library.videos.map((video) =>
    video.id === videoId ? { ...video, durationSeconds } : video,
  );
  return { ...library, videos: nextVideos };
}

export function buildLibraryForClearVideos(library: LibraryState): LibraryState {
  const removable = library.videos.filter((video) => !video.locked).map((video) => video.id);
  return buildLibraryForRemoveVideos(library, removable);
}

function pruneVideoFromGroups(groups: GroupItem[], videoId: string): GroupItem[] {
  return groups.map((group) => ({
    ...group,
    videoIds: group.videoIds.filter((value) => value !== videoId),
  }));
}

function normalizeGroupName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

function isValidGroupName(name: string): boolean {
  return name.length >= GROUP_NAME_MIN && name.length <= GROUP_NAME_MAX;
}

function findGroupByName(groups: GroupItem[], normalized: string): GroupItem | undefined {
  return groups.find(
    (group) => normalizeGroupName(group.name).toLowerCase() === normalized.toLowerCase(),
  );
}
