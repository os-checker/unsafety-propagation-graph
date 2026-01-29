import { MarkerType, Position, type Edge, type Node } from "@vue-flow/core";
import type { ELK, ElkNode, LayoutOptions } from "elkjs";
import { FieldAccessKind, type Caller, AdtFnKind, type Callees, type CalleeInfo } from "~/lib/output";
import { idAdt, idEdge, idAdtFnKind, idTag, idField, idCalleeWithAdt, idCalleeKindAdt, idCalleeNonGeneric } from "~/lib/graph";
import { ViewType, type FlowOpts } from "~/lib/topbar";
import updateNodePosition from "./updateNodePosition";
import { getTag, type DataTags } from "~/lib/output/tag";

type Dim = { height: number, width: number };

// Put label top-center inside the node.
const FnLayoutOptions = {
  "elk.nodeLabels.placement": "INSIDE H_CENTER V_TOP",
  "elk.direction": "RIGHT",
  "elk.alignment": "CENTER",
  // Enlarge the node to contain labels.
  // "elk.nodeSize.constraints": "NODE_LABELS",
  // Put more inner nodes into a row.
  "elk.aspectRatio": "5.0",
  // "elk.padding": "0",
  // "elk.padding": "[top=5,left=5,bottom=5,right=5]",
};

const AdtLayoutOptions = {
  "elk.nodeLabels.placement": "INSIDE H_CENTER V_TOP",
  "elk.direction": "RIGHT",
  "elk.aspectRatio": "10.0",
};

const TagLayoutOptions = {
  "elk.nodeLabels.placement": "INSIDE H_CENTER V_TOP",
  "elk.direction": "RIGHT",
  "elk.alignment": "CENTER",
}

const FieldLayoutOptions = {
  "elk.nodeLabels.placement": "INSIDE H_CENTER V_TOP",
  "elk.direction": "RIGHT",
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
  // All nodes IDs.
  id_to_item: IdToItem;
  // Adt node IDs that have callees connected to fields.
  // We unset bottom border for not making lines messy.
  adt_border_b_0: Set<string>;

  constructor(tags: DataTags, px: number, flowOpts: FlowOpts) {
    this.tags = tags;
    this.disam = 0;
    this.px = px;
    this.flowOpts = flowOpts;
    this.id_to_item = {};
    this.adt_border_b_0 = new Set();

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

  calleeChildren(callees: Callees, withAdt: string): ElkNode[] {
    return Object.entries(callees).map(([name, info]) => {
      const labelDim = this.size(name);
      const id = idCalleeWithAdt(name, withAdt);
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

  /** Generate unsafe callee nodes with tags inside, but without adts. */
  calleeUnsafe(callees: Callees): ElkNode[] {
    const nodes: ElkNode[] = []

    for (const [name, info] of Object.entries(callees)) {
      // if (info.safe) continue;

      const labelDim = this.size(name);
      const id = idCalleeNonGeneric(name);
      this.id_to_item[id] = { name, kind: info.safe ? NodeKind.SafeFn : NodeKind.UnsafeFn };
      const tags = this.tagChildren(name)
      nodes.push({
        id, layoutOptions: FnLayoutOptions,
        labels: [{ text: name, ...labelDim }],
        children: this.view.tags ? tags : [],
        ...this.fnDim(tags, labelDim)
      })
    }

    return nodes
  }

  elkNode_to_vueFlowNode(node: ElkNode, opts: any = {}): Node {
    const id = node.id

    const kind = this.id_to_item[id]!.kind
    let type = "no-handle"
    switch (kind) {
      case NodeKind.Tag: { type = "tag"; break };
      case NodeKind.SafeFn: case NodeKind.UnsafeFn: { type = "output"; break };
      case NodeKind.Field: { type = "input"; break };
      case NodeKind.UnsafeRoot: case NodeKind.SafeRoot: { type = "default"; break };
    }

    const labelWidth = node.labels![0]!.width!
    return {
      id, label: node.labels![0]!.text!, width: Math.max(node.width!, labelWidth), height: node.height,
      position: { x: node.x!, y: node.y! }, class: this.nodeClass(id), type,
      sourcePosition: Position.Right, targetPosition: Position.Left,
      ...opts
    }
  }

  fieldHeaderNode(x: number, y: number, adt: string, nFields: number, parent: string): Node {
    const id = `FieldHeader@${adt}`
    this.id_to_item[id] = { name: adt, kind: NodeKind.FieldHeader }
    const label = (nFields === 1) ? "Field" : "Fields"
    const dim = this.size(label)
    return {
      id, label, width: dim.width, height: dim.height, parentNode: parent,
      position: { x, y }, class: this.nodeClass(id), type: "no-handle",
    }
  }

  callerHeaderNode(x: number, y: number, caller: string, parent: string): Node {
    const id = `CallerHeader@${caller}`
    this.id_to_item[id] = { name: caller, kind: NodeKind.CallerHeader }
    const label = "Caller"
    const dim = this.size(label)
    return {
      id, label, width: dim.width, height: dim.height, parentNode: parent,
      position: { x, y }, class: this.nodeClass(id), type: "no-handle",
    }
  }


  nodeClass(id: string) {
    let ret = nodeKindClass(this.id_to_item[id]!.kind)
    if (this.adt_border_b_0.has(id)) {
      ret += " upg-node-adt-border-b-0"
    }
    return ret
  }

  nodeType(id: string) {
    return nodeKindType(this.id_to_item[id]!.kind)
  }

  nodeSourceTargetPos(id: string) {
    switch (this.id_to_item[id]!.kind) {
      case NodeKind.SafeFn: case NodeKind.UnsafeFn: case NodeKind.Adt:
        return { targetPosition: Position.Left, type: 'output' };
      case NodeKind.SafeFnWithAdt: case NodeKind.UnsafeFnWithAdt:
        return { targetPosition: Position.Bottom, type: 'output' };
      case NodeKind.Field:
        return { sourcePosition: Position.Bottom, type: 'input' };
      case NodeKind.SafeRoot: case NodeKind.UnsafeRoot:
        return { sourcePosition: Position.Right, type: 'input' };
      default: return {};
    }
  }

  fnDim(tags: ElkNode[], dim: Dim) {
    return (!this.view.tags || tags.length === 0) ? dim : {};
  }

  edgeType(): string {
    return this.flowOpts.edge as string
  }

  nodeKind(id: string) {
    return this.id_to_item[id]!.kind
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
  CallerHeader,
}

function nodeKindClass(kind: NodeKind) {
  switch (kind) {
    case NodeKind.SafeFn: case NodeKind.SafeFnWithAdt: case NodeKind.SafeRoot: return "upg-node-fn";
    case NodeKind.UnsafeFn: case NodeKind.UnsafeFnWithAdt: case NodeKind.UnsafeRoot: return "upg-node-unsafe-fn";
    case NodeKind.Tag: return "upg-node-tag";
    case NodeKind.Adt: return "upg-node-adt";
    case NodeKind.FnKind: return "upg-node-adt-fn-kind";
    case NodeKind.Field: return "upg-node-fn";
    case NodeKind.FieldHeader: case NodeKind.CallerHeader: return "upg-node-adt-fn-kind";
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
    this.config.adt_border_b_0.clear();
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
    // if (this.config.view.adts) await this.callee_adt(fn)
    // else await this.callee_tag(fn);
    await this.caller_adt(fn)
  }

  /** Generate the graph with callees and optional tags. */
  async callee_tag(fn: Caller) {
    this.clear();
    const root = this.rootNode(fn);
    const config = this.config;

    const callees = config.calleeChildren(fn.callees, "");

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
        position: { x: node.x!, y: node.y! }, class: config.nodeClass(node.id),
        ...config.nodeSourceTargetPos(node.id)
      });
      for (const tag of node.children ?? []) {
        nodes.push({
          id: tag.id, label: tag.labels![0]!.text!, width: tag.width, height: tag.height,
          position: { x: tag.x!, y: tag.y! }, class: "upg-node-tag", type: "tag",
          parentNode: node.id,
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
    const edgeType = config.edgeType();

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

    const edgesBetweenFieldsAndCallee: Edge[] = []
    const callees_with_adt = new Set<string>(); // Callee names.
    const adtNodes: ElkNode[] = Object.entries(adt_to_fnKind).map(([adtName, callees]) => {
      const edgesInAdt: Edge[] = []
      const labelDim = config.size(adtName);
      const adt_id = idAdt(adtName);
      id_to_item[adt_id] = { name: adtName, kind: NodeKind.Adt };

      const kinds: { [key: string]: Callees } = {};
      for (const { kind, name, info } of callees) {
        kinds[kind] ??= {};
        kinds[kind][name] = info;
        callees_with_adt.add(name);
      }
      const kindNodes: ElkNode[] = Object.entries(kinds).map(([kind, callees]) => {
        const id_adt_fnKind = idAdtFnKind(adt_id, kind);
        id_to_item[id_adt_fnKind] = { name: kind, kind: NodeKind.FnKind };
        return {
          id: id_adt_fnKind, layoutOptions: FnLayoutOptions,
          labels: [{ text: kind, ...config.size(kind) }],
          children: config.calleeChildren(callees, id_adt_fnKind),
          // size will be computed from children
        }
      });

      const fieldsChildren: ElkNode[] = [];
      const adt_fields = field_access[adtName];
      if (adt_fields) {
        for (const [field, callees] of Object.entries(adt_fields)) {
          const id_field = idField(adtName, field)
          id_to_item[id_field] = { name: field, kind: NodeKind.Field }
          const dimField = config.size(field)
          fieldsChildren.push({
            id: id_field, layoutOptions: FnLayoutOptions,
            labels: [{ text: field, ...dimField }],
            ...dimField
          })

          for (const callee of callees) {
            const fnKind = callee.info.adt[adtName]!.kind
            const source = idCalleeKindAdt(callee.name, fnKind, adtName)
            edgesInAdt.push({ id: idEdge(source, id_field), source, target: id_field, type: "step", label: callee.access })
          }
        }
      }
      let fieldNode = null;
      if (fieldsChildren.length !== 0) {
        const id_field_header = `Fields@adt@${adtName}`;
        id_to_item[id_field_header] = { name: adtName, kind: NodeKind.FieldHeader }
        fieldNode = {
          id: id_field_header, layoutOptions: FieldLayoutOptions,
          labels: [{ text: "Fields", ...config.size("Fields") }],
          children: fieldsChildren
        }
        // Append the field node to kind nodes.
        kindNodes.push(fieldNode)
        // Unset bottom border of adt node.
        config.adt_border_b_0.add(adt_id)
      }

      // Add current adt edges.
      edgesInAdt.forEach(e => edgesBetweenFieldsAndCallee.push(e))

      return {
        id: adt_id, layoutOptions: AdtLayoutOptions,
        labels: [{ text: adtName, ...labelDim }],
        children: kindNodes,
        edges: edgesInAdt.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] }))
      }
    })

    // Add callees that have no adts to the graph.
    const callees_no_adt: Callees = {};
    for (const [name, info] of Object.entries(fn.callees)) {
      if (!callees_with_adt.has(name)) callees_no_adt[name] = info;
    }
    const calleesNoAdt = config.calleeChildren(callees_no_adt, "");

    const edges: Edge[] = adtNodes.map(a => ({ id: idEdge(root.id, a.id), source: root.id, target: a.id, type: edgeType }));

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
        ...config.nodeSourceTargetPos(node.id)
      });
      for (const adtKind of node.children ?? []) {
        // This can be FnKind or Field header.
        const adtFnKindID = adtKind.id;
        nodes.push({
          id: adtFnKindID, label: adtKind.labels![0]!.text!, width: adtKind.width, height: adtKind.height,
          position: { x: adtKind.x!, y: adtKind.y! }, type: config.nodeType(adtFnKindID),
          class: config.nodeClass(adtFnKindID),
          parentNode: node.id,
          targetPosition: Position.Left, sourcePosition: Position.Right,
          ...config.nodeSourceTargetPos(adtFnKindID)
        });
        for (const callee of adtKind.children ?? []) {
          // This can be callee or field.
          const calleeID = callee.id;
          nodes.push({
            id: calleeID, label: callee.labels![0]!.text!, width: callee.width, height: callee.height,
            position: { x: callee.x!, y: callee.y! },
            class: config.nodeClass(calleeID),
            parentNode: adtFnKindID,
            targetPosition: Position.Left, sourcePosition: Position.Right,
            ...config.nodeSourceTargetPos(calleeID)
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

    // Connect callee and field in adts.
    edgesBetweenFieldsAndCallee.forEach(e => edges.push(e))
    Object.assign(this, { nodes, edges });
  }

  /** Generate the graph: caller as a method of an adt, and unsafe callees. */
  async caller_adt(fn: Caller) {
    this.clear()
    const root = this.rootNode(fn);
    let rootNode = root// possibly with adt
    const config = this.config;
    const id_to_item = this.config.id_to_item;
    const edgeType = config.edgeType();
    const edges: Edge[] = []

    const callees = this.config.calleeUnsafe(fn.callees)
    // Connect caller to callees: | caller (source) | -> | callee (target) |
    callees.forEach(c => edges.push({ id: idEdge(root.id, c.id), source: root.id, target: c.id, type: edgeType }))

    // Determine the caller's method adt
    let adt: { name: string, kind: AdtFnKind, field: { name: string, access: FieldAccessKind }[] } | null = null
    for (const [name, info] of Object.entries(fn.adts)) {
      const kind = info.kind
      switch (kind) {
        case AdtFnKind.MethodImmutableRefReceiver:
        case AdtFnKind.MethodMutableRefReceiver:
        case AdtFnKind.MethodOwnedReceiver: {
          const field = Object.entries(info.field)
            .map(([name, access]) => ({ name, access }))
            .filter(f => f.access !== FieldAccessKind.Other)
          adt = { name, kind, field }
        }
      }
    }

    if (adt !== null) {
      const children: ElkNode[] = []

      for (const field of adt.field) {
        const fieldID = idField(adt.name, field.name)
        id_to_item[fieldID] = { name: field.name, kind: NodeKind.Field }
        const dimField = config.size(field.name)
        children.push({
          id: fieldID, layoutOptions: FnLayoutOptions,
          labels: [{ text: field.name, ...dimField }],
          ...dimField
        })
        // | field (source) | -> | caller (target) |
        edges.push({
          id: idEdge(root.id, fieldID,), source: fieldID, target: root.id, type: edgeType,
          label: field.access as string, markerStart: { type: MarkerType.Arrow, color: 'gray', width: 25, height: 25 }
        })
      }

      children.push(root)

      const adtID = idAdt(adt.name)
      id_to_item[adtID] = { name: adt.name, kind: NodeKind.Adt }
      const dimAdt = config.size(adt.name)
      // Override rootNode.
      rootNode = {
        id: adtID, children, layoutOptions: AdtLayoutOptions,
        labels: [{ text: adt.name, ...dimAdt }],
      }
    }

    const graph: ElkNode = {
      id: "__root",
      layoutOptions: config.rootLayoutOptions,
      children: [rootNode, ...callees],
      edges: edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] }))
    };

    const tree = await this.elk.layout(graph);

    const nodes: Node[] = [];
    for (const adtOrCallerOrCallee of tree.children ?? []) {
      const parent = config.elkNode_to_vueFlowNode(adtOrCallerOrCallee)
      nodes.push(parent);

      const isAdt = config.nodeKind(adtOrCallerOrCallee.id) === NodeKind.Adt
      if (isAdt) {
        for (const fieldOrCaller of adtOrCallerOrCallee.children ?? []) {
          const child = config.elkNode_to_vueFlowNode(fieldOrCaller, { parentNode: parent.id })
          nodes.push(child)

          const isCaller = root.id === fieldOrCaller.id
          if (isCaller) {
            // Enlarge adt node when caller has been enlarged due to label width.
            // NOTE: must use vue node instead of elk node because we ignore elk node by using label width.
            const adtNode = parent
            const caller = child
            const gapX = (adtNode.width as number) - caller.position.x - (caller.width as number)
            const spacingX = config.px * 3
            if (gapX < spacingX) (adtNode.width as number) += ((gapX < 0) ? (-gapX) : 0) + spacingX

            const gapY = (adtNode.height as number) - caller.position.y - (caller.height as number)
            const spacingY = config.px * 2
            if (gapY < spacingY) (adtNode.height as number) += ((gapY < 0) ? (-gapY) : 0) + spacingY
          }

          for (const tag of fieldOrCaller.children ?? []) {
            nodes.push(config.elkNode_to_vueFlowNode(tag, { parentNode: fieldOrCaller.id }))
          }
        }
      } else {
        const func = adtOrCallerOrCallee
        for (const tag of func.children ?? []) {
          nodes.push(config.elkNode_to_vueFlowNode(tag, { parentNode: func.id }))
        }
      }
    }

    // Refine layout with caller and callees.
    const refinedNodes = nodes.filter(n => {
      switch (id_to_item[n.id]!.kind) {
        // Always inculde callees.
        case NodeKind.UnsafeFn: case NodeKind.SafeFn: return true;
        // Include caller if no adt wraps it.
        case NodeKind.UnsafeRoot: case NodeKind.SafeRoot: return adt ? false : true;
        // Include adt if adt wraps the caller.
        case NodeKind.Adt: return adt ? true : false;
        // Don't relayout other nodes.
        default: return false;
      }
    })

    const refinedEdges: Edge[] = []
    if (adt) {
      // Relayout adt node with callees.
      const adtID = idAdt(adt.name)
      callees.forEach(c => refinedEdges.push({
        id: idEdge(adtID, c.id), source: adtID, target: c.id, type: edgeType
      }))
    } else {
      callees.forEach(c => refinedEdges.push({
        id: idEdge(root.id, c.id), source: root.id, target: c.id, type: edgeType
      }))
    }

    updateNodePosition(refinedNodes, refinedEdges);

    if (adt) {
      // Don't overlap large adt node with callees.
      const fieldNodes = []
      let adtNode: Node | null = null
      let callerNode: Node | null = null

      for (const node of nodes) {
        switch (config.nodeKind(node.id)) {
          case NodeKind.Field: { fieldNodes.push(node); break };
          case NodeKind.Adt: { adtNode = node; break };
          case NodeKind.UnsafeRoot: case NodeKind.SafeRoot: { callerNode = node; break };
        }
      }

      if (adtNode !== null) {
        const adtMaxX = (typeof adtNode.width === "number") ? (adtNode.position.x + adtNode.width) : null
        if (adtMaxX) {
          for (const node of refinedNodes) {
            const kind = config.nodeKind(node.id)
            if (kind === NodeKind.UnsafeFn || kind === NodeKind.SafeFn) {
              const x = node.position.x
              if (x < adtMaxX) node.position.x = adtMaxX + 50
            }
          }
        }

        // Enlarge fields and caller spacing.
        let enlarge_spacing = false
        let firstFieldY: number | null = null
        let firstFieldX: number | null = null
        const spacing = config.px * 7 // in the unit of a mono char with
        for (const field of fieldNodes) {
          const x = field.position.x
          const gap = callerNode!.position.x - x - (field.width as number)
          if (gap < spacing) enlarge_spacing = true

          const y = field.position.y
          firstFieldY = firstFieldY ? Math.min(y, firstFieldY) : y
          firstFieldX = firstFieldX ? Math.min(x, firstFieldX) : x
        }

        if (enlarge_spacing) {
          // Move adt node left. All elements inside will also be moved left.
          adtNode.position.x -= spacing;
          // Widen adt node for enclosing all elements .
          adtNode.width = adtNode.width as number + spacing
          // Move caller node right.
          callerNode!.position.x += spacing
        }

        // Add field and caller header
        if (firstFieldY !== null && firstFieldX !== null) {
          const parent = adtNode!.id
          const y = firstFieldY - config.px * 3
          const fieldHeader = config.fieldHeaderNode(firstFieldX, y, adt.name, fieldNodes.length, parent)
          nodes.push(fieldHeader)

          const callerHeaderX = (callerNode!.position.x + (callerNode!.width as number)) / 2
          const callerY = callerNode!.position.y - config.px * 3
          const callerHeader = config.callerHeaderNode(callerHeaderX, callerY, fn.name, parent)
          nodes.push(callerHeader)
        }
      }
    } else {
      let calleeNodes: Node[] = []
      let callerNode: Node | null = null

      for (const node of nodes) {
        switch (config.nodeKind(node.id)) {
          case NodeKind.UnsafeFn: case NodeKind.SafeFn: { calleeNodes.push(node); break };
          case NodeKind.UnsafeRoot: case NodeKind.SafeRoot: { callerNode = node; break };
        }
      }

      // Don't overlap caller and callees.
      let calleeX: number | null = null
      calleeNodes.forEach(c => calleeX = calleeX ? Math.min(c.position.x) : c.position.x)
      if (calleeX !== null) {
        const gap = calleeX - callerNode!.position.x - (callerNode!.width as number)
        const spacing = 100
        // Move left if the gap is narrow. Use abs for negative gap (overlapping).
        if (gap < spacing) callerNode!.position.x -= (Math.abs(gap) + spacing)
      }
    }

    Object.assign(this, { nodes, edges });
  }
}
