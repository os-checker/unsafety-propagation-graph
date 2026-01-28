export const enum Panel {
  Src = "Source Code",
  Mir = "MIR",
  Doc = "Documentation",
  Tag = "Safety Property",
  // This will never appear in URL, because it should be auto-switched to
  // when an Adt node is selected.
  Adt = "Adt Exogenous Fn",
}

export const PANELS: Panel[] = [Panel.Adt, Panel.Tag, Panel.Doc, Panel.Src, Panel.Mir];

export type PanelContent = {
  nodeItem: string
}

export function toPanelStr(p: Panel): string {
  switch (p) {
    case Panel.Src: return "src";
    case Panel.Mir: return "mir";
    case Panel.Doc: return "doc";
    case Panel.Tag: return "tag";
    case Panel.Adt: return "adt";
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
    case "adt": return Panel.Adt;
  }
}
