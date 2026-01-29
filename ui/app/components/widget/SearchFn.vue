<template>
  <div class="h-[70vh] overflow-y-auto m-2">
    <div class="text-lg font-bold">{{ title }}</div>
    <ol class="list-decimal ml-3 list-inside" :start="view.start">
      <li v-for="item in view.range" class="my-1">
        <ULink :to="getLink(item.name, $route, $router)" :class="isUnsafe(item.name) ? 'unsafeFnLink' : ''">
          <span class="font-mono">{{ item.name }}</span>
        </ULink>
        <UBadge v-for="tag in item.tags" :label="tag" color="warning" variant="outline" class="ml-2" />
      </li>
    </ol>
  </div>
  <div class="flex justify-between items-center m-2">
    <WidgetPaginator :total="fullFns.length" v-model:itemsPerPage="search.itemsPerPage" v-model:page="search.page" />

    <div class="flex justify-end items-center gap-2">
      <UInput v-model="search.text" placeholder="Search Name Or Tag" />

      <UCheckbox v-model="search.withTags" label="Only With Tags" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Search, SearchFnItem, UnsafeFns } from '~/lib/topbar';

const props = defineProps<{ v_fn: SearchFnItem[], title: string, unsafeFns: UnsafeFns }>()

function isUnsafe(name: string): boolean {
  return props.unsafeFns[name] ? true : false
}

const search = defineModel<Search>({ required: true })

const sort = (a: SearchFnItem, b: SearchFnItem) => a.name.localeCompare(b.name)
const fullFns = computed<SearchFnItem[]>(() => {
  const original = props.v_fn

  const filterTags = search.value.withTags
  const filterText = search.value.text ? search.value.text.toLowerCase() : ""
  return (filterTags || filterText) ? original.filter(i => {
    let ret = true
    if (filterTags) ret &&= i.tags.length !== 0
    if (filterText) ret &&= (
      i.name.toLowerCase().includes(filterText)
      || i.tags.findIndex(t => t.toLowerCase().includes(filterText)) !== -1)
    return ret
  }).sort(sort) : original.sort(sort)
})

const view = computed(() => {
  const page = search.value.page
  const p = page ? page : 1
  const ipp = search.value.itemsPerPage
  const start = (p - 1) * ipp
  return {
    start: start + 1,
    range: fullFns.value.slice(start, start + ipp)
  }
})


</script>
