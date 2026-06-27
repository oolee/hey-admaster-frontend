import type { Order, OrderRequest } from '#/types/order';

import { ref } from 'vue';

import { useOrderStore } from '#/store/orderStore';
import { createOrder as submitOrder } from '#/utils/api';

export function useOrderFlow() {
  const orderStore = useOrderStore();
  const isLoading = ref(false);
  const error = ref<null | string>(null);
  const currentOrder = ref<null | Order>(null);

  async function placeOrder(data: OrderRequest) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await submitOrder(data);
      currentOrder.value = res.data;
      orderStore.addOrder(res.data);
      return res.data;
    } catch (error: any) {
      error.value = (error as Error).message;
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  return { placeOrder, isLoading, error, currentOrder };
}
