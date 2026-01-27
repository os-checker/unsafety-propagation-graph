
export type AdtOpts = {
  name?: string, data?: DataAdt,
}

export const ADT_OPTs: AdtOpts = {}

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
  let doc = `\`${adt.name}\`\n\n${adt.doc_adt}\n\n### Fields\n\n`
  for (const field of Object.values(adt.variant_fields)) {
    const field_doc = field.doc ? `: ${field.doc}` : ""
    doc += `* \`${field.name}\`${field_doc}\n\n`
  }
  if (adt.access_self_as_arg.read.length !== 0)
    doc += "### access_self_as_locals.read\n\n"
  for (const fnName of adt.access_self_as_arg.read) {
    doc += `* ${fnName}\n\n`
  }
  return doc
}
