/* eslint-env node */
import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

const enableBundleReport = Boolean(process.env.npm_config_report)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(enableBundleReport
      ? [
          visualizer({
            filename: 'dist/bundle-report.html',
            template: 'treemap',
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ],
})
