
/** The way to view UPG. */
export enum ViewType {
  Callees = "Callees",
  Adts = "Adts",
  Tags = "Tags",
}

export const VIEW_TYPES: ViewType[] = [
  ViewType.Callees, ViewType.Adts, ViewType.Tags
];

export function toViewTypes(s: any): ViewType[] | undefined {
  if (typeof s !== "string") return;
  const v = []
  for (const ele of s.split(",")) {
    switch (ele) {
      case "Callees": { v.push(ViewType.Callees); continue };
      case "Adts": { v.push(ViewType.Adts); continue };
      case "Tags": { v.push(ViewType.Tags); continue };
    }
  }
  return v.length === 0 ? undefined : v
}

// Navigation

export enum DefPathKind {
  Mod = "Mod",
  Fn = "Fn",
  AssocFn = "AssocFn",
  Struct = "Struct",
  Enum = "Enum",
  Union = "Union",
  TraitDecl = "TraitDecl",
  Ty = "Ty",
  ImplTrait = "ImplTrait",
}

/** Returns an icon string for a DefPathKind.
 * The icon must be maintained in nuxt config.*/
export function icon(kind: DefPathKind | string): string {
  switch (kind) {
    case DefPathKind.Mod: return "tabler:letter-m";
    case DefPathKind.Fn: return "tabler:square-letter-f";
    case DefPathKind.AssocFn: return "tabler:square-letter-f";
    case DefPathKind.Struct: return "tabler:letter-s";
    case DefPathKind.Enum: return "tabler:letter-e";
    case DefPathKind.Union: return "tabler:letter-u";
    case DefPathKind.TraitDecl: return "tabler:letter-t";
    case DefPathKind.Ty: return "tabler:letter-t-small";
    case DefPathKind.ImplTrait: return "tabler:letter-t";
    default: return "tabler:alert-circle";
  }
}

export function colorClass(kind: DefPathKind | string): string {
  switch (kind) {
    case DefPathKind.Mod: return ""; // "def-mod";
    case DefPathKind.Fn: return "def-fn";
    case DefPathKind.AssocFn: return "def-fn";
    case DefPathKind.Struct: return "def-struct";
    case DefPathKind.Enum: return "def-enum";
    case DefPathKind.Union: return "def-union";
    case DefPathKind.TraitDecl: return "def-trait";
    case DefPathKind.Ty: return "def-ty";
    case DefPathKind.ImplTrait: return "def-trait";
    default: return "";
  }
}

export function urlKind(kind: DefPathKind): string {
  switch (kind) {
    case DefPathKind.Mod: return "mod";
    case DefPathKind.Fn: return "function";
    case DefPathKind.AssocFn: return "function";
    case DefPathKind.Struct: return "adt";
    case DefPathKind.Enum: return "adt";
    case DefPathKind.Union: return "adt";
    case DefPathKind.TraitDecl: return "adt";
    case DefPathKind.Ty: return "unknown";
    case DefPathKind.ImplTrait: return "adt";
    default: return "unknown";
  }
}

export type DefPath = {
  kind: DefPathKind,
  name: string,
}

export type Navi = {
  tree: NaviTree,
  name_to_id: { [key: string]: number }
}

export type NaviTree = {
  node: DefPath & { id: number },
  sub: NaviTree[],
}

export const NAVI_TREE: NaviTree = { node: { kind: DefPathKind.Mod, name: "", id: 0 }, sub: [] }
export const NAVI: Navi = { tree: NAVI_TREE, name_to_id: {} }

// flow options

export enum ELKAlgorithm {
  layered = "layered",
  stress = "stress",
  mrtree = "mrtree",
  radial = "radial",
  force = "force",
  disco = "disco",
}

export const ELK_LAYOUTS = [
  ELKAlgorithm.mrtree, ELKAlgorithm.layered, ELKAlgorithm.radial, ELKAlgorithm.force,
]

export enum EdgeType {
  bezier = "bezier",
  step = "step",
  smoothstep = "smoothstep",
  straight = "straight",
}

export const EDGE_TYPES = [
  EdgeType.bezier, EdgeType.straight, EdgeType.step, EdgeType.smoothstep,
]

export type FlowOpts = { layout: ELKAlgorithm, edge: EdgeType, fit: boolean, view: ViewType[] };

export const FLOW_OPTS = {
  layout: ELKAlgorithm.mrtree,
  edge: EdgeType.bezier,
  fit: false,
  view: [ViewType.Callees, ViewType.Tags, ViewType.Adts]
};

export enum Crate {
  std = "std",
  core = "core",
  alloc = "alloc",
  ostd = "ostd",
}

export const CRATES: Crate[] = [Crate.std, Crate.core, Crate.alloc, Crate.ostd];

export function defaultCrateItemQuery(crate: Crate): string {
  switch (crate) {
    case Crate.std: return "std::time::Instant::now";
    case Crate.core: return "core::str::<impl str>::len";
    case Crate.alloc: return "alloc::vec::Vec::<T, A>::set_len";
    case Crate.ostd: return "ostd::init";
    default: return "";
  }
}

export function toCrate(s: string): Crate | undefined {
  switch (s) {
    case "std": return Crate.std;
    case "core": return Crate.core;
    case "alloc": return Crate.alloc;
    case "ostd": return Crate.ostd;
    default: return undefined
  }
}

export const BASE_URL = `https://raw.githubusercontent.com/os-checker/unsafety-propagation-graph-data/refs/heads/main`;

export function adtURL(adtName: string) {
  if (!adtName) return ""

  const crate = adtName.match(/^[^:]+/)?.[0]
  if (!crate) return ""

  return `${BASE_URL}/${crate}/adt/${adtName}.json`;
}

export function naviTreeURL(crate: Crate) {
  return `${BASE_URL}/${crate}/navi/tree.json`;
}

export function tagURL(crate: Crate) {
  switch (crate) {
    case Crate.std: case Crate.core: case Crate.alloc:
      return `${BASE_URL}/tags/std.json`;
    case Crate.ostd: return `${BASE_URL}/tags/ostd.json`;
    default: return "";
  }
}

export type BarPlotData = {
  label: string,
  value: number,
}

export type Search = { withTags: boolean, unsafeOnly: boolean, text: string, page: number, itemsPerPage: number }

export type SearchFnItem = { name: string, tags: string[] }

export function unsafeFnsURL(crate: Crate) {
  return `${BASE_URL}/${crate}/navi/unsafe_fns.json`
}

export type UnsafeFns = {
  [key: string]: Unsafe
}

export enum Unsafe {
  Caller, Callee, Both,
}
