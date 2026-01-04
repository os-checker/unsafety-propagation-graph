import { createHighlighterCore } from "shiki/core"
import { createOnigurumaEngine } from "shiki/engine/oniguruma"

export default defineNuxtPlugin(async () => {
  const highlighter = await createHighlighterCore({
    // We can't interpolate theme string here, because shiki
    // statically imports them.
    themes: [
      import("@shikijs/themes/github-light"),
      import("@shikijs/themes/github-dark"),
    ],
    langs: [
      import("@shikijs/langs/rust"),
    ],
    engine: createOnigurumaEngine(() => import("shiki/wasm"))
  })


  return {
    provide: {
      shiki: { highlighter }
    }
  }
})
