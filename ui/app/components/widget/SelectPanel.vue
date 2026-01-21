<template>
  <div class="upg-panel-header">
    <USelect v-model="selected" :items="PANELS" placeholder="Select Panel" class="w-40"
      :content="{ bodyLock: false }" />

    <UCheckbox label="Wrap" v-model="isWrapped" />
  </div>

  <div class="upg-panel-content">
    <CodeSrc v-if="selected === Panel.Src" :src="content.src.src" :isWrapped="isWrapped" />
    <CodeSrc v-else-if="selected === Panel.Mir" :src="content.mir.mir" :isWrapped="isWrapped" />
    <CodeMarkdown v-else-if="selected === Panel.Doc" :doc="content.doc.doc" :isWrapped="isWrapped" />
  </div>
</template>

<script setup lang="ts">
import type { Doc, Mir, Src } from "~/lib/output";
import { EMPTY_DOC, EMPTY_MIR, EMPTY_SRC, mirURL, srcURL } from "~/lib/output";
import { Panel, PANELS, type PanelContent } from "~/lib/panel"

const selected = defineModel<Panel>();

const panelContent = defineModel<PanelContent>("panelContent", { required: true });

type Content = { src: Src, mir: Mir, doc: Doc, raw: string }
const EMPTY_CONTENT: Content = {
  src: EMPTY_SRC, mir: EMPTY_MIR, raw: "", doc: EMPTY_DOC
}
const content = ref<Content>(EMPTY_CONTENT)

watch(() => ({ panel: selected.value, name: panelContent.value.nodeItem }),
  ({ panel, name }) => {
    switch (panel) {
      case Panel.Src: {
        const url = srcURL(name)
        if (!url) content.value = EMPTY_CONTENT
        else $fetch(url)
          .then(text => {
            const raw = text as string
            const src: Src = JSON.parse(raw)
            content.value = { ...EMPTY_CONTENT, src, raw }
          })
          .catch(err => console.log(err));
        return
      }
      case Panel.Mir: {
        const url = mirURL(name)
        if (!url) content.value = EMPTY_CONTENT
        else $fetch(url)
          .then(text => {
            const raw = text as string
            const mir: Mir = JSON.parse(raw)
            content.value = { ...EMPTY_CONTENT, mir, raw }
          })
          .catch(err => console.log(err));
        return
      }
      case Panel.Doc: {
        const url = mirURL(name)
        if (!url) content.value = EMPTY_CONTENT
        else $fetch(url)
          .then(text => {
            const raw = text as string
            const doc: Doc = JSON.parse(raw)
            content.value = { ...EMPTY_CONTENT, doc, raw }
          })
          .catch(err => console.log(err));
        return
      }
      default: content.value = EMPTY_CONTENT
    }
  })

const isWrapped = ref(true);
</script>
