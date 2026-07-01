import { ref, watch, onUnmounted, Ref, toValue, MaybeRefOrGetter } from 'vue';
import Hls from 'hls.js';

export interface UseHlsOptions {
  /** hls.js configuration options */
  config?: Partial<Hls.Config>;
  /** Automatically play the video once it is loaded */
  autoplay?: boolean;
  /** Max retries for network connection recovery */
  maxRetries?: number;
  /** Delay in milliseconds between retries */
  retryDelay?: number;
}

export interface HlsQualityLevel {
  index: number;
  width: number;
  height: number;
  bitrate: number;
  label: string;
}

export interface HlsErrorData {
  type: string;
  details: string;
  fatal: boolean;
}

export function useHls(
  videoRef: Ref<HTMLVideoElement | null | undefined>,
  src: MaybeRefOrGetter<string | null | undefined>,
  options: UseHlsOptions = {}
) {
  const {
    config = {},
    autoplay = false,
    maxRetries = 5,
    retryDelay = 3000,
  } = options;

  const hls = ref<Hls | null>(null);
  const isBuffering = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const isPlaying = ref(false);
  const levels = ref<HlsQualityLevel[]>([]);
  const currentLevel = ref(-1);
  const error = ref<HlsErrorData | null>(null);

  let retryCount = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  // Clean up Hls instance and DOM event listeners
  const destroyHls = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    if (hls.value) {
      hls.value.destroy();
      hls.value = null;
    }

    // Reset reactive states
    isBuffering.value = false;
    levels.value = [];
    currentLevel.value = -1;
    error.value = null;
    retryCount = 0;
  };

  const handleVideoEvents = (video: HTMLVideoElement, action: 'add' | 'remove') => {
    const method = action === 'add' ? 'addEventListener' : 'removeEventListener';

    const onWaiting = () => { isBuffering.value = true; };
    const onPlaying = () => { isBuffering.value = false; isPlaying.value = true; };
    const onPause = () => { isPlaying.value = false; };
    const onTimeUpdate = () => { currentTime.value = video.currentTime; };
    const onDurationChange = () => { duration.value = video.duration; };
    const onSeeking = () => { isBuffering.value = true; };
    const onSeeked = () => { isBuffering.value = false; };

    video[method]('waiting', onWaiting);
    video[method]('playing', onPlaying);
    video[method]('pause', onPause);
    video[method]('timeupdate', onTimeUpdate);
    video[method]('durationchange', onDurationChange);
    video[method]('seeking', onSeeking);
    video[method]('seeked', onSeeked);

    return () => {
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('seeked', onSeeked);
    };
  };

  let cleanVideoListeners: (() => void) | null = null;

  const initHls = (video: HTMLVideoElement, streamUrl: string) => {
    destroyHls();

    if (cleanVideoListeners) {
      cleanVideoListeners();
    }
    cleanVideoListeners = handleVideoEvents(video, 'add');

    // Check native HLS support (mostly for Safari)
    if (video.canPlayType('application/x-mpegURL') || video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      if (autoplay) {
        video.play().catch(() => {});
      }
      return;
    }

    if (!Hls.isSupported()) {
      error.value = {
        type: 'SUPPORT_ERROR',
        details: 'HLS is not supported in this browser.',
        fatal: true,
      };
      return;
    }

    const hlsInstance = new Hls({
      ...config,
    });

    hlsInstance.attachMedia(video);

    hlsInstance.on(Hls.Events.MEDIA_ATTACHED, () => {
      hlsInstance.loadSource(streamUrl);
    });

    hlsInstance.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
      levels.value = data.levels.map((level, index) => ({
        index,
        width: level.width || 0,
        height: level.height || 0,
        bitrate: level.bitrate,
        label: level.name || `${level.height || level.width || 'Unknown'}p`,
      }));
      currentLevel.value = hlsInstance.currentLevel;

      if (autoplay) {
        video.play().catch(() => {});
      }
    });

    hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
      currentLevel.value = data.level;
    });

    hlsInstance.on(Hls.Events.ERROR, (_, data) => {
      error.value = {
        type: data.type,
        details: data.details,
        fatal: data.fatal,
      };

      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('Fatal network error encountered, attempting recovery...', data);
            attemptReconnect();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('Fatal media error encountered, attempting recovery...', data);
            hlsInstance.recoverMediaError();
            break;
          default:
            console.error('Unrecoverable fatal error:', data);
            destroyHls();
            break;
        }
      }
    });

    hls.value = hlsInstance;
  };

  const attemptReconnect = () => {
    if (!hls.value) return;

    if (retryCount < maxRetries) {
      retryCount++;
      isBuffering.value = true;
      console.log(`Reconnecting attempt ${retryCount}/${maxRetries} in ${retryDelay}ms...`);
      
      retryTimer = setTimeout(() => {
        if (hls.value) {
          hls.value.startLoad();
        }
      }, retryDelay);
    } else {
      console.error('Max network reconnect retries reached.');
      error.value = {
        type: 'RECONNECT_ERROR',
        details: 'Failed to reconnect after maximum retries.',
        fatal: true,
      };
      destroyHls();
    }
  };

  const changeQuality = (levelIndex: number) => {
    if (hls.value) {
      hls.value.currentLevel = levelIndex;
      currentLevel.value = levelIndex;
    }
  };

  const retry = () => {
    const video = videoRef.value;
    const url = toValue(src);
    if (video && url) {
      initHls(video, url);
    }
  };

  watch(
    [() => videoRef.value, () => toValue(src)],
    ([video, url]) => {
      if (video && url) {
        initHls(video, url);
      } else {
        destroyHls();
        if (cleanVideoListeners) {
          cleanVideoListeners();
          cleanVideoListeners = null;
        }
      }
    },
    { immediate: true }
  );

  onUnmounted(() => {
    destroyHls();
    if (cleanVideoListeners) {
      cleanVideoListeners();
      cleanVideoListeners = null;
    }
  });

  return {
    hls,
    isBuffering,
    currentTime,
    duration,
    isPlaying,
    levels,
    currentLevel,
    error,
    changeQuality,
    retry,
  };
}
