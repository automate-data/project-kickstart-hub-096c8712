## Problema

No modo **Portaria Simples com Armário** (`simple_locker`), o badge das encomendas alocadas mostra apenas a primeira palavra da posição do armário — por exemplo, exibe **"posição Armário"** em vez de **"posição Armário 08"**, e **"posição Caixinha"** em vez de **"posição Caixinha do correio"**.

Isso é crítico porque, no dia seguinte, o porteiro precisa da posição **completa** para localizar a encomenda fisicamente.

## Causa raiz

Confirmei consultando os `package_events` reais: os dados estão salvos corretamente no banco, ex.:

```
notes: "locker_reference:Armário 08"
notes: "locker_reference:Caixinha do correio"
```

O bug está no **regex** que extrai a posição em `src/pages/Packages.tsx`, função `getLocationBadge`:

```ts
const match = notes?.match(/locker_reference:([^\s,;]+)/i);
```

O padrão `[^\s,;]+` para no **primeiro espaço**, então captura só `"Armário"` ou `"Caixinha"`, descartando o restante.

## Correção

Arquivo único: **`src/pages/Packages.tsx`** (função `getLocationBadge`, ~linha 453).

Trocar o regex para capturar tudo até o final da linha ou até um separador real (`,` ou `;`), preservando espaços internos:

```ts
const match = notes?.match(/locker_reference:([^,;\n\r]+)/i);
if (match) position = match[1].trim();
```

## Resultado esperado

Os badges passam a exibir a posição completa registrada pelo porteiro:

| Antes | Depois |
|---|---|
| No Armário — posição Armário | No Armário — posição Armário 08 |
| No Armário — posição Caixinha | No Armário — posição Caixinha do correio |

Nenhuma migração de dados é necessária — o banco já tem a informação correta, é apenas a leitura no frontend que estava truncando.
