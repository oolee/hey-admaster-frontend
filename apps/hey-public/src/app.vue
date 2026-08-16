<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import SiteFooter from '@/components/layout/SiteFooter.vue';
import SiteHeader from '@/components/layout/SiteHeader.vue';
import PromptHost from '@/components/ui/PromptHost.vue';
import ToastHost from '@/components/ui/ToastHost.vue';
import { useThemeStore } from '@/stores/theme';

const route = useRoute();
useThemeStore(); // 初始化主题

const layout = computed(() => route.meta.layout || 'site');
</script>

<template>
  <div class="app-shell">
    <template v-if="layout === 'site'">
      <SiteHeader />
      <main class="app-main">
        <router-view v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </router-view>
      </main>
      <SiteFooter />
    </template>

    <template v-else>
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </router-view>
    </template>

    <ToastHost />
    <PromptHost />
  </div>
</template>

<style scoped>
.app-main {
  min-height: calc(100vh - var(--header-h));
  padding-top: var(--header-h);
}
</style>
