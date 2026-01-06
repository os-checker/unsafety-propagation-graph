// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: true,
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  sourcemap: { server: false, client: false, },
  // devtools: { enabled: true }
})
