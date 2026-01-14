
export type Function = {
  name: string,
  safe: boolean,
  callees: { [key: string]: CalleeInfo },
  adts: { [key: string]: string[] },
  path: number | string,
  span: string,
  src: string,
  mir: string,
  doc: string,
  tags: Tags
}

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

export const EMPTY_FUNCTION: Function = {
  name: "", safe: true, callees: {}, adts: {}, path: "", span: "",
  src: "", mir: "", doc: "", tags: { tags: [], spec: {}, docs: [] },
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
