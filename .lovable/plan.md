

## Importação em massa de moradores via planilha (somente Superadmin)

Atualizações ao plano anterior baseadas no feedback:

1. **Acesso restrito**: somente `superadmin` (apenas `contato@automatedata.com.br` por enquanto)
2. **Validação rigorosa de telefone WhatsApp**
3. **Confirmação explícita para nomes suspeitos**

## Acesso

- Botão "Importar planilha" **só aparece** se `role === 'superadmin'` na tela `/residents`
- Superadmin escolhe o condomínio (já tem o seletor) e faz upload no contexto do condomínio selecionado
- Nenhum admin de condomínio enxerga a função neste primeiro momento

## Fluxo do usuário

1. Superadmin entra em **Moradores** com um condomínio selecionado
2. Clica em **"Importar planilha"** (visível só para superadmin)
3. Dialog com 4 etapas:
   - **Etapa 1 — Baixar template** (CSV com labels do condomínio)
   - **Etapa 2 — Upload** (`.csv`, `.xlsx`, `.xls`, até 2 MB)
   - **Etapa 3 — Preview com validação detalhada**
   - **Etapa 4 — Confirmação de itens suspeitos** (nomes anômalos, duplicados parciais)
4. Importação em lote com progresso visual
5. Toast final + opção de baixar relatório CSV de erros

## Validação rigorosa de telefone (WhatsApp Brasil)

Toda linha passa por uma função `validateBrazilianMobile(phone)` antes de chegar ao banco:

### Regras obrigatórias (erro se falhar — não importa)
- Após sanitização (remover espaços, traços, parênteses, `+`):
  - Aceitar formatos: `11987654321`, `5511987654321`, `+5511987654321`
  - Normalizar para **E.164**: `+55XXXXXXXXXXX` (13 dígitos totais)
- **Total de dígitos do número nacional**: exatamente **11** (DDD + 9 + 8 dígitos) — fixos não entram
- **DDD válido**: deve estar na lista oficial de DDDs brasileiros (11–99 com exclusões: 20, 23, 25, 26, 29, 30, 36, 39, 40, 50, 52, 56, 57, 58, 59, 60, 70, 72, 76, 78, 80, 90)
- **Nono dígito obrigatório**: o primeiro dígito após o DDD deve ser `9` (celular pós-2012)
- **Não pode ter sequências inválidas**: rejeita `11999999999`, `00000000000`, ou números repetidos triviais
- **Sem caracteres alfabéticos** após sanitização

### Avisos (importa, mas marca em amarelo)
- Telefone duplicado dentro da própria planilha (2 moradores com mesmo número)
- Telefone já cadastrado no condomínio para outro morador

### Exemplo prático
| Entrada | Resultado |
|---|---|
| `(11) 98765-4321` | ✅ `+5511987654321` |
| `11 98765 4321` | ✅ `+5511987654321` |
| `+55 11 98765-4321` | ✅ `+5511987654321` |
| `11 8765-4321` (sem 9) | ❌ "Falta nono dígito" |
| `1198765432` (10 dígitos) | ❌ "Telefone incompleto" |
| `21 99999-9999` | ⚠️ "Número repetitivo, confirme" |
| `99 98765-4321` | ❌ "DDD 99 inválido" |

## Validação rigorosa de nomes

### Regras obrigatórias (erro)
- `trim()` aplicado, mínimo **3 caracteres**, máximo **100**
- Deve conter **pelo menos 2 palavras** (nome + sobrenome)
- Não pode ser só números ou só caracteres especiais
- Caracteres permitidos: letras (com acento), espaço, hífen, apóstrofo (`João D'Ávila`, `Maria-José`)

### Confirmação obrigatória — etapa 4 do dialog
Linhas com qualquer um dos sinais abaixo aparecem em uma **lista de revisão manual**, e o superadmin precisa marcar individualmente "Confirmar e importar" ou "Pular":

- **Nome muito curto** (ex.: "Ana B" — menos de 5 chars no total)
- **Nome com dígitos** (ex.: "João 101")
- **Nome todo MAIÚSCULO ou todo minúsculo** (provável erro de digitação)
- **Caracteres incomuns repetidos** (ex.: "Joaooo", "Maaria")
- **Match parcial com morador existente**: usa similaridade (Levenshtein normalizado ≥ 0.8) — ex.: planilha tem "João Silva" e banco já tem "Joao Silva" → pergunta se é a mesma pessoa
- **Mesmo bloco+apto da planilha já tem outro nome no banco** → pergunta se substitui ou adiciona

A etapa 4 só aparece se houver itens suspeitos. Sem suspeitos, pula direto para importação.

## Estratégia de deduplicação (chave composta)

Antes de inserir, busca todos moradores ativos do condomínio (`deleted_at IS NULL`) e compara:

- **Match exato** (`lower(full_name) + block + apartment` iguais): pula silenciosamente
- **Match por telefone** (mesmo `+55...`): aviso, vai pra etapa 4
- **Match por bloco+apto com nome diferente**: aviso, vai pra etapa 4
- **Match por similaridade de nome no mesmo bloco+apto**: aviso, vai pra etapa 4

## Implementação técnica

### Arquivos novos
- `src/components/residents/ImportResidentsDialog.tsx` — wizard 4 etapas, preview, lista de revisão, progresso
- `src/lib/residentImport.ts` — parser XLSX→JSON, dedup, gerador de CSV de erro
- `src/lib/residentValidation.ts` — `validateBrazilianMobile`, `validateName`, lista oficial de DDDs, similaridade Levenshtein
- `src/lib/residentTemplate.ts` — gerador do CSV modelo dinâmico

### Arquivos alterados
- `src/pages/Residents.tsx` — botão "Importar planilha" condicional a `role === 'superadmin'`

### Bibliotecas
- **`xlsx`** (SheetJS) — única dependência nova, parsing 100% no browser

### Inserção em lote
- RLS atual de `residents` cobre superadmin via política `Users can insert residents in their condominium` combinada com role do superadmin no condomínio
- Batches de 100 linhas via `supabase.from('residents').insert([...])`
- Barra de progresso real
- Erros parciais acumulados e exportáveis

## Validação manual

1. Baixar template → preencher 5 moradores válidos → confirmar todos importados
2. Planilha com telefone `11 8765-4321` (sem nono dígito) → confirmar erro bloqueante
3. Planilha com nome "João 101" → confirmar etapa 4 obrigatória
4. Planilha com 2 linhas mesmo bloco+apto → confirmar revisão manual
5. Re-importar mesma planilha → confirmar que tudo é detectado como duplicado
6. Login como admin (não superadmin) → confirmar que botão **não aparece**

## Fora de escopo (futuras iterações)

- Liberar para admin do condomínio
- Importação assíncrona via edge function (>5.000 linhas)
- Histórico de importações com rollback
- Upload de fotos/avatars

