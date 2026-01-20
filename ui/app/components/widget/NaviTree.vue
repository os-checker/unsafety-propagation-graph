<template>
  <UTree :items="items" :getKey="i => i.id" />
</template>

<script setup lang="ts">
import type { TreeItem } from '@nuxt/ui';
import type { Navi, NaviTree } from '~/lib/topbar';
import { colorClass, icon } from '~/lib/topbar';

const props = defineProps<{ navi: Navi }>()

const items = computed<TreeItem[]>(() => {
  let root = makeTreeItem(props.navi.tree, { id: 0 })
  root.defaultExpanded = true
  return [root]
})

function makeTreeItem(tree: NaviTree, state: { id: number }): TreeItem {
  return {
    label: tree.node.name, icon: icon(tree.node.kind), id: state.id++,
    class: colorClass(tree.node.kind),
    children: tree.sub.map(t => makeTreeItem(t, state)),
    onToggle: (e) => console.log("toggle", e.type, e.detail.value?.label),
    onSelect: (e) => console.log("select", e.type, e.detail.value?.label),
  }
}

</script>
