<template>
  <div class="upg-left">
    <WidgetTopBar v-model:itemName="itemName" v-model:flowOpts="flowOpts" />
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
import { FLOW_OPTS, DefPathKind, urlKind, } from "~/lib/topbar";
import type { FlowOpts } from "~/lib/topbar"

const flowOpts = ref<FlowOpts>(FLOW_OPTS);
const panelContent = ref<PanelContent>(PANEL_CONTENT);
const itemName = ref<{ name: string, kind: DefPathKind }>({ name: "poc::f", kind: DefPathKind.Fn });

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
    `https://raw.githubusercontent.com/os-checker/unsafety-propagation-graph-data/refs/heads/main/test/${crate}/${k}/${fn}.json` :
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
