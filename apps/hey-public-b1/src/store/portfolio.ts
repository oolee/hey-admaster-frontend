import { portfolioCases } from '@hey/public';
import { defineStore } from 'pinia';

export const usePortfolioStore = defineStore('hey-public-portfolio', {
  state: () => ({ cases: portfolioCases }),
});
