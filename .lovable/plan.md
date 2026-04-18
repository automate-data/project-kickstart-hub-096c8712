

## Plano: Auto-update silencioso do PWA (Opção A)

### O que muda

**`src/registerSW.ts`** — única alteração:

1. Reduzir polling: `60 * 60 * 1000` → `15 * 60 * 1000` (15 min)
2. Adicionar revalidação em `visibilitychange` (quando aba volta visível) e em `online` (quando reconecta)
3. Detectar SW novo via `reg.addEventListener('updatefound')` → quando `installing.state === 'installed'` E já há `controller` → `postMessage({type:'SKIP_WAITING'})` automaticamente
4. O `controllerchange` já existente cuida do reload silencioso

**`public/sw.js`** — pequeno ajuste:
- O listener atual aceita `event.data === 'SKIP_WAITING'` (string). Aceitar também `event.data?.type === 'SKIP_WAITING'` para compatibilidade com o padrão postMessage com objeto.

### Comportamento final

```text
App aberto
  ↓
A cada 15min OU ao voltar visível/online → reg.update()
  ↓
SW novo detectado → instala em background
  ↓
Quando state='installed' + há controller → SKIP_WAITING auto
  ↓
controllerchange dispara → reload silencioso
  ↓
Usuário vê versão nova
```

### Arquivos modificados
- `src/registerSW.ts`
- `public/sw.js` (1 linha)

### Validação
Publicar uma mudança visível. PWA aberto deve recarregar sozinho em até 15 min (ou imediatamente se trocar de aba e voltar).

