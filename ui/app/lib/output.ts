import { BASE_URL } from "./topbar";

export type Caller = {
  name: string,
  span: string,
  safe: boolean,
  callees: Callees,
  adts: { [key: string]: string[] },
  path: { type: PathType, path: string },
  tags: Tags
}

export enum PathType {
  Local = "Local",
  External = "External",
}

export type Callees = { [key: string]: CalleeInfo };

export type CalleeInfo = {
  instance_name: string[],
  safe: boolean,
  tags: Tags,
  doc: string,
  adt: { [key: string]: AdtFnKind },
}

export enum AdtFnKind {
  Constructor = "Constructor",
  MutableAsArgument = "MutableAsArgument",
  ImmutableAsArgument = "ImmutableAsArgument",
  Fn = "Fn",
}

export type Tags = {
  tags: Property[],
  spec: { [key: string]: TagSpec },
  docs: string[],
}

export type Property = {
  tag: { name: string, typ: TagType | null },
  args: string[],
}

export function tagName(tag: Property): string {
  const { typ, name } = tag.tag;
  switch (typ) {
    case null: return `${name}(${tag.args.join(", ")})`;
    case TagType.Precond: return `${name}(${tag.args.join(", ")})`;
    default: return `${typ}.${name}`;
  }
}

// Usually the tag name is itself, but for `any(...)`  tag, we should 
// parse it to get real used tags.
// export function toRealTag(s: string): string[] {
//   const match = s.match(/^any\((.*)\)$/);
//   if (match) {
//     const tagStr = match[1];
//     return tagStr?.split(",").map(t => t.trim()) ?? [s]
//   }
//   return [s]
// }

export type Src = { name: string, span: string, src: string, }
export type Doc = { name: string, span: string, doc: string, }
export type Mir = { name: string, span: string, mir: string, }

export const EMPTY_SRC: Src = { name: "", span: "", src: "" }
export const EMPTY_DOC: Doc = { name: "", span: "", doc: "" }
export const EMPTY_MIR: Mir = { name: "", span: "", mir: "" }

export function functionURL(name: string, info: string): string | undefined {
  // name must be `{crate_name}::{func_name}`
  const pat = /(\w+)::(.*)/;
  const matched = name.match(pat);
  if (!matched) return undefined;
  const crate = matched[1];
  // const fn = matched[2];
  return (crate) ? `${BASE_URL}/${crate}/${name}/${info}.json` : undefined;
}

export const callerURL = (name: string) => functionURL(name, "caller")
export const srcURL = (name: string) => functionURL(name, "src")
export const docURL = (name: string) => functionURL(name, "doc")
export const mirURL = (name: string) => functionURL(name, "mir")

export type TagSpec = {
  args: string[],
  desc: string | null,
  expr: string | null,
  types: TagType[],
  url: string | null,
}

export enum TagType {
  Precond = "precond",
  Hazard = "hazard",
  Option = "option",
}

export type DataTags = {
  v_fn: { [key: string]: TagUsage[] },
  spec: { [key: string]: { tag: TagSpec } }
}

export type TagUsage = {
  tags: TagUsageItem[],
  desc: null | string
}

export type TagUsageItem = {
  tag: { typ: null | TagType, name: string },
  args: string[]
}

export const EMPTY_CALLER: Caller = {
  name: "", span: "", safe: true, callees: {}, adts: {}, path: { type: PathType.Local, path: "" },
  tags: { tags: [], spec: {}, docs: [] },
};

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
