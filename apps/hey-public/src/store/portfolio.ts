import { defineStore } from 'pinia';
import { portfolioCases } from '@hey/public';

export const usePortfolioStore = defineStore('hey-public-portfolio', { state: () => ({ cases: portfolioCases }) });
