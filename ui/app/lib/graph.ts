/** Tag node must have unique id. Mere tagName is not enough, because it 
 * can be shared in multiple fns. And it'd also be possible to see 
 * the same fn in UPG, so disam should be added. */
export function idTag(tagName: string, fnName: string, disam: number) {
  return `tag@${tagName}@${fnName}@${disam}`
}

export function idEdge(src: string, dst: string) {
  return `e@${src}-${dst}`
}

export function idCalleeNonGeneric(name: string) {
  return `c@${name}`
}

export function idCalleeWithAdt(callee: string, withAdt: string) {
  return withAdt ? `${idCalleeNonGeneric(callee)}@withAdt@${withAdt}` : idCalleeNonGeneric(callee);
}

export function idCalleeKindAdt(callee: string, fnKind: string, adt: string) {
  const id_adt_fnKind = idAdtFnKind(idAdt(adt), fnKind);
  return idCalleeWithAdt(callee, id_adt_fnKind)
  // return `c@${callee}@kind@${fnKind}@adt@${adt}@field@${field}`
}

export function idAdt(name: string) {
  return `adt@${name}`
}

export function idField(adt: string, field: string) {
  return `field@${field}@adt@${adt}`
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

export function isTagID(id: string) {
  return id.startsWith("tag@")
}
