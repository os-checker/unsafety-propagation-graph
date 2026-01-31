// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: true,
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  sourcemap: { server: false, client: false, },
  icon: {
    serverBundle: { collections: ['tabler'] },
    clientBundle: {
      // https://icones.js.org/collection/codicon
      // https://icones.js.org/collection/tabler
      icons: [
        'tabler:letter-m', // module
        'tabler:letter-s', // struct
        'tabler:letter-e', // enum
        'tabler:letter-u', // union
        'tabler:letter-t', // trait
        'tabler:letter-t-small', // SelfTy
        'tabler:square-letter-f',// function
        'tabler:letter-m-small', // method
        'tabler:square-rounded-letter-p-filled', // safety property
        'tabler:alert-circle', // something wrong
        'tabler:chevron-right', // separator
        'tabler:arrow-autofit-height', // fit view
        'tabler:layout-board-split-filled', // layout
        'tabler:braces', // graph view kind
        'tabler:line', // edge type
        'tabler:box', // crate
        'tabler:tag', // safety tag
        'tabler:search', // search
        'tabler:sitemap', // sidebar
        'tabler:browser-share', // share
        'tabler:hexagon-letter-c-filled', // constructor
        'tabler:hexagon-letter-f-filled', // field
        'tabler:hexagon-letter-a-filled', // argument
        'tabler:hexagon-letter-l-filled', // locals
        'tabler:question-mark', // help
      ],
    }
  },
})
