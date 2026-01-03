<script setup>
import { VueFlow, useVueFlow } from '@vue-flow/core'

const initialNodes = ref([
  {
    id: '1',
    position: { x: 50, y: 50 },
    data: { label: 'Node 1', },
  },
  {
    id: '2',
    position: { x: 50, y: 250 },

    data: { label: 'Node 2', },
  }
])

const { addEdges } = useVueFlow()

addEdges([
  {
    source: '1',
    target: '2',

    // if a node has multiple handles of the same type,
    // you should specify which handle to use by id
    sourceHandle: null,
    targetHandle: null,
  }
])
</script>

<template>
  <VueFlow :nodes="initialNodes" />
</template>
