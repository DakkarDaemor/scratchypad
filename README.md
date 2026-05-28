# ScratchyPad

A minimal online scratch editor — extended clipboard, text drafting, and AI-assisted writing.  
Your data lives in **your** Dropbox. No backend, no tracking.

## Features

- ✍️ Distraction-free editor with auto-save (localStorage draft)
- ☁️ Save/load notes to your **own Dropbox** folder (`/scratchypad/`)
- 🤖 AI actions via Claude API: Summarize, Improve, Fix grammar, Shorten, IT ↔ EN
- 🔐 All credentials stored locally in the browser — nothing sent to any third-party server
- 📱 Responsive, works on any device

## Setup

### 1. Dropbox token

1. Go to [dropbox.com/developers/apps](https://www.dropbox.com/developers/apps)
2. Create a new app → **Scoped access** → **Full Dropbox**
3. Under **Permissions**, enable: `files.content.write`, `files.content.read`
4. Under **Settings** → **OAuth 2** → click **Generate** to get an access token
5. Paste the token in ScratchyPad → ⚙ Settings

### 2. Claude API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Paste it in ScratchyPad → ⚙ Settings

> Both values are stored in `localStorage` — they never leave your browser.

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

> If you use a custom domain or deploy to Netlify/Vercel, change `base` in `vite.config.js` to `'/'`.

## Tech stack

- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Dropbox API v2](https://www.dropbox.com/developers/documentation/http/documentation)
- [Anthropic Claude API](https://docs.anthropic.com)
- Zero dependencies beyond React itself

## License

MIT
