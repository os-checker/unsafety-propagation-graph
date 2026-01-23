<template>
  <div class="upg-left">
    <WidgetTopBar v-model:flowOpts="flowOpts" v-model:crate="crate" v-model="nodeItem" v-model:share="share"
      :tags="tags" />
    <Flow :nodeItem="nodeItem" :tags="tags" v-model:flowOpts="flowOpts" v-model:panelContent="panelContent" />
  </div>
  <div class="upg-right">
    <div class="upg-panel upg-panel-1">
      <WidgetSelectPanel v-model="upPanel" v-model:panelContent="panelContent" :tags="tags" />
    </div>
    <div class="upg-panel">
      <WidgetSelectPanel v-model="downPanel" v-model:panelContent="panelContent" :tags="tags" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FlowOpts } from "~/lib/topbar"
import { type DataTags, } from '~/lib/output/tag';
import { Panel, toPanel, toPanelStr, type PanelContent } from "~/lib/panel"
import { Crate, FLOW_OPTS, defaultCrateItemQuery, tagURL, toCrate, toViewTypes } from "~/lib/topbar";

const router = useRouter();
const route = useRoute();
// watch(route, val => console.log(val.query))

/** Parse route query to show the specified item; default to a std item if anything wrong. */
function init() {
  const query = route.query
  let krate: undefined | Crate = undefined

  const item = query.item
  if (item && typeof item === "string") {
    const matched = item.match(/^([^:]+)/)
    if (matched && matched[1]) {
      krate = toCrate(matched[1])
    }
  }

  let flowOpts_ = FLOW_OPTS
  const view = query.view
  if (typeof view === "string") {
    const viewTypes = toViewTypes(view)
    if (viewTypes) flowOpts_.view = viewTypes
  }

  return {
    crate: krate ?? Crate.std,
    item: (krate && item && item as string) ?? defaultCrateItemQuery(Crate.std),
    flowOpts: flowOpts_,
    up: toPanel(query.up as string) ?? Panel.Src,
    down: toPanel(query.down as string) ?? Panel.Doc,
  }
}

const initState = init();
const crate = ref<Crate>(initState.crate);
const nodeItem = ref<string>(initState.item);
watch(crate, root => nodeItem.value = defaultCrateItemQuery(root))

const tags = ref<DataTags>({ v_fn: {}, spec: {} });
watch(crate, val => {
  $fetch(tagURL(val))
    .then(text => tags.value = JSON.parse(text as string))
    .catch(err => console.log(err));
}, { immediate: true });

const panelContent = ref<PanelContent>({ nodeItem: nodeItem.value });
watch(nodeItem, item => {
  panelContent.value.nodeItem = item
  router.replace({ query: { item } })
})

const upPanel = ref(initState.up);
const downPanel = ref(initState.down);

const flowOpts = ref<FlowOpts>(initState.flowOpts);

const share = ref<boolean>(false)
watch(share, val => {
  if (!val) return;
  // Update URL with all queries.
  router.push({
    query: {
      item: nodeItem.value,
      view: flowOpts.value.view.join(","),
      up: toPanelStr(upPanel.value),
      down: toPanelStr(downPanel.value),
    }
  })
  share.value = false // share will be triggered again shen the button is clicked
})
</script>
