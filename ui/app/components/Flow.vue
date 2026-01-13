<template>
  <VueFlow :nodes="data.nodes" :edges="data.edges" @update:edges="fit" @nodes-initialized="fit" />
  <div id="bridge" style="width: 1ch; visibility: hidden; position: absolute;"></div>
</template>

<script setup lang="ts">
import type { Node, Edge } from '@vue-flow/core'
import { Position, VueFlow, useVueFlow } from '@vue-flow/core'
import { idCalleeNonGeneric, idEdge, idTag, tagName, type Function, type Tags } from "~/lib/output"
import { ViewType, type FlowOpts } from '~/lib/topbar';
import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js'
import type { PanelContent } from '~/lib/panel';

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

/** id_to_item: Node id to item (fn, callee, adt) name.
    Rust forbids identical path to different items, so the name is trustworthy. */
type IdToItem = { [key: string]: { name: string, doc: string } };
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

  const viewSet = new Set(flowOpts.value.view);
  const view = { callees: viewSet.has(ViewType.Callees), adts: viewSet.has(ViewType.Adts), tags: viewSet.has(ViewType.Tags) };

  // const dim = (label: string) => ({ height: `4ch`, width: `${label.length + 2}ch`, class: "upg-elem" });
  const px = Math.ceil(chPx.value);
  type Dim = { height: number, width: number };
  const size = (label: string): Dim => ({ height: 5 * px, width: (label.length + 4) * px });

  // Put label top-center inside the node.
  const layoutOptions = { "elk.nodeLabels.placement": "INSIDE H_CENTER V_TOP", 'elk.direction': 'RIGHT', 'elk.alignment': 'LEFT', };
  // Treat label size as node size if no tags are inside or viewed.
  const fnDim = (tags: Tags, dim: Dim) => (!view.tags || tags.tags.length === 0) ? dim : {};
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

  let id_to_item: IdToItem = {}

  const rootLabelDim = size(fn.name);
  const root: ElkNode = {
    id: fn.name,
    layoutOptions,
    labels: [{ text: fn.name, ...rootLabelDim }],
    children: view.tags ? tagChildren(fn.tags) : [],
    ...fnDim(fn.tags, rootLabelDim)
  }
  id_to_item[root.id] = { name: fn.name, doc: fn.doc };

  const callees: ElkNode[] = Object.entries(fn.callees).map(([name, info]) => {
    const labelDim = size(name);
    const id = idCalleeNonGeneric(name);
    id_to_item[id] = { name: name, doc: info.doc };
    return {
      id, layoutOptions,
      labels: [{ text: name, ...labelDim }],
      children: view.tags ? tagChildren(info.tags) : [],
      ...fnDim(info.tags, labelDim)
    }
  })

  const edges: Edge[] =
    callees.map(c => ({ id: idEdge(root.id, c.id), source: root.id, target: c.id, type: flowOpts.value.edge as string }))

  const graph: ElkNode = {
    id: "__root",
    layoutOptions: {
      "elk.algorithm": flowOpts.value.layout as string, 'elk.direction': 'RIGHT', 'elk.alignment': 'LEFT',
    },
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

  data.value = { nodes, edges, id_to_item };
})

watch(() => flowOpts.value.fit, val => {
  if (val) {
    fitView();
    flowOpts.value.fit = false;
  }
})

/** Fit view.  */
function fit() {
  if (data.value.nodes.length === 0) return;
  nextTick(fitView);
}


</script>
