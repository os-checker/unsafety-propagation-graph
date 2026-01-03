<template>
  <div v-html="md.render(doc)"></div>
</template>

<script setup lang="ts">
import { fromHighlighter } from "@shikijs/markdown-it/core"
import MarkdownIt from "markdown-it"

const { doc } = defineProps<{ doc: string }>();

// Construct markdown-it instance with shiki highlighter plugin
const md = MarkdownIt()
const { $shiki } = useNuxtApp()
const { shikiThemes } = globalTheme();
md.use(fromHighlighter($shiki.highlighter as any, {
  themes: shikiThemes,
  defaultColor: "light",
}));

</script>
