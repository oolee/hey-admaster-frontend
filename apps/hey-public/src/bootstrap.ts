import { createApp } from 'vue';
import { createPinia } from 'pinia';
import '@vben/styles';
import './styles/main.css';
import './styles/theme.css';
import './styles/animations.css';

import App from './app.vue';
import { router } from './router';

async function bootstrap() {
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount('#app');
}

export { bootstrap };
