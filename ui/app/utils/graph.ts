import { Position, type Edge, type Node } from "@vue-flow/core";
import type { ELK, ElkNode, LayoutOptions } from "elkjs";
import type { Tags, Function, AdtFnKind, Callees, CalleeInfo } from "~/lib/output";
import { idAdt, idCalleeNonGeneric, idEdge, idTag, isAdtID, tagName } from "~/lib/output";
import { ViewType, type FlowOpts } from "~/lib/topbar";
import updateNodePosition from "./updateNodePosition";

type Dim = { height: number, width: number };

// Put label top-center inside the node.
const FnLayoutOptions = { "elk.nodeLabels.placement": "INSIDE H_CENTER V_TOP", 'elk.direction': 'RIGHT', 'elk.alignment': 'LEFT', };

export type View = { callees: boolean, adts: boolean, tags: boolean };

export class PlotConfig {
  // mono font ch width in px.
  px: number;
  // Graph view type.
  view: View;
  // Interaction with TopBar.
  flowOpts: FlowOpts;
  // ELK options.
  rootLayoutOptions: LayoutOptions;

  constructor(px: number, flowOpts: FlowOpts) {
    this.px = px;
    this.flowOpts = flowOpts;

    const viewSet = new Set(flowOpts.view);
    this.view = { callees: viewSet.has(ViewType.Callees), adts: viewSet.has(ViewType.Adts), tags: viewSet.has(ViewType.Tags) };

    this.rootLayoutOptions = {
      "elk.algorithm": flowOpts.layout as string,
      'elk.direction': 'RIGHT',
      'elk.alignment': 'LEFT',
    };
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
        layoutOptions: FnLayoutOptions,
        labels: [{ text: name, ...dim }],
        ...dim
      }
    })
  }

  calleeChildren(callees: Callees, id_to_item: IdToItem): ElkNode[] {
    return Object.entries(callees).map(([name, info]) => {
      const labelDim = this.size(name);
      const id = idCalleeNonGeneric(name);
      id_to_item[id] = { name: name, doc: info.doc, safe: info.safe };
      return {
        id, layoutOptions: FnLayoutOptions,
        labels: [{ text: name, ...labelDim }],
        children: this.view.tags ? this.tagChildren(info.tags) : [],
        ...this.fnDim(info.tags, labelDim)
      };
    });
  }

  fnDim(tags: Tags, dim: Dim) {
    return (!this.view.tags || tags.tags.length === 0) ? dim : {};
  }

  edgeType(): string {
    return this.flowOpts.edge as string
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

  clear() {
    Object.assign(this, { nodes: [], edges: [], id_to_item: {} });
  }

  rootNode(fn: Function): ElkNode {
    const config = this.config;
    const rootLabelDim = config.size(fn.name);
    const root: ElkNode = {
      id: fn.name,
      layoutOptions: FnLayoutOptions,
      labels: [{ text: fn.name, ...rootLabelDim }],
      children: config.view.tags ? config.tagChildren(fn.tags) : [],
      ...config.fnDim(fn.tags, rootLabelDim)
    };
    this.id_to_item[root.id] = { name: fn.name, doc: fn.doc, safe: fn.safe };
    return root;
  }

  async plot(fn: Function) {
    if (this.config.view.adts) await this.callee_adt(fn)
    else await this.callee_tag(fn);
  }

  /** Generate the graph with callees and optional tags. */
  async callee_tag(fn: Function) {
    this.clear();
    const root = this.rootNode(fn);
    const config = this.config;
    const id_to_item = this.id_to_item;

    const callees = config.calleeChildren(fn.callees, id_to_item);

    const edges: Edge[] = callees.map(c => ({ id: idEdge(root.id, c.id), source: root.id, target: c.id, type: config.flowOpts.edge as string }));

    const graph: ElkNode = {
      id: "__root",
      layoutOptions: config.rootLayoutOptions,
      children: [root, ...callees],
      edges: edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] }))
    };

    const tree = await this.elk.layout(graph);

    const nodes: Node[] = [];
    for (const node of tree.children ?? []) {
      nodes.push({
        id: node.id, label: node.labels![0]!.text!, width: node.width, height: node.height,
        position: { x: node.x!, y: node.y! },
        class: id_to_item[node.id]!.safe ? "upg-node-fn" : "upg-node-unsafe-fn",
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

    updateNodePosition(nodes.filter(n => id_to_item[n.id] !== undefined), edges);
    Object.assign(this, { nodes, edges });
  }

  /** Generate the graph with callee and adt nodes. */
  async callee_adt(fn: Function) {
    this.clear()
    const root = this.rootNode(fn);
    const config = this.config;
    const id_to_item = this.id_to_item;

    // The key is adt name, the value is callee name.
    const adts: { [keys: string]: { name: string, kind: AdtFnKind, info: CalleeInfo }[] } = {};
    for (const [callee_name, info] of Object.entries(fn.callees)) {
      // Callee name has been unqiue, so we push it to the adts.
      for (const [adt, fn_kind] of Object.entries(info.adt)) {
        adts[adt] ??= [];
        adts[adt].push({ name: callee_name, kind: fn_kind, info });
      }
    }

    const id_to_callee_with_adt: IdToItem = {};
    const callees_with_adt = new Set<string>(); // Callee names.
    const adtNodes: ElkNode[] = Object.entries(adts).map(([name, callees]) => {
      const labelDim = config.size(name);
      const id = idAdt(name);
      id_to_item[id] = { name: name, doc: "", safe: true };

      const kinds: { [key: string]: Callees } = {};
      for (const { kind, name, info } of callees) {
        kinds[kind] ??= {};
        kinds[kind][name] = info;
        callees_with_adt.add(name);
      }
      const kindsChildren: ElkNode[] = Object.entries(kinds).map(([kind, callees]) => ({
        id: `${id} kind@${kind}`, layoutOptions: FnLayoutOptions,
        labels: [{ text: kind, ...config.size(kind) }],
        children: config.calleeChildren(callees, id_to_callee_with_adt),
        // size will be computed from children
      }));

      return {
        id, layoutOptions: FnLayoutOptions,
        labels: [{ text: name, ...labelDim }],
        children: kindsChildren
      }
    })

    // Add callees that have no adts to the graph.
    const callees_no_adt: Callees = {};
    for (const [name, info] of Object.entries(fn.callees)) {
      if (!callees_with_adt.has(name)) callees_no_adt[name] = info;
    }
    const id_to_callee_no_adt: IdToItem = {};
    const calleesNoAdt = config.calleeChildren(callees_no_adt, id_to_callee_no_adt);
    Object.assign(id_to_item, id_to_callee_no_adt);

    const edgeType = config.edgeType();
    let edges: Edge[] = adtNodes.map(a => ({ id: idEdge(root.id, a.id), source: root.id, target: a.id, type: edgeType }));

    const graph: ElkNode = {
      id: "__root",
      layoutOptions: config.rootLayoutOptions,
      children: [root, ...adtNodes, ...calleesNoAdt],
      edges: edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] }))
    };

    const tree = await this.elk.layout(graph);

    const nodes: Node[] = [];
    for (const node of tree.children ?? []) {
      // Node is root fn and adt names.
      nodes.push({
        id: node.id, label: node.labels![0]!.text!, width: node.width, height: node.height,
        position: { x: node.x!, y: node.y! },
        class: id_to_item[node.id]!.safe ? "upg-node-fn" : "upg-node-unsafe-fn",
        targetPosition: Position.Left, sourcePosition: Position.Right,
      });
      for (const adtKind of node.children ?? []) {
        const adtKindID = adtKind.id;
        nodes.push({
          id: adtKindID, label: adtKind.labels![0]!.text!, width: adtKind.width, height: adtKind.height,
          position: { x: adtKind.x!, y: adtKind.y! }, class: "upg-node-fn", // TODO: fill class
          parentNode: node.id,
          targetPosition: Position.Left, sourcePosition: Position.Right,
        });
        for (const callee of adtKind.children ?? []) {
          const calleeID = callee.id;
          nodes.push({
            id: calleeID, label: callee.labels![0]!.text!, width: callee.width, height: callee.height,
            position: { x: callee.x!, y: callee.y! }, class: "upg-node-fn", // TODO: fill class
            parentNode: adtKindID,
            targetPosition: Position.Left, sourcePosition: Position.Right,
          })
          for (const tag of callee.children ?? []) {
            nodes.push({
              id: tag.id, label: tag.labels![0]!.text!, width: tag.width, height: tag.height,
              position: { x: tag.x!, y: tag.y! }, class: "upg-node-tag",
              parentNode: calleeID,
              targetPosition: Position.Left, sourcePosition: Position.Right,
            })
          }
        }
      }
    }

    // Connect root with callees that are not binded to adts (orphan callees).
    for (const callee_no_adt_id of Object.keys(id_to_callee_no_adt)) {
      edges.push({ id: idEdge(root.id, callee_no_adt_id), source: root.id, target: callee_no_adt_id, type: edgeType });
    }

    // Refine layout with orphan callees and adts.
    updateNodePosition(nodes.filter(n => id_to_item[n.id] !== undefined), edges);

    // Connect root with callees that are binded to adts.
    for (const callee_with_adt of Object.keys(id_to_callee_with_adt)) {
      edges.push({ id: idEdge(root.id, callee_with_adt), source: root.id, target: callee_with_adt, type: edgeType });
    }

    // Disconnect root from adts.
    edges = edges.filter(e => !isAdtID(e.target));

    // Add callee items to id_to_item, because we need it to render documentation.
    Object.assign(id_to_item, id_to_callee_with_adt);

    Object.assign(this, { nodes, edges });
  }
}
