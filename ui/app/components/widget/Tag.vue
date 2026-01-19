<template>
  <UTabs :items="tabs" color="neutral">

    <template #spec>
      <UScrollArea v-slot="{ item, index }" :items="filterSpecTags" class="h-[80vh]">
        <UPageCard v-bind="{ id: index }" :variant="index % 2 === 0 ? 'soft' : 'outline'" class="rounded-none">

          <template #title>
            <div class="text-orange-600 dark:text-orange-400 font-bold text-xl">{{ item.tag }}</div>
          </template>
          <template #description v-if="item.spec.desc">
            <div class="text-orange-600 dark:text-orange-400 font-bold"> {{ item.spec.desc }}</div>
          </template>

          <div v-if="item.spec.args.length !== 0">
            <UBadge color="neutral" variant="outline">Arguments</UBadge> {{ item.spec.args }}
          </div>
          <div v-if="item.spec.expr">
            <UBadge color="neutral" variant="outline">Expression</UBadge> {{ item.spec.expr }}
          </div>
          <div v-if="item.spec.types.length !== 0">
            <UBadge color="neutral" variant="outline">Types</UBadge> {{ item.spec.types }}
          </div>
          <div v-if="item.spec.url">
            <UBadge color="neutral" variant="outline">Ref</UBadge> <span class="w-2" />
            <ULink external :to="item.spec.url" target="_blank">{{ item.spec.url }}</ULink>
          </div>
          <div v-if="item.occurence">
            <UBadge color="neutral" variant="outline">Occurence</UBadge> {{ item.occurence }}
            <div class="mt-2" v-if="showFunction">
              <ul>
                <li v-for="fn_name in spec.stat.occurence[item.tag]" class="flex items-start gap-2">
                  <span class="mt-2.5 size-1.5 shrink-0 rounded-full bg-gray-600 dark:bg-gray-400" />
                  <span class="font-mono">{{ fn_name }}</span>
                </li>
              </ul>
            </div>
          </div>

        </UPageCard>
      </UScrollArea>

      <div class="p-2 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <USelectMenu v-model="filterTagNames" multiple clear :items="tagNames" placeholder="Filter Tags"
            variant="ghost" icon="tabler:search" />
          <UCheckbox label="Toggle Function" color="secondary" v-model="showFunction" />
        </div>
        <div class="text-sm">
          Tag Cardinality: {{ spec.stat.tag_cardinality }},
          Tagged Function: {{ spec.stat.tagged_fn }},
          Tag Occurence: {{ spec.stat.total_occurence }}
        </div>
      </div>

    </template>

    <template #usage>
      <UScrollArea class="h-[80vh]">
        {{ crates }}
      </UScrollArea>
    </template>

  </UTabs>
</template>

<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';
import type { DataTags, TagSpec } from '~/lib/output';

const props = defineProps<{ tags: DataTags }>()

const crates = computed<string[]>(() => {
  const name = new Set<string>()
  for (const fn_name of Object.keys(props.tags.v_fn)) {
    name.add(fn_name)
  }
  const arr = [...name]
  arr.sort()
  return arr
})

const showFunction = ref<boolean>(true);

// The key is tag name, the value is fn names.
type Stat = { occurence: { [key: string]: string[] }, total_occurence: number, tag_cardinality: number, tagged_fn: number };
type SpecTag = { tag: string, spec: TagSpec, occurence: number };
type SpecData = { tags: SpecTag[], stat: Stat };
const spec = computed<SpecData>(() => {
  const stat: Stat = { occurence: {}, total_occurence: 0, tag_cardinality: 0, tagged_fn: 0 }

  for (const [fn_name, tag_usage] of Object.entries(props.tags.v_fn)) {
    for (const sp of tag_usage) {
      for (const tag of sp.tags) {
        const name = tag.tag.name;
        stat.occurence[name] ??= [];
        stat.occurence[name].push(fn_name);
        stat.total_occurence += 1;
      }
    }
  }

  stat.tag_cardinality = Object.keys(stat.occurence).length;

  // Dedulipcate functions.
  const total_fn = new Set<string>();
  const set_fn = new Set<string>();
  for (let v of Object.values(stat.occurence)) {
    v.forEach(f => { set_fn.add(f); total_fn.add(f); });
    v = [...set_fn];
    set_fn.clear();
  }
  stat.tagged_fn = total_fn.size;

  return {
    tags: Object.entries(props.tags.spec).map(([tag, info]) => {
      return { tag, spec: info.tag, occurence: stat.occurence[tag]?.length ?? 0 }
    }),
    stat
  }
})

const tagNames = computed<string[]>(() => Object.keys(props.tags.spec));
const filterTagNames = ref<string[] | undefined>();
const filterSpecTags = computed<SpecTag[]>(() => {
  const names = filterTagNames.value;
  const tags = spec.value.tags;
  if (names === undefined || names.length === 0) return tags;
  const set = new Set(names);
  return tags.filter(tag => set.has(tag.tag))
})

const tabs: TabsItem[] = [
  { label: "Tag Specification", slot: "spec" as const },
  { label: "Tag Usage", slot: "usage" as const },
]
</script>
