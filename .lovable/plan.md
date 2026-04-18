

## Diagnóstico: Tela branca no Android após instalar PWA

### Causa raiz

Há dois problemas no `public/sw.js` que afetam o Chrome/Android (iOS Safari é mais tolerante e por isso funciona lá):

**1. `controllerchange` causa loop de reload no Android instalado**
No `registerSW.ts`, sempre que o SW assume controle (incluindo a primeira instalação no Android standalone), dispara `window.location.reload()`. Combinado com `skipWaiting()` + `clients.claim()` na primeira ativação, o Android pode entrar em loop de reload antes da app montar — resultado: tela branca.

**2. `navigate` handler quebra em modo offline/cold start**
Quando o Android abre o PWA standalone pela primeira vez sem rede estável (ou com rede lenta), o handler tenta `fetch(request)` e, se falhar, faz `caches.match('/index.html')`. Mas o `/index.html` cacheado no install foi salvo com `cache.addAll(['/', '/index.html'])` — o Android pode ter falhado silenciosamente nesse `addAll` (uma URL falhando aborta tudo), deixando o cache vazio. Resultado: fetch falha + cache vazio = tela branca permanente.

**3. Falta `purpose: "any"` nos ícones**
Os ícones estão apenas como `maskable`. O Chrome Android precisa de pelo menos um ícone com `purpose: "any"` (ou sem purpose) para o splash screen — sem isso, a splash pode renderizar branca/quebrada antes do app carregar.

### Correções

**`public/sw.js`** — bump de versão de cache + tornar install resiliente + fallback robusto:
- `CACHE_NAME` → `'chegueii-v3'` (força limpeza de caches antigos quebrados em devices já instalados)
- Trocar `cache.addAll([...])` por `Promise.allSettled` com `cache.add` individual — uma falha não aborta o install
- No `navigate` handler: se fetch falhar E não houver cache, retornar uma `Response` HTML mínima com meta-refresh ao invés de `undefined` (evita tela branca pura)
- Remover `skipWaiting()` da primeira instalação (manter só no update) — evita race condition

**`src/registerSW.ts`** — não recarregar na primeira instalação:
- Só fazer `window.location.reload()` em `controllerchange` se já existia um `controller` antes (ou seja, é update, não primeira instalação). Padrão recomendado: checar `navigator.serviceWorker.controller` antes do registro.

**`public/site.webmanifest`** — adicionar ícone `any` para splash do Android:
- Duplicar entradas 192/512 com `"purpose": "any"` (mantendo as `maskable` existentes)

### Arquivos modificados
- `public/sw.js`
- `src/registerSW.ts`
- `public/site.webmanifest`

### Como o usuário valida
Após o deploy, no Android instalado: desinstalar o PWA atual, limpar dados do Chrome para o site, reinstalar. Tela deve carregar normalmente.

