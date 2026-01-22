
export function idTag(name: string) {
  return `tag@${name}`
}

export function idEdge(src: string, dst: string) {
  return `e@${src}-${dst}`
}

export function idCalleeNonGeneric(name: string) {
  return `c@${name}`
}

export function idAdt(name: string) {
  return `adt@${name}`
}

export function isAdtID(id: string) {
  return id.startsWith("adt@")
}

export function idAdtFnKind(adt_id: string, fn_kind: string) {
  return `kind@${fn_kind}@${adt_id}`
}

export function isAdtFnKindID(id: string) {
  return id.startsWith("kind@")
}
