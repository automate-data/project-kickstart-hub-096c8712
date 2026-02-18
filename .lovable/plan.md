
## Adicionar botao "Selecionar arquivo" na tela de recebimento (desktop)

### O que muda

Na tela `/receive`, no passo `capture`, alem do botao de camera, adicionar um segundo botao para selecionar uma foto do computador. No mobile, o botao de camera ja abre a galeria como fallback, entao o novo botao sera mais util no desktop.

### Implementacao

**Arquivo:** `src/pages/ReceivePackage.tsx`

Na secao `step === 'capture'` (linhas ~300-325), o layout atual tem apenas o bloco clicavel da camera. A mudanca:

1. Manter o bloco da camera como esta (clique abre a camera)
2. Adicionar abaixo um divisor "ou" e um botao secundario "Selecionar arquivo" que aciona o `fileInputRef.current?.click()` para abrir o seletor de arquivos do sistema operacional
3. O `<input type="file">` ja existe no codigo (linha ~298), entao basta reutiliza-lo

Layout visual:

```text
+---------------------------+
|                           |
|    [icone camera]         |
|    Toque para fotografar  |
|                           |
+---------------------------+

         — ou —

  [ Selecionar do computador ]
```

### Detalhes tecnicos

- O botao usara `variant="outline"` com icone `Upload` (ou `ImagePlus`) do lucide-react
- O input file ja chama `handleFileChange` que processa a imagem normalmente
- Nenhuma mudanca de logica, apenas UI adicional
