<template>
  <ClientOnly>
    <VueFlow :nodes="data.nodes" :edges="data.edges" @update:edges="fit" @nodes-initialized="fit">
      <template #node-no-handle="props">
        <NodeNoHandle v-bind="props" />
      </template>
    </VueFlow>
    <div id="bridge" style="width: 1ch; visibility: hidden; position: absolute;"></div>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { Node, Edge } from '@vue-flow/core'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { type Caller, callerURL, EMPTY_CALLER } from "~/lib/output"
import type { DataTags } from '~/lib/output/tag';
import { type FlowOpts } from '~/lib/topbar';
import type { PanelContent } from '~/lib/panel';
import ELK from 'elkjs/lib/elk.bundled.js'
import { Plot, PlotConfig, type IdToItem } from '~/utils/graph';

const flowOpts = defineModel<FlowOpts>('flowOpts', { required: true });
const panelContent = defineModel<PanelContent>('panelContent', { required: true });

const elk = new ELK()

const props = defineProps<{ nodeItem: string, tags: DataTags }>();

const item = ref<Caller>(EMPTY_CALLER)
watch(() => props.nodeItem, name => {
  const url = callerURL(name)
  if (!url) return;
  $fetch(url)
    .then(text => item.value = JSON.parse(text as string))
    .catch(err => console.log(err));
}, { immediate: true });

const chPx = ref(9.375);
onMounted(() => {
  const bridge = document.getElementById('bridge');
  if (!bridge) return;
  const pxValue = parseFloat(getComputedStyle(bridge).width);
  chPx.value = pxValue;
});

const { fitView, onNodeClick } = useVueFlow();

type Data = { nodes: Node[], edges: Edge[], id_to_item: IdToItem };
const EMPTY_DATA = { nodes: [], edges: [], id_to_item: {} };

const data = ref<Data>(EMPTY_DATA);

// Respond to node click.
onNodeClick(event => {
  panelContent.value.nodeItem = data.value.id_to_item[event.node.id]?.name ?? "";
})

watchEffect(async () => {
  // This should be a caller or adt, but currently only caller is supported.
  const caller = item.value;
  if (!caller.name) return;

  const px = Math.ceil(chPx.value);
  const plotConfig = new PlotConfig(props.tags, px, flowOpts.value,);

  const plot = new Plot(plotConfig, elk);
  await plot.plot(caller);

  const { nodes, edges, id_to_item } = plot;
  data.value = { nodes, edges, id_to_item };
})

watch(() => flowOpts.value.fit, val => {
  if (val) { fitView(); flowOpts.value.fit = false; }
})

/** Fit view.  */
function fit() {
  if (data.value.nodes.length === 0) return;
  nextTick(fitView);
}
</script>
