import type {
  LibraryState,
  RegisterVideoSourceInput,
  RegisterVideoSourceResult,
} from "@shared/types";
import { runWithConcurrency } from "@web/utils/concurrency";
import {
  mergeRegisteredVideo,
  type QueueStatus,
} from "@web/store/validationHelpers";

export type RegistrationJob = {
  queueKey: string;
  url: string;
  pluginId?: string;
  label?: string;
};

type ExecuteRegistrationJobsParams = {
  jobs: RegistrationJob[];
  concurrency: number;
  timeoutMs: number;
  initialLibrary: LibraryState;
  onJobStatus: (
    queueKey: string,
    status: QueueStatus,
    message: string,
  ) => void;
  register: (payload: RegisterVideoSourceInput) => Promise<RegisterVideoSourceResult>;
};

export async function executeRegistrationJobs(
  params: ExecuteRegistrationJobsParams,
): Promise<{
  nextLibrary: LibraryState;
  successCount: number;
  failedJobs: RegistrationJob[];
}> {
  const { jobs, concurrency, timeoutMs, initialLibrary, onJobStatus, register } = params;

  let workingLibrary = initialLibrary;
  const results = await runWithConcurrency<
    RegistrationJob,
    { job: RegistrationJob; result: RegisterVideoSourceResult }
  >(
    jobs,
    concurrency,
    async (job) => {
      onJobStatus(job.queueKey, "running", "検証中");

      const result = await register({
        url: job.url,
        label: job.label,
        timeoutMs,
        pluginId: job.pluginId,
      });

      onJobStatus(
        job.queueKey,
        result.status === "registered" ? "success" : "failed",
        result.status === "registered" ? "追加" : "失敗",
      );

      return { job, result };
    },
  );

  for (const { result } of results) {
    workingLibrary = mergeRegisteredVideo(workingLibrary, result);
  }

  const failedJobs = results
    .filter(({ result }) => result.status !== "registered")
    .map(({ job }) => job);

  return {
    nextLibrary: workingLibrary,
    successCount: results.length - failedJobs.length,
    failedJobs,
  };
}
