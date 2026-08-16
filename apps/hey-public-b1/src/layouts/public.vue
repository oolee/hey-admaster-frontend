<script setup lang="ts">
import { onMounted } from 'vue';

import AppFooter from '#/components/layout/AppFooter.vue';
import AppHeader from '#/components/layout/AppHeader.vue';
import FloatSidebar from '#/components/layout/FloatSidebar.vue';
import { useTheme } from '#/composables/useTheme';

const { initTheme } = useTheme();

onMounted(() => {
  initTheme();
});
</script>

<template>
  <div class="app-layout">
    <AppHeader />
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
    <AppFooter />
    <FloatSidebar />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  transition:
    background 0.4s ease,
    color 0.4s ease;
}

/* Page transition */
.page-enter-active,
.page-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
