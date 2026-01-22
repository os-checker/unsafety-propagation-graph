<template>
  <UTree virtualize :items="items" :getKey="i => i.id" v-model:expanded="expanded" v-model:modelValue="treeValue" />
</template>

<script setup lang="ts">
import type { TreeItem } from '@nuxt/ui';
import type { Navi, NaviTree } from '~/lib/topbar';
import { colorClass, icon } from '~/lib/topbar';

const props = defineProps<{ navi: Navi }>()
const nodeId = defineModel<number | undefined>("nodeId", { required: true })
const expanded = defineModel<string[]>("expandedNodes");
const treeValue = defineModel<TreeItem>("treeValue");

const items = computed<TreeItem[]>(() => {
  let root = makeTreeItem(props.navi.tree)
  root.defaultExpanded = true
  return [root]
})

function makeTreeItem(tree: NaviTree): TreeItem {
  const node = tree.node
  return {
    label: node.name, icon: icon(node.kind), id: node.id,
    class: colorClass(node.kind), data: tree,
    children: tree.sub.map(makeTreeItem),
    onSelect: (e) => {
      const val = e.detail.value;
      if (!val || !val.data) return;
      const data: NaviTree = val.data
      nodeId.value = data.node.id
    }
  }
}

</script>
