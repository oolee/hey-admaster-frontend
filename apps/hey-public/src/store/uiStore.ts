import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const isMobileMenuOpen = ref(false)
  const isPageLoading = ref(false)

  function toggleMobileMenu() {
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  }

  function closeMobileMenu() {
    isMobileMenuOpen.value = false
  }

  function setPageLoading(val: boolean) {
    isPageLoading.value = val
  }

  return {
    isMobileMenuOpen,
    isPageLoading,
    toggleMobileMenu,
    closeMobileMenu,
    setPageLoading,
  }
})