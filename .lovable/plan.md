

## Visualizar assinatura de retirada

Ao clicar em uma encomenda ja retirada (tab "Retiradas"), abrir um Dialog mostrando os detalhes da retirada com a assinatura digital capturada.

### O que sera feito

1. **Novo componente `PackageDetailsDialog`** -- Dialog que exibe:
   - Foto da encomenda
   - Nome do morador, unidade, transportadora
   - Data/hora de recebimento e retirada
   - Tempo de permanencia na portaria
   - Imagem da assinatura (renderizada a partir do `signature_data` base64)
   - Mensagem caso nao haja assinatura registrada

2. **Alteracao em `Packages.tsx`**:
   - Adicionar estado para package selecionado para detalhes
   - Tornar os cards de encomendas retiradas clicaveis (cursor pointer, onClick)
   - Abrir o `PackageDetailsDialog` ao clicar

### Arquivos

- **Criar**: `src/components/PackageDetailsDialog.tsx`
- **Editar**: `src/pages/Packages.tsx` -- adicionar estado e onClick nos cards retirados

