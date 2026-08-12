import { ref, watch } from 'vue';

import { defineStore } from 'pinia';

export interface ThemePreset {
  id: string;
  name: string;
  preview: string;
}

/* 色系主题：data-theme 控制色系，data-mode 控制明暗 */
export const THEMES: ThemePreset[] = [
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

const STORAGE_KEY = 'hey19-v2-theme';
const MODE_KEY = 'hey19-v2-mode';

function getInitial(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEMES.some((t) => t.id === stored)) return stored;
  } catch {
    /* ignore */
  }
  return 'warm';
}

function getInitialMode(): 'dark' | 'light' {
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
  const themeId = ref(getInitial());
  const mode = ref<'dark' | 'light'>(getInitialMode());

  function apply(): void {
    const html = document.documentElement;
    html.dataset.theme = themeId.value;
    html.dataset.mode = mode.value;
    localStorage.setItem(STORAGE_KEY, themeId.value);
    localStorage.setItem(MODE_KEY, mode.value);
  }

  /* 切换色系：保留当前明暗模式 */
  function setTheme(id: string): void {
    if (!THEMES.some((t) => t.id === id)) return;
    themeId.value = id;
    apply();
  }

  /* 仅切换明暗：保留当前色系 */
  function setMode(m: 'dark' | 'light'): void {
    mode.value = m;
    apply();
  }

  function toggleMode(): void {
    mode.value = mode.value === 'dark' ? 'light' : 'dark';
    apply();
  }

  const isDark = ref(mode.value === 'dark');

  watch(mode, (m) => {
    isDark.value = m === 'dark';
  });

  watch([themeId, mode], apply, { immediate: true });

  return { themeId, mode, isDark, setTheme, setMode, toggleMode };
});
