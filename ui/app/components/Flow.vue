<template>
  <VueFlow :nodes="data.nodes" :edges="data.edges" @update:edges="fit" @nodes-initialized="fit" />
  <div id="bridge" style="width: 1ch; visibility: hidden; position: absolute;"></div>
</template>

<script setup lang="ts">
import type { Node, Edge } from '@vue-flow/core'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { type Function, } from "~/lib/output"
import { ViewType, type FlowOpts } from '~/lib/topbar';
import ELK from 'elkjs/lib/elk.bundled.js'
import type { PanelContent } from '~/lib/panel';
import { Plot, PlotConfig, type IdToItem } from '~/utils/graph';

const flowOpts = defineModel<FlowOpts>('flowOpts', { required: true });
const panelContent = defineModel<PanelContent>('panelContent', { required: true });

const elk = new ELK()

const props = defineProps<{ fn: Function }>();

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

// Render current fn item doc as defualt.
watch(() => props.fn, fn => panelContent.value.doc = fn.doc);
// Respond to node click.
onNodeClick(event => {
  panelContent.value.doc = data.value.id_to_item[event.node.id]?.doc ?? props.fn.doc;
})

watchEffect(async () => {
  const fn = props.fn;
  if (!fn.name) return;

  const px = Math.ceil(chPx.value);
  const plotConfig = new PlotConfig(px, flowOpts.value);
  const plot = new Plot(plotConfig, elk);

  await plot.callee_tag(fn);

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
