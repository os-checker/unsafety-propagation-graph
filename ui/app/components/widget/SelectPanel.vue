<template>
  <div class="upg-panel-header">
    <USelect v-model="selected" :items="PANELS" placeholder="Select Panel" class="w-43"
      :content="{ bodyLock: false }" />

    <UCheckbox label="Wrap" v-model="isWrapped" />
  </div>

  <ClientOnly>
    <div class="upg-panel-content">
      <CodeSrc v-if="selected === Panel.Src" :src="src.src" :isWrapped="isWrapped" />
      <CodeSrc v-else-if="selected === Panel.Mir" :src="mir.mir" :isWrapped="isWrapped" />
      <CodeMarkdown v-else-if="selected === Panel.Doc" :doc="doc.doc" :isWrapped="isWrapped" />
      <CodeMarkdown v-else-if="selected === Panel.Tag" :doc="tagDoc" :isWrapped="isWrapped" />
      <CodeAdt v-else-if="selected === Panel.Adt" :adt="adtOpts.data" :tags="tags" :unsafeFns="unsafeFns" />
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { Doc, Mir, Src } from "~/lib/output";
import { docURL, EMPTY_DOC, EMPTY_MIR, EMPTY_SRC, mirURL, srcURL } from "~/lib/output";
import { adtDoc, type AdtOpts } from "~/lib/output/adt";
import { getTagDoc, type DataTags, } from "~/lib/output/tag";
import { Panel, PANELS, type PanelContent } from "~/lib/panel"
import getLink from "~/utils/getLink";
import { type UnsafeFns } from "~/lib/topbar";

const selected = defineModel<Panel>();
const panelContent = defineModel<PanelContent>("panelContent", { required: true });
const props = defineProps<{ tags: DataTags, unsafeFns: UnsafeFns, adtOpts: AdtOpts }>()

const src = ref<Src>(EMPTY_SRC)
const mir = ref<Mir>(EMPTY_MIR)
const doc = ref<Doc>(EMPTY_DOC)
const tagDoc = ref("")

const router = useRouter()
const route = useRoute()
const getURL = (item: string) => getLink(item, route, router)

watch(
  () => ({ panel: selected.value, name: panelContent.value.nodeItem, tags: props.tags, adt: props.adtOpts }),
  ({ panel, name, tags, adt }) => {
    switch (panel) {
      case Panel.Src: {
        if (adt.name && adt.data) {
          src.value = { name: adt.name, span: adt.data.span, src: adt.data.src }
          return
        }

        const url = srcURL(name)
        if (!url) src.value = EMPTY_SRC
        else $fetch(url)
          .then(text => src.value = JSON.parse(text as string))
          .catch(() => src.value = EMPTY_SRC);
        return
      }
      case Panel.Mir: {
        const url = mirURL(name)
        if (!url) mir.value = EMPTY_MIR
        else $fetch(url)
          .then(text => mir.value = JSON.parse(text as string))
          .catch(() => mir.value = EMPTY_MIR);
        return
      }
      case Panel.Doc: {
        if (adt.name && adt.data) {
          doc.value = { name: adt.name, span: adt.data.span, doc: adtDoc(adt.data) }
          return
        }

        const url = docURL(name)
        // doc.json is failed to fetch, so we can unlink the item.
        if (!url) doc.value = { name, span: "", doc: name }
        else $fetch(url)
          .then(text => {
            const d: Doc = JSON.parse(text as string)
            // Encode fn name and span at the start of doc string.
            d.doc = `[\`${name}\`](${getURL(name)})\n\n${d.doc}`
            doc.value = d
          })
          .catch(() => doc.value = EMPTY_DOC);
        return
      }
      case Panel.Tag: {
        const v_tagDoc = getTagDoc(name, tags, true)
        const doc = v_tagDoc.map(s => s.doc).join("\n\n")
        // FIXME: unlike Panel.Doc which doesn't return the link,
        // here encodes the link anyway because we don't check if 
        // the item is jumpable or not.
        tagDoc.value = `[\`${name}\`](${getURL(name)})\n\n${doc}`
        return
      }
      default: {
        src.value = EMPTY_SRC;
        mir.value = EMPTY_MIR;
        doc.value = EMPTY_DOC;
        tagDoc.value = "";
      }
    }
  },
  { immediate: true })

const isWrapped = ref(true);
</script>
