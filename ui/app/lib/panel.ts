export const enum Panel {
  Src = "Source Code",
  Mir = "MIR",
  Doc = "Documentation",
  Tag = "Safety Property",
  // This will never appear in URL, because it should be auto-switched to
  // when an Adt node is selected.
  Adt = "Adt",
}

export const PANELS: Panel[] = [Panel.Src, Panel.Mir, Panel.Doc, Panel.Tag];

export type PanelContent = {
  nodeItem: string
}

export function toPanelStr(p: Panel): string {
  switch (p) {
    case Panel.Src: return "src";
    case Panel.Mir: return "mir";
    case Panel.Doc: return "doc";
    case Panel.Tag: return "tag";
    default: return ""
  }
}

export function toPanel(s: string): Panel | undefined {
  if (!s) return undefined;
  switch (s) {
    case "src": return Panel.Src;
    case "mir": return Panel.Mir;
    case "doc": return Panel.Doc;
    case "tag": return Panel.Tag;
  }
}
