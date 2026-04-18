

## Plano: Ocultar barra de navegação do browser no PWA Android

### Diagnóstico

No `public/site.webmanifest` atual:
```json
"display": "standalone"
```

No Android, `standalone` ainda mostra a barra de status do sistema e, em alguns launchers/versões do Chrome, pode exibir controles do browser quando o usuário navega entre rotas. O iOS ignora `display` e sempre roda fullscreen-ish quando instalado via "Adicionar à Tela de Início" — por isso lá está limpo.

A solução padrão é usar **`display_override`** (suportado pelo Chrome/Android) com fallback para `display`:

```json
"display_override": ["fullscreen", "standalone"],
"display": "standalone"
```

- `fullscreen`: oculta barra de status + qualquer chrome do navegador (comportamento de app nativo)
- Fallback para `standalone` em browsers que não suportam `display_override`
- iOS continua igual (ignora ambos os campos, usa meta tags já presentes no `index.html`)

### Alternativa considerada

`"display": "fullscreen"` direto — mas isso esconde também a barra de status do sistema (relógio, bateria), o que costuma incomodar em apps de produtividade. Por isso `display_override: ["fullscreen", "standalone"]` é mais conservador? **Não** — `fullscreen` esconde a status bar também. 

Opção mais equilibrada: usar **`"display_override": ["standalone"]`** com `theme_color` correto (já tem `#0f766e`) — isso garante standalone "puro" no Android, sem chrome do browser, mas mantém status bar.

### Decisão recomendada

Usar `display_override: ["standalone"]` (mantém status bar do Android, oculta toda UI do Chrome). Se mesmo assim aparecer chrome, escalar para `["fullscreen", "standalone"]`.

### Mudança

**`public/site.webmanifest`** — adicionar 1 linha:
```json
"display_override": ["standalone"],
"display": "standalone",
```

### Validação

Usuário precisa **desinstalar e reinstalar** o PWA no Android (manifest é cacheado pelo Chrome na instalação — não atualiza sozinho). Após reinstalar, a barra do Chrome deve sumir.

### Arquivo modificado
- `public/site.webmanifest` (1 linha adicionada)

