/** The way to view UPG. */
export enum ViewType {
  Callees = "Callees",
  Adts = "Adts",
  Tags = "Tags",
}

export const VIEW_TYPES: ViewType[] = [
  ViewType.Callees, ViewType.Adts, ViewType.Tags
];


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
    case DefPathKind.Mod: return "def-mod";
    case DefPathKind.Fn: return "def-fn";
    case DefPathKind.AssocFn: return "def-fn";
    case DefPathKind.Struct: return "def-struct";
    case DefPathKind.Enum: return "def-enum";
    case DefPathKind.Union: return "def-union";
    case DefPathKind.TraitDecl: return "def-trait";
    case DefPathKind.Ty: return "def-ty";
    case DefPathKind.ImplTrait: return "def-trait";
    default: return "gray";
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
export type ItemPath = DefPath[];
export type SubNaviItem = {
  idx: number, name: string, kind: DefPathKind,
}
export type NaviItem = {
  non_mod_kinds: DefPathKind[],
  subitems: SubNaviItem[],
  /** The key is DefPathKind, and each number in the value points to the element in subitems. */
  groups: { [key: string]: number[] },
}
export type Navigation = {
  data: ItemPath[],
  navi: { [key: number]: NaviItem },
  name_to_path: { [key: string]: number },
  path_to_name: { [key: number]: string },
}

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
  view: [ViewType.Callees, ViewType.Tags]
};

export enum Crate {
  std = "std",
  core = "core",
  alloc = "alloc",
  ostd = "ostd",
}

export const CRATES: Crate[] = [Crate.std, Crate.core, Crate.alloc, Crate.ostd];

export type CrateItemQuery = { name: string, kind: DefPathKind };
export function defaultCrateItemQuery(crate: Crate): CrateItemQuery {
  switch (crate) {
    case Crate.std: return { name: "std::time::Instant::now", kind: DefPathKind.Fn };
    case Crate.core: return { name: "core::str::<impl str>::len", kind: DefPathKind.Fn };
    case Crate.alloc: return { name: "alloc::vec::Vec::<T, A>::push", kind: DefPathKind.Fn };
    case Crate.ostd: return { name: "ostd::boot::call_ostd_main", kind: DefPathKind.Fn };
    default: return { name: "", kind: DefPathKind.Fn };
  }
}

export const EMPTY_NAVI: Navigation = { data: [], navi: {}, name_to_path: {}, path_to_name: {} };
export function navi_url(crate: Crate) {
  return `https://raw.githubusercontent.com/os-checker/unsafety-propagation-graph-data/refs/heads/main/${crate}/navi/navi.json`;
}
