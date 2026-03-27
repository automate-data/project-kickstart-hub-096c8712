export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      let refreshing = false;

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.update();
        setInterval(() => reg.update(), 60 * 60 * 1000);
      });
    });
  }
}
