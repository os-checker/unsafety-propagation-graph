import { Position, type Edge, type Node } from "@vue-flow/core";
import type { ELK, ElkNode, LayoutOptions } from "elkjs";
import type { Caller, AdtFnKind, Callees, CalleeInfo, FieldAccessKind } from "~/lib/output";
import { idAdt, idCalleeNonGeneric, idEdge, idAdtFnKind, idTag, idField } from "~/lib/graph";
import { ViewType, type FlowOpts } from "~/lib/topbar";
import updateNodePosition from "./updateNodePosition";
import { getTag, type DataTags } from "~/lib/output/tag";

type Dim = { height: number, width: number };

// Put label top-center inside the node.
const FnLayoutOptions = {
  "elk.nodeLabels.placement": "INSIDE H_CENTER V_TOP",
  "elk.direction": "RIGHT",
  "elk.alignment": "LEFT",
  // Enlarge the node to contain labels.
  // "elk.nodeSize.constraints": "NODE_LABELS",
  // Put more inner nodes into a row.
  "elk.aspectRatio": "10.0",
  // "elk.padding": "0",
  // "elk.padding": "[top=5,left=5,bottom=5,right=5]",
};

const TagLayoutOptions = {
  "elk.nodeLabels.placement": "INSIDE H_CENTER V_TOP",
  "elk.direction": "RIGHT",
  "elk.alignment": "LEFT",
}

export type View = { callees: boolean, adts: boolean, tags: boolean };

export class PlotConfig {
  // Tags including all functions and specs.
  tags: DataTags;
  // Used to help generate unique idTag to prevent the same tag 
  // on the same fn from being hidden.
  disam: number;
  // mono font ch width in px.
  px: number;
  // Graph view type.
  view: View;
  // Interaction with TopBar.
  flowOpts: FlowOpts;
  // ELK options.
  rootLayoutOptions: LayoutOptions;
  id_to_item: IdToItem;

  constructor(tags: DataTags, px: number, flowOpts: FlowOpts) {
    this.tags = tags;
    this.disam = 0;
    this.px = px;
    this.flowOpts = flowOpts;
    this.id_to_item = {};

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
    return { height: 4.8 * px, width: (label.length + 4) * px }
  }

  // Treat label size as node size if no tags are inside or viewed.
  tagChildren(fn_name: string): ElkNode[] {
    const tags = getTag(fn_name, this.tags, false)
    return tags.map(name => {
      const dim = this.size(name);
      const id = idTag(name, fn_name, this.disam++);
      this.id_to_item[id] = { name, kind: NodeKind.Tag }
      return {
        id,
        layoutOptions: TagLayoutOptions,
        labels: [{ text: name, ...dim }],
        ...dim
      }
    })
  }

  calleeChildren(callees: Callees, withAdt: boolean): ElkNode[] {
    return Object.entries(callees).map(([name, info]) => {
      const labelDim = this.size(name);
      const id = idCalleeNonGeneric(name);
      this.id_to_item[id] = {
        name: name,
        kind: info.safe ?
          (withAdt ? NodeKind.SafeFnWithAdt : NodeKind.SafeFn) :
          (withAdt ? NodeKind.UnsafeFnWithAdt : NodeKind.UnsafeFn)
      };
      const tags = this.tagChildren(name)
      return {
        id, layoutOptions: FnLayoutOptions,
        labels: [{ text: name, ...labelDim }],
        children: this.view.tags ? tags : [],
        ...this.fnDim(tags, labelDim)
      };
    });
  }

  nodeClass(id: string) {
    return nodeKindClass(this.id_to_item[id]!.kind)
  }

  nodeType(id: string) {
    return nodeKindType(this.id_to_item[id]!.kind)
  }

  fnDim(tags: ElkNode[], dim: Dim) {
    return (!this.view.tags || tags.length === 0) ? dim : {};
  }

  edgeType(): string {
    return this.flowOpts.edge as string
  }
}

export enum NodeKind {
  SafeRoot,
  UnsafeRoot,
  SafeFn,
  UnsafeFn,
  SafeFnWithAdt,
  UnsafeFnWithAdt,
  Tag,
  Adt,
  FnKind,
  Field,
  FieldHeader,
}

function nodeKindClass(kind: NodeKind) {
  switch (kind) {
    case NodeKind.SafeFn: case NodeKind.SafeFnWithAdt: case NodeKind.SafeRoot: return "upg-node-fn";
    case NodeKind.UnsafeFn: case NodeKind.UnsafeFnWithAdt: case NodeKind.UnsafeRoot: return "upg-node-unsafe-fn";
    case NodeKind.Tag: return "upg-node-tag";
    case NodeKind.Adt: return "upg-node-adt";
    case NodeKind.FnKind: return "upg-node-adt-fn-kind";
    case NodeKind.Field: return "upg-node-fn";
    case NodeKind.FieldHeader: return "upg-node-adt-fn-kind";
    default: return "";
  }
}

function nodeKindType(kind: NodeKind) {
  switch (kind) {
    case NodeKind.Tag: return "tag";
    case NodeKind.SafeFn: case NodeKind.UnsafeFn: return "default";
    default: return "no-handle";
  }
}

/** id_to_item: Node id to item (e.g. fn, callee, adt) name.
    Rust forbids identical path to different items, so the name is trustworthy. */
export type IdToItem = { [key: string]: { name: string, kind: NodeKind } };

export class Plot {
  nodes: Node[];
  edges: Edge[];
  config: PlotConfig;
  elk: ELK;

  constructor(config: PlotConfig, elk: ELK) {
    this.nodes = [];
    this.edges = [];
    this.config = config;
    this.elk = elk;
  }

  clear() {
    Object.assign(this, { nodes: [], edges: [] });
    this.config.id_to_item = {};
  }

  rootNode(fn: Caller): ElkNode {
    const config = this.config;
    const rootLabelDim = config.size(fn.name);
    const tags = config.tagChildren(fn.name)
    const root: ElkNode = {
      id: fn.name,
      layoutOptions: FnLayoutOptions,
      labels: [{ text: fn.name, ...rootLabelDim }],
      children: config.view.tags ? tags : [],
      ...config.fnDim(tags, rootLabelDim)
    };
    config.id_to_item[root.id] = { name: fn.name, kind: fn.safe ? NodeKind.SafeRoot : NodeKind.UnsafeRoot };
    return root;
  }

  async plot(fn: Caller) {
    if (this.config.view.adts) await this.callee_adt(fn)
    else await this.callee_tag(fn);
  }

  /** Generate the graph with callees and optional tags. */
  async callee_tag(fn: Caller) {
    this.clear();
    const root = this.rootNode(fn);
    const config = this.config;

    const callees = config.calleeChildren(fn.callees, false);

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
        class: config.nodeClass(node.id),
        targetPosition: Position.Left, sourcePosition: Position.Right,
      });
      for (const tag of node.children ?? []) {
        nodes.push({
          id: tag.id, label: tag.labels![0]!.text!, width: tag.width, height: tag.height,
          position: { x: tag.x!, y: tag.y! }, class: "upg-node-tag", type: "tag",
          parentNode: node.id,
          targetPosition: Position.Left, sourcePosition: Position.Right,
        });
      }
    }

    const id_to_item = config.id_to_item;
    updateNodePosition(nodes.filter(n => id_to_item[n.id]?.kind !== NodeKind.Tag), edges);
    Object.assign(this, { nodes, edges });
  }

  /** Generate the graph with callee and adt nodes. */
  async callee_adt(fn: Caller) {
    this.clear()
    const root = this.rootNode(fn);
    const config = this.config;
    const id_to_item = this.config.id_to_item;

    // The key is adt name, the value is callee name.
    const adt_to_fnKind: { [keys: string]: { name: string, kind: AdtFnKind, info: CalleeInfo }[] } = {};
    // The outer key is adt name, inner key is field name, and the value is callee name.
    const field_access: { [keys: string]: { [keys: string]: { name: string, access: FieldAccessKind, info: CalleeInfo }[] } } = {};
    for (const [callee_name, info] of Object.entries(fn.callees)) {
      // Callee name has been unqiue, so we push it to the adts.
      for (const [adt, adt_info] of Object.entries(info.adt)) {
        adt_to_fnKind[adt] ??= [];
        adt_to_fnKind[adt].push({ name: callee_name, kind: adt_info.kind, info });

        for (const [field, access] of Object.entries(adt_info.field)) {
          field_access[adt] ??= {};
          field_access[adt][field] ??= [];
          field_access[adt][field].push({ name: callee_name, access, info });
        }
      }
    }

    const callees_with_adt = new Set<string>(); // Callee names.
    const adtNodes: ElkNode[] = Object.entries(adt_to_fnKind).map(([name, callees]) => {
      const labelDim = config.size(name);
      const adt_id = idAdt(name);
      id_to_item[adt_id] = { name: name, kind: NodeKind.Adt };

      const kinds: { [key: string]: Callees } = {};
      for (const { kind, name, info } of callees) {
        kinds[kind] ??= {};
        kinds[kind][name] = info;
        callees_with_adt.add(name);
      }
      const kindsChildren: ElkNode[] = Object.entries(kinds).map(([kind, callees]) => {
        const id_adt_fnKind = idAdtFnKind(adt_id, kind);
        id_to_item[id_adt_fnKind] = { name: kind, kind: NodeKind.FnKind };
        return {
          id: id_adt_fnKind, layoutOptions: FnLayoutOptions,
          labels: [{ text: kind, ...config.size(kind) }],
          children: config.calleeChildren(callees, true),
          // size will be computed from children
        }
      });

      const fieldsChildren: ElkNode[] = [];
      const adt_fields = field_access[name];
      if (adt_fields) {
        for (const [field,] of Object.entries(adt_fields)) {
          const id_field = idField(name, field)
          id_to_item[id_field] = { name: field, kind: NodeKind.Field }
          fieldsChildren.push({
            id: id_field, layoutOptions: FnLayoutOptions,
            labels: [{ text: field, ...config.size(field) }]
          })
        }
      }
      let fieldNode: null | ElkNode = null
      if (fieldsChildren.length !== 0) {
        const id_field_header = `Fields@adt@${name}`;
        id_to_item[id_field_header] = { name, kind: NodeKind.FieldHeader }
        fieldNode = {
          id: id_field_header, layoutOptions: FnLayoutOptions,
          labels: [{ text: "Fields", ...config.size("Fields") }],
          children: fieldsChildren
        }
      }

      return {
        id: adt_id, layoutOptions: FnLayoutOptions,
        labels: [{ text: name, ...labelDim }],
        children: fieldNode ? [fieldNode, ...kindsChildren] : kindsChildren
      }
    })

    // Add callees that have no adts to the graph.
    const callees_no_adt: Callees = {};
    for (const [name, info] of Object.entries(fn.callees)) {
      if (!callees_with_adt.has(name)) callees_no_adt[name] = info;
    }
    const calleesNoAdt = config.calleeChildren(callees_no_adt, false);

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
        class: config.nodeClass(node.id),
        targetPosition: Position.Left, sourcePosition: Position.Right,
      });
      for (const adtKind of node.children ?? []) {
        const adtFnKindID = adtKind.id;
        nodes.push({
          id: adtFnKindID, label: adtKind.labels![0]!.text!, width: adtKind.width, height: adtKind.height,
          position: { x: adtKind.x!, y: adtKind.y! }, type: config.nodeType(adtFnKindID),
          class: config.nodeClass(adtFnKindID),
          parentNode: node.id,
          targetPosition: Position.Left, sourcePosition: Position.Right,
        });
        for (const callee of adtKind.children ?? []) {
          const calleeID = callee.id;
          nodes.push({
            id: calleeID, label: callee.labels![0]!.text!, width: callee.width, height: callee.height,
            position: { x: callee.x!, y: callee.y! },
            class: config.nodeClass(calleeID),
            parentNode: adtFnKindID,
            targetPosition: Position.Left, sourcePosition: Position.Right,
          })
          for (const tag of callee.children ?? []) {
            nodes.push({
              id: tag.id, label: tag.labels![0]!.text!, width: tag.width, height: tag.height,
              position: { x: tag.x!, y: tag.y! }, class: "upg-node-tag", type: "tag",
              parentNode: calleeID,
              targetPosition: Position.Left, sourcePosition: Position.Right,
            })
          }
        }
      }
    }

    const refineNodesId = new Set<string>()
    for (const [id, item] of Object.entries(id_to_item)) {
      switch (item.kind) {
        case NodeKind.SafeFn: case NodeKind.UnsafeFn: {
          refineNodesId.add(id)
          // Connect root with callees that are not binded to adts (orphan callees).
          edges.push({ id: idEdge(root.id, id), source: root.id, target: id, type: edgeType })
          continue
        }
        case NodeKind.Adt: case NodeKind.SafeRoot: case NodeKind.UnsafeRoot: {
          refineNodesId.add(id)
          continue
        }
      }
    }

    // Refine layout with orphan callees and adts.
    updateNodePosition(nodes.filter(n => refineNodesId.has(n.id)), edges);

    Object.assign(this, { nodes, edges });
  }
}
