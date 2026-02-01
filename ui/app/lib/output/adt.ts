import type { SearchFnItem } from "../topbar"

export type AdtOpts = { name?: string, data?: DataAdt }

export type AdtClicked = {
  open: boolean, clickedAdt?: string, clickedField?: string,
  lastClickedAdt?: string, lastClickedField?: string,
}

export type DataAdt = {
  name: string,
  constructors: string[],
  access_self_as_arg: Access,
  access_self_as_locals: Access,
  access_field: Access[],
  span: string,
  src: string,
  kind: string,
  doc_adt: string,
  variant_fields: { [key: string]: VariantField },
}

export type Access = {
  read: string[],
  write: string[],
  other: string[],
}

export type VariantField = {
  name: string,
  doc: string,
}

export function adtDoc(adt: DataAdt) {
  let doc = `\`${adt.name}\`\n\n### Fields Doc:\n\n`
  for (const field of Object.values(adt.variant_fields)) {
    const field_doc = field.doc ? `: ${field.doc}` : ""
    doc += `* \`${field.name}\`${field_doc}\n\n`
  }
  doc += `### ADT Doc:\n\n${adt.doc_adt}`
  return doc
}

export type AdtPanelItem = { v_fn: SearchFnItem[], kind: string, desc: string }
