import { ref } from 'vue'

const isDark = ref(true)

export function useTheme() {
  function toggle() {
    isDark.value = !isDark.value
    document.documentElement.classList.toggle('light', !isDark.value)
  }

  return { isDark, toggle }
}