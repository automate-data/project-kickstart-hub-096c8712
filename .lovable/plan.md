

# Modulo de Setup do Condominio

## Visao Geral

Criar um fluxo de configuracao inicial (onboarding/setup) que o administrador completa antes de qualquer funcionario usar o sistema. Este modulo define a estrutura do condominio, suas nomenclaturas de unidades, e permite o cadastro previo de moradores e equipe.

## Estrutura do Banco de Dados

### Nova tabela: `condominiums`

Armazena os dados juridicos e estruturais do condominio.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Identificador |
| name | text | Nome do condominio (ex: "Residencial Park") |
| cnpj | text | CNPJ do condominio |
| address | text | Endereco completo |
| city | text | Cidade |
| state | text | Estado (UF) |
| zip_code | text | CEP |
| phone | text | Telefone da administracao |
| email | text | Email da administracao |
| unit_type | text | Tipo: 'apartment', 'house', 'mixed' |
| group_label | text | Rotulo do agrupamento: "Bloco", "Torre", "Rua", "Quadra", etc. |
| unit_label | text | Rotulo da unidade: "Apartamento", "Casa", "Sala", etc. |
| groups | jsonb | Lista dos agrupamentos (ex: ["A","B","C"] ou ["1","2","3"]) |
| setup_completed | boolean | Se o setup inicial foi finalizado |
| admin_user_id | uuid | Usuario que criou o condominio |
| created_at | timestamptz | Data de criacao |
| updated_at | timestamptz | Data de atualizacao |

O campo `unit_type` determina o comportamento da interface:
- `apartment`: mostra campo de bloco/torre + apartamento
- `house`: mostra campo de rua/quadra + casa
- `mixed`: permite ambos

Os campos `group_label` e `unit_label` permitem nomenclaturas customizadas que serao usadas em toda a interface (formularios, listagens, matching da IA).

### Alteracao na tabela `residents`

Adicionar coluna `condominium_id` (uuid, FK para condominiums) para vincular moradores ao condominio. Os moradores existentes receberao o ID do primeiro condominio criado.

## Fluxo de Telas

### 1. Tela de Setup (Wizard em 3 etapas) - `/setup`

Rota acessivel apenas quando `setup_completed = false` ou nenhum condominio existe.

**Etapa 1 - Dados do Condominio**
- Nome, CNPJ, endereco, cidade, estado, CEP
- Telefone e email da administracao

**Etapa 2 - Estrutura e Nomenclaturas**
- Tipo de condominio (Apartamentos / Casas / Misto)
- Rotulo do agrupamento (Bloco, Torre, Rua, Quadra - com opcao customizada)
- Rotulo da unidade (Apartamento, Casa, Sala - com opcao customizada)
- Lista de agrupamentos (ex: digitar "A, B, C, D" ou "1, 2, 3")

**Etapa 3 - Cadastro Inicial**
- Cadastro rapido de moradores (tabela editavel)
- Cadastro de membros da equipe (porteiros)
- Botao "Concluir Setup"

### 2. Redirecionamento Automatico

- Se nao existe condominio ou `setup_completed = false`, redirecionar para `/setup`
- Apos concluir, redirecionar para o Dashboard normal
- O setup pode ser revisitado em uma pagina de Configuracoes (futura)

## Alteracoes nos Componentes Existentes

### Labels Dinamicos

Os formularios de moradores (`Residents.tsx`) e o matching da IA (`ReceivePackage.tsx`) passarao a usar `group_label` e `unit_label` do condominio em vez de "Bloco" e "Apartamento" fixos. Por exemplo, se o condominio for de casas, o label dira "Rua" e "Casa".

### Roteamento (`App.tsx`)

- Nova rota `/setup` protegida para admins
- Logica de redirecionamento: se nao existe condominio configurado, redirecionar para `/setup`

### Hook `useCondominium`

Novo hook que carrega os dados do condominio e disponibiliza `group_label`, `unit_label`, `unit_type` e `groups` para toda a aplicacao via Context.

## Detalhes Tecnicos

### Migracao SQL

```text
1. CREATE TABLE condominiums (...)
2. ALTER TABLE residents ADD COLUMN condominium_id uuid REFERENCES condominiums(id)
3. RLS: admin pode CRUD, authenticated pode SELECT
4. Trigger para updated_at
```

### Arquivos a Criar

- `src/pages/Setup.tsx` - Wizard de 3 etapas
- `src/hooks/useCondominium.tsx` - Context + hook para dados do condominio

### Arquivos a Modificar

- `src/App.tsx` - Nova rota + logica de redirecionamento
- `src/types/index.ts` - Interface `Condominium`
- `src/pages/Residents.tsx` - Labels dinamicos
- `src/pages/ReceivePackage.tsx` - Labels dinamicos no matching
- `src/components/layout/AppLayout.tsx` - Exibir nome do condominio no header

### Seguranca (RLS)

- Apenas admins podem criar/editar condominios
- Todos os usuarios autenticados podem visualizar o condominio (necessario para labels dinamicos)
- Moradores continuam com as politicas atuais

