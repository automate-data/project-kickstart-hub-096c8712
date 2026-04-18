

## Diagnóstico

Você esclareceu que o que aparece são os **botões do Android** (barra de navegação do sistema: voltar, home, recentes) — não a barra do Chrome. Ou seja, o ajuste anterior (`display_override: ["standalone"]`) já funcionou para esconder o navegador. Agora falta esconder a UI do **sistema operacional** para virar fullscreen real.

Como você confirmou que pode esconder tudo (inclusive status bar), a solução é escalar para `fullscreen`.

## Mudanças

**`public/site.webmanifest`** — escalar display para fullscreen:
```json
"display_override": ["fullscreen", "standalone"],
"display": "fullscreen",
```

- `fullscreen`: oculta status bar (relógio/bateria) **e** barra de navegação do Android
- Fallback `standalone` para browsers que não suportarem fullscreen
- iOS continua igual (ignora estes campos)

**`index.html`** — reforçar fullscreen no Android com meta tag e ajustar viewport para considerar safe-areas:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="mobile-web-app-capable" content="yes" />
<!-- Status bar translúcida no Android (caso fullscreen caia para standalone) -->
<meta name="theme-color" content="#0f766e" />
```

`viewport-fit=cover` garante que o conteúdo use a tela inteira em telas com notch/safe-area, evitando faixas pretas quando o sistema fica fullscreen.

**`src/index.css`** (mínimo) — aplicar `env(safe-area-inset-*)` nos paddings principais para conteúdo não ficar embaixo do notch quando o Android entra em modo imersivo.

## Comportamento esperado no Android

- App abre ocupando tela inteira (sem status bar nem barra de navegação)
- Para acessar voltar/home, usuário faz swipe da borda inferior (gesto padrão do Android imersivo)
- iOS: sem mudança (já estava bom)

## Validação

Como manifest é cacheado pelo Chrome no momento da instalação:
1. Desinstalar PWA atual
2. Limpar dados do site no Chrome (Configurações → Apps → Chrome → Armazenamento → Gerenciar Espaço → "good-start-code" / "cheguei.automatedata.com.br")
3. Reinstalar via "Adicionar à tela inicial"

## Arquivos modificados
- `public/site.webmanifest`
- `index.html`
- `src/index.css` (ajuste mínimo de safe-area)

