import { defineStore } from 'pinia';

export const useAiStore = defineStore('hey-public-ai', { state: () => ({ prompt: '', loading: false }) });
