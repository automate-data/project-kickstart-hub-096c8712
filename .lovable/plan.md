

## Problema

No `ReceivePackage.tsx` (linha 281-293), o INSERT na tabela `packages` **não define `current_location_id`**. Como o Dashboard e a listagem filtram por `current_location_id = central_location_id` no modo `multi_custody`, os pacotes inseridos sem esse campo ficam invisíveis.

## Solução

**Arquivo: `src/pages/ReceivePackage.tsx`**

1. Ao montar o componente (ou quando `condominium` mudar), buscar o `central location id` se `custody_mode === 'multi_custody'`
2. No `handleSubmit`, incluir `current_location_id` no INSERT — apontando para a localização central (ou `null` se modo simples)

Alteração mínima:
- Adicionar `useState` para `centralLocationId`
- Adicionar `useEffect` que busca a location central quando `custody_mode === 'multi_custody'`
- Adicionar `current_location_id: centralLocationId` no objeto de INSERT (linha ~282)

Nenhuma alteração de schema ou migração necessária — a coluna `current_location_id` já existe na tabela `packages`.

