import { ensureActiveTab } from "@web/store/libraryHelpers";
import {
  createQueue,
  mergePendingValidations,
  parseUrlInput,
  queueKeyForPending,
  updateQueueItem,
} from "@web/store/validationHelpers";
import {
  executeRegistrationJobs,
  type RegistrationJob,
} from "@web/store/registrationWorkflows";
import { runRendererInputPlugin } from "@web/plugins/registry";
import type { AppState, AppStoreGet, AppStoreSet } from "@web/store/appStoreTypes";

type RegistrationActions = Pick<
  AppState,
  "registerUrlInput" | "runPluginInput" | "validateAllPending" | "exportAliveUrls"
>;

export function createRegistrationActions(
  set: AppStoreSet,
  get: AppStoreGet,
): RegistrationActions {
  return {
    async registerUrlInput() {
      const { urlInput, settings, library, pendingValidations } = get();
      const urls = parseUrlInput(urlInput);
      if (urls.length === 0) {
        set({ lastMessage: "有効なURLが見つかりませんでした。" });
        return;
      }

      if (settings.validationMode === "manual") {
        const nextPending = mergePendingValidations(
          pendingValidations,
          urls.map((url) => ({ url })),
        );
        const queuedCount = nextPending.length - pendingValidations.length;
        set({
          urlInput: "",
          pendingValidations: nextPending,
          lastMessage: `検証待ちに追加: ${queuedCount}件（合計 ${nextPending.length}件）`,
        });
        return;
      }

      set({
        busy: true,
        lastMessage: `${urls.length}件のURLを登録中...`,
        validationQueue: createQueue(urls),
      });

      const jobs: RegistrationJob[] = urls.map((url) => ({ queueKey: url, url }));
      const { nextLibrary, successCount, failedJobs } = await executeRegistrationJobs({
        jobs,
        concurrency: settings.validationConcurrency,
        timeoutMs: settings.validationTimeoutMs,
        initialLibrary: library,
        onJobStatus: (queueKey, status, message) => {
          set((state) => ({
            validationQueue: updateQueueItem(state.validationQueue, queueKey, {
              status,
              message,
            }),
          }));
        },
        register: (payload) => window.m3u8Viewer.videoSource.register(payload),
      });

      const nextPreparedLibrary = ensureActiveTab(nextLibrary);
      await window.m3u8Viewer.library.save(nextPreparedLibrary);

      const failedCount = failedJobs.length;
      set({
        busy: false,
        library: nextPreparedLibrary,
        urlInput: "",
        lastMessage: `URL登録完了: 成功 ${successCount}件 / 失敗 ${failedCount}件`,
        validationQueue: {
          ...get().validationQueue,
          active: false,
        },
      });
    },

    async runPluginInput(pluginId) {
      const { pluginInput, settings, pendingValidations } = get();
      const value = pluginInput[pluginId]?.trim();
      if (!value) {
        set({ lastMessage: "プラグイン入力が空です。" });
        return;
      }

      set({ busy: true, lastMessage: "プラグイン入力を処理中..." });
      let urls: string[];
      try {
        urls = await runRendererInputPlugin(pluginId, value, settings.validationTimeoutMs);
      } catch (error) {
        const message =
          error instanceof Error &&
          (error.message === "plugin-timeout" || error.message === "plugin-entry-load-failed")
            ? error.message
            : "plugin-runtime-error";
        set({ busy: false, lastMessage: `プラグイン実行失敗: ${message}` });
        return;
      }
      if (urls.length === 0) {
        set({
          busy: false,
          lastMessage: "URL候補が見つかりませんでした。",
          pluginInput: { ...pluginInput, [pluginId]: "" },
        });
        return;
      }

      if (settings.validationMode === "manual") {
        const nextPending = mergePendingValidations(
          pendingValidations,
          urls.map((url) => ({ url, pluginId })),
        );
        const queuedCount = nextPending.length - pendingValidations.length;
        set({
          busy: false,
          pluginInput: { ...pluginInput, [pluginId]: "" },
          pendingValidations: nextPending,
          lastMessage: `プラグイン結果を検証待ちに追加: ${queuedCount}件（合計 ${nextPending.length}件）`,
        });
        return;
      }

      set({
        validationQueue: createQueue(urls),
        lastMessage: `${urls.length}件のURLを登録中...`,
      });

      const jobs: RegistrationJob[] = urls.map((url) => ({
        queueKey: url,
        url,
        pluginId,
      }));

      const { nextLibrary, successCount, failedJobs } = await executeRegistrationJobs({
        jobs,
        concurrency: settings.validationConcurrency,
        timeoutMs: settings.validationTimeoutMs,
        initialLibrary: get().library,
        onJobStatus: (queueKey, status, message) => {
          set((state) => ({
            validationQueue: updateQueueItem(state.validationQueue, queueKey, {
              status,
              message,
            }),
          }));
        },
        register: (payload) => window.m3u8Viewer.videoSource.register(payload),
      });

      const nextPreparedLibrary = ensureActiveTab(nextLibrary);
      await window.m3u8Viewer.library.save(nextPreparedLibrary);
      const failedCount = failedJobs.length;

      set({
        busy: false,
        library: nextPreparedLibrary,
        pluginInput: { ...pluginInput, [pluginId]: "" },
        lastMessage: `プラグイン登録完了: 成功 ${successCount}件 / 失敗 ${failedCount}件`,
        validationQueue: {
          ...get().validationQueue,
          active: false,
        },
      });
    },

    async validateAllPending() {
      const { pendingValidations, settings, library } = get();
      if (pendingValidations.length === 0) {
        if (settings.validationMode === "on-register") {
          const jobs: RegistrationJob[] = library.videos.map((video) => ({
            queueKey: video.id,
            url: video.sourceUrl,
            label: video.label,
            pluginId: video.addedByPluginId,
          }));

          if (jobs.length === 0) {
            set({ lastMessage: "再検証対象のURLがありません。" });
            return;
          }

          set({
            busy: true,
            lastMessage: `${jobs.length}件の再検証を実行中...`,
            validationQueue: createQueue(jobs.map((job) => job.queueKey)),
          });

          const { nextLibrary, successCount, failedJobs } = await executeRegistrationJobs({
            jobs,
            concurrency: settings.validationConcurrency,
            timeoutMs: settings.validationTimeoutMs,
            initialLibrary: library,
            onJobStatus: (queueKey, status, message) => {
              set((state) => ({
                validationQueue: updateQueueItem(state.validationQueue, queueKey, {
                  status,
                  message,
                }),
              }));
            },
            register: (payload) => window.m3u8Viewer.videoSource.register(payload),
          });

          const nextPreparedLibrary = ensureActiveTab(nextLibrary);
          await window.m3u8Viewer.library.save(nextPreparedLibrary);

          set({
            busy: false,
            library: nextPreparedLibrary,
            lastMessage: `再検証完了: 成功 ${successCount}件 / 失敗 ${failedJobs.length}件`,
            validationQueue: {
              ...get().validationQueue,
              active: false,
            },
          });
          return;
        }

        set({ lastMessage: "検証待ちのURLはありません。" });
        return;
      }

      const jobs: RegistrationJob[] = pendingValidations.map((item) => ({
        ...item,
        queueKey: queueKeyForPending(item),
      }));

      set({
        busy: true,
        lastMessage: `${jobs.length}件の検証を実行中...`,
        validationQueue: createQueue(jobs.map((job) => job.queueKey)),
      });

      const { nextLibrary, successCount, failedJobs } = await executeRegistrationJobs({
        jobs,
        concurrency: settings.validationConcurrency,
        timeoutMs: settings.validationTimeoutMs,
        initialLibrary: library,
        onJobStatus: (queueKey, status, message) => {
          set((state) => ({
            validationQueue: updateQueueItem(state.validationQueue, queueKey, {
              status,
              message,
            }),
          }));
        },
        register: (payload) => window.m3u8Viewer.videoSource.register(payload),
      });

      const nextPreparedLibrary = ensureActiveTab(nextLibrary);
      await window.m3u8Viewer.library.save(nextPreparedLibrary);

      const failedItems = failedJobs.map(({ url, pluginId }) => ({ url, pluginId }));
      set({
        busy: false,
        library: nextPreparedLibrary,
        pendingValidations: failedItems,
        lastMessage:
          failedItems.length === 0
            ? `検証完了: 成功 ${successCount}件`
            : `検証完了: 成功 ${successCount}件 / 失敗 ${failedItems.length}件（失敗分は待機に残しています）`,
        validationQueue: {
          ...get().validationQueue,
          active: false,
        },
      });
    },

    async exportAliveUrls() {
      const result = await window.m3u8Viewer.videoSource.exportAlive();
      if (result.status === "empty") {
        set({ lastMessage: "エクスポート対象URLがありません。" });
        return;
      }
      if (result.status === "cancelled") {
        set({ lastMessage: "エクスポートをキャンセルしました。" });
        return;
      }
      set({ lastMessage: `${result.count}件のURLをエクスポートしました。` });
    },
  };
}
