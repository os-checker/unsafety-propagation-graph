<template>
  <div class="grid grid-cols-[auto_1fr]">
    <UTree :items="items" :get-key="item => item.id" v-model="active" class="m-2 overflow-y-auto h-0 min-h-full"
      expandedIcon="tabler:square-letter-f" collapsedIcon="tabler:square-letter-f" />

    <div class="w-full">
      <WidgetSearchFn :v_fn="adtItem.v_fn" :unsafeFns="unsafeFns" v-model="search" :title="adtItem.desc" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdtClicked, AdtPanelItem, DataAdt } from '~/lib/output/adt';
import { getTag, type DataTags } from '~/lib/output/tag';
import type { Search, UnsafeFns } from '~/lib/topbar';
import type { TreeItem } from '@nuxt/ui'

const props = defineProps<{ adt?: DataAdt, tags: DataTags, unsafeFns: UnsafeFns, adtClicked: AdtClicked }>()

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
  gen(props.adt?.constructors, "Constructors", `All Constructors of \`${props.adt?.name ?? ''}\``)
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

const active = ref<TreeItem>()
const adtItem = ref<AdtPanelItem>({ v_fn: [], kind: "", desc: "" })

// This is used to determine which subpanel is selected as per the click,
enum Selected { Field, Constructor, AsArg, AsLocals }

// The default selected item panel (write).
const initAdtItem = () => {
  let item: AdtPanelItem | undefined = undefined
  let selected: Selected | undefined = undefined
  let selectedIdx: string | number | undefined = undefined

  const clicked = props.adtClicked
  const field = clicked.lastClickedField
  const fields = groupedFieldAccess.value
  if (field) {
    // field name in fn json includes the idx prefix like `0-fieldName`,
    // while adt json only uses `fieldName` directly.
    const fieldName = field.match(/[^-]+$/)?.[0]
    item = fields[field]?.at(-1) || (fieldName ? fields[fieldName]?.at(-1) : undefined)
    if (item) {
      selected = Selected.Field
      selectedIdx = fieldName
    }
  } else if (clicked.lastClickedAdt) {
    if (constructors.value.v_fn.length) {
      item = constructors.value
      selected = Selected.Constructor
    } else {
      item = Object.values(fields)[0]?.at(-1)
      if (item) {
        selected = Selected.Field
        // Default to write access
        selectedIdx = -1
      } else {
        item = group_access_self_as_arg.value.data.at(-1)
        if (item) {
          selected = Selected.AsArg
          selectedIdx = -1
        } else {
          item = group_access_self_as_locals.value.data.at(-1)
          if (item) {
            selected = Selected.AsLocals
            selectedIdx = -1
          }
        }
      }
    }
  }

  if (item) return { item, selected, selectedIdx }
}

const search = ref<Search>({ withTags: false, unsafeOnly: false, text: "", page: 1, itemsPerPage: 20 })

const items = computed<TreeItem[]>(() => {
  const tree: TreeItem[] = []

  const initItem = initAdtItem()
  let selected: Selected | undefined = undefined
  let selectedIdx = undefined
  if (initItem) {
    // We must explicitly set adtItem, because active doesn't trigger onSelect.
    adtItem.value = initItem.item
    selected = initItem.selected
    selectedIdx = initItem.selectedIdx
  }

  const lenConstructor = constructors.value.v_fn.length
  if (lenConstructor) {
    const label = kindLabel(constructors.value)
    const node = {
      label, id: label, onSelect: () => adtItem.value = constructors.value,
      icon: "tabler:hexagon-letter-c-filled",
    }
    tree.push(node)
    if (selected === Selected.Constructor) {
      active.value = node
      selected = undefined
    }
  }

  const fields = Object.entries(groupedFieldAccess.value)
  if (fields.length) {
    const fieldHeader: TreeItem = {
      label: (fields.length === 1) ? "Access Field" : "Access Fields",
      id: "Field", defaultExpanded: true, children: []
    }
    tree.push(fieldHeader)

    for (const [field, v_data] of fields) {
      const fieldItem: TreeItem = {
        label: field, id: `Field@${field}`, defaultExpanded: true, children: [],
        icon: "tabler:hexagon-letter-f-filled",
      }
      for (const data of v_data) {
        const label = kindLabel(data)
        const node = {
          label, id: `Field@${field}@kind@${data.kind}`,
          onSelect: () => adtItem.value = data
        }
        fieldItem.children!.push(node)
      }

      fieldHeader.children!.push(fieldItem)
    }
    if (selected === Selected.Field) {
      if (typeof selectedIdx === "string") {
        const fieldName = selectedIdx
        selectedIdx = fields.findIndex(([f, _]) => f === fieldName)
        if (selectedIdx === -1) console.log(`${fieldName} is not a valid field in`, fields)
      }
      active.value = fieldHeader.children!.at(selectedIdx as number)!.children!.at(-1)
    }
  }

  const as_arg = group_access_self_as_arg.value.data
  const as_local = group_access_self_as_locals.value.data
  if (as_arg.length && as_local.length) {
    const headerLabel = "Access Self"
    const header: TreeItem = {
      label: headerLabel, id: headerLabel, defaultExpanded: true, children: []
    }
    tree.push(header)

    if (as_arg.length) {
      const argLabel = "As Arguments"
      const argHeader: TreeItem = {
        label: argLabel, id: argLabel, defaultExpanded: true, children: [],
        icon: "tabler:hexagon-letter-a-filled",
      }
      header.children!.push(argHeader)

      for (const data of as_arg) {
        const node = {
          label: kindLabel(data), id: `AsArg@${data.kind}`,
          onSelect: () => adtItem.value = data
        }
        argHeader.children!.push(node)
      }
      if (selected === Selected.AsArg) {
        active.value = argHeader.children!.at(selectedIdx as number)
      }
    }

    if (as_local.length) {
      const localsLabel = "As Locals"
      const localsHeader: TreeItem = {
        label: localsLabel, id: localsLabel, defaultExpanded: true, children: [],
        icon: "tabler:hexagon-letter-l-filled",
      }
      header.children!.push(localsHeader)

      for (const data of as_local) {
        const node = {
          label: kindLabel(data), id: `AsLocal@${data.kind}`,
          onSelect: () => adtItem.value = data
        }
        localsHeader.children!.push(node)
      }
      if (selected === Selected.AsLocals) {
        active.value = localsHeader.children!.at(selectedIdx as number)
      }
    }
  }

  return tree
})

const kindLabel = (item: AdtPanelItem) => `${item.kind} (${item.v_fn.length})`
</script>
