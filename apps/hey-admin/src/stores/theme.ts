import { ref, watch } from 'vue';

import { defineStore } from 'pinia';

/* 色系主题：data-theme 控制色系，data-mode 控制明暗 */

export interface ThemeOption {
  id: string;
  name: string;
  preview: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'warm',
    name: '日曜',
    preview: 'linear-gradient(135deg, #ff6b35 0%, #ffc24b 100%)',
  },
  {
    id: 'ink',
    name: '墨青',
    preview: 'linear-gradient(135deg, #142a25 0%, #f5a623 100%)',
  },
  {
    id: 'mint',
    name: '薄荷森林',
    preview: 'linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)',
  },
  {
    id: 'midnight',
    name: '紫夜密林',
    preview: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
  },
  {
    id: 'sand',
    name: '赤陶沙丘',
    preview: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)',
  },
];

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'hey19-v2-theme';
const MODE_KEY = 'hey19-v2-mode';

function getInitialTheme(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEMES.some((t) => t.id === stored)) return stored;
  } catch {
    /* ignore */
  }
  return 'warm';
}

function getInitialMode(): ThemeMode {
  try {
    const m = localStorage.getItem(MODE_KEY);
    if (m === 'light' || m === 'dark') return m;
  } catch {
    /* ignore */
  }
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

export const useThemeStore = defineStore('theme', () => {
  const themeId = ref<string>(getInitialTheme());
  const mode = ref<ThemeMode>(getInitialMode());
  const isDark = ref<boolean>(mode.value === 'dark');

  function apply() {
    const html = document.documentElement;
    html.dataset.theme = themeId.value;
    html.dataset.mode = mode.value;
    try {
      localStorage.setItem(STORAGE_KEY, themeId.value);
      localStorage.setItem(MODE_KEY, mode.value);
    } catch {
      /* ignore */
    }
  }

  /* 切换色系：保留当前明暗模式 */
  function setTheme(id: string) {
    if (!THEMES.some((t) => t.id === id)) return;
    themeId.value = id;
    apply();
  }

  /* 仅切换明暗：保留当前色系 */
  function setMode(m: ThemeMode) {
    mode.value = m;
    apply();
  }

  function toggleMode() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark';
    apply();
  }

  watch(mode, (m) => {
    isDark.value = m === 'dark';
  });
  watch([themeId, mode], apply, { immediate: true });

  return { themeId, mode, isDark, setTheme, setMode, toggleMode };
});
