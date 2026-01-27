<template>
  <div v-html="html" class="prose prose-slate max-w-none dark:prose-invert mt-2 prose-tight-list"
    :class="{ 'code-wrap': isWrapped }">
  </div>
</template>

<script setup lang="ts">
import { fromHighlighter } from "@shikijs/markdown-it/core"
import MarkdownIt from "markdown-it"

const props = defineProps<{ doc: string, isWrapped: boolean }>();

const { $shiki } = useNuxtApp()
const { shikiThemes } = globalTheme();

const md = MarkdownIt()

md.use(fromHighlighter($shiki.highlighter as any, {
  themes: shikiThemes,
  fallbackLanguage: 'rust',
}))

const html = computed(() => {
  return md.render(props.doc)
})

</script>

<style lang="css">
.prose pre {
  white-space: pre;
  /* overflow-x: auto; */
}

/* Force wrapping if parent has .code-wrap class. */
.code-wrap pre {
  white-space: pre-wrap !important;
  /* word-break: break-all; */
  /* overflow-x: visible; */
}
</style>
