<template>
  <VueFlow :nodes="data.nodes" :edges="data.edges"></VueFlow>
</template>

<script setup lang="ts">
import type { Node, Edge } from '@vue-flow/core'
import { VueFlow, useVueFlow } from '@vue-flow/core'

// const { addNodes, $reset, getNodes } = useVueFlow();

const url = "https://raw.githubusercontent.com/os-checker/unsafety-propogation-graph-data/refs/heads/main/test/demo/function/S%3A%3Awrite_field.json"

type Function = {
  name: string,
  safe: boolean,
  callees: string[],
  adts: { [key: string]: string[] },
  span: string,
  src: string,
  mir: string
}

const EMPTY: Function = {
  name: "", safe: true, callees: [], adts: {}, span: "", src: "", mir: ""
};

const raw = ref(EMPTY);
$fetch(url)
  .then(text => raw.value = JSON.parse(text as string))
  .catch(err => console.log(err));

const data = computed<{ nodes: Node[], edges: Edge[] }>(() => {
  const val = raw.value;
  if (!val.name) return { nodes: [], edges: [] };

  // Add the current function as root node, callees and adts as leaves.
  const root: Node = { id: val.name, position: { x: 200, y: 100 }, data: { label: val.name } };
  const callees: Node[] = val.callees.map((callee, idx) => ({ id: `c@${callee}`, type: "input", position: { x: 200 * idx, y: 0 }, label: callee }));
  const adts: Node[] = Object.keys(val.adts).map((adt, idx) => ({ id: `a@${adt}`, type: "output", position: { x: 200 * idx, y: 200 }, label: adt }));
  const nodes = [root, ...callees, ...adts];

  let edges: Edge[] = [];
  // Connect the root with leaves.
  callees.forEach(leaf => edges.push({ id: `e@${root.id}-${leaf.id}`, source: leaf.id, target: root.id, }));
  adts.forEach(leaf => edges.push({ id: `e@${root.id}-${leaf.id}`, source: root.id, target: leaf.id, }));

  return { nodes, edges }
})

</script>
