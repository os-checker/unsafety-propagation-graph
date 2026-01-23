<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'

// props were passed from the slot using `v-bind="customNodeProps"`
const props = defineProps<NodeProps>()
</script>

<template>
  <div>
    {{ label }}
  </div>
</template>
