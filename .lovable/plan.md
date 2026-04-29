## Objetivo

Liberar para o papel `tower_admin` o acesso total à página de **Moradores** (`/residents`), com os mesmos poderes que `admin` (criar, editar, excluir, importar). Hoje o `tower_admin` é redirecionado para `/tower-admin-dashboard` ao logar e não enxerga o menu principal.

## Mudanças

### 1. Liberar a rota `/residents`
**Arquivo:** `src/App.tsx`

A rota usa `<ProtectedRoute requiredRole="admin">`, e dentro do `ProtectedRoute` qualquer papel diferente de `admin`/`superadmin` é barrado. Trocar a checagem de papel para aceitar também `tower_admin` — feito de forma localizada na própria rota, sem alterar o comportamento global do `ProtectedRoute`.

Abordagem: usar `requiredRole="admin"` mas permitir bypass quando `role === 'tower_admin'`. A forma mais limpa é estender o `ProtectedRoute` para aceitar uma lista `allowedRoles`, ou criar um wrapper inline. Vou estender `ProtectedRoute` com um prop opcional `allowedRoles?: AppRole[]` que, se preenchido, substitui a regra `requiredRole`.

**Arquivo:** `src/components/ProtectedRoute.tsx`
- Adicionar `allowedRoles?: AppRole[]`.
- Se `allowedRoles` estiver presente, autorizar quando `role` estiver nessa lista (mantendo `superadmin` sempre autorizado).

### 2. Mostrar Moradores no menu para tower_admin
**Arquivo:** `src/components/layout/AppLayout.tsx`

Hoje o tower_admin nem chega ao `AppLayout` porque o App.tsx faz `Navigate to="/tower-admin-dashboard"` no path `/`. Para que ele navegue até `/residents`, duas peças:

- **Remover o redirect forçado de tower_admin** apenas para a rota `/residents` — manter o `tower-admin-dashboard` como home padrão dele continua válido.
- **Não alterar** o redirect de `/` (ele continua indo pro dashboard da torre ao logar).
- Adicionar um link/botão "Moradores" dentro do `TowerAdminDashboard.tsx` para que ele consiga navegar até lá. Como o `TowerAdminDashboard` não usa o `AppLayout`, o caminho precisa ser explícito.

### 3. Desbloquear edição dentro da página
**Arquivo:** `src/pages/Residents.tsx` (linha 26)

```ts
const isAdmin = role === 'admin';
```
Trocar para:
```ts
const isAdmin = role === 'admin' || role === 'superadmin' || role === 'tower_admin';
```
Isso libera os botões de criar/editar/excluir/importar que dependem de `isAdmin`.

### 4. RLS no banco
As políticas de `residents` já permitem qualquer usuário com vínculo em `user_roles` para o `condominium_id` correspondente fazer SELECT/INSERT/UPDATE/DELETE — não checam o tipo de papel. Portanto **nenhuma migração é necessária**: o `tower_admin` já tem permissão a nível de banco. A restrição era puramente de UI.

## Resumo das telas afetadas
- `/residents` — acessível e totalmente editável para tower_admin.
- `/tower-admin-dashboard` — ganha botão "Moradores" para navegação.
- Demais páginas (`/staff`, `/reports`, `/advanced-settings`) permanecem restritas a admin/superadmin.

## Pergunta pendente
Você não respondeu como o tower_admin deve **chegar** na página. Vou seguir com a opção **botão no Tower Admin Dashboard** (mais coerente com o fluxo atual dele) — me avise se preferir liberar o menu completo do AppLayout.
