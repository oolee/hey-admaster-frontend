import { createApp } from 'vue';

import '@vben/styles';

import { createPinia } from 'pinia';

import App from './app.vue';
import { initTheme } from './composables/useTheme';
import { router } from './router';

import './styles/main.css';
import './styles/theme.css';
import './styles/animations.css';

async function bootstrap() {
  // 在挂载前初始化主题，避免页面闪烁
  initTheme();

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount('#app');
}

export { bootstrap };
