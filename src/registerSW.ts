export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        setInterval(() => reg.update(), 60 * 60 * 1000);
      });
    });
  }
}
