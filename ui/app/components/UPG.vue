<template>
  <div class="upg-left">
    <WidgetTopBar v-model:flowOpts="flowOpts" v-model:crate="crate" v-model="nodeItem" />
    <Flow :nodeItem="nodeItem" v-model:flowOpts="flowOpts" v-model:panelContent="panelContent" />
  </div>
  <div class="upg-right">
    <div class="upg-panel upg-panel-1">
      <WidgetSelectPanel v-model="leftPanel" v-model:panelContent="panelContent" />
    </div>
    <div class="upg-panel">
      <WidgetSelectPanel v-model="rightPanel" v-model:panelContent="panelContent" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FlowOpts } from "~/lib/topbar"
import { Panel, type PanelContent } from "~/lib/panel"
import { Crate, FLOW_OPTS, defaultCrateItemQuery, toCrate, toViewTypes } from "~/lib/topbar";

const router = useRouter();
const route = useRoute();
// watch(route, val => console.log(val.query))

/** Parse route query to show the specified item; default to a std item if anything wrong. */
function init() {
  let krate: undefined | Crate = undefined

  const item = route.query.item
  if (item && typeof item === "string") {
    const matched = item.match(/^([^:]+)/)
    if (matched && matched[1]) {
      krate = toCrate(matched[1])
    }
  }

  let flowOpts_ = FLOW_OPTS
  const view = route.query.view
  if (typeof view === "string") {
    const viewTypes = toViewTypes(view)
    if (viewTypes) flowOpts_.view = viewTypes
  }

  return {
    crate: krate ?? Crate.std,
    item: (krate && item && item as string) ?? defaultCrateItemQuery(Crate.std),
    flowOpts: flowOpts_
  }
}

const initState = init();
const crate = ref<Crate>(initState.crate);
const nodeItem = ref<string>(initState.item);
watch(crate, root => nodeItem.value = defaultCrateItemQuery(root))

const panelContent = ref<PanelContent>({ nodeItem: nodeItem.value });
watch(nodeItem, item => {
  panelContent.value.nodeItem = item
  router.replace({ query: { item } })
})

const leftPanel = ref(Panel.Src);
const rightPanel = ref(Panel.Doc);

const flowOpts = ref<FlowOpts>(initState.flowOpts);
watch(() => flowOpts.value.view, view => router.push({ query: { item: nodeItem.value, view: view.join(",") } }))
</script>
