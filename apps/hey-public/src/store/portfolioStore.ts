import type { PortfolioItem } from '#/types/portfolio';

import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

import { fetchPortfolio } from '#/utils/api';

export const usePortfolioStore = defineStore('portfolio', () => {
  const items = ref<PortfolioItem[]>([]);
  const loading = ref(false);
  const activeFilter = ref<null | string>(null);

  async function load() {
    if (items.value.length > 0) return;
    loading.value = true;
    try {
      const res = await fetchPortfolio();
      items.value = res.data;
    } catch (error) {
      console.error('Failed to load portfolio', error);
    } finally {
      loading.value = false;
    }
  }

  function setFilter(category: null | string) {
    activeFilter.value = category;
  }

  const filteredItems = computed(() => {
    if (!activeFilter.value) return items.value;
    return items.value.filter((item) => item.category === activeFilter.value);
  });

  return {
    items,
    loading,
    activeFilter,
    filteredItems,
    load,
    setFilter,
  };
});
