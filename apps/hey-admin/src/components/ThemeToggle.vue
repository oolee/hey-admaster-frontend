<script setup>
import { computed } from 'vue';

import { ChevronDown, Moon, Sun } from 'lucide-vue-next';

import { THEMES, useThemeStore } from '#/stores/theme';

const theme = useThemeStore();

const currentTheme = computed(
  () => THEMES.find((t) => t.id === theme.themeId) || THEMES[0],
);

function toggleMode() {
  theme.toggleMode();
}

function setTheme(id) {
  theme.setTheme(id);
}
</script>

<template>
  <div class="theme-switch">
    <!-- 明暗切换 -->
    <button
      class="theme-toggle"
      :aria-label="theme.isDark ? '切换到日间模式' : '切换到夜晚模式'"
      @click="toggleMode"
    >
      <Transition name="icon" mode="out-in">
        <Sun v-if="theme.isDark" :size="17" key="sun" />
        <Moon v-else :size="17" key="moon" />
      </Transition>
    </button>

    <!-- 色系选择 -->
    <div class="theme-picker" role="menu">
      <button
        class="picker-trigger"
        :title="`当前色系：${currentTheme.name} · ${theme.isDark ? '暗色' : '亮色'}`"
      >
        <span
          class="swatch"
          :style="{ background: currentTheme.preview }"
        ></span>
        <ChevronDown :size="12" />
      </button>
      <div class="picker-menu">
        <p class="picker-title">选择色系</p>
        <button
          v-for="t in THEMES"
          :key="t.id"
          class="theme-item"
          :class="{ active: theme.themeId === t.id }"
          @click="setTheme(t.id)"
        >
          <span class="swatch" :style="{ background: t.preview }"></span>
          <span class="name">{{ t.name }}</span>
          <span v-if="theme.themeId === t.id" class="cur-badge">当前</span>
        </button>
        <div class="picker-foot">
          <span>明暗：{{ theme.isDark ? '暗色' : '亮色' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.theme-switch {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.theme-toggle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) var(--ease-out-expo);
}

.theme-toggle:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  transform: rotate(12deg);
}

.icon-enter-active,
.icon-leave-active {
  transition: all 0.25s var(--ease-spring);
}

.icon-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
}

.icon-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}

.theme-picker {
  position: relative;
  flex-shrink: 0;
}

.picker-trigger {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  height: 40px;
  padding: 0 8px;
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.picker-trigger:hover {
  color: var(--color-text-1);
  border-color: var(--color-border-strong);
}

.swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 10%);
}

.picker-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 100;
  min-width: 200px;
  max-width: calc(100vw - 32px);
  padding: 8px;
  pointer-events: none;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  opacity: 0;
  transform: translateY(-6px);
  transition: all var(--dur-fast) var(--ease-out-expo);
}

.theme-picker:hover .picker-menu,
.theme-picker:focus-within .picker-menu {
  pointer-events: auto;
  opacity: 1;
  transform: translateY(0);
}

.picker-title {
  padding: 4px 10px 6px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-3);
}

.theme-item {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  font-size: var(--text-sm);
  color: var(--color-text-2);
  text-align: left;
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.theme-item:hover {
  color: var(--color-text-1);
  background: var(--color-surface-2);
}

.theme-item.active {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.theme-item .name {
  flex: 1;
  font-weight: 500;
}

.cur-badge {
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border-radius: var(--r-full);
}

.picker-foot {
  padding: 8px 10px 2px;
  margin-top: 4px;
  font-size: var(--text-xs);
  color: var(--color-text-3);
  border-top: 1px solid var(--color-border);
}
</style>
