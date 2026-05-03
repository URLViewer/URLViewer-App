import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@web/components/Icon";
import { resolvePlaybackPlugin } from "@web/plugins/registry";
import type { PlaybackFailure } from "@web/plugins/types";
import { useAppStore } from "@web/store/appStore";

type PlaybackErrorState = {
  videoId: string;
  message: string;
};

type SeekPreviewState = {
  visible: boolean;
  x: number;
  time: number;
  imageDataUrl: string | null;
};

const RESUME_SAVE_INTERVAL_MS = 2000;
const CONTROL_HIDE_DELAY_MS = 3000;
const FLOATING_CLOSE_MS = 140;
const GROUP_NAME_MIN = 1;
const GROUP_NAME_MAX = 10;
const PREVIEW_CANVAS_WIDTH = 240;
const PREVIEW_CANVAS_HEIGHT = 135;
const PREVIEW_JPEG_QUALITY = 0.9;

function messageForPlaybackFailure(failure: PlaybackFailure): string {
  if (failure.kind === "access-error") {
    return "アクセスエラー: コンテンツを取得できませんでした。";
  }
  if (failure.kind === "not-playable") {
    return "再生不可: フォーマット非対応、または動画コンテンツではありません。";
  }
  return "不明なエラー: 再生に失敗しました。";
}

function detailForPlaybackFailure(
  failure: PlaybackFailure,
  sourceUrl: string,
  mediaState?: {
    currentSrc?: string;
    readyState?: number;
    networkState?: number;
  },
): string | undefined {
  const maybeDetail = (failure as PlaybackFailure & { detail?: string }).detail?.trim();
  const mediaLine = mediaState
    ? `media currentSrc=${mediaState.currentSrc ?? ""} readyState=${mediaState.readyState ?? -1} networkState=${mediaState.networkState ?? -1}`
    : "";
  if (maybeDetail) {
    return ["source=" + sourceUrl, mediaLine, maybeDetail].filter(Boolean).join("\n");
  }
  return ["source=" + sourceUrl, mediaLine].filter(Boolean).join("\n");
}

async function enrichPlaybackFailureDetail(
  sourceUrl: string,
  baseDetail: string | undefined,
  timeoutMs: number,
): Promise<string | undefined> {
  const lines: string[] = [];
  if (baseDetail) {
    lines.push(baseDetail);
  }
  try {
    const probe = await window.m3u8Viewer.videoSource.validate({
      url: sourceUrl,
      timeoutMs: Math.max(1000, Math.min(timeoutMs, 8000)),
    });
    const probeLine =
      probe.status === "valid"
        ? `probe status=valid normalized=${probe.normalizedUrl}`
        : `probe status=invalid reason=${probe.reason}${probe.detail ? ` detail=${probe.detail}` : ""}`;
    if (!lines.some((line) => line.includes("probe status="))) {
      lines.push(probeLine);
    }
  } catch (error) {
    const probeLine = `probe status=error message=${error instanceof Error ? error.message : "unknown-error"}`;
    if (!lines.some((line) => line.includes("probe status="))) {
      lines.push(probeLine);
    }
  }

  try {
    const traceResult = await window.m3u8Viewer.videoSource.getPlaybackTrace(sourceUrl);
    if (traceResult.status === "found" && !lines.some((line) => line.includes("trace phase="))) {
      const trace = traceResult.trace;
      const statusPart = typeof trace.statusCode === "number" ? ` status=${trace.statusCode}` : "";
      const errorPart = trace.error ? ` error=${trace.error}` : "";
      const cachePart = typeof trace.fromCache === "boolean" ? ` cache=${trace.fromCache}` : "";
      const resourcePart = trace.resourceType ? ` resource=${trace.resourceType}` : "";
      const referrerPart = trace.referrer ? ` referrer=${trace.referrer}` : "";
      const headersPart = trace.responseHeaders
        ? ` headers=${Object.entries(trace.responseHeaders)
            .slice(0, 8)
            .map(([key, value]) => `${key}:${value}`)
            .join(" | ")}`
        : "";
      lines.push(
        `trace phase=${trace.phase} method=${trace.method}${statusPart}${errorPart}${cachePart}${resourcePart}${referrerPart} at=${trace.capturedAt}${headersPart}`,
      );
    }
  } catch (error) {
    if (!lines.some((line) => line.includes("trace phase="))) {
      lines.push(`trace error=${error instanceof Error ? error.message : "unknown-error"}`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : undefined;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoPlayer() {
  const tabs = useAppStore((state) => state.library.tabs);
  const videos = useAppStore((state) => state.library.videos);
  const saveResume = useAppStore((state) => state.saveResume);
  const markPlaybackFailed = useAppStore((state) => state.markPlaybackFailed);
  const setPlaybackState = useAppStore((state) => state.setPlaybackState);
  const playbackCommand = useAppStore((state) => state.playbackCommand);
  const plugins = useAppStore((state) => state.plugins);
  const groups = useAppStore((state) => state.library.groups);
  const addGroupWithVideo = useAppStore((state) => state.addGroupWithVideo);
  const setVideoDuration = useAppStore((state) => state.setVideoDuration);
  const validationTimeoutMs = useAppStore((state) => state.settings.validationTimeoutMs);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResumeSaveAtRef = useRef(0);
  const resumeAtLoadRef = useRef(0);
  const isSeekingRef = useRef(false);
  const seekRafRef = useRef<number | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const wasPlayingBeforeSeekRef = useRef(false);
  const lastHandledCommandSeqRef = useRef(0);
  const groupMenuRef = useRef<HTMLDivElement | null>(null);
  const groupCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLInputElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRequestTokenRef = useRef(0);
  const previewReadyRef = useRef(false);
  const previewCaptureRunningRef = useRef(false);
  const previewQueuedTargetRef = useRef<{ time: number; x: number } | null>(null);

  const [error, setError] = useState<PlaybackErrorState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [groupInput, setGroupInput] = useState("");
  const [groupMenuVisible, setGroupMenuVisible] = useState(false);
  const [groupMenuClosing, setGroupMenuClosing] = useState(false);
  const [seekPreview, setSeekPreview] = useState<SeekPreviewState>({
    visible: false,
    x: 0,
    time: 0,
    imageDataUrl: null,
  });

  const activeVideo = useMemo(
    () => videos.find((video) => video.id === tabs.activeVideoId),
    [tabs.activeVideoId, videos],
  );

  const activeVideoId = activeVideo?.id ?? null;
  const sourceUrl = activeVideo?.sourceUrl ?? null;
  const visibleError = activeVideoId && error?.videoId === activeVideoId ? error.message : "";
  const inputNormalized = groupInput.trim().replace(/\s+/g, " ");
  const inputLower = inputNormalized.toLowerCase();
  const displayedGroups = useMemo(() => {
    const mapped = groups.map((group) => ({
      ...group,
      matched: inputLower.length > 0 && group.name.toLowerCase().includes(inputLower),
      isFavorite: group.builtin === "favorites",
    }));

    return mapped.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }
      return Number(b.matched) - Number(a.matched) || a.name.localeCompare(b.name);
    });
  }, [groups, inputLower]);
  const hasExactGroup = useMemo(
    () => groups.some((group) => group.name.trim().toLowerCase() === inputLower && inputLower.length > 0),
    [groups, inputLower],
  );
  const canCreateGroupFromInput =
    inputNormalized.length >= GROUP_NAME_MIN && inputNormalized.length <= GROUP_NAME_MAX && !hasExactGroup;
  const isActiveVideoGrouped = useMemo(
    () => Boolean(activeVideoId && groups.some((group) => group.videoIds.includes(activeVideoId))),
    [activeVideoId, groups],
  );

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleAutoHide = useCallback(() => {
    clearHideTimer();

    if (!isPlaying) {
      return;
    }

    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, CONTROL_HIDE_DELAY_MS);
  }, [clearHideTimer, isPlaying]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleAutoHide();
  }, [scheduleAutoHide]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }, []);

  const skipBy = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const next = Math.max(0, Math.min(video.duration || Infinity, video.currentTime + seconds));
    video.currentTime = next;
    setCurrentTime(next);
  }, []);

  const setRate = useCallback((rate: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const setVolumeValue = useCallback((next: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const normalized = Math.max(0, Math.min(1, next));
    video.volume = normalized;
    if (normalized > 0 && video.muted) {
      video.muted = false;
    }

    setVolume(normalized);
    setIsMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (!document.fullscreenElement) {
      await container.requestFullscreen();
      return;
    }

    if (document.fullscreenElement === container) {
      await document.exitFullscreen();
    }
  }, []);

  const applyPendingSeek = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const next = pendingSeekRef.current;
    if (next === null) {
      return;
    }

    pendingSeekRef.current = null;
    if (typeof video.fastSeek === "function") {
      video.fastSeek(next);
    } else {
      video.currentTime = next;
    }
  }, []);

  const scheduleSeek = useCallback(() => {
    if (seekRafRef.current !== null) {
      return;
    }

    seekRafRef.current = window.requestAnimationFrame(() => {
      seekRafRef.current = null;
      applyPendingSeek();
    });
  }, [applyPendingSeek]);

  const captureSeekPreviewImage = useCallback(async (time: number, x: number) => {
    const previewVideo = previewVideoRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!previewVideo || !previewCanvas || !Number.isFinite(time) || time < 0) {
      setSeekPreview((current) => ({ ...current, visible: true, x, time }));
      return;
    }
    if (!previewReadyRef.current || previewVideo.readyState < HTMLMediaElement.HAVE_METADATA) {
      setSeekPreview((current) => ({ ...current, visible: true, x, time }));
      return;
    }

    const token = ++previewRequestTokenRef.current;

    try {
      await new Promise<void>((resolve, reject) => {
        const onSeeked = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error("preview-seek-failed"));
        };
        const timeout = window.setTimeout(() => {
          cleanup();
          reject(new Error("preview-timeout"));
        }, 450);
        const cleanup = () => {
          window.clearTimeout(timeout);
          previewVideo.removeEventListener("seeked", onSeeked);
          previewVideo.removeEventListener("error", onError);
        };
        previewVideo.addEventListener("seeked", onSeeked, { once: true });
        previewVideo.addEventListener("error", onError, { once: true });
        if (typeof previewVideo.fastSeek === "function") {
          previewVideo.fastSeek(time);
        } else {
          previewVideo.currentTime = time;
        }
      });

      if (token !== previewRequestTokenRef.current) {
        return;
      }

      const width = PREVIEW_CANVAS_WIDTH;
      const height = PREVIEW_CANVAS_HEIGHT;
      previewCanvas.width = width;
      previewCanvas.height = height;
      const ctx = previewCanvas.getContext("2d");
      if (!ctx) {
        throw new Error("preview-context-failed");
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);

      const sourceWidth = previewVideo.videoWidth;
      const sourceHeight = previewVideo.videoHeight;
      if (!sourceWidth || !sourceHeight) {
        throw new Error("preview-size-unavailable");
      }

      const scale = Math.min(width / sourceWidth, height / sourceHeight);
      const drawWidth = Math.round(sourceWidth * scale);
      const drawHeight = Math.round(sourceHeight * scale);
      const offsetX = Math.floor((width - drawWidth) / 2);
      const offsetY = Math.floor((height - drawHeight) / 2);
      ctx.drawImage(previewVideo, offsetX, offsetY, drawWidth, drawHeight);
      const imageDataUrl = previewCanvas.toDataURL("image/jpeg", PREVIEW_JPEG_QUALITY);
      setSeekPreview((current) => ({ ...current, visible: true, imageDataUrl }));
    } catch {
      if (token !== previewRequestTokenRef.current) {
        return;
      }
      setSeekPreview((current) => ({ ...current, visible: true }));
    }
  }, []);

  const scheduleSeekPreviewCapture = useCallback((time: number, x: number) => {
    previewQueuedTargetRef.current = { time, x };
    if (previewCaptureRunningRef.current) {
      return;
    }

    previewCaptureRunningRef.current = true;
    void (async () => {
      while (previewQueuedTargetRef.current) {
        const target = previewQueuedTargetRef.current;
        previewQueuedTargetRef.current = null;
        await captureSeekPreviewImage(target.time, target.x);
      }
      previewCaptureRunningRef.current = false;
    })();
  }, [captureSeekPreviewImage]);

  const handleSeekHover = useCallback((clientX: number) => {
    const progressNode = progressRef.current;
    if (!progressNode || !Number.isFinite(duration) || duration <= 0) {
      setSeekPreview((current) => ({ ...current, visible: false }));
      return;
    }

    const rect = progressNode.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(rect.width, 1)));
    const time = ratio * duration;
    const x = ratio * rect.width;
    setSeekPreview((current) => ({ ...current, visible: true, x, time }));
    scheduleSeekPreviewCapture(time, x);
  }, [duration, scheduleSeekPreviewCapture]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!groupMenuRef.current) {
        return;
      }

      if (!groupMenuRef.current.contains(event.target as Node)) {
        setGroupMenuClosing(true);
        groupCloseTimerRef.current = setTimeout(() => {
          setGroupMenuClosing(false);
          setGroupMenuVisible(false);
          groupCloseTimerRef.current = null;
        }, FLOATING_CLOSE_MS);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      showControls();
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [showControls]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isProgressRange =
        target instanceof HTMLInputElement &&
        target.type === "range" &&
        (target.classList.contains("viewer-progress") || target.classList.contains("viewer-volume"));
      if (
        target &&
        !isProgressRange &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      switch (event.code) {
        case "Space":
        case "KeyK":
          event.preventDefault();
          togglePlay();
          showControls();
          break;
        case "ArrowLeft":
          event.preventDefault();
          skipBy(-5);
          showControls();
          break;
        case "ArrowRight":
          event.preventDefault();
          skipBy(5);
          showControls();
          break;
        case "KeyJ":
          event.preventDefault();
          skipBy(-10);
          showControls();
          break;
        case "KeyL":
          event.preventDefault();
          skipBy(10);
          showControls();
          break;
        case "KeyM":
          event.preventDefault();
          toggleMute();
          showControls();
          break;
        case "KeyF":
          event.preventDefault();
          void toggleFullscreen();
          showControls();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showControls, skipBy, toggleFullscreen, toggleMute, togglePlay]);

  useEffect(() => {
    isSeekingRef.current = isSeeking;
  }, [isSeeking]);

  useEffect(() => {
    resumeAtLoadRef.current = activeVideo?.resumeSeconds ?? 0;
  }, [activeVideoId, activeVideo?.resumeSeconds]);

  useEffect(() => {
    if (!sourceUrl) {
      previewReadyRef.current = false;
      previewRequestTokenRef.current += 1;
      previewVideoRef.current = null;
      return;
    }

    previewReadyRef.current = false;
    previewRequestTokenRef.current += 1;
    const previewVideo = document.createElement("video");
    previewVideo.muted = true;
    previewVideo.preload = "auto";
    previewVideo.playsInline = true;
    previewVideoRef.current = previewVideo;
    setSeekPreview((current) => ({ ...current, imageDataUrl: null }));

    const onReady = () => {
      previewReadyRef.current = true;
    };
    const onError = () => {
      previewReadyRef.current = false;
    };

    previewVideo.addEventListener("loadedmetadata", onReady);
    previewVideo.addEventListener("canplay", onReady);
    previewVideo.addEventListener("error", onError);

    let unmountPreview: void | (() => void);
    const previewPlugin = resolvePlaybackPlugin(sourceUrl, plugins);
    if (previewPlugin) {
      unmountPreview = previewPlugin.mount({
        video: previewVideo,
        sourceUrl,
        onFatalError: () => {
          previewReadyRef.current = false;
        },
      });
    } else {
      previewVideo.src = sourceUrl;
    }

    return () => {
      previewRequestTokenRef.current += 1;
      previewReadyRef.current = false;
      previewVideo.removeEventListener("loadedmetadata", onReady);
      previewVideo.removeEventListener("canplay", onReady);
      previewVideo.removeEventListener("error", onError);
      previewVideo.pause();
      if (typeof unmountPreview === "function") {
        unmountPreview();
      } else {
        previewVideo.removeAttribute("src");
        previewVideo.load();
      }
      if (previewVideoRef.current === previewVideo) {
        previewVideoRef.current = null;
      }
    };
  }, [plugins, sourceUrl]);

  useEffect(() => {
    if (!playbackCommand) {
      return;
    }

    if (playbackCommand.seq === lastHandledCommandSeqRef.current) {
      return;
    }

    if (playbackCommand.videoId !== activeVideoId) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    lastHandledCommandSeqRef.current = playbackCommand.seq;

    if (playbackCommand.action === "toggle") {
      if (video.paused) {
        void video.play();
      } else {
        video.pause();
      }
      return;
    }

    if (playbackCommand.action === "play") {
      void video.play();
      return;
    }

    video.pause();
  }, [activeVideoId, playbackCommand]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const videoIdSnapshot = activeVideoId;
    const resumeAtStart = resumeAtLoadRef.current;

    if (!videoIdSnapshot || !sourceUrl) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      setPlaybackState({ videoId: null, status: "idle" });
      return;
    }

    lastResumeSaveAtRef.current = 0;

    const onLoadedMetadata = () => {
      if (resumeAtStart > 1 && resumeAtStart < (video.duration || Infinity)) {
        video.currentTime = resumeAtStart;
      }

      setDuration(video.duration || 0);
      setCurrentTime(video.currentTime || 0);
      setPlaybackRate(video.playbackRate);
      setVolume(video.volume);
      setIsMuted(video.muted);
      if (videoIdSnapshot && video.duration > 0) {
        void setVideoDuration(videoIdSnapshot, video.duration);
      }
    };

    const onDurationChange = () => {
      setDuration(video.duration || 0);
    };

    const onTimeUpdate = () => {
      if (!isSeekingRef.current) {
        setCurrentTime(video.currentTime || 0);
      }

      const now = Date.now();
      if (now - lastResumeSaveAtRef.current < RESUME_SAVE_INTERVAL_MS) {
        return;
      }

      lastResumeSaveAtRef.current = now;
      void saveResume(videoIdSnapshot, video.currentTime);
    };

    const onPlay = () => {
      setIsPlaying(true);
      setPlaybackState({ videoId: videoIdSnapshot, status: "playing" });
    };

    const onPause = () => {
      setIsPlaying(false);
      setControlsVisible(true);
      setPlaybackState({ videoId: videoIdSnapshot, status: "paused" });
    };

    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setControlsVisible(true);
      setPlaybackState({ videoId: videoIdSnapshot, status: "paused" });
    };

    const onFatalPlaybackError = (failure: PlaybackFailure) => {
      setPlaybackState({ videoId: videoIdSnapshot, status: "paused" });
      setError({
        videoId: videoIdSnapshot,
        message: messageForPlaybackFailure(failure),
      });
      void (async () => {
        const detail = detailForPlaybackFailure(failure, sourceUrl, {
          currentSrc: video.currentSrc,
          readyState: video.readyState,
          networkState: video.networkState,
        });
        const enriched = await enrichPlaybackFailureDetail(
          sourceUrl,
          detail,
          validationTimeoutMs,
        );
        await markPlaybackFailed(videoIdSnapshot, failure.kind, enriched);
      })();
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("ended", onEnded);
    const playbackPlugin = resolvePlaybackPlugin(sourceUrl, plugins);
    if (!playbackPlugin) {
      onFatalPlaybackError({ kind: "not-playable" });
      return () => undefined;
    }
    const unmountPlayback = playbackPlugin.mount({
      video,
      sourceUrl,
      onFatalError: onFatalPlaybackError,
    });

    return () => {
      void saveResume(videoIdSnapshot, video.currentTime);

      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("ended", onEnded);

      if (typeof unmountPlayback === "function") {
        unmountPlayback();
      }

      setPlaybackState({ videoId: null, status: "idle" });
    };
  }, [
    activeVideoId,
    markPlaybackFailed,
    plugins,
    validationTimeoutMs,
    saveResume,
    setPlaybackState,
    setVideoDuration,
    sourceUrl,
  ]);

  useEffect(() => {
    scheduleAutoHide();
  }, [isPlaying, scheduleAutoHide]);

  useEffect(() => {
    return () => {
      clearHideTimer();
      if (groupCloseTimerRef.current) {
        clearTimeout(groupCloseTimerRef.current);
      }
      if (seekRafRef.current !== null) {
        cancelAnimationFrame(seekRafRef.current);
      }
      previewRequestTokenRef.current += 1;
      previewQueuedTargetRef.current = null;
      previewCaptureRunningRef.current = false;
    };
  }, [clearHideTimer]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const closeGroupMenu = useCallback(() => {
    setGroupMenuClosing(true);
    groupCloseTimerRef.current = setTimeout(() => {
      setGroupMenuClosing(false);
      setGroupMenuVisible(false);
      groupCloseTimerRef.current = null;
    }, FLOATING_CLOSE_MS);
  }, []);

  const openGroupMenu = useCallback(() => {
    if (groupCloseTimerRef.current) {
      clearTimeout(groupCloseTimerRef.current);
      groupCloseTimerRef.current = null;
    }
    setGroupMenuClosing(false);
    setGroupMenuVisible(true);
  }, []);

  const handleCreateGroupFromInput = useCallback(async () => {
    if (!activeVideoId) {
      return;
    }

    if (!canCreateGroupFromInput) {
      return;
    }
    await addGroupWithVideo(inputNormalized, activeVideoId);
    setGroupInput("");
  }, [activeVideoId, addGroupWithVideo, canCreateGroupFromInput, inputNormalized]);

  return (
    <section
      ref={containerRef}
      className="viewer-shell"
      tabIndex={0}
      onMouseMove={showControls}
    >
      <div className="viewer-stage" onDoubleClick={() => void toggleFullscreen()}>
        <video ref={videoRef} className="viewer-video" onClick={togglePlay} />
        <canvas ref={previewCanvasRef} className="hidden" aria-hidden="true" />
        <div className="viewer-infobar-top">
          <span className="viewer-info-title-light" title={activeVideo?.label ?? ""}>
            {activeVideo?.label ?? "動画なし"}
          </span>
          <div className="relative">
            <button
              className={`icon-btn-sm ${isActiveVideoGrouped ? "bookmark-btn-active" : ""}`}
              title="グループに追加"
              disabled={!activeVideoId}
              onClick={() => {
                if (!activeVideoId) {
                  return;
                }
                if (groupMenuVisible) {
                  closeGroupMenu();
                } else {
                  openGroupMenu();
                }
              }}
            >
              <Icon name={isActiveVideoGrouped ? "bookmark-solid" : "bookmark"} className="h-4 w-4" />
            </button>

            {groupMenuVisible && (
              <div
                ref={groupMenuRef}
                className={`group-popover player-group-popover ${groupMenuClosing ? "floating-exit" : "floating-enter"}`}
                onClick={(event) => event.stopPropagation()}
              >
                <span className="group-popover-title">グループへ追加</span>
                <div className="group-simple-input-wrap">
                  <input
                    className="group-simple-input"
                    placeholder="グループ名 (1〜10文字)"
                    maxLength={GROUP_NAME_MAX}
                    value={groupInput}
                    onChange={(event) => setGroupInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleCreateGroupFromInput();
                      } else if (event.key === "Escape") {
                        closeGroupMenu();
                      }
                    }}
                  />
                </div>
                <div className="group-simple-list">
                  {displayedGroups.map((group) => {
                    const linked = Boolean(activeVideoId && group.videoIds.includes(activeVideoId));
                    const isFavorite = group.builtin === "favorites";
                    return (
                      <button
                        key={group.id}
                        className={`group-simple-item ${linked ? "group-simple-item-linked" : ""} ${
                          isFavorite ? "group-simple-item-favorite" : ""
                        }`}
                        title={linked ? "クリックでこのグループから外す" : "クリックでこのグループに追加"}
                        aria-pressed={linked}
                        onClick={() => activeVideoId && void addGroupWithVideo(group.name, activeVideoId)}
                      >
                        <span className="group-simple-item-label truncate">
                          {isFavorite && <Icon name="star-solid" className="h-3.5 w-3.5 text-amber-500" />}
                          <span className="truncate">{group.name}</span>
                        </span>
                        <span
                          className={`group-simple-item-meta ${
                            linked ? "group-simple-item-meta-linked" : "group-simple-item-meta-unlinked"
                          }`}
                        >
                          {linked && <Icon name="check" className="h-3 w-3" />}
                          {linked ? "追加済み" : "未追加"}
                        </span>
                      </button>
                    );
                  })}
                  {displayedGroups.length === 0 && (
                    <div className="group-simple-empty">グループなし</div>
                  )}
                  {canCreateGroupFromInput && (
                    <button className="group-simple-item group-simple-item-create" onClick={() => void handleCreateGroupFromInput()}>
                      <span className="truncate">「{inputNormalized}」を新規作成して追加</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {visibleError && (
          <div className="absolute left-0 right-0 top-4 z-30 mx-auto w-fit rounded-full border border-slate-300 bg-white/95 px-3 py-1 text-xs text-slate-700 shadow-sm">
            {visibleError}
          </div>
        )}

        {!activeVideo && (
          <div className="absolute inset-0 grid place-items-center text-sm text-white/85">動画を開いてください</div>
        )}

        <div className={`viewer-controls-overlay ${controlsVisible || !isPlaying ? "viewer-controls-visible" : ""}`}>
          <div className="viewer-progress-wrap">
            <div className="viewer-progress-fill" style={{ width: `${progressPercent}%` }} />
            {seekPreview.visible && (
              <div
                className="viewer-seek-preview"
                style={{ left: `${seekPreview.x}px` }}
              >
                {seekPreview.imageDataUrl ? (
                  <img src={seekPreview.imageDataUrl} alt="" className="viewer-seek-preview-image" />
                ) : (
                  <div className="viewer-seek-preview-fallback">プレビューなし</div>
                )}
                <div className="viewer-seek-preview-time">{formatTime(seekPreview.time)}</div>
              </div>
            )}
            <input
              ref={progressRef}
              className="viewer-progress"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={isSeeking ? seekValue : currentTime}
              onMouseMove={(event) => handleSeekHover(event.clientX)}
              onMouseEnter={(event) => handleSeekHover(event.clientX)}
              onMouseLeave={() => {
                previewQueuedTargetRef.current = null;
                setSeekPreview((current) => ({ ...current, visible: false }));
              }}
              onPointerDown={() => {
                const video = videoRef.current;
                if (!video) {
                  return;
                }

                wasPlayingBeforeSeekRef.current = !video.paused;
                if (!video.paused) {
                  video.pause();
                }
                setIsSeeking(true);
              }}
              onChange={(event) => {
                const next = Number(event.target.value);
                setSeekValue(next);
                setCurrentTime(next);
                pendingSeekRef.current = next;
                scheduleSeek();
              }}
              onInput={(event) => {
                const next = Number((event.target as HTMLInputElement).value);
                setSeekValue(next);
                setCurrentTime(next);
                pendingSeekRef.current = next;
                scheduleSeek();
              }}
              onBlur={() => {
                const video = videoRef.current;
                setIsSeeking(false);
                applyPendingSeek();
                if (video && wasPlayingBeforeSeekRef.current) {
                  void video.play();
                }
                wasPlayingBeforeSeekRef.current = false;
              }}
              onPointerUp={() => {
                const video = videoRef.current;
                setIsSeeking(false);
                applyPendingSeek();
                if (video && wasPlayingBeforeSeekRef.current) {
                  void video.play();
                }
                wasPlayingBeforeSeekRef.current = false;
              }}
            />
          </div>

          <div className="viewer-toolbar">
            <div className="viewer-left-controls">
              <button className="player-btn" title="再生/停止 (Space/K)" onClick={togglePlay}>
                <Icon name={isPlaying ? "pause" : "play"} className="h-4 w-4" />
              </button>
              <button className="player-btn" title="-10秒 (J)" onClick={() => skipBy(-10)}>
                <Icon name="back10" className="h-4 w-4" />
              </button>
              <button className="player-btn" title="-5秒 (←)" onClick={() => skipBy(-5)}>
                <Icon name="back5" className="h-4 w-4" />
              </button>
              <button className="player-btn" title="+5秒 (→)" onClick={() => skipBy(5)}>
                <Icon name="fwd5" className="h-4 w-4" />
              </button>
              <button className="player-btn" title="+10秒 (L)" onClick={() => skipBy(10)}>
                <Icon name="fwd10" className="h-4 w-4" />
              </button>
              <span className="viewer-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="viewer-right-controls">
              <button className="player-btn" title="ミュート (M)" onClick={toggleMute}>
                <Icon name={isMuted || volume === 0 ? "mute" : "volume"} className="h-4 w-4" />
              </button>
              <input
                type="range"
                className="viewer-volume"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                style={{ "--volume-percent": `${(isMuted ? 0 : volume) * 100}%` } as CSSProperties}
                onChange={(event) => setVolumeValue(Number(event.target.value))}
              />
              <div className="viewer-speed-group">
                {[1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    className={`speed-chip ${playbackRate === rate ? "speed-chip-active" : ""}`}
                    onClick={() => setRate(rate)}
                    title={`${rate}x`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
              <button className="player-btn" title="全画面 (F)" onClick={() => void toggleFullscreen()}>
                <Icon name={isFullscreen ? "fullscreen-exit" : "fullscreen"} className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
