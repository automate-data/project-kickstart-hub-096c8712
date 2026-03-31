

## Integração do LockerDialog no TowerDashboard

### Objetivo
Conectar o botão "Alocar em Armário" ao `LockerDialog`, registrar o evento no banco e enviar notificação WhatsApp com o template correto.

### Alterações

**1. `src/pages/TowerDashboard.tsx`** (único arquivo modificado)

- Importar `LockerDialog` de `@/components/custody/CustodyDialogs`
- Adicionar estado `lockerPkg` para o pacote selecionado e `lockerOpen` para o dialog
- Substituir o `toast.info('Funcionalidade de armário em breve')` por abertura do `LockerDialog` com o pacote clicado
- Implementar `handleLockerConfirm(lockerReference, sendWhatsApp)`:
  1. Buscar o primeiro locker (`locations` com `parent_id = towerLocationId` e `type = 'locker'`)
  2. Inserir `package_event` com `package_id`, `from_location_id = towerLocationId`, `to_location_id = lockerId`, `transferred_by = user.id`, `notes = "locker_reference:{ref}"`
  3. Se `sendWhatsApp` ativado, invocar `send-locker-notification` com `resident_phone`, `resident_name`, `tower_name`, `locker_reference`, `registered_by` (nome do perfil do porteiro), `datetime`
  4. Toast de sucesso, fechar dialog, recarregar pacotes
- Renderizar `<LockerDialog>` passando `towerName`, `lockerPkg`, `open`, `onOpenChange`, `onConfirm`

**2. `supabase/functions/send-locker-notification/index.ts`**

- Atualizar `ContentSid` de `"HXlocker_placeholder"` para `"HXc204f9f00578f2992b04646e8482f2bd"` (template real do Twilio)
- O template espera 3 variáveis: `{{1}}` = nome morador, `{{2}}` = nome torre, `{{3}}` = referência armário
- Ajustar `ContentVariables` para enviar apenas as 3 variáveis necessárias

### Fluxo
```text
Botão "Alocar em Armário" → LockerDialog abre
  → Porteiro digita referência (ex: "A7")
  → Toggle WhatsApp (on/off)
  → Confirmar
    → INSERT package_event (locker_reference no notes)
    → Se WhatsApp on: invoke send-locker-notification
    → Refresh lista
```

