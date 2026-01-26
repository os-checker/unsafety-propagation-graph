<script setup lang="ts">
const props = defineProps({
  total: { type: Number, default: 0 },
})

const currentPage = defineModel('page', { default: 1 })
const itemsPerPage = defineModel('itemsPerPage', { default: 20, required: true })

const totalPages = computed(() => Math.ceil(props.total / itemsPerPage.value))

const next = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

const prev = () => {
  if (currentPage.value > 1) currentPage.value--
}

const inputPage = ref(currentPage.value ?? 1)
watch(inputPage, n => { if (n > 0 && n < totalPages.value) currentPage.value = n })
</script>


<template>
  <div class="flex items-center gap-2">
    <UButton icon="i-lucide-chevron-left" color="neutral" variant="outline" :disabled="currentPage === 1"
      @click="prev" />

    <div class="flex items-center gap-1">
      <template v-for="p in totalPages" :key="p">
        <UButton v-if="Math.abs(p - currentPage) <= 1 || p === 1 || p === totalPages" :label="String(p)"
          :variant="currentPage === p ? 'subtle' : 'ghost'" :color="currentPage === p ? 'primary' : 'neutral'" size="sm"
          @click="currentPage = p" />
        <span v-else-if="Math.abs(p - currentPage) === 2" class="text-neutral-400">
          ...
        </span>
      </template>
    </div>

    <UButton icon="i-lucide-chevron-right" color="neutral" variant="outline" :disabled="currentPage === totalPages"
      @click="next" />

    <USelect v-model="itemsPerPage" :items="[10, 20, 50, 100]" class="w-18" />
    <UInput v-model="inputPage" placeholder="Jump" class="w-15" />

    <span class="text-sm text-neutral-500 ml-2">
      Total Items {{ total }}
    </span>
  </div>
</template>
