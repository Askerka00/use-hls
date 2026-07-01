# ⚡ useHls Vue Hook

[![Vue 3](https://img.shields.io/badge/Vue-3.x-4fc08d?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![hls.js](https://img.shields.io/badge/hls.js-1.x-orange?style=flat-square)](https://github.com/video-dev/hls.js/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-green?style=flat-square&logo=playwright)](https://playwright.dev/)

Легковесный, полностью реактивный и пуленепробиваемый Vue 3 Composition API хук для бесшовной интеграции HLS-видеопотоков (`.m3u8`) с использованием библиотеки **hls.js**.

---

## ✨ Почему `useHls`?

В отличие от стандартных решений или громоздких обёрток, `useHls` спроектирован с упором на производительность, чистоту памяти и готовые «киллер-фичи» для продакшена:

1. **🔒 Умный жизненный цикл:** Автоматическая инициализация, переподключение при смене источников и гарантированная очистка памяти (`hls.destroy()`) при размонтировании компонента для предотвращения утечек.
2. **🔌 Пуленепробиваемый авто-реконнект:** Автоматически восстанавливает соединение при сетевых сбоях (моргании интернета) с кастомизируемым количеством попыток и задержкой.
3. **📊 Реактивные уровни качества:** Возвращает массив доступных разрешений (`levels`) и индекс текущего качества (`currentLevel`), позволяя в два клика создать красивый кастомный переключатель (например, 720p/1080p/Auto).
4. **⚡ Полная реактивность:** Все ключевые состояния плеера (`isBuffering`, `currentTime`, `duration`, `isPlaying`, `error`) доступны как стандартные Vue `ref` переменные.
5. **🍏 Нативная поддержка Safari:** Автоматический фоллбек на нативное проигрывание HLS на устройствах Apple (iOS/macOS Safari), где `hls.js` не требуется.

---

## 🚀 Установка

Установите необходимые зависимости в ваш Vue 3 проект:

```bash
npm install hls.js
```

---

## 🛠️ Быстрый старт

Простейший пример реализации кастомного видеоплеера:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useHls } from './hook/useHls';

const videoRef = ref<HTMLVideoElement | null>(null);
const streamUrl = ref('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');

const {
  isBuffering,
  currentTime,
  duration,
  isPlaying,
  levels,
  currentLevel,
  changeQuality,
  error,
} = useHls(videoRef, streamUrl, {
  autoplay: true,
  maxRetries: 5,
  retryDelay: 3000,
});
</script>

<template>
  <div class="player-container">
    <div class="video-wrapper">
      <video ref="videoRef" class="video-element"></video>
      
      <!-- Индикатор буферизации -->
      <div v-if="isBuffering" class="loader">Загрузка...</div>
    </div>

    <!-- Контроллеры качества -->
    <div class="quality-controls">
      <button 
        :class="{ active: currentLevel === -1 }" 
        @click="changeQuality(-1)"
      >
        Auto
      </button>
      <button
        v-for="level in levels"
        :key="level.index"
        :class="{ active: currentLevel === level.index }"
        @click="changeQuality(level.index)"
      >
        {{ level.label }}
      </button>
    </div>

    <!-- Статус воспроизведения -->
    <p>Время: {{ currentTime.toFixed(1) }}s / {{ duration.toFixed(1) }}s</p>
    <p v-if="error" class="error-msg">Ошибка: {{ error.details }}</p>
  </div>
</template>

<style scoped>
/* Ваши стили */
</style>
```

---

## 📖 Спецификация API

### Параметры хука

`useHls(videoRef, src, options)`

| Параметр | Тип | Описание |
| :--- | :--- | :--- |
| `videoRef` | `Ref<HTMLVideoElement \| null \| undefined>` | Ссылка на DOM-элемент `<video>` |
| `src` | `MaybeRefOrGetter<string \| null \| undefined>` | Реактивный URL-адрес HLS-потока (`.m3u8`) |
| `options` | `UseHlsOptions` | (Опционально) Конфигурация хука и hls.js |

#### UseHlsOptions

```typescript
export interface UseHlsOptions {
  /** Кастомная конфигурация hls.js */
  config?: Partial<Hls.Config>;
  /** Автоматический запуск воспроизведения */
  autoplay?: boolean;
  /** Максимальное число попыток реконнекта при сетевых ошибках (default: 5) */
  maxRetries?: number;
  /** Задержка между попытками реконнекта в миллисекундах (default: 3000) */
  retryDelay?: number;
}
```

### Возвращаемые значения

| Переменная / Метод | Тип | Описание |
| :--- | :--- | :--- |
| `hls` | `Ref<Hls \| null>` | Ссылка на экземпляр `hls.js` для низкоуровневых операций |
| `isBuffering` | `Ref<boolean>` | `true`, если плеер буферизует видео в данный момент |
| `currentTime` | `Ref<number>` | Текущая секунда воспроизведения |
| `duration` | `Ref<number>` | Общая длительность видеопотока |
| `isPlaying` | `Ref<boolean>` | Статус воспроизведения (воспроизводится/на паузе) |
| `levels` | `Ref<HlsQualityLevel[]>` | Массив доступных уровней качества видеопотока |
| `currentLevel` | `Ref<number>` | Индекс активного уровня качества (`-1` означает авто-выбор) |
| `error` | `Ref<HlsErrorData \| null>` | Информация о последней фатальной ошибке |
| `changeQuality(index)` | `(index: number) => void` | Функция переключения качества (передайте `-1` для авто) |
| `retry()` | `() => void` | Функция ручного перезапуска инициализации HLS-потока |

---

## 🧪 Тестирование (E2E Playwright)

В проект встроены сквозные (E2E) тесты с использованием **Playwright**, которые проверяют автоматическое проигрывание, считывание метаданных, переключение уровней качества и эмуляцию отключения сети для проверки авто-реконнекта.

Для запуска тестов:

```bash
# Установка тестового окружения (включая Chromium)
npx playwright install chromium

# Запуск тестов
npm run test:e2e
```

---

## 🐳 Запуск через Docker (Демо-песочница)

Для быстрой демонстрации вы можете запустить демо-приложение в изолированном Docker-контейнере через `docker-compose`:

```bash
# Сборка и запуск контейнера
docker-compose up --build -d
```

После этого демо-приложение с кастомным плеером и панелью дебаггинга реактивного состояния будет доступно по адресу: **`http://localhost:8080`**.

---

## 👨‍💻 Автор

Разработано **Asker Aubakirov** в рамках демонстрации профессиональных навыков проектирования Vue-библиотек.
