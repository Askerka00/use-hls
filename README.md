# ⚡ vue-use-hls

[![Vue 3](https://img.shields.io/badge/Vue-3.x-4fc08d?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/npm/v/vue-use-hls.svg?style=flat-square)](https://www.npmjs.com/package/vue-use-hls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-green?style=flat-square&logo=playwright)](https://playwright.dev/)

Легковесный и полностью реактивный Vue 3 Composition API хук для интеграции HLS-видеопотоков (`.m3u8`) с использованием библиотеки **hls.js**.

---

## ✨ Основные возможности

`vue-use-hls` разработан для простой и надежной работы с HLS во Vue-экосистеме:

1. **🔒 Управление жизненным циклом:** Автоматическая инициализация, переподключение при смене источников и очистка памяти (`hls.destroy()`) при размонтировании компонента для предотвращения утечек памяти.
2. **🔌 Автоматический реконнект:** Восстановление соединения при временных сетевых сбоях с настраиваемым количеством попыток и интервалом.
3. **📊 Реактивные уровни качества:** Доступ к списку уровней качества (`levels`) и индексу текущего качества (`currentLevel`) для легкой реализации кастомных переключателей.
4. **⚡ Реактивные состояния:** Состояния воспроизведения (`isBuffering`, `currentTime`, `duration`, `isPlaying`, `error`) доступны в виде Vue `ref` переменных.
5. **🍏 Нативная поддержка Safari:** Автоматический фоллбек на нативное воспроизведение HLS на устройствах Apple (iOS/macOS Safari), где `hls.js` не требуется.

---

## 🚀 Установка

Установите необходимые зависимости в ваш Vue 3 проект:

```bash
npm install hls.js vue-use-hls
```

---

## 🛠️ Быстрый старт

Пример реализации кастомного видеоплеера с помощью `vue-use-hls`:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useHls } from 'vue-use-hls';

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
/* Стили плеера */
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
  /** Конфигурация hls.js */
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
| `error` | `Ref<HlsErrorData \| null>` | Информация о последней ошибке |
| `changeQuality(index)` | `(index: number) => void` | Функция переключения качества (передайте `-1` для авто) |
| `retry()` | `() => void` | Функция ручного перезапуска инициализации HLS-потока |

---

## 🧪 Тестирование (E2E Playwright)

В проект встроены сквозные (E2E) тесты с использованием **Playwright**, которые проверяют автоматическое проигрывание, считывание метаданных, переключение уровней качества и эмуляцию отключения сети для проверки реконнекта.

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

Демо-приложение будет доступно по адресу: **`http://localhost:8080`**.

---

## 📄 Лицензия

Этот проект распространяется под лицензией **MIT**. Подробности смотрите в файле LICENSE.

---

## 👨‍💻 Автор

Разработано **Asker Aubakirov** в рамках демонстрации профессиональных навыков проектирования Vue-библиотек.
