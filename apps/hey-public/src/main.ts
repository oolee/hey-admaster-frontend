import { bootstrap } from './bootstrap';

function removeGlobalLoading() {
  document.querySelector('#__app-loading__')?.remove();
  document
    .querySelectorAll('[data-app-loading^="inject"]')
    .forEach((element) => element.remove());
}

async function initApplication() {
  await bootstrap();
  removeGlobalLoading();
}

initApplication();
