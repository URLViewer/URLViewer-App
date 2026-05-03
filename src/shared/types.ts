import type {
  PluginCapability,
  PluginDescription,
  PluginManifestV1,
  PluginPanelSpec,
} from "@m3u8viewer/plugin-sdk";

export type ValidationMode = "on-register" | "manual";

export type VideoItem = {
  id: string;
  label: string;
  sourceUrl: string;
  locked: boolean;
  durationSeconds?: number;
  resumeSeconds?: number;
  lastValidatedAt?: string;
  addedByPluginId?: string;
};

export type GroupItem = {
  id: string;
  name: string;
  videoIds: string[];
  locked: boolean;
  builtin?: "favorites";
};

export type TabState = {
  openVideoIds: string[];
  activeVideoId: string | null;
};

export type AppSettings = {
  restoreTabsOnLaunch: boolean;
  validationMode: ValidationMode;
  validationConcurrency: number;
  validationTimeoutMs: number;
};

export type LibraryState = {
  videos: VideoItem[];
  groups: GroupItem[];
  tabs: TabState;
};

export type { PluginCapability, PluginDescription, PluginManifestV1, PluginPanelSpec };

export type PluginSourceType = "builtin" | "zip" | "folder" | "git";

export type PluginListItem = {
  id: string;
  enabled: boolean;
  order: number;
  sourceType: PluginSourceType;
  sourceRef?: string;
  localPath?: string;
  lastUpdatedAt?: string;
  manifest: PluginManifestV1;
  panel?: PluginPanelSpec;
};

export type PluginState = {
  schemaVersion: 1;
  items: PluginListItem[];
};

export type VideoSourceValidateInput = {
  url: string;
  timeoutMs: number;
};

export type VideoSourceValidateResult =
  | {
      status: "valid";
      normalizedUrl: string;
      validatedAt: string;
    }
  | {
      status: "invalid";
      reason: "invalid-url" | "network";
    };

export type RegisterVideoSourceInput = {
  url: string;
  label?: string;
  timeoutMs: number;
  pluginId?: string;
};

export type RegisterVideoSourceResult =
  | {
      status: "registered";
      video: VideoItem;
    }
  | {
      status: "rejected";
      reason: "invalid-url" | "network";
    };

export type InstallPluginResult =
  | { status: "installed"; plugin: PluginListItem }
  | { status: "rejected"; reason: string };

export type ExportAliveUrlsResult =
  | {
      status: "success";
      path: string;
      count: number;
    }
  | { status: "empty" }
  | { status: "cancelled" };

export type ResumePayload = {
  videoId: string;
  seconds: number;
};

export type GitInstallPayload = {
  url: string;
  branch?: string;
  token?: string;
};
