import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { demoStatePlugin } from '../../scripts/demo-state-plugin'

export default defineConfig({
  plugins: [demoStatePlugin(), react(), tailwindcss()],
  server: { port: 5173 },
})
