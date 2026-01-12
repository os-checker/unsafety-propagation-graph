<template>
  <VueFlow :nodes="data.nodes" :edges="data.edges" @update:edges="fit" @nodes-initialized="fit" />
  <div id="bridge" style="width: 1ch; visibility: hidden; position: absolute;"></div>
</template>

<script setup lang="ts">
import type { Node, Edge } from '@vue-flow/core'
import { Position, VueFlow, useVueFlow } from '@vue-flow/core'
import { idCalleeNonGeneric, idEdge, idTag, tagName, type Function, type Tags } from "~/lib/output"
import { ViewType } from '~/lib/topbar';
import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js'
import type { ELKAlgorithm } from '~/lib/elk';

const layout = defineModel<ELKAlgorithm>('layout');

const elk = new ELK()

const props = defineProps<{ raw: Function, viewSelected: ViewType[] }>();

const chPx = ref(9.375);
onMounted(() => {
  const bridge = document.getElementById('bridge');
  if (!bridge) return;
  const pxValue = parseFloat(getComputedStyle(bridge).width);
  chPx.value = pxValue;
});

const { fitView } = useVueFlow();

type Data = { nodes: Node[], edges: Edge[] };
const EMPTY_DATA = { nodes: [], edges: [] };

const data = ref<Data>(EMPTY_DATA);

watch(props, async ({ raw: fn, viewSelected }) => {
  if (!fn.name) return;

  const view = new Set(viewSelected);
  const viewCallees = view.has(ViewType.Callees);
  const viewAdts = view.has(ViewType.Adts);
  const viewBoth = viewCallees && viewAdts;
  const viewTags = view.has(ViewType.Tags);

  // const dim = (label: string) => ({ height: `4ch`, width: `${label.length + 2}ch`, class: "upg-elem" });
  const px = Math.ceil(chPx.value);
  type Dim = { height: number, width: number };
  const size = (label: string): Dim => ({ height: 5 * px, width: (label.length + 4) * px });

  // Put label top-center inside the node.
  const layoutOptions = { "elk.nodeLabels.placement": "INSIDE H_CENTER V_TOP", 'elk.direction': 'RIGHT', 'elk.alignment': 'LEFT', };
  // Treat label size as node size if no tags are inside.
  const fnDim = (tags: Tags, dim: Dim) => (tags.tags.length === 0) ? dim : {};
  function tagChildren(tags: Tags): ElkNode[] {
    return tags.tags.map(tag => {
      const name = tagName(tag);
      const dim = size(name);
      return {
        id: idTag(name),
        layoutOptions,
        labels: [{ text: name, ...dim }],
        ...dim
      }
    })
  }

  const rootLabelDim = size(fn.name);
  const root: ElkNode = {
    id: fn.name,
    layoutOptions,
    labels: [{ text: fn.name, ...rootLabelDim }],
    children: tagChildren(fn.tags),
    ...fnDim(fn.tags, rootLabelDim)
  }

  const callees: ElkNode[] = Object.entries(fn.callees).map(([name, info]) => {
    const labelDim = size(name);
    return {
      id: idCalleeNonGeneric(name),
      layoutOptions,
      labels: [{ text: name, ...labelDim }],
      children: tagChildren(info.tags),
      ...fnDim(info.tags, labelDim)
    }
  })

  const edges: Edge[] =
    callees.map(c => ({ id: idEdge(root.id, c.id), source: root.id, target: c.id }))

  const graph: ElkNode = {
    id: "__root",
    layoutOptions: { "elk.algorithm": layout.value as string, 'elk.direction': 'RIGHT', 'elk.alignment': 'LEFT', },
    children: [root, ...callees],
    edges: edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] }))
  };

  const tree = await elk.layout(graph);

  const nodes: Node[] = [];
  for (const node of tree.children ?? []) {
    nodes.push({
      id: node.id, label: node.labels![0]!.text!, width: node.width, height: node.height,
      position: { x: node.x!, y: node.y! }, class: "upg-node-fn",
      targetPosition: Position.Left, sourcePosition: Position.Right,
    })
    for (const tag of node.children ?? []) {
      nodes.push({
        id: tag.id, label: tag.labels![0]!.text!, width: tag.width, height: tag.height,
        position: { x: tag.x!, y: tag.y! }, class: "upg-node-tag",
        parentNode: node.id,
        targetPosition: Position.Left, sourcePosition: Position.Right,
      })
    }
  }

  data.value = { nodes, edges };
})

const fit_view = defineModel<boolean>('fitView');
watch(fit_view, val => {
  if (val) {
    fitView();
    fit_view.value = false;
  }
})

/** Fit view.  */
function fit() {
  if (data.value.nodes.length === 0) return;
  nextTick(fitView);
}

</script>
