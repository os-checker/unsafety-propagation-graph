<template>
  <div v-html="renderedHtml" class="upg-code-src" :class="{ 'is-wrapped': isWrapped }"></div>
</template>

<script setup lang="ts">
const { $shiki } = useNuxtApp()
const { src } = defineProps<{ src: string, isWrapped: boolean }>();

// Don't move hlOpts to computed closure, because it'll re-hightlight code
// when theme changes.
const hlOpts = {
  lang: "rust",
  themes: globalTheme().shikiThemes
};
const renderedHtml = computed(() => {
  return $shiki.highlighter.codeToHtml(src, hlOpts);
})
</script>

<style lang="css">
.upg-code-src.is-wrapped pre,
.upg-code-src.is-wrapped code {
  white-space: pre-wrap !important;
  word-break: break-all !important;
  overflow-wrap: break-word !important;
  max-width: 100%;
}
</style>
