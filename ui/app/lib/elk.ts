export enum ELKAlgorithm {
  layered = "layered",
  stress = "stress",
  mrtree = "mrtree",
  radial = "radial",
  force = "force",
  disco = "disco",
}

export const ELK_LAYOUTS = [
  ELKAlgorithm.layered, ELKAlgorithm.mrtree, ELKAlgorithm.radial, ELKAlgorithm.force,
]

export enum EdgeType {
  bezier = "bezier",
  step = "step",
  smoothstep = "smoothstep",
  straight = "straight",
}

export const EDGE_TYPES = [
  EdgeType.bezier, EdgeType.step, EdgeType.smoothstep, EdgeType.straight
]
