export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return; // primeira instalação — não recarregar
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      const triggerSkipWaiting = (sw: ServiceWorker | null) => {
        if (sw && navigator.serviceWorker.controller) {
          sw.postMessage({ type: 'SKIP_WAITING' });
        }
      };

      // Se já há um SW esperando ao registrar
      if (reg.waiting) triggerSkipWaiting(reg.waiting);

      // Detectar instalação de novo SW
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') {
            triggerSkipWaiting(installing);
          }
        });
      });

      // Checagem inicial + polling a cada 15 min
      reg.update();
      setInterval(() => reg.update(), 15 * 60 * 1000);

      // Revalidar quando aba volta a ficar visível
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update();
      });

      // Revalidar quando volta online
      window.addEventListener('online', () => reg.update());
    });
  });
}
