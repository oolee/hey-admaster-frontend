import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PortfolioItem } from '#/types/portfolio'
import { fetchPortfolio } from '#/utils/api'

export const usePortfolioStore = defineStore('portfolio', () => {
  const items = ref<PortfolioItem[]>([])
  const loading = ref(false)
  const activeFilter = ref<string | null>(null)

  async function load() {
    if (items.value.length > 0) return
    loading.value = true
    try {
      const res = await fetchPortfolio()
      items.value = res.data
    } catch (e) {
      console.error('Failed to load portfolio', e)
    } finally {
      loading.value = false
    }
  }

  function setFilter(category: string | null) {
    activeFilter.value = category
  }

  const filteredItems = computed(() => {
    if (!activeFilter.value) return items.value
    return items.value.filter(item => item.category === activeFilter.value)
  })

  return {
    items,
    loading,
    activeFilter,
    filteredItems,
    load,
    setFilter,
  }
})