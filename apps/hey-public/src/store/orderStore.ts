import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Order } from '#/types/order'

export const useOrderStore = defineStore('order', () => {
  const orders = ref<Order[]>([])
  const currentOrder = ref<Order | null>(null)

  function addOrder(order: Order) {
    orders.value.unshift(order)
  }

  function setCurrentOrder(order: Order | null) {
    currentOrder.value = order
  }

  return {
    orders,
    currentOrder,
    addOrder,
    setCurrentOrder,
  }
})