import type { AppSettings, LibraryState, PluginListItem } from "@shared/types";
import type { PlaybackFailureKind } from "@web/plugins/types";
import type {
  PendingValidationItem,
  ValidationQueue,
} from "@web/store/validationHelpers";

export type PlaybackStatus = "idle" | "paused" | "playing";

export type PlaybackState = {
  videoId: string | null;
  status: PlaybackStatus;
};

export type PlaybackCommand = {
  videoId: string;
  action: "toggle" | "play" | "pause";
  seq: number;
};

export type AppState = {
  loaded: boolean;
  settings: AppSettings;
  library: LibraryState;
  plugins: PluginListItem[];
  pluginPanels: PluginListItem[];
  currentPanel: "input" | "library" | "groups" | "plugins";
  urlInput: string;
  pluginInput: Record<string, string>;
  appVersion: string;
  busy: boolean;
  lastMessage: string;
  validationQueue: ValidationQueue;
  pendingValidations: PendingValidationItem[];
  playback: PlaybackState;
  playbackCommand: PlaybackCommand | null;
  loadInitialData: () => Promise<void>;
  setUrlInput: (input: string) => void;
  setPluginInput: (pluginId: string, input: string) => void;
  registerUrlInput: () => Promise<void>;
  runPluginInput: (pluginId: string) => Promise<void>;
  validateAllPending: () => Promise<void>;
  exportAliveUrls: () => Promise<void>;
  refreshPlugins: () => Promise<void>;
  setPluginEnabled: (pluginId: string, enabled: boolean) => Promise<void>;
  reorderPlugins: (orderedIds: string[]) => Promise<void>;
  removePlugin: (pluginId: string) => Promise<void>;
  updatePlugin: (pluginId: string) => Promise<void>;
  installPluginFromZip: () => Promise<void>;
  installPluginFromFolder: () => Promise<void>;
  installPluginFromGit: (url: string, branch?: string, token?: string) => Promise<void>;
  openVideoTab: (videoId: string) => Promise<void>;
  closeVideoTab: (videoId: string) => Promise<void>;
  setActiveTab: (videoId: string | null) => Promise<void>;
  saveResume: (videoId: string, seconds: number) => Promise<void>;
  addGroup: (name: string) => Promise<void>;
  addToGroup: (groupId: string, videoId: string) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  removeVideo: (videoId: string) => Promise<void>;
  clearAllVideos: () => Promise<void>;
  markPlaybackFailed: (videoId: string, reason: PlaybackFailureKind) => Promise<void>;
  renameVideo: (videoId: string, label: string) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  setPanel: (panel: "input" | "library" | "groups" | "plugins") => void;
  setPlaybackState: (playback: PlaybackState) => void;
  requestPlaybackCommand: (videoId: string, action: PlaybackCommand["action"]) => void;
  addGroupWithVideo: (name: string, videoId: string) => Promise<void>;
};

export type AppStoreSet = (
  partial: Partial<AppState> | ((state: AppState) => Partial<AppState>),
) => void;
export type AppStoreGet = () => AppState;
