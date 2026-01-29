<template>
  <div class="top-menu">
    <div class="top-menu m-2 gap-1">
      <UTooltip text="Update URL To Share The Link">
        <UButton icon="tabler:browser-share" color="neutral" variant="ghost" @click="shareHandle" />
      </UTooltip>
      <ClientOnly>{{ nodeItem }}</ClientOnly>
    </div>

    <div class="top-menu m-2 gap-1">

      <UModal :ui="{ content: 'w-[70vw] max-w-none' }">
        <UTooltip text="Search Function">
          <UButton icon="tabler:search" variant="ghost" color="neutral" />
        </UTooltip>
        <template #content>
          <WidgetSearchFn :v_fn="searchFnItems" :unsafe-fns="unsafeFns" v-model="search"
            :title="`Search All Funtions in Crate ${crate}`" />
        </template>
      </UModal>

      <USlideover side="left" title="Navigation Tree">
        <UTooltip text="Navigation Tree">
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
        <UTooltip text="Safety Properties Specs & Stats">
          <UButton icon="tabler:tag" variant="ghost" label="Safety Tags"
            :ui="{ leadingIcon: 'text-orange-600 dark:text-orange-400', label: 'text-orange-600 dark:text-orange-400' }" />
        </UTooltip>
        <template #content>
          <WidgetTag :tags="tags" />
        </template>
      </UModal>

      <!-- <UTooltip v-if="false" text="Layout Algorithm"> -->
      <!--   <USelect v-model="flowOpts.layout" placeholder="Layout" :items="ELK_LAYOUTS" class="w-31" -->
      <!--     icon="tabler:layout-board-split-filled" /> -->
      <!-- </UTooltip> -->
      <!---->
      <!-- <UTooltip text="Edge Type"> -->
      <!--   <USelect v-model="flowOpts.edge" placeholder="Edge Type" :items="EDGE_TYPES" class="w-30" icon="tabler:line" /> -->
      <!-- </UTooltip> -->

      <UTooltip text="Fit To Screen">
        <UButton icon="tabler:arrow-autofit-height" color="neutral" variant="ghost" @click="fitViewHandle" />
      </UTooltip>

      <!-- <UTooltip text="Graph View"> -->
      <!--   <USelect v-model="flowOpts.view" multiple :items="VIEW_TYPES" class="w-50" icon="tabler:braces" /> -->
      <!-- </UTooltip> -->

      <UColorModeButton />
      <!-- <ULink to="https://artisan-lab.github.io/RAPx-Book/6.4-unsafe.html" :external="true" target="_blank">Help</ULink> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TreeItem } from '@nuxt/ui';
import { getTag, type DataTags } from '~/lib/output/tag';
import { NAVI, naviTreeURL, CRATES, } from '~/lib/topbar';
import type { Navi, FlowOpts, Crate, Search, SearchFnItem, UnsafeFns } from '~/lib/topbar';

// Props values are passed in, and never mutated here.
const props = defineProps<{ tags: DataTags, unsafeFns: UnsafeFns }>();

const flowOpts = defineModel<FlowOpts>('flowOpts', { required: true });
function fitViewHandle() { if (flowOpts.value) flowOpts.value.fit = true }

const crate = defineModel<Crate>('crate', { required: true });

const navi = ref<Navi>(NAVI)
watch(crate, val => {
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

const share = defineModel<boolean>("share", { required: true })
const shareHandle = () => { share.value = true }

// Search fn
const search = ref<Search>({ withTags: true, unsafeOnly: true, text: "", page: 1, itemsPerPage: 20 })
const searchFnItems = computed<SearchFnItem[]>(() => {
  return Object.keys(navi.value.name_to_id).map(name => {
    return { name, tags: getTag(name, props.tags, true) }
  })
})
</script>
