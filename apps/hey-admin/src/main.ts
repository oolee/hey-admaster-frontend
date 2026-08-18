import { createApp } from 'vue';

import { createPinia } from 'pinia';

import router from '#/router';

import App from './app.vue';

import '#/styles/tokens.css';
import '#/styles/base.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');

// 移除启动 loading 遮罩
const loadingEl = document.querySelector('#app-loading');
if (loadingEl) {
  loadingEl.classList.add('is-hidden');
  setTimeout(() => loadingEl.remove(), 350);
}
