<template>
  <div class="upg-left">
    <WidgetTopBar v-model:viewSelected="viewSelected" v-model:itemName="itemName" v-model:fitView="fitView"
      v-model:layout="layout" />
    <Flow :raw="raw" :viewSelected="viewSelected" v-model:fitView="fitView" v-model:layout="layout" />
  </div>
  <div class="upg-right">
    <div class="upg-panel upg-panel-1">
      <WidgetSelectPanel v-model="leftPanel" :raw="raw" />
    </div>
    <div class="upg-panel">
      <WidgetSelectPanel v-model="rightPanel" :raw="raw" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ELKAlgorithm } from "~/lib/elk";
import type { Function } from "~/lib/output"
import { EMPTY_FUNCTION } from "~/lib/output"
import { Panel } from "~/lib/panel"
import { DEFAULT_VIEW_TYPES, DefPathKind, urlKind, ViewType } from "~/lib/topbar";

const viewSelected = ref<ViewType[]>(DEFAULT_VIEW_TYPES);
const fitView = ref<boolean>(false);
const layout = ref<ELKAlgorithm>(ELKAlgorithm.mrtree);
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
const rightPanel = ref(Panel.Mir);
</script>
