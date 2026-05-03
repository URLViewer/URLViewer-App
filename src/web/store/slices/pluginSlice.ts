import {
  installPluginFromFolder as installPluginFromFolderAction,
  installPluginFromGit as installPluginFromGitAction,
  installPluginFromZip as installPluginFromZipAction,
  refreshPluginState as refreshPluginStateAction,
  removePluginState as removePluginStateAction,
  reorderPluginState as reorderPluginStateAction,
  setPluginEnabled as setPluginEnabledAction,
  updatePluginState as updatePluginStateAction,
} from "@web/store/pluginActions";
import type { AppState, AppStoreGet, AppStoreSet } from "@web/store/appStoreTypes";

type PluginActions = Pick<
  AppState,
  | "refreshPlugins"
  | "setPluginEnabled"
  | "reorderPlugins"
  | "removePlugin"
  | "updatePlugin"
  | "installPluginFromZip"
  | "installPluginFromFolder"
  | "installPluginFromGit"
>;

export function createPluginActions(set: AppStoreSet, get: AppStoreGet): PluginActions {
  return {
    async refreshPlugins() {
      const { plugins, pluginPanels } = await refreshPluginStateAction();
      set({ plugins, pluginPanels });
    },

    async setPluginEnabled(pluginId, enabled) {
      const { plugins, pluginPanels } = await setPluginEnabledAction(pluginId, enabled);
      set({ plugins, pluginPanels });
    },

    async reorderPlugins(orderedIds) {
      const { plugins, pluginPanels } = await reorderPluginStateAction(orderedIds);
      set({ plugins, pluginPanels });
    },

    async removePlugin(pluginId) {
      const { plugins, pluginPanels } = await removePluginStateAction(pluginId);
      set({ plugins, pluginPanels });
    },

    async updatePlugin(pluginId) {
      const { plugins, pluginPanels } = await updatePluginStateAction(pluginId);
      set({ plugins, pluginPanels });
    },

    async installPluginFromZip() {
      const result = await installPluginFromZipAction();
      if (!result.changed) {
        if (result.message) {
          set({ lastMessage: result.message });
          get().appendLog({ level: "error", scope: "plugins", message: result.message });
        }
        return;
      }
      const { plugins, pluginPanels } = await refreshPluginStateAction();
      set({ plugins, pluginPanels, lastMessage: result.message ?? "" });
      if (result.message) {
        get().appendLog({ level: "success", scope: "plugins", message: result.message });
      }
    },

    async installPluginFromFolder() {
      const result = await installPluginFromFolderAction();
      if (!result.changed) {
        if (result.message) {
          set({ lastMessage: result.message });
          get().appendLog({ level: "error", scope: "plugins", message: result.message });
        }
        return;
      }
      const { plugins, pluginPanels } = await refreshPluginStateAction();
      set({ plugins, pluginPanels, lastMessage: result.message ?? "" });
      if (result.message) {
        get().appendLog({ level: "success", scope: "plugins", message: result.message });
      }
    },

    async installPluginFromGit(url, branch, token) {
      const result = await installPluginFromGitAction({ url, branch, token });
      if (!result.changed) {
        if (result.message) {
          set({ lastMessage: result.message });
          get().appendLog({
            level: "error",
            scope: "plugins",
            message: result.message,
            detail: result.detail,
          });
        }
        return;
      }
      const { plugins, pluginPanels } = await refreshPluginStateAction();
      set({ plugins, pluginPanels, lastMessage: result.message ?? "" });
      if (result.message) {
        get().appendLog({ level: "success", scope: "plugins", message: result.message });
      }
    },
  };
}
