import { defineStore } from 'pinia';

export const usePublicUiStore = defineStore('hey-public-ui', { state: () => ({ mobileNavOpen: false }) });
