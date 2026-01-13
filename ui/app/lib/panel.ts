export const enum Panel {
  Src = "Source Code",
  Mir = "MIR",
  Doc = "Documentation",
  Raw = "Raw JSON",
}

export const PANELS: Panel[] = [Panel.Src, Panel.Mir, Panel.Doc, Panel.Raw];

export type PanelContent = {
  doc: string,
}

export const PANEL_CONTENT: PanelContent = {
  doc: "",
}
