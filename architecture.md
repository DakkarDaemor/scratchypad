# ScratchyPad — Architecture

## Stack

React 18 + Vite, zero backend. Deploy su GitHub Pages.
Storage: Google Drive REST API v3 + OAuth2 (GIS), scope `drive.file`.
AI: Claude / OpenAI / Gemini / OpenRouter / Groq — chiavi salvate su Drive in `scratchypad_config.json`.

---

## Pattern utilizzati

### Custom Hooks
Il pattern centrale dell'app. `useGDrive`, `useAI`, `useSession`, `useDictation`, `useSwipe`
incapsulano logica e stato in unità coese, separando i concerns dal componente radice `App.jsx`.

### Facade
`useGDrive` nasconde la complessità dell'API REST di Google Drive (OAuth2, folder discovery,
multipart upload, backup) dietro un'interfaccia semplice: `getToken`, `saveFile`, `loadConfig`, ecc.

### Strategy
`useAI` implementa il pattern Strategy: la funzione `dispatch` seleziona a runtime
l'implementazione concreta (`callClaude`, `callOpenAI`, `callGemini`) in base a `config.provider`,
senza che i chiamanti sappiano quale provider è attivo.

### Command
`constants.js` definisce `AI_ACTIONS` (lista di comandi) e `AI_PROMPTS` (mappa `nome → funzione`).
Le azioni AI custom sono oggetti con `label`, `prompt` e `append`, che `runAI` in `App.jsx`
esegue in modo uniforme indipendentemente dalla loro origine (builtin o custom).

### Container / Presentational
`App.jsx` è il container: gestisce tutto lo stato e la logica applicativa.
I componenti (`EditorPane`, `TabBar`, `Sidebar`, ecc.) sono presentational — ricevono dati
e callback via props, senza dipendenze da Drive o AI.

### Controlled Components
Tutte le textarea e gli input sono controllati (pattern React standard): `value` + `onChange`.
L'accesso diretto al DOM è limitato ai casi strettamente necessari (`setSelectionRange` in
FindBar, `scrollIntoView` in TabBar).

### Ref come out-parameter
`taRef` viene passato dall'alto verso il basso fino a `<textarea>` in `EditorPane` e usato da
`App.jsx` per leggere la selezione corrente (`selectionStart`/`selectionEnd`) senza causare
re-render aggiuntivi.

### Index/Barrel exports
Ogni componente ha il proprio `index.jsx` — convenzione che permette importazioni pulite:
`import { EditorPane } from './components/EditorPane'`.

---

## Scelte architetturali deliberate

### Nessun Context/Provider

L'albero dei componenti è piatto e fisso: tutti i figli diretti di `App.jsx` sono a un solo
livello di profondità. Il prop drilling è gestibile e mantiene esplicito il flusso dei dati.

Context introduce un accoppiamento implicito e rende i componenti più difficili da riusare
in isolamento — non conviene usarlo senza un vantaggio concreto di profondità dell'albero.

### Nessun reducer/Redux

Redux è utile quando lo stato è condiviso tra molti componenti non correlati, o quando le
transizioni di stato sono complesse. Qui tutto lo stato vive in `App.jsx` e le transizioni
sono semplici (`setPanel`, `setLoading`, `setAiResult`…).

Il criterio pratico: se riesci a capire lo stato leggendo un unico file, `useState` è
sufficiente. Aggiungere Redux significa scrivere actions, reducers, selectors e un provider
per nessun guadagno concreto a questa scala.

### Nessun backend

Scelta esplicita di zero infrastructure cost:

- Google Drive fa da storage (file) e da database (config JSON)
- OAuth2 gira interamente nel browser via Google Identity Services
- Deploy su GitHub Pages = hosting gratuito, zero server da mantenere

Il trade-off accettato: le chiavi API viaggiano tra browser e provider AI senza intermediari
server-side. Questo è ragionevole perché le chiavi appartengono all'utente stesso, non all'app.
