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
import { Crate, FLOW_OPTS, defaultCrateItemQuery, toCrate } from "~/lib/topbar";

const flowOpts = ref<FlowOpts>(FLOW_OPTS);

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
  return {
    crate: krate ?? Crate.std,
    item: (krate && item && item as string) ?? defaultCrateItemQuery(Crate.std)
  }
}

const initState = init();
const crate = ref<Crate>(initState.crate);
const nodeItem = ref<string>(initState.item);
watch(crate, root => nodeItem.value = defaultCrateItemQuery(root))
watch(nodeItem, item => router.replace({ query: { item } }), { immediate: true })

const panelContent = ref<PanelContent>({ nodeItem: nodeItem.value });
watch(nodeItem, name => { if (name) panelContent.value.nodeItem = name })

const leftPanel = ref(Panel.Src);
const rightPanel = ref(Panel.Doc);

</script>
