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
