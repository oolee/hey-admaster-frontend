import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GenerationHistoryItem } from '#/types/ai'
import { MAX_FREE_GENERATIONS } from '#/utils/constants'

export const useAiStore = defineStore('ai', () => {
  const history = ref<GenerationHistoryItem[]>([])
  const generationCount = ref(0)
  const favorites = ref<string[]>([])

  const remainingFree = computed(() =>
    Math.max(0, MAX_FREE_GENERATIONS - generationCount.value)
  )

  function addGeneration(item: GenerationHistoryItem) {
    history.value.unshift(item)
    generationCount.value++
    // Keep last 50 items
    if (history.value.length > 50) {
      history.value = history.value.slice(0, 50)
    }
  }

  function toggleFavorite(id: string) {
    const idx = favorites.value.indexOf(id)
    if (idx > -1) {
      favorites.value.splice(idx, 1)
    } else {
      favorites.value.push(id)
    }
  }

  function isFavorite(id: string): boolean {
    return favorites.value.includes(id)
  }

  return {
    history,
    generationCount,
    favorites,
    remainingFree,
    addGeneration,
    toggleFavorite,
    isFavorite,
  }
})