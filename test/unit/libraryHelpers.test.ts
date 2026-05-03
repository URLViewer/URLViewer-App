import { describe, expect, it } from "vitest";
import type { LibraryState, VideoItem } from "@shared/types";
import { FAVORITES_GROUP_ID } from "@shared/defaults";
import {
  buildLibraryForRemoveGroups,
  buildLibraryForRemoveVideos,
  ensureFavoritesGroup,
} from "@web/store/libraryHelpers";
import { sortVideos } from "@web/features/library/sortVideos";

function createVideo(id: string, label: string, locked = false, durationSeconds?: number): VideoItem {
  return {
    id,
    label,
    sourceUrl: `https://example.com/${id}.mp4`,
    locked,
    durationSeconds,
  };
}

function createBaseLibrary(): LibraryState {
  return {
    videos: [
      createVideo("v1", "動画10", false, 20),
      createVideo("v2", "動画2", true, 10),
      createVideo("v3", "あ", false),
    ],
    groups: [
      { id: "g1", name: "通常", videoIds: ["v1", "v2"], locked: false },
      { id: FAVORITES_GROUP_ID, name: "お気に入り", videoIds: ["v3"], locked: true, builtin: "favorites" },
    ],
    tabs: {
      openVideoIds: ["v1", "v2"],
      activeVideoId: "v2",
    },
  };
}

describe("library helpers", () => {
  it("keeps favorites group and lock when normalizing", () => {
    const withoutFavorites: LibraryState = {
      videos: [createVideo("v1", "sample")],
      groups: [{ id: "g1", name: "通常", videoIds: ["v1"], locked: false }],
      tabs: { openVideoIds: [], activeVideoId: null },
    };

    const normalized = ensureFavoritesGroup(withoutFavorites);
    const favorites = normalized.groups.find((group) => group.builtin === "favorites");

    expect(favorites).toBeDefined();
    expect(favorites?.locked).toBe(true);
  });

  it("does not remove locked videos in bulk delete", () => {
    const next = buildLibraryForRemoveVideos(createBaseLibrary(), ["v1", "v2"]);

    expect(next.videos.map((video) => video.id)).toEqual(["v2", "v3"]);
    expect(next.groups.find((group) => group.id === "g1")?.videoIds).toEqual(["v2"]);
  });

  it("does not remove favorites/locked groups in bulk delete", () => {
    const next = buildLibraryForRemoveGroups(createBaseLibrary(), ["g1", FAVORITES_GROUP_ID]);

    expect(next.groups.map((group) => group.id)).toContain(FAVORITES_GROUP_ID);
    expect(next.groups.map((group) => group.id)).not.toContain("g1");
  });
});

describe("sortVideos", () => {
  const videos = [
    createVideo("a", "動画10", false, 12),
    createVideo("b", "動画2", false, 5),
    createVideo("c", "あ", false),
  ];

  it("sorts names with japanese/numeric natural order", () => {
    const sorted = sortVideos(videos, "name", "asc");
    expect(sorted.map((video) => video.label)).toEqual(["あ", "動画2", "動画10"]);
  });

  it("puts unknown duration at end for asc and desc", () => {
    const asc = sortVideos(videos, "duration", "asc");
    const desc = sortVideos(videos, "duration", "desc");

    expect(asc[asc.length - 1]?.id).toBe("c");
    expect(desc[desc.length - 1]?.id).toBe("c");
  });
});
