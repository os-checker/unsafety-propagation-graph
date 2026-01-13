<template>
  <div v-html="html"></div>
</template>

<script setup lang="ts">
import { fromHighlighter } from "@shikijs/markdown-it/core"
import MarkdownIt from "markdown-it"

const props = defineProps<{ doc: string }>();

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
