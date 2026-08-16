import { ref } from 'vue';

import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', () => {
  const isMobileMenuOpen = ref(false);
  const isPageLoading = ref(false);

  function toggleMobileMenu() {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
  }

  function closeMobileMenu() {
    isMobileMenuOpen.value = false;
  }

  function setPageLoading(val: boolean) {
    isPageLoading.value = val;
  }

  return {
    isMobileMenuOpen,
    isPageLoading,
    toggleMobileMenu,
    closeMobileMenu,
    setPageLoading,
  };
});
