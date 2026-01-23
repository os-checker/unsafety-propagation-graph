

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
  // The doc field only points to current single tag.
  tags: { sp: TagUsageItem, doc: string }[],
  desc: null | string
  // The doc field contains the desc and all inner tag docs.
  doc: string,
}

export type TagUsageItem = {
  tag: { typ: null | TagType, name: string },
  args: string[],
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

  const v_tag: string[] = []
  for (const tagGroup of fn_tags) {
    for (const tagItem of tagGroup.tags) {
      v_tag.push(with_args ? tagName(tagItem.sp) : tagItem.sp.tag.name)
    }
  }
  return v_tag
}

export type TagDoc = { doc: string, tags: TagDocItem[] }
export type TagDocItem = { doc: string, tag: string }

export const TAG_DOC: TagDoc = { doc: "", tags: [] }

export function getTagDoc(fn_name: string, tags: DataTags, with_args: boolean): TagDoc[] {
  const fn_tags = tags.v_fn[fn_name]
  if (!fn_tags) return [];

  const ret: TagDoc[] = []
  for (const tagGroup of fn_tags) {
    const tags: TagDocItem[] = []
    for (const tagItem of tagGroup.tags) {
      tags.push({
        doc: tagItem.doc,
        tag: with_args ? tagName(tagItem.sp) : tagItem.sp.tag.name,
      })
    }
    ret.push({ doc: tagGroup.doc, tags })
  }
  return ret
}

