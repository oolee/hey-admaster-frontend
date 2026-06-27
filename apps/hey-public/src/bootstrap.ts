import { createApp } from 'vue';

import '@vben/styles';

import { createPinia } from 'pinia';

import App from './app.vue';
import { router } from './router';

import './styles/main.css';
import './styles/theme.css';
import './styles/animations.css';

async function bootstrap() {
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount('#app');
}

export { bootstrap };
