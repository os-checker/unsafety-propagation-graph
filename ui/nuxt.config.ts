// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
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
      ],
    }
  },
  // vite: {
  //   optimizeDeps: {
  //     // 预构建这些库，防止它们在开发环境下导致页面多次刷新，
  //     // 也能帮助 Vite 在生产环境下更稳定地处理它们。
  //     include: ['elkjs', '@dagrejs/dagre', '@dagrejs/graphlib',]
  //   },
  //   build: {
  //     // 1. 必须禁用，否则 elkjs 的巨大体积会导致这个补丁注入失败
  //     modulePreload: { polyfill: false },
  //
  //     // 2. 适当调高警告阈值（治标）
  //     chunkSizeWarningLimit: 3000,
  //
  //     commonjsOptions: {
  //       // 允许处理 node_modules 里的 CommonJS 模块
  //       include: [/@dagrejs\/dagre/, /@dagrejs\/graphlib/, /node_modules/],
  //       // 关键：很多库会用 try-catch 包裹 require，设置此项为 false 能跳过检查
  //       ignoreTryCatch: false
  //     }
  //   },
  // },
  // 2. 核心修复：针对 Nitro 服务端的配置
  // nitro: {
  //   externals: {
  //     // 强制 Nitro 在服务端构建时将这些包内联
  //     // 这样可以避免运行时出现 "Dynamic require" 错误
  //     inline: [
  //       '@dagrejs/dagre',
  //       '@dagrejs/graphlib',
  //       'elkjs'
  //     ]
  //   },
  // },
  // build: {
  //   transpile: ['elkjs',]
  // },
  // devtools: { enabled: true }
})
