<template>
  <div class="h-[70vh] overflow-y-auto m-2">
    <ol class="list-decimal ml-3 list-inside" :start="view.start">
      <li v-for="item in view.range" class="my-1">
        <ULink :to="getLink(item.name, $route, $router)">
          <span class="font-mono">{{ item.name }}</span>
        </ULink>
        <UBadge v-for="tag in item.tags" :label="tag" color="warning" variant="outline" class="ml-2" />
      </li>
    </ol>
  </div>
  <div class="flex justify-between items-center m-2">
    <WidgetPaginator :total="search.length" v-model:itemsPerPage="itemsPerPage" v-model:page="page" />

    <div class="flex justify-end items-center gap-2">
      <UInput v-model="searchText" placeholder="Search Name Or Tags" />

      <UCheckbox v-model="withTags" label="Only With Tags" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { getTag, type DataTags } from '~/lib/output/tag';
import type { Navi } from '~/lib/topbar';

const props = defineProps<{ navi: Navi, tags: DataTags }>()

const withTags = ref(false)
const searchText = ref("")

type Search = { name: string, tags: string[] }
const search = computed<Search[]>(() => {
  const original = Object.keys(props.navi.name_to_id).map(name => {
    return { name, tags: getTag(name, props.tags, true) }
  })

  const sort = (a: Search, b: Search) => a.name.localeCompare(b.name)

  const filterTags = withTags.value
  const filterText = searchText.value ? searchText.value.toLowerCase() : ""
  return (filterTags || filterText) ? original.filter(i => {
    let ret = true
    if (filterTags) ret &&= i.tags.length !== 0
    if (filterText) ret &&= (
      i.name.toLowerCase().includes(filterText)
      || i.tags.findIndex(t => t.toLowerCase().includes(filterText)) !== -1)
    return ret
  }).sort(sort) : original.sort(sort)
})

const page = ref(1)
const itemsPerPage = ref(20);
const view = computed(() => {
  const p = page.value ? page.value : 1
  const ipp = itemsPerPage.value
  const start = (p - 1) * ipp
  return {
    start: start + 1,
    range: search.value.slice(start, start + ipp)
  }
})


</script>
