
## Anonimizacao de Fotos de Etiquetas para WhatsApp (LGPD)

### Problema
As etiquetas de encomendas contem dados pessoais sensiveis (CPF, endereco, telefone). Quando o morador recebe a notificacao via WhatsApp com o botao para ver a foto, ele ve a etiqueta completa e legivel. Pela LGPD, esses dados devem ser minimizados -- o morador so precisa reconhecer visualmente que e sua encomenda.

### Abordagem: Blur client-side no momento do registro

Ao registrar a encomenda, o sistema criara automaticamente duas versoes da foto:
- **Original** -- armazenada normalmente para porteiros e admins (usada no dashboard)
- **Versao borrada** -- com blur sutil aplicado, usada exclusivamente no link enviado via WhatsApp

O blur sera aplicado no navegador usando o filtro nativo do Canvas (`ctx.filter = 'blur(6px)'`), sem necessidade de bibliotecas externas ou processamento server-side.

### O que muda para o morador
O morador continua recebendo a mensagem com o botao para ver a foto. Ao clicar, vera a imagem com um blur suave -- suficiente para reconhecer cores, formas e o formato da encomenda, mas que dificulta a leitura de textos como CPF e endereco.

### O que NAO muda
- Porteiros e admins continuam vendo a foto original nitida no sistema
- O fluxo de registro permanece identico (sem passos extras)
- Os templates do Twilio nao precisam ser alterados

### Detalhes tecnicos

**Arquivo modificado:** `src/lib/imageProcessor.ts`
- Nova funcao `processImageBlurred(file: File)` que aplica `ctx.filter = 'blur(6px)'` antes de desenhar na canvas
- Retorna um `ProcessedImage` com filename prefixado `blurred_` (ex: `blurred_encomenda_1234.jpg`)

**Arquivo modificado:** `src/pages/ReceivePackage.tsx`
- No `handleSubmit`, apos fazer upload da imagem original, tambem processa e faz upload da versao borrada
- Passa o filename borrado (`blurred_encomenda_xxx.jpg`) para a funcao `send-whatsapp` no campo `photoFilename`
- A foto original continua sendo salva no campo `photo_url` do banco para uso no dashboard

**Nenhuma alteracao em:**
- Edge functions (send-whatsapp, send-pickup-confirmation, process-label)
- Componentes de exibicao (PackagePhoto, PickupDialog, Packages)
- Banco de dados
- Templates do Twilio
