export const enum Panel {
  Src = "Source Code",
  Mir = "MIR",
  Doc = "Documentation",
  Tag = "Safety Property",
}

export const PANELS: Panel[] = [Panel.Src, Panel.Mir, Panel.Doc, Panel.Tag];

export type PanelContent = {
  nodeItem: string
}

