<template>
  <UTree :items="items" />
</template>

<script setup lang="ts">
import type { TreeItem } from '@nuxt/ui';
import type { Navi, NaviTree } from '~/lib/topbar';
import { icon } from '~/lib/topbar';

const props = defineProps<{ navi: Navi }>()

const items = computed<TreeItem[]>(() => {
  return [makeTreeItem(props.navi.tree)]
})

function makeTreeItem(tree: NaviTree): TreeItem {
  return {
    label: tree.node.name, icon: icon(tree.node.kind),
    children: tree.sub.map(makeTreeItem)
  }
}

watch(items, console.log, { immediate: true })
</script>
