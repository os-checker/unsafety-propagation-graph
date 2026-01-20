<template>
  <UTree :items="items" :getKey="i => i.id" />
</template>

<script setup lang="ts">
import type { TreeItem } from '@nuxt/ui';
import type { Navi, NaviTree } from '~/lib/topbar';
import { icon } from '~/lib/topbar';

const props = defineProps<{ navi: Navi }>()

const items = computed<TreeItem[]>(() => {
  return [makeTreeItem(props.navi.tree, { id: 0 })]
})

function makeTreeItem(tree: NaviTree, state: { id: number }): TreeItem {
  return {
    label: tree.node.name, icon: icon(tree.node.kind), id: state.id++,
    children: tree.sub.map(t => makeTreeItem(t, state))
  }
}

</script>
