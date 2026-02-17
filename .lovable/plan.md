
## Correção: Filtro de moradores por condomínio

### Problema
A página de Moradores (`/residents`) exibe moradores de todos os condomínios porque o filtro por `condominium_id` é opcional — se o condomínio ainda não carregou, a query retorna tudo.

### Solução
Aplicar a mesma correção já feita em `ReceivePackage.tsx`: retornar lista vazia se `condominium_id` não estiver disponível, e sempre filtrar com `.eq('condominium_id', condominium.id)`.

### Detalhes técnicos

**Arquivo: `src/pages/Residents.tsx`**

Alterar a função `fetchResidents` de:
```typescript
const fetchResidents = async () => {
  let query = supabase.from('residents').select('*').order('full_name');
  if (condominium?.id) {
    query = query.eq('condominium_id', condominium.id);
  }
  const { data } = await query;
  if (data) setResidents(data as Resident[]);
  setIsLoading(false);
};
```

Para:
```typescript
const fetchResidents = async () => {
  if (!condominium?.id) {
    setResidents([]);
    setIsLoading(false);
    return;
  }

  const { data } = await supabase
    .from('residents')
    .select('*')
    .eq('condominium_id', condominium.id)
    .order('full_name');

  if (data) setResidents(data as Resident[]);
  setIsLoading(false);
};
```

Isso garante que moradores de outros condomínios nunca sejam exibidos.
