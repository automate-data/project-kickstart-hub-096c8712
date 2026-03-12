
## Tarja em informacoes sensiveis (substituindo blur)

### Abordagem

Substituir o blur atual por tarjas pretas sobre areas sensiveis da etiqueta. Para isso, a IA que ja le a etiqueta (`process-label`) tambem retornara as coordenadas (bounding boxes) das areas com dados sensiveis (CPF, endereco completo, telefone, CEP). No client-side, essas coordenadas serao usadas para desenhar retangulos pretos sobre a imagem antes de enviar via WhatsApp.

O nome do destinatario e a transportadora ficam visiveis -- o morador precisa reconhecer que a encomenda e dele.

### O que muda

1. **Edge function `process-label`** -- Adicionar ao prompt da IA uma instrucao para retornar tambem um campo `sensitive_regions` com bounding boxes normalizadas (0-1000) das areas que contem CPF, endereco, telefone e CEP. O Gemini Vision suporta retorno de coordenadas espaciais.

2. **`src/lib/imageProcessor.ts`** -- Substituir `processImageBlurred` por `processImageRedacted(file, regions)` que recebe a lista de bounding boxes e desenha retangulos pretos semitransparentes (com cantos arredondados para visual mais suave) sobre essas areas.

3. **`src/pages/ReceivePackage.tsx`** -- Passar as `sensitive_regions` retornadas pela IA para a nova funcao de redacao. O fluxo de dual upload (original + redacted) permanece igual.

4. **`src/types/index.ts`** -- Adicionar tipo `SensitiveRegion` para as bounding boxes.

### Detalhes tecnicos

**Arquivo modificado: `supabase/functions/process-label/index.ts`**
- Adicionar ao SYSTEM_PROMPT instrucoes para retornar `sensitive_regions`:
```
"sensitive_regions": [
  { "label": "cpf", "x": 100, "y": 200, "width": 300, "height": 50 },
  { "label": "address", "x": 50, "y": 400, "width": 500, "height": 120 }
]
```
- As coordenadas sao normalizadas em escala 0-1000 (relativas ao tamanho da imagem)
- Labels possiveis: "cpf", "address", "phone", "zipcode", "rg"
- Instrucao explicita: NAO incluir o nome do destinatario nas regioes sensiveis

**Arquivo modificado: `src/types/index.ts`**
- Novo tipo:
```typescript
interface SensitiveRegion {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

**Arquivo modificado: `src/lib/imageProcessor.ts`**
- Remover `processImageBlurred`
- Nova funcao `processImageRedacted(file: File, regions: SensitiveRegion[])`:
  - Carrega a imagem e redimensiona (mesma logica do processForWhatsApp)
  - Converte coordenadas normalizadas (0-1000) para pixels reais
  - Desenha retangulos pretos com `ctx.fillRect` sobre cada regiao, com pequena margem de seguranca
  - Para visual suave: usa `roundRect` com cantos arredondados de 4px e opacidade de ~0.92 (quase opaco, mas sutilmente suave)
  - Fallback: se nao receber regioes, aplica blur simples como antes (seguranca)
  - Prefixo do filename: `redacted_encomenda_xxx.jpg`

**Arquivo modificado: `src/pages/ReceivePackage.tsx`**
- Armazenar `sensitiveRegions` no state (vindas da resposta da IA)
- No `handleSubmit`, chamar `processImageRedacted(photoFile, sensitiveRegions)` ao inves de `processImageBlurred(photoFile)`
- Passar filename redacted para `send-whatsapp`

### Fallback de seguranca
Se a IA nao retornar bounding boxes (por qualquer motivo), o sistema aplica o blur como fallback, garantindo que dados nunca sejam enviados sem protecao.

### O que NAO muda
- Porteiros e admins continuam vendo a foto original no sistema
- O fluxo de registro nao tem passos extras
- Templates do Twilio permanecem iguais
- Banco de dados sem alteracoes
