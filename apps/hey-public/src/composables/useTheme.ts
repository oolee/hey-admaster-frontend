import { ref, watch } from 'vue';

const isDark = ref(true);

const THEME_KEY = 'hey-public-theme';

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  isDark.value = saved === null ? true : saved === 'dark';
  applyTheme();
}

function applyTheme() {
  const html = document.documentElement;
  if (isDark.value) {
    html.classList.remove('light');
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
    html.classList.add('light');
  }
}

function toggleTheme() {
  isDark.value = !isDark.value;
  localStorage.setItem(THEME_KEY, isDark.value ? 'dark' : 'light');
  applyTheme();
}

watch(isDark, applyTheme);

export function useTheme() {
  return {
    isDark,
    toggleTheme,
    initTheme,
  };
}
