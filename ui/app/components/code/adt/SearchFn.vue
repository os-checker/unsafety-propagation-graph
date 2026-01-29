<template>
  <UModal v-if="val.v_fn.length" :ui="{ content: 'w-[70vw] max-w-none' }">
    <UTooltip :text="val.desc">
      <UButton variant="subtle" color="neutral">
        {{ val.kind }}
        <UBadge color="neutral" variant="outline">{{ val.v_fn.length }}</UBadge>
      </UButton>
    </UTooltip>
    <template #content>
      <WidgetSearchFn :v_fn="val.v_fn" :unsafeFns="unsafeFns" v-model="search" :title="val.desc" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { AdtPanelItem } from '~/lib/output/adt';
import type { Search, UnsafeFns } from '~/lib/topbar';

const props = defineProps<{ val: AdtPanelItem, unsafeFns: UnsafeFns }>()
const search = ref<Search>({ withTags: false, unsafeOnly: false, text: "", page: 1, itemsPerPage: 20 })
</script>
