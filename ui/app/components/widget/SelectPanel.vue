<template>
  <div class="absolute top-2 right-2 z-50">
    <USelect v-model="model" :items="PANELS" placeholder="Select Panel" class="w-40" :content="{ bodyLock: false }" />
  </div>
</template>

<script setup>
import { PANELS } from "~/lib/panel"

const model = defineModel()
</script>
