import { Position, type Edge, type Node } from "@vue-flow/core";
import type { ELK, ElkNode } from "elkjs";
import type { Tags, Function } from "~/lib/output";
import { idCalleeNonGeneric, idEdge, idTag, tagName } from "~/lib/output";
import { ViewType, type FlowOpts } from "~/lib/topbar";
import updateNodePosition from "./updateNodePosition";

type Dim = { height: number, width: number };

// Put label top-center inside the node.
const layoutOptions = { "elk.nodeLabels.placement": "INSIDE H_CENTER V_TOP", 'elk.direction': 'RIGHT', 'elk.alignment': 'LEFT', };

export type View = { callees: boolean, adts: boolean, tags: boolean };

export class PlotConfig {
  // mono font ch width in px.
  px: number;
  // Graph view type.
  view: View;
  flowOpts: FlowOpts;

  constructor(px: number, flowOpts: FlowOpts) {
    this.px = px;
    this.flowOpts = flowOpts;

    const viewSet = new Set(flowOpts.view);
    this.view = { callees: viewSet.has(ViewType.Callees), adts: viewSet.has(ViewType.Adts), tags: viewSet.has(ViewType.Tags) };
  }

  size(label: string): Dim {
    const px = this.px;
    // const dim = (label: string) => ({ height: `4ch`, width: `${label.length + 2}ch`, class: "upg-elem" });
    return { height: 5 * px, width: (label.length + 4) * px }
  }

  // Treat label size as node size if no tags are inside or viewed.
  tagChildren(tags: Tags): ElkNode[] {
    return tags.tags.map(tag => {
      const name = tagName(tag);
      const dim = this.size(name);
      return {
        id: idTag(name),
        layoutOptions,
        labels: [{ text: name, ...dim }],
        ...dim
      }
    })
  }


  fnDim(tags: Tags, dim: Dim) {
    return (!this.view.tags || tags.tags.length === 0) ? dim : {};
  }
}

/** id_to_item: Node id to item (fn, callee, adt) name.
    Rust forbids identical path to different items, so the name is trustworthy. */
export type IdToItem = { [key: string]: { name: string, doc: string, safe: boolean } };

export class Plot {
  nodes: Node[];
  edges: Edge[];
  id_to_item: IdToItem;
  config: PlotConfig;
  elk: ELK;

  constructor(config: PlotConfig, elk: ELK) {
    this.nodes = [];
    this.edges = [];
    this.id_to_item = {};
    this.config = config;
    this.elk = elk;
  }

  async callee_tag(fn: Function) {
    const config = this.config;
    const rootLabelDim = config.size(fn.name);
    const root: ElkNode = {
      id: fn.name,
      layoutOptions,
      labels: [{ text: fn.name, ...rootLabelDim }],
      children: config.view.tags ? config.tagChildren(fn.tags) : [],
      ...config.fnDim(fn.tags, rootLabelDim)
    };
    this.id_to_item[root.id] = { name: fn.name, doc: fn.doc, safe: fn.safe };

    const callees: ElkNode[] = Object.entries(fn.callees).map(([name, info]) => {
      const labelDim = config.size(name);
      const id = idCalleeNonGeneric(name);
      this.id_to_item[id] = { name: name, doc: info.doc, safe: info.safe };
      return {
        id, layoutOptions,
        labels: [{ text: name, ...labelDim }],
        children: config.view.tags ? config.tagChildren(info.tags) : [],
        ...config.fnDim(info.tags, labelDim)
      };
    });

    const edges: Edge[] = callees.map(c => ({ id: idEdge(root.id, c.id), source: root.id, target: c.id, type: config.flowOpts.edge as string }));

    const graph: ElkNode = {
      id: "__root",
      layoutOptions: {
        "elk.algorithm": config.flowOpts.layout as string, 'elk.direction': 'RIGHT', 'elk.alignment': 'LEFT',
      },
      children: [root, ...callees],
      edges: edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] }))
    };

    const tree = await this.elk.layout(graph);

    const nodes: Node[] = [];
    for (const node of tree.children ?? []) {
      nodes.push({
        id: node.id, label: node.labels![0]!.text!, width: node.width, height: node.height,
        position: { x: node.x!, y: node.y! },
        class: this.id_to_item[node.id]!.safe ? "upg-node-fn" : "upg-node-unsafe-fn",
        targetPosition: Position.Left, sourcePosition: Position.Right,
      });
      for (const tag of node.children ?? []) {
        nodes.push({
          id: tag.id, label: tag.labels![0]!.text!, width: tag.width, height: tag.height,
          position: { x: tag.x!, y: tag.y! }, class: "upg-node-tag",
          parentNode: node.id,
          targetPosition: Position.Left, sourcePosition: Position.Right,
        });
      }
    }

    updateNodePosition(nodes.filter(n => this.id_to_item[n.id] !== undefined), edges);
    this.nodes = nodes;
    this.edges = edges;
  }
}
