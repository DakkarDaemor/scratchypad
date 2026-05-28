import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base to '/scratchypad/' if deploying to GitHub Pages
// (i.e. https://<user>.github.io/scratchypad/)
// Change to '/' if using a custom domain or Netlify/Vercel
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/scratchypad/' : '/',
}))
