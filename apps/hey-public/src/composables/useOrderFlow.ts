import { ref } from 'vue'
import { createOrder as submitOrder } from '#/utils/api'
import { useOrderStore } from '#/store/orderStore'
import type { Order, OrderRequest } from '#/types/order'

export function useOrderFlow() {
  const orderStore = useOrderStore()
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const currentOrder = ref<Order | null>(null)

  async function placeOrder(data: OrderRequest) {
    isLoading.value = true
    error.value = null
    try {
      const res = await submitOrder(data)
      currentOrder.value = res.data
      orderStore.addOrder(res.data)
      return res.data
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      isLoading.value = false
    }
  }

  return { placeOrder, isLoading, error, currentOrder }
}