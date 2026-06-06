## Problema

O diálogo "Confirmar retirada de N encomendas" aparece deslocado para a esquerda (margem esquerda menor que a direita) em viewports onde a página de fundo tem scrollbar.

## Causa

O `DialogContent` do shadcn centraliza usando `fixed left-[50%] translate-x-[-50%]`. Quando o Radix abre o diálogo, ele bloqueia o scroll do `body` e adiciona padding-right equivalente à largura da scrollbar para evitar reflow. Isso faz o viewport visual ficar mais estreito à direita, mas o cálculo de `left: 50%` continua referente ao viewport completo — resultando no diálogo aparentemente colado à esquerda.

O `mx-auto` que adicionei antes não tem efeito em elemento `fixed` com `left: 50%`.

## Correção

Em `src/components/BatchPickupDialog.tsx`, sobrescrever o posicionamento do `DialogContent` para centralizar de forma simétrica independente da scrollbar:

- Trocar `left-[50%] translate-x-[-50%]` por `left-0 right-0 mx-auto translate-x-0`
- Manter `w-[calc(100%-2rem)] max-w-sm` para garantir margens laterais consistentes em mobile

Classe resultante:

```
left-0 right-0 translate-x-0 mx-auto w-[calc(100%-2rem)] max-w-sm p-6
```

Aplicar a mesma correção em `src/components/PickupDialog.tsx` para manter consistência entre os dois diálogos de retirada.

## Arquivos alterados

- `src/components/BatchPickupDialog.tsx`
- `src/components/PickupDialog.tsx` (se apresentar o mesmo deslocamento)
