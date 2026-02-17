

# Plano: Reintroduzir Email no Cadastro de Membros e Corrigir Acesso ao Login

## Problema Atual

1. **Membros sem email real**: O cadastro atual gera emails internos fictícios (ex: `staff-xxxxx@internal.local`), impossibilitando que porteiros e outros membros façam login no sistema.

2. **Pagina de login inacessivel**: Quando voce ja esta logado e tenta acessar `/auth`, o sistema redireciona para `/` que, por sua vez, carrega a rota protegida. Se outra pessoa tentar criar conta (signup), ela vera "Acesso pendente" porque nao tera um papel atribuido ainda -- isso e esperado, mas o fluxo precisa ser mais claro.

## Solucao Proposta

### 1. Reintroduzir campo Email no cadastro de membros

**Arquivo: `src/pages/Staff.tsx`**
- Adicionar campo de email no formulario de adicao de membro (nome, email, RG, papel)
- Adicionar campo de email no formulario de edicao
- Exibir email do membro na listagem
- Incluir email no filtro de busca

### 2. Atualizar a edge function `invite-staff`

**Arquivo: `supabase/functions/invite-staff/index.ts`**
- Aceitar o campo `email` enviado pelo admin
- Usar o email real fornecido (em vez de gerar `staff-xxx@internal.local`)
- Gerar uma senha padrao temporaria (ex: `Mudar@123`) para o novo usuario
- Retornar a senha temporaria para que o admin informe ao membro
- Manter a vinculacao com `condominium_id`

### 3. Sobre a pagina de login

A pagina `/auth` funciona normalmente para usuarios nao logados. O comportamento "Acesso pendente" aparece quando um usuario cria conta via "Criar conta" mas ainda nao tem papel atribuido -- isso e o fluxo correto. Os membros devem ser cadastrados pelo admin (na tela Equipe) e depois fazer login com o email e senha informados.

## Detalhes Tecnicos

### Alteracoes em `src/pages/Staff.tsx`
- Novo estado `email` e `editEmail` para os formularios
- Campo `<Input type="email">` nos dialogs de adicao e edicao
- Exibir email na listagem ao lado do RG
- Passar `email` no body da chamada `invoke('invite-staff', ...)`

### Alteracoes em `supabase/functions/invite-staff/index.ts`
- Receber `email` do request body
- Usar `adminClient.auth.admin.createUser({ email, password: 'Mudar@123', ... })`
- Verificar se email ja existe antes de criar
- Retornar senha temporaria na resposta para o admin compartilhar

### Fluxo de uso
1. Admin cadastra membro com nome, email, RG e papel
2. Sistema cria usuario com email real e senha temporaria
3. Admin informa email e senha ao membro
4. Membro faz login com email e senha
5. Membro acessa apenas o condominio ao qual foi vinculado

