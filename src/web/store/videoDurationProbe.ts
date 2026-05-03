export async function probeVideoDurationSeconds(
  sourceUrl: string,
  timeoutMs = 12000,
): Promise<number | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    let resolved = false;

    const finalize = (value?: number) => {
      if (resolved) {
        return;
      }
      resolved = true;
      cleanup();
      resolve(value);
    };

    const onLoadedMetadata = () => {
      const duration = video.duration;
      if (Number.isFinite(duration) && duration > 0) {
        finalize(duration);
        return;
      }
      finalize(undefined);
    };
    const onError = () => finalize(undefined);

    const timer = setTimeout(() => finalize(undefined), timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("error", onError);
      video.preload = "none";
      video.removeAttribute("src");
      video.load();
    };

    video.preload = "metadata";
    video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.src = sourceUrl;
    video.load();
  });
}
