<template>
  <UTree :items="items" :getKey="i => i.id" v-model:expanded="expanded" />
</template>

<script setup lang="ts">
import type { TreeItem } from '@nuxt/ui';
import type { Navi, NaviTree } from '~/lib/topbar';
import { colorClass, icon } from '~/lib/topbar';

const expanded = ref<string[]>();
const props = defineProps<{ navi: Navi }>()

const items = computed<TreeItem[]>(() => {
  let root = makeTreeItem(props.navi.tree, { id: 0 })
  root.defaultExpanded = true
  return [root]
})

function makeTreeItem(tree: NaviTree, state: { id: number }): TreeItem {
  return {
    label: tree.node.name, icon: icon(tree.node.kind), id: state.id++,
    class: colorClass(tree.node.kind), data: tree,
    children: tree.sub.map(t => makeTreeItem(t, state)),
    // onToggle: (e) => console.log("toggle", e.type, e.detail.value?.label),
    // onSelect: (e) => {
    //   const val = e.detail.value
    //   if (!val || !val.data) return;
    //   const label = val.label;
    //   // const data: NaviTree = val.data
    //   // if (data.node.kind !== DefPathKind.Mod)
    //   //   val.children?.map(c => c.console.log = true)
    //   console.log(label)
    // }
  }
}

// watch(expanded, console.log)

</script>
