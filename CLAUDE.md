# ScratchyPad — CLAUDE.md

## Comandi essenziali

```bash
npm run dev      # dev server (localhost:5173)
npm run build    # build → dist/
npm run preview  # preview del build
```

## Stack

React 18 + Vite + CSS Modules. Zero backend. Deploy su GitHub Pages via Actions.
Storage: Google Drive REST API v3 + OAuth2 (GIS), scope `drive.file`.
AI: Claude / OpenAI / Gemini / OpenRouter / Groq — chiavi salvate su Drive in `scratchypad_config.json`.
Markdown: libreria `marked`.

## Struttura

```
src/
  App.jsx                  # root: stato globale, layout, routing logico
  App.module.css
  constants.js             # CLIENT_ID, AI_ACTIONS, AI_PROMPTS, KEYS, TAB_COLORS, ecc.
  utils.js
  main.jsx
  ui/                      # primitivi: IconBtn, Btn
  hooks/
    useGDrive.js           # OAuth2 + Drive API (token, file CRUD, folder)
    useAI.js               # chiamate AI (tutti i provider)
    useSession.js          # stato tab (testi, ordine, colori) — localStorage
    useDictation.js        # Web Speech API
    useSwipe.js            # swipe mobile per sidebar
  components/
    TopBar/                # barra superiore: save, menu ⚙, split toggle
    TabBar/                # tab drag-to-reorder, colori, close
    EditorPane/            # textarea + FindBar + markdown preview
    Sidebar/               # lista file Drive, backup/restore
    AIBar/                 # toolbar azioni AI + selezione testo
    AIResultModal/         # modal risultato AI con diff/accept
    SettingsModal/         # provider, API key, font, markdown mode
    LoginScreen/           # schermata iniziale OAuth
```

## Convenzioni

- **CSS Modules** ovunque: `import s from './Foo.module.css'`, classi con `s.foo`.
- **Componenti**: `export function FooComponent(...)` (named export, no default).
- **Stile**: palette viola/lilla (#9b85c4, #6a5f8a, #e0d8f0), font DM Sans / Lora / DM Mono.
- **Nessun test** — verificare build pulito dopo ogni modifica (`npm run build`).
- **Nessun backend** — tutto client-side; mai introdurre chiamate server proprie.
- Textarea raw (`<textarea>`) — nessun rich-text framework.
- `setSelectionRange` per evidenziare match nel Find & Replace.

## Pattern chiave

- **findTrigger** (`null | 'find' | 'replace'`): stato in App.jsx → EditorPane via prop, resettato da `onFindTriggered`. Permette a TopBar di aprire FindBar nel pannello focalizzato.
- **useSession**: array di tab `{ id, name, text, color }` in localStorage (`sp_session`).
- **useGDrive**: gestisce token GIS, folder `/scratchypad/` su Drive, config AI.
- **Split view**: due `<EditorPane>` affiancati, prop `focused` distingue quale è attivo.

## Note deploy

- `vite.config.js` ha `base: '/scratchypad/'` per GitHub Pages.
- Google OAuth client ID in `constants.js` — non cambiare senza aggiornare la Google Cloud Console.
- Backlog e decisioni di progetto: vedi memory files Claude (`project_backlog.md`).
