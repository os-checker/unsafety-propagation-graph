<template>
  <div class="upg-left">
    <WidgetTopBar v-model:flowOpts="flowOpts" v-model:crate="crate" v-model="nodeItem" />
    <Flow :fn="raw" v-model:flowOpts="flowOpts" v-model:panelContent="panelContent" />
  </div>
  <div class="upg-right">
    <div class="upg-panel upg-panel-1">
      <WidgetSelectPanel v-model="leftPanel" :raw="raw" v-model:panelContent="panelContent" />
    </div>
    <div class="upg-panel">
      <WidgetSelectPanel v-model="rightPanel" :raw="raw" v-model:panelContent="panelContent" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Function } from "~/lib/output"
import { EMPTY_FUNCTION } from "~/lib/output"
import { Panel, PANEL_CONTENT, type PanelContent } from "~/lib/panel"
import { Crate, FLOW_OPTS, DefPathKind, urlKind, defaultCrateItemQuery } from "~/lib/topbar";
import type { FlowOpts, CrateItemQuery } from "~/lib/topbar"

const flowOpts = ref<FlowOpts>(FLOW_OPTS);
const panelContent = ref<PanelContent>(PANEL_CONTENT);

const crate = ref<Crate>(Crate.std);
const itemName = ref<CrateItemQuery>(defaultCrateItemQuery(crate.value));

const nodeItem = ref<string>();
watch(nodeItem, name => {
  if (name) itemName.value = { name, kind: DefPathKind.Fn }
})

// const url = "https://raw.githubusercontent.com/os-checker/unsafety-propagation-graph-data/refs/heads/main/test/poc/function/f.json"
function getFunctionUrl(name: string, kind: DefPathKind): string | undefined {
  // name must be `{crate_name}::{func_name}`
  const pat = /(\w+)::(.*)/;
  const matched = name.match(pat);
  if (!matched) return undefined;
  const crate = matched[1];
  const fn = matched[2];
  const k = urlKind(kind);
  return (crate && fn) ?
    `https://raw.githubusercontent.com/os-checker/unsafety-propagation-graph-data/refs/heads/main/${crate}/${k}/${fn}.json` :
    undefined;
}

const url = computed<string>(() => {
  const { name, kind } = itemName.value;
  return getFunctionUrl(name, kind) ?? "";
});

const raw = ref<Function>(EMPTY_FUNCTION);
watch(url, val => {
  if (!val) return;
  $fetch(val)
    .then(text => raw.value = JSON.parse(text as string))
    .catch(err => console.log(err));
}, { immediate: true });

const leftPanel = ref(Panel.Src);
const rightPanel = ref(Panel.Doc);
</script>
