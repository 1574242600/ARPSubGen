// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
    output: 'static',
    integrations: [react()],
    vite: {
        plugins: [tailwindcss()],
        build: {
            // lightningcss cannot parse Tailwind v4.3's @theme syntax yet
            cssMinify: 'esbuild',
        },
    },
})
