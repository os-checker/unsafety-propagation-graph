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
import { Crate, FLOW_OPTS, defaultCrateItemQuery } from "~/lib/topbar";

const flowOpts = ref<FlowOpts>(FLOW_OPTS);

const crate = ref<Crate>(Crate.std);
const nodeItem = ref<string>(defaultCrateItemQuery(crate.value));
watch(crate, root => nodeItem.value = defaultCrateItemQuery(root))

const panelContent = ref<PanelContent>({ nodeItem: nodeItem.value });
watch(nodeItem, name => { if (name) panelContent.value.nodeItem = name })

const leftPanel = ref(Panel.Src);
const rightPanel = ref(Panel.Doc);

const router = useRouter();
const route = useRoute();
watch(route, val => console.log(val.query))
watch(nodeItem, item => {
  router.replace({ query: { item } })
}, { immediate: true })
</script>
