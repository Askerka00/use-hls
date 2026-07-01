<script setup lang="ts">
import { ref, computed } from 'vue';
import { useHls } from './hook/useHls';

// Default test stream (Big Buck Bunny)
const defaultStream = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
const streamUrlInput = ref(defaultStream);
const activeStream = ref(defaultStream);

const videoElement = ref<HTMLVideoElement | null>(null);

const {
  isBuffering,
  currentTime,
  duration,
  isPlaying,
  levels,
  currentLevel,
  error,
  changeQuality,
  retry,
} = useHls(videoElement, activeStream, {
  autoplay: true,
  maxRetries: 5,
  retryDelay: 3000,
});

// Update stream source
const loadNewStream = () => {
  if (streamUrlInput.value.trim()) {
    activeStream.value = streamUrlInput.value.trim();
  }
};

// Reset to default
const resetStream = () => {
  streamUrlInput.value = defaultStream;
  activeStream.value = defaultStream;
};

// Quality helper
const qualityLabel = computed(() => {
  if (currentLevel.value === -1) return 'Auto';
  const found = levels.value.find((l) => l.index === currentLevel.value);
  return found ? found.label : 'Auto';
});

// Format time
const formatTime = (secs: number) => {
  if (isNaN(secs)) return '0:00';
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// Play / Pause toggle
const togglePlay = () => {
  if (!videoElement.value) return;
  if (isPlaying.value) {
    videoElement.value.pause();
  } else {
    videoElement.value.play().catch(() => {});
  }
};

// Seek logic
const seekVideo = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (videoElement.value) {
    videoElement.value.currentTime = parseFloat(target.value);
  }
};

// Show quality dropdown
const showQualityDropdown = ref(false);
const toggleQualityDropdown = () => {
  showQualityDropdown.value = !showQualityDropdown.value;
};

const selectQuality = (index: number) => {
  changeQuality(index);
  showQualityDropdown.value = false;
};
</script>

<template>
  <div class="demo-container">
    <!-- Header -->
    <header class="header">
      <div class="logo-area">
        <span class="logo-icon">⚡</span>
        <h1>useHls Vue Hook</h1>
        <span class="badge">v1.0.0</span>
      </div>
      <p class="subtitle">Легковесный, реактивный и надежный хук для HLS-видеопотоков во Vue 3</p>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Player Panel -->
      <section class="player-card">
        <div class="video-wrapper">
          <video
            ref="videoElement"
            class="video-player"
            playsinline
            @click="togglePlay"
          ></video>

          <!-- Loading/Buffering Spinner -->
          <div v-if="isBuffering" class="overlay-spinner">
            <div class="spinner"></div>
          </div>

          <!-- Error Alert Overlay -->
          <div v-if="error" class="overlay-error">
            <div class="error-dialog">
              <span class="error-icon">⚠️</span>
              <h3>Произошла ошибка воспроизведения</h3>
              <p>{{ error.details }} (Тип: {{ error.type }})</p>
              <button class="btn-retry" @click="retry">Повторить попытку</button>
            </div>
          </div>

          <!-- Custom Control Bar -->
          <div class="controls-overlay">
            <div class="progress-bar-container">
              <input
                type="range"
                min="0"
                :max="duration || 100"
                step="0.1"
                :value="currentTime"
                class="progress-slider"
                @input="seekVideo"
              />
            </div>
            
            <div class="controls-row">
              <div class="controls-left">
                <button class="control-btn" @click="togglePlay">
                  <span v-if="isPlaying">⏸️</span>
                  <span v-else>▶️</span>
                </button>
                <span class="time-display">
                  {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
                </span>
              </div>

              <div class="controls-right">
                <!-- Quality Switcher -->
                <div class="quality-selector">
                  <button class="control-btn quality-btn" @click="toggleQualityDropdown">
                    ⚙️ {{ qualityLabel }}
                  </button>
                  <transition name="fade">
                    <div v-if="showQualityDropdown" class="quality-menu">
                      <button
                        :class="['menu-item', { active: currentLevel === -1 }]"
                        @click="selectQuality(-1)"
                      >
                        Auto
                      </button>
                      <button
                        v-for="level in levels"
                        :key="level.index"
                        :class="['menu-item', { active: currentLevel === level.index }]"
                        @click="selectQuality(level.index)"
                      >
                        {{ level.label }} ({{ (level.bitrate / 1000000).toFixed(1) }} Mbps)
                      </button>
                    </div>
                  </transition>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Source -->
        <div class="source-config">
          <div class="input-group">
            <label for="hls-url">HLS Поток (.m3u8)</label>
            <div class="input-row">
              <input
                id="hls-url"
                v-model="streamUrlInput"
                type="text"
                placeholder="Введите URL HLS потока"
                class="url-input"
              />
              <button class="btn-primary" @click="loadNewStream">Загрузить</button>
              <button class="btn-secondary" @click="resetStream">Сбросить</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Sidebar Hook State Details -->
      <section class="state-card">
        <h2 class="card-title">Реактивное состояние хука</h2>
        <div class="state-grid">
          <div class="state-item">
            <span class="state-label">isPlaying</span>
            <span :class="['state-value', { 'val-true': isPlaying }]">
              {{ isPlaying ? 'true' : 'false' }}
            </span>
          </div>

          <div class="state-item">
            <span class="state-label">isBuffering</span>
            <span :class="['state-value', { 'val-true': isBuffering }]">
              {{ isBuffering ? 'true' : 'false' }}
            </span>
          </div>

          <div class="state-item">
            <span class="state-label">currentTime</span>
            <span class="state-value val-num">{{ currentTime.toFixed(2) }}s</span>
          </div>

          <div class="state-item">
            <span class="state-label">duration</span>
            <span class="state-value val-num">{{ duration.toFixed(2) }}s</span>
          </div>

          <div class="state-item">
            <span class="state-label">currentLevel</span>
            <span class="state-value val-badge">{{ currentLevel === -1 ? 'Auto' : `Index ${currentLevel}` }}</span>
          </div>

          <div class="state-item">
            <span class="state-label">Levels count</span>
            <span class="state-value val-num">{{ levels.length }}</span>
          </div>
        </div>

        <!-- Error State Details -->
        <div class="error-status">
          <h4>Статус ошибок:</h4>
          <pre v-if="error" class="error-pre">{{ JSON.stringify(error, null, 2) }}</pre>
          <p v-else class="no-error">Ошибок нет. Все работает отлично.</p>
        </div>

        <!-- Active Source Display -->
        <div class="active-source">
          <h4>Текущий источник:</h4>
          <code class="source-code">{{ activeStream }}</code>
        </div>
      </section>
    </main>

    <footer class="footer">
      <p>Создано с ❤️ для портфолио Asker Aubakirov. Проект useHls.</p>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

.demo-container {
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #f3f4f6;
  min-height: 100vh;
  background: radial-gradient(circle at top right, #1f1235 0%, #0f0a1c 40%, #07050e 100%);
  padding: 2.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
  max-width: 800px;
}

.logo-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.logo-icon {
  font-size: 2.5rem;
  filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.6));
}

.header h1 {
  font-size: 2.75rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #a78bfa 0%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.badge {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.4);
  color: #c084fc;
}

.subtitle {
  font-size: 1.15rem;
  color: #9ca3af;
  margin: 0;
  font-weight: 300;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  width: 100%;
  max-width: 1200px;
  margin-bottom: 3rem;
}

@media (min-width: 900px) {
  .main-content {
    grid-template-columns: 2fr 1fr;
  }
}

/* Cards style (Glassmorphism) */
.player-card, .state-card {
  background: rgba(17, 12, 28, 0.65);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

/* Video Wrapper */
.video-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: pointer;
}

/* Buffer Spinner */
.overlay-spinner {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(139, 92, 246, 0.1);
  border-left-color: #a78bfa;
  border-right-color: #ec4899;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.5));
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error dialog */
.overlay-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(10, 6, 18, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  z-index: 10;
}

.error-dialog {
  text-align: center;
  max-width: 400px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 2rem;
  border-radius: 16px;
  backdrop-filter: blur(8px);
}

.error-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  display: inline-block;
}

.error-dialog h3 {
  margin: 0 0 0.5rem 0;
  color: #fca5a5;
}

.error-dialog p {
  font-size: 0.9rem;
  color: #f87171;
  margin-bottom: 1.5rem;
}

.btn-retry {
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  border: none;
  color: white;
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-retry:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
}

/* Custom Controls */
.controls-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 60%, transparent 100%);
  padding: 1.25rem 1rem 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: 5;
}

.video-wrapper:hover .controls-overlay {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.progress-bar-container {
  width: 100%;
  display: flex;
  align-items: center;
}

.progress-slider {
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.25);
  outline: none;
  cursor: pointer;
  transition: height 0.1s ease;
}

.progress-slider:hover {
  height: 8px;
}

.progress-slider::-webkit-slider-runnable-track {
  width: 100%;
  height: 100%;
}

.progress-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #a78bfa;
  box-shadow: 0 0 10px rgba(167, 139, 250, 0.8);
  transition: transform 0.1s ease;
}

.progress-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.controls-left, .controls-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.control-btn {
  background: transparent;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.time-display {
  font-size: 0.9rem;
  color: #d1d5db;
  font-weight: 300;
}

/* Quality Switcher */
.quality-selector {
  position: relative;
}

.quality-btn {
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.4);
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
}

.quality-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: #a78bfa;
}

.quality-menu {
  position: absolute;
  bottom: 120%;
  right: 0;
  background: rgba(15, 10, 25, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0.5rem;
  min-width: 140px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  z-index: 15;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.menu-item {
  background: transparent;
  border: none;
  color: #d1d5db;
  text-align: left;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-item:hover {
  background: rgba(139, 92, 246, 0.2);
  color: #fff;
}

.menu-item.active {
  background: rgba(139, 92, 246, 0.4);
  color: #c084fc;
  font-weight: 500;
}

/* Source Input Form */
.source-config {
  margin-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-size: 0.9rem;
  color: #9ca3af;
  font-weight: 500;
}

.input-row {
  display: flex;
  gap: 0.75rem;
}

.url-input {
  flex-grow: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0.6rem 0.9rem;
  color: white;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s ease;
}

.url-input:focus {
  border-color: #a78bfa;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
}

.btn-primary {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border: none;
  color: white;
  padding: 0.6rem 1.25rem;
  border-radius: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
}

.btn-secondary {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #d1d5db;
  padding: 0.6rem 1.25rem;
  border-radius: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
}

/* Sidebar State Card */
.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.75rem;
  color: #fff;
}

.state-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 900px) {
  .state-grid {
    grid-template-columns: 1fr;
  }
}

.state-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  padding: 0.75rem 1rem;
  border-radius: 10px;
}

.state-label {
  font-size: 0.85rem;
  color: #9ca3af;
  font-family: monospace;
}

.state-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #f3f4f6;
}

.state-value.val-true {
  color: #34d399;
}

.state-value.val-num {
  font-family: monospace;
}

.state-value.val-badge {
  background: rgba(236, 72, 153, 0.15);
  border: 1px solid rgba(236, 72, 153, 0.3);
  padding: 0.1rem 0.5rem;
  border-radius: 6px;
  color: #f472b6;
  font-size: 0.8rem;
}

/* Error status container */
.error-status {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  margin-top: 1rem;
  padding-top: 1rem;
}

.error-status h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #9ca3af;
}

.error-pre {
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #f87171;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-family: monospace;
  overflow-x: auto;
  margin: 0;
}

.no-error {
  color: #34d399;
  font-size: 0.85rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.no-error::before {
  content: "✓";
  font-weight: 700;
}

/* Active Source info */
.active-source {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  margin-top: 1rem;
  padding-top: 1rem;
}

.active-source h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #9ca3af;
}

.source-code {
  font-family: monospace;
  font-size: 0.75rem;
  word-break: break-all;
  background: rgba(0, 0, 0, 0.25);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  display: block;
  color: #a78bfa;
}

.footer {
  margin-top: 4rem;
  font-size: 0.85rem;
  color: #4b5563;
  text-align: center;
}

/* Fade animation */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
