# ScratchyPad

**Your data in your Google Drive. AI power via your own API key. No backend, no subscription, no lock-in.**

A minimal online scratch editor — multi-tab text drafting with AI writing assistance.  
No tracking, no server of ours ever sees your content.

## Features

- **Multi-tab editor** with drag-to-reorder, per-tab colors, and split-pane view (desktop)
- **Google Drive sync** — files saved as `.md` to a `/scratchypad/` folder in your own Drive
- **AI writing actions** on selection or full text: Summarize, Improve, Fix grammar, Shorten, Expand, Bullet points, Tone, IT ↔ EN, Continue
- **Custom AI actions** — define your own prompts in Settings → Actions, with `{{text}}` placeholder; each action can append to the text instead of replacing it
- **Multiple AI providers** — Claude, ChatGPT, Gemini, OpenRouter, Groq (configurable in Settings)
- **Markdown preview** — toggleable per pane with an Edit / Preview button
- **Find & Replace** — Ctrl+F to find, Ctrl+H for find & replace; navigate with Enter / Shift+Enter
- **Dictation** — speech-to-text input via Web Speech API
- **Font resize** — Ctrl+scroll or pinch on mobile
- **Auto-save** — draft persisted to localStorage on every keystroke
- **Sidebar** — file list from Drive with backup/restore support
- **Word and character count** always visible

## Setup

### 1. Login with Google

Click **Login with Google** — the app uses OAuth2 (no password, no token to copy).  
It only requests access to files it creates (`drive.file` scope), so it cannot see the rest of your Drive.

### 2. AI provider

Open **⚙ → Settings** (tabbed: Editor · AI · Actions · Account) and choose a provider:

| Provider | Key format | Free tier |
|---|---|---|
| Claude (Anthropic) | `sk-ant-…` | No |
| ChatGPT (OpenAI) | `sk-…` | No |
| Gemini (Google) | `AIza…` | Yes |
| OpenRouter | `sk-or-…` | Yes (`:free` models) |
| Groq | `gsk_…` | Yes |

API keys are saved to `scratchypad_config.json` in your Google Drive — available across all your devices, never stored on any third-party server.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

The repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and deploys automatically on every push to `main`.

1. Push this repo to GitHub
2. Go to **Settings → Pages → Source** → select **GitHub Actions**
3. Push to `main` — the site will be live at `https://<your-username>.github.io/scratchypad/`

> If you deploy to a custom domain or Netlify/Vercel, set `base: '/'` in `vite.config.js`.

## Tech stack

- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Google Drive REST API v3](https://developers.google.com/drive/api/v3/reference) + Google Identity Services (OAuth2)
- AI: Anthropic Claude, OpenAI, Google Gemini, OpenRouter, Groq
- [marked](https://marked.js.org/) for Markdown rendering

## Credits

Built by Fabio & Claude.

## License

MIT
