import { createApp } from 'vue';

import { createPinia } from 'pinia';

import App from './app.vue';
import { router } from './router';

import './styles/main.css';

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();

  app.use(pinia);
  app.use(router);
  app.mount('#app');
}

export { bootstrap };
