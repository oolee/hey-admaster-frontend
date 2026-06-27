import type { Order } from '#/types/order';

import { ref } from 'vue';

import { defineStore } from 'pinia';

export const useOrderStore = defineStore('order', () => {
  const orders = ref<Order[]>([]);
  const currentOrder = ref<null | Order>(null);

  function addOrder(order: Order) {
    orders.value.unshift(order);
  }

  function setCurrentOrder(order: null | Order) {
    currentOrder.value = order;
  }

  return {
    orders,
    currentOrder,
    addOrder,
    setCurrentOrder,
  };
});
