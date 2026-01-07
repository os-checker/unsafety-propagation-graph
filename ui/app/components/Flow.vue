<template>
  <VueFlow :nodes="data.nodes" :edges="data.edges" @update:edges="layoutGraph('LR')">
  </VueFlow>
</template>

<script setup lang="ts">
import type { Node, Edge } from '@vue-flow/core'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import type { Function } from "~/lib/output"
import { ViewType } from '~/lib/topbar';

const props = defineProps<{ raw: Function, viewSelected: ViewType[] }>();

const { fitView } = useVueFlow();
const { layout } = useLayout();

type Data = { nodes: Node[], edges: Edge[] };
const EMPTY_DATA = { nodes: [], edges: [] };

const data = ref<Data>(EMPTY_DATA);

watch(props, ({ raw: val, viewSelected }) => {
  if (!val.name) return;

  const view = new Set(viewSelected);
  const viewCallees = view.has(ViewType.Callees);
  const viewAdts = view.has(ViewType.Adts);
  const viewBoth = viewCallees && viewAdts;

  // Placeholder for initial position. The layout will be recomputed later.
  const POS = { x: 0, y: 0 };

  // Add the current function as root node, callees and adts as leaves.
  const root: Node = { id: val.name, type: viewBoth ? "default" : "input", label: val.name, position: POS };

  let callees: Node[] = [];
  let edges: Edge[] = [];

  if (viewCallees) {
    const type = viewBoth ? "input" : "default";
    callees = val.callees.map(callee => ({ id: `c@${callee}`, type, label: callee, position: POS }));
    callees.forEach(leaf => edges.push({
      id: `e@${root.id}-${leaf.id}`,
      ...(viewBoth ? { source: leaf.id, target: root.id, } : { source: root.id, target: leaf.id, })
    }));
  }

  let adts: Node[] = [];
  if (viewAdts) {
    adts = Object.keys(val.adts).map(adt => ({ id: `adt@${adt}`, type: "default", label: adt, position: POS }));
    adts.forEach(leaf => edges.push({ id: `e@${root.id}-${leaf.id}`, source: root.id, target: leaf.id, }));
  }

  // const adts_access: Node[] = Object.values(val.adts).flat().map(access => ({ id: `access@${access}`, type: "output", label: access, position: POS }));
  // const nodes = [root, ...callees, ...adts, ...adts_access];
  const nodes = [root, ...callees, ...adts];

  // Connect adt and access.
  // for (const [adt, v_access] of Object.entries(val.adts)) {
  //   for (const access of v_access) {
  //     const id_adt = `adt@${adt}`;
  //     const id_access = `access@${access}`;
  //     edges.push({ id: `e@${id_adt}-${id_access}`, source: id_adt, target: id_access });
  //   }
  // }

  // console.log(`update nodes: ${nodes.length} and edges: ${edges.length}`);
  data.value = { nodes, edges };
})

/** Recompute node layout (position). */
async function layoutGraph(direction: string) {
  if (data.value.nodes.length === 0) return;
  await nextTick(() => {
    data.value.nodes = layout(data.value.nodes, data.value.edges, direction)
    // console.log(`update layout: nodes: ${data.value.nodes.length} edges: ${data.value.edges.length}`);
  });
  await nextTick(fitView);
}

</script>
