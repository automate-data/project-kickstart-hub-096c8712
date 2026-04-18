

## Diagnóstico

Adicionei na última iteração o embed `transferred_by_profile:profiles!transferred_by(full_name)` no `select` da query principal de `Packages.tsx`. Mas **não existe foreign key** entre `package_events.transferred_by` e `profiles.id`, então o PostgREST retorna **HTTP 400** em todas as queries de pacotes.

Resultado: tanto a aba "Aguardando" quanto "Retiradas" ficam vazias (a aba "Aguardando" só não mostra como vazia visualmente porque o card "Aguardando retirada" usa um count separado que funciona — mas a lista também está quebrada).

Erro exato no console:
```
PGRST200: Could not find a relationship between 'package_events' and 'profiles' 
using the hint 'transferred_by' in the schema 'public'
```

## Correção

Duas opções:

**A) Criar a foreign key no banco** (correto a longo prazo) — uma migration adicionando:
```sql
ALTER TABLE package_events 
ADD CONSTRAINT package_events_transferred_by_fkey 
FOREIGN KEY (transferred_by) REFERENCES profiles(id);
```

**B) Buscar o nome do recebedor em paralelo no front** (sem alterar schema) — remover o embed inválido, e no `PackageDetailsDialog` fazer um fetch separado do `profiles.full_name` quando `transferred_by` existir.

**Recomendo a opção A** — é uma única migration de 1 linha, deixa o embed funcionar e mantém o código simples. Não há risco de quebrar nada porque a coluna já existe e os valores atuais (`transferred_by`) já apontam para IDs válidos em `profiles`.

## Mudanças

1. **Nova migration**: adicionar FK `package_events.transferred_by → profiles.id` (`ON DELETE SET NULL`)
2. **Sem mudança em código** — o embed `profiles!transferred_by(full_name)` já está correto e passará a funcionar quando a FK for criada e o cache do PostgREST recarregar (automático)

## Validação

1. Aba "Aguardando" volta a listar pacotes
2. Aba "Retiradas" mostra picked_up + transferidos
3. Clicar num pacote transferido mostra nome do porteiro do bloco

## Arquivos
- 1 nova migration SQL (FK constraint)

