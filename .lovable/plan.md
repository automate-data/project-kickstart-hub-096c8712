

## Busca de Encomendas na página /packages

Adicionar um campo de busca na lista de encomendas para facilitar a localização em condomínios com muitas entregas.

### O que será feito

- Adicionar um campo de busca logo abaixo do título "Encomendas" e acima das abas (Aguardando / Retiradas)
- A busca filtrará pelo nome do morador, bloco/apartamento e transportadora
- O filtro será aplicado localmente (client-side) sobre os pacotes já carregados, sem necessidade de novas queries

### Detalhes técnicos

**Arquivo modificado:** `src/pages/Packages.tsx`

1. Adicionar estado `searchTerm` com `useState`
2. Inserir um `Input` com icone de busca (Search do lucide-react) e placeholder "Buscar por morador, unidade ou transportadora..."
3. Criar uma lista `filteredPackages` que filtra `packages` pelo `searchTerm`, comparando contra:
   - `resident.full_name`
   - `resident.block` + `resident.apartment`
   - `carrier`
4. Renderizar `filteredPackages` ao invés de `packages` na listagem

Nenhuma alteração de banco de dados é necessária.

