<template>
  <div class="top-menu">
    <div class="m-2"> </div>

    <div class="top-menu m-2 gap-1">

      <USlideover side="left" title="Navigation">
        <UTooltip text="Navigation">
          <UButton icon="tabler:sitemap" variant="ghost" />
        </UTooltip>
        <template #body>
          <WidgetNaviTree :navi="navi" v-model:node-id="nodeId" v-model:expanded-nodes="expandedNodess"
            v-model:tree-value="treeValue" />
        </template>
      </USlideover>

      <UTooltip text="Select A Crate">
        <USelect v-model="crate" placeholder="Crate" :items="CRATES" class="w-28" icon="tabler:box" />
      </UTooltip>

      <UModal :ui="{ content: 'w-[70vw] max-w-none' }">
        <UTooltip text="View Tags">
          <UButton icon="tabler:tag" variant="ghost" :ui="{ leadingIcon: 'text-orange-600 dark:text-orange-400' }" />
        </UTooltip>
        <template #content>
          <WidgetTag :tags="tags" />
        </template>
      </UModal>

      <UTooltip v-if="false" text="Layout Algorithm">
        <USelect v-model="flowOpts.layout" placeholder="Layout" :items="ELK_LAYOUTS" class="w-31"
          icon="tabler:layout-board-split-filled" />
      </UTooltip>

      <UTooltip text="Edge Type">
        <USelect v-model="flowOpts.edge" placeholder="Edge Type" :items="EDGE_TYPES" class="w-30" icon="tabler:line" />
      </UTooltip>

      <UTooltip text="Fit To Screen">
        <UButton icon="tabler:arrow-autofit-height" color="neutral" variant="ghost" @click="fitViewHandle" />
      </UTooltip>

      <UTooltip text="Graph View">
        <USelect v-model="flowOpts.view" multiple :items="VIEW_TYPES" class="w-45" icon="tabler:braces" />
      </UTooltip>

      <UColorModeButton />
      <!-- <ULink to="https://artisan-lab.github.io/RAPx-Book/6.4-unsafe.html" :external="true" target="_blank">Help</ULink> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TreeItem } from '@nuxt/ui';
import type { DataTags } from '~/lib/output';
import { VIEW_TYPES, NAVI, naviTreeURL, ELK_LAYOUTS, EDGE_TYPES, CRATES, tagURL } from '~/lib/topbar';
import type { Navi, FlowOpts, Crate } from '~/lib/topbar';

const flowOpts = defineModel<FlowOpts>('flowOpts', { required: true });
function fitViewHandle() { if (flowOpts.value) flowOpts.value.fit = true }

const crate = defineModel<Crate>('crate', { required: true });
const tags = ref<DataTags>({ v_fn: {}, spec: {} });
const navi = ref<Navi>(NAVI)
watch(crate, val => {
  // Update tag data.
  $fetch(tagURL(val))
    .then(text => tags.value = JSON.parse(text as string))
    .catch(err => console.log(err));
  // Update navi tree.
  $fetch(naviTreeURL(val))
    .then(text => navi.value = JSON.parse(text as string))
    .catch(err => console.log(err));
}, { immediate: true });

const nodeId = ref<number | undefined>();
const nodeItem = defineModel<string>({ required: true })
// Update nodeId when navi (crate) changes.
watch(navi, nav => {
  const item = nodeItem.value
  nodeId.value = item ? nav.name_to_id[item] : undefined
})
// Update nodeItem when nodeId changes to a valid id, and the fn name is different.
watch(nodeId, targetId => {
  if (targetId === undefined) return;

  const oldItem = nodeItem.value;
  for (const [fn_name, id] of Object.entries(navi.value.name_to_id)) {
    if (id === targetId) {
      if (oldItem !== fn_name) nodeItem.value = fn_name;
      return
    }
  }
})

// Keep these nodes expanded when the slideover is reopened.
const expandedNodess = ref<string[]>()
// Keep the last clicked item Selected when slideover is reopened.
const treeValue = ref<TreeItem>()
</script>
