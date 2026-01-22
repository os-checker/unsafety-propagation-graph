

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

export function tagName(tag: TagUsageItem): string {
  const { typ, name } = tag.tag;
  switch (typ) {
    case null: return `${name}(${tag.args.join(", ")})`;
    case TagType.Precond: return `${name}(${tag.args.join(", ")})`;
    default: return `${typ}.${name}`;
  }
}
