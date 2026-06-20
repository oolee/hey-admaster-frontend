function removeGlobalLoading() {
  document.querySelector('#__app-loading__')?.remove();
  document
    .querySelectorAll('[data-app-loading^="inject"]')
    .forEach((element) => element.remove());
}

async function initApplication() {
  const { bootstrap } = await import('./bootstrap');
  await bootstrap();
  removeGlobalLoading();
}

initApplication();
