

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

function tagName(tag: TagUsageItem): string {
  const { typ, name } = tag.tag;
  const args = tag.args.join(", ");
  const hasArgs = tag.args.length !== 0
  switch (typ) {
    case null: return hasArgs ? `${name}(${args})` : name;
    case TagType.Precond: return hasArgs ? `${name}(${args})` : name;
    default: return hasArgs ? `${typ}.${name}(${args})` : `${typ}.${name}`;
  }
}

export function getTag(fn_name: string, tags: DataTags, with_args: boolean): string[] {
  const fn_tags = tags.v_fn[fn_name]
  if (!fn_tags) return [];

  let v_tag: string[] = []
  for (const tagGroup of fn_tags) {
    for (const tagItem of tagGroup.tags) {
      v_tag.push(with_args ? tagName(tagItem) : tagItem.tag.name)
    }
  }
  return v_tag
}
