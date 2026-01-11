
export type Function = {
  name: string,
  safe: boolean,
  callees: string[],
  adts: { [key: string]: string[] },
  path: number | string,
  span: string,
  src: string,
  mir: string,
  doc: string,
  tags: Tags
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
  name: "", safe: true, callees: [], adts: {}, path: "", span: "",
  src: "", mir: "", doc: "", tags: { tags: [], spec: {}, docs: [] },
};

