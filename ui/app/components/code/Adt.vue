<template>
  <div class="my-2">
    <div> Field Access: </div>
    <div v-for="[field, v_data], idx in Object.entries(groupedFieldAccess)" class="adt-fn-group">
      <div class="min-w-15 ml-5 font-mono">{{ idx }}-{{ field }}:</div>
      <CodeAdtSearchFn v-for="data in v_data" :val="data" />
    </div>

    <div class="adt-fn-group">
      <div> Construct Adt: </div>
      <CodeAdtSearchFn :val="constructors" />
    </div>

    <div class="adt-fn-group">
      <div>{{ group_access_self_as_arg.group }}</div>
      <CodeAdtSearchFn v-for="data in group_access_self_as_arg.data" :val="data" />
    </div>

    <div class="adt-fn-group">
      <div>{{ group_access_self_as_locals.group }}</div>
      <CodeAdtSearchFn v-for="data in group_access_self_as_locals.data" :val="data" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdtPanelItem, DataAdt } from '~/lib/output/adt';
import { getTag, type DataTags } from '~/lib/output/tag';

const props = defineProps<{ adt?: DataAdt, tags: DataTags }>()

function gen(v: string[] | undefined, kind: string, desc: string) {
  const v_fn = v ? v.map(
    name => ({ name, tags: getTag(name, props.tags, true) }))
    : []
  return { v_fn, kind, desc }
}

// Fields
const fields = computed<string[]>(() => {
  return Object.values(props.adt?.variant_fields ?? {}).map(f => f.name)
})

const fieldAccess = computed<{ field: string, data: AdtPanelItem }[]>(() => {
  const adt = props.adt
  if (adt === undefined) return []
  const fields_ = fields.value
  if (adt.access_field.length != fields_.length) return []

  return fields_.flatMap((field, idx) => {
    const access = adt!.access_field[idx]!
    return [
      { field, data: gen(access.read, "Read", `Read Access to Field \`${field}\` of \`${adt.name}\``) },
      { field, data: gen(access.write, "Write", `Write Access to Field \`${field}\` of \`${adt.name}\``) },
      // { field, data: gen(access.other, "Unknown", `Other Access to Field \`${field}\` of Self`) },
    ]
  })
})

const groupedFieldAccess = computed<{ [key: string]: AdtPanelItem[] }>(() => {
  const map: { [key: string]: AdtPanelItem[] } = {}
  fieldAccess.value.forEach(({ field, data }) => {
    map[field] ??= []
    map[field].push(data)
  })
  return map
})

// Constructors
const constructors = computed<AdtPanelItem>(() =>
  gen(props.adt?.constructors, "Constructors", `All Constructors of ${props.adt?.name ?? ''}`)
)

// As arguments
const group_access_self_as_arg = computed<{ group: string, data: AdtPanelItem[] }>(() => {
  const adt = props.adt
  if (!adt) return { group: "", data: [] }

  const group = adt.access_self_as_arg
  return {
    group: "Access Adt through arguments:", data: [
      gen(group.read, "Read", `Read Access to \`${adt.name}\` through a Function Argument`),
      gen(group.write, "Write", `Write Access to \`${adt.name}\` through a Function Argument`),
      // gen(group.other, "Unknown", "Other Access to Self through a function argument"),
    ]
  }
})

// As locals
const group_access_self_as_locals = computed<{ group: string, data: AdtPanelItem[] }>(() => {
  const adt = props.adt
  if (!adt) return { group: "", data: [] }

  const group = adt.access_self_as_locals
  return {
    group: "Access Adt through locals:", data: [
      gen(group.read, "Read", `Read Access to \`${adt.name}\` through a Function Local`),
      gen(group.write, "Write", `Write Access to \`${adt.name}\` through a Function Local`),
      // gen(group.other, "Unknown", "Other Access to Self through a function local"),
    ]
  }
})

</script>
