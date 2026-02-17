
# Atualizar Edge Function para usar Templates Twilio

## Problema
A edge function `send-whatsapp` envia mensagem de texto simples em vez de usar os Content Templates do Twilio. Alem disso, a edge function `send-pickup-confirmation` (Template 2) nao existe.

## O que sera feito

### 1. Reescrever `send-whatsapp` para usar Template 1 (Recebimento)
- Usar `ContentSid: HXdc5f26078f32727eaa02ffc3c848f82e` em vez de `Body`
- Enviar `ContentVariables` com as 4 variaveis:
  - `{{1}}` = nome do morador
  - `{{2}}` = nome do porteiro
  - `{{3}}` = data/hora formato brasileiro (ex: "17/02/2026, 14:30")
  - `{{4}}` = apenas o filename (ex: `encomenda_1771082842269.jpg`)
- Remover o campo `Body` da requisicao

### 2. Criar `send-pickup-confirmation` para Template 2 (Retirada)
- Nova edge function em `supabase/functions/send-pickup-confirmation/index.ts`
- Usar `ContentSid: HXfd32c526e2f3c8209d014dd2c2f27120`
- Enviar `ContentVariables` com 2 variaveis:
  - `{{1}}` = nome do morador
  - `{{2}}` = data/hora da retirada formato brasileiro
- Registrar no `config.toml` com `verify_jwt = false`

### 3. Ajustar chamadas no frontend

**ReceivePackage.tsx** - A chamada ja envia `photo_filename` e `resident_name`. Ajustar os nomes dos campos para alinhar com a edge function (`residentName` vs `resident_name`).

**Packages.tsx** - Ja chama `send-pickup-confirmation` com os campos corretos. Nenhuma mudanca necessaria.

---

## Detalhes tecnicos

A API do Twilio com Content Templates usa estes campos no POST:

```text
To=whatsapp:+5511...
From=whatsapp:+1415...
ContentSid=HXdc5f26078f32727eaa02ffc3c848f82e
ContentVariables={"1":"Joao","2":"Carlos","3":"17/02/2026, 14:30","4":"encomenda_123.jpg"}
```

O campo `Body` nao e enviado quando se usa `ContentSid`.

Arquivos modificados:
- `supabase/functions/send-whatsapp/index.ts` (reescrever)
- `supabase/functions/send-pickup-confirmation/index.ts` (criar)
- `supabase/config.toml` (adicionar send-pickup-confirmation)
- `src/pages/ReceivePackage.tsx` (ajustar nomes dos campos na chamada)
