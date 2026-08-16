import { defineStore } from 'pinia';

export const useOrderStore = defineStore('hey-public-order', {
  state: () => ({ packageSlug: 'ai-design', contact: '' }),
});
