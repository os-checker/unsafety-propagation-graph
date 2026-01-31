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
          <!-- <div v-if="item.spec.url"> -->
          <!--   <UBadge color="neutral" variant="outline">Ref</UBadge> <span class="w-2" /> -->
          <!--   <ULink external :to="item.spec.url" target="_blank">{{ item.spec.url }}</ULink> -->
          <!-- </div> -->
          <div v-if="item.occurence">
            <UBadge color="neutral" variant="outline">Occurence</UBadge> {{ item.occurence }}
            <div class="mt-2" v-if="showFunction">
              <ul>
                <li v-for="fn_name in spec.stat.occurence[item.tag]?.unqiue_tagged_fn ?? []"
                  class="flex items-start gap-2">
                  <span class="mt-2.5 size-1.5 shrink-0 rounded-full bg-gray-600 dark:bg-gray-400" />
                  <ULink :to="getLink(fn_name, $route, $router)">
                    <span class="font-mono">{{ fn_name }}</span>
                  </ULink>
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
          <UCheckbox label="Display Functions" color="secondary" v-model="showFunction" />
        </div>
        <div class="text-xs">
          Used Tag Kind: {{ spec.stat.tag_cardinality }},
          Tagged Function: {{ spec.stat.tagged_fn }},
          Tag Occurence: {{ spec.stat.total_occurence }}.
        </div>
      </div>

    </template>

    <template #usage>
      <UScrollArea class="h-[80vh]">
        <WidgetTagPlot :data="selectedPlotData" />
      </UScrollArea>

      <div class="p-2 flex justify-between items-center gap-2">
        <div class="flex items-center gap-4">
          <span>Quantity:</span>
          <URadioGroup orientation="horizontal" variant="list" v-model="selectedPlotKind" :items="radioGroup" />
        </div>
        <div class="text-xs">
          Tag Summary:
          Kind: {{ spec.tags.length }},
          Used: {{ spec.stat.tag_cardinality }},
          Occurence: {{ spec.stat.total_occurence }},
          Function: {{ spec.stat.tagged_fn }}.
        </div>
      </div>
    </template>

  </UTabs>
</template>

<script setup lang="ts">
import type { RadioGroupItem, TabsItem } from '@nuxt/ui';
import { type DataTags, type TagSpec } from '~/lib/output/tag';
import type { BarPlotData } from '~/lib/topbar';
import getLink from '~/utils/getLink';

const props = defineProps<{ tags: DataTags }>()

// const crates = computed<string[]>(() => {
//   const name = new Set<string>()
//   for (const fn_name of Object.keys(props.tags.v_fn)) {
//     name.add(fn_name)
//   }
//   const arr = [...name]
//   arr.sort()
//   return arr
// })

const showFunction = ref<boolean>(true);

// The key is real tag name (never includes `any`), the value is fn names.
type Stat = {
  occurence: { [key: string]: { full_tagged_fn: string[], unqiue_tagged_fn: string[] } },
  total_occurence: number, tag_cardinality: number, tagged_fn: number
};
// Occurence usually equals to tagged_fn, but if a fn has the same tag multiple times, they will differ.
type SpecTag = { tag: string, spec: TagSpec, occurence: number, tagged_fn: number };
type SpecData = { tags: SpecTag[], stat: Stat };
const spec = computed<SpecData>(() => {
  const stat: Stat = { occurence: {}, total_occurence: 0, tag_cardinality: 0, tagged_fn: 0 }

  for (const [fn_name, tag_usage] of Object.entries(props.tags.v_fn)) {
    for (const sp of tag_usage) {
      for (const tag of sp.tags) {
        const name = tag.sp.tag.name;
        // Real tags in `any` tag are in args:
        // "core::alloc::layout::Layout::for_value_raw": [
        // { "tags": [ { "tag": { "typ": null, "name": "any" }, "args": [ "Size", "ValidSlice", "ValidTraitObj" ] } ], } ],
        const realTags = (name === "any") ? tag.sp.args : [name];
        for (const realTag of realTags) {
          stat.occurence[realTag] ??= { full_tagged_fn: [], unqiue_tagged_fn: [] };
          stat.occurence[realTag].full_tagged_fn.push(fn_name);
          stat.total_occurence += 1;
        }
      }
    }
  }

  const stat_occurence = Object.keys(stat.occurence);
  stat.tag_cardinality = stat_occurence.length;
  // Checke `any` tag
  const any_tags = stat_occurence.filter(name => name.startsWith("any"));
  if (any_tags.length !== 0) console.log("There shouldn't be `any` tags", any_tags)

  const tags = Object.entries(props.tags.spec).map(([tag, info]) => {
    return { tag, spec: info.tag, occurence: stat.occurence[tag]?.full_tagged_fn.length ?? 0, tagged_fn: 0 }
  });

  // Dedulipcate functions.
  const total_fn = new Set<string>();
  const set_fn = new Set<string>();
  for (const v of Object.values(stat.occurence)) {
    v.full_tagged_fn.forEach(f => { set_fn.add(f); total_fn.add(f); });
    v.unqiue_tagged_fn = [...set_fn];
    set_fn.clear();
  }
  stat.tagged_fn = total_fn.size;

  // Update tagged_fn.
  for (const tag of tags) {
    // occurence now is unique functions.
    tag.tagged_fn = stat.occurence[tag.tag]?.unqiue_tagged_fn.length ?? 0;
  }

  return { tags, stat }
})

const enum PlotKind { occurence = "Occurence", tagged_fn = "Function" }
const selectedPlotKind = ref<PlotKind>(PlotKind.occurence)
type PlotData = { value: PlotKind, data: BarPlotData[], n: number }[]
const plotData = computed<PlotData>(() => {
  const tags = spec.value.tags;
  const occurenceData: BarPlotData[] = tags.map(tag => ({ label: tag.tag, value: tag.occurence }));
  const tagged_fnData: BarPlotData[] = tags.map(tag => ({ label: tag.tag, value: tag.tagged_fn }));
  return [
    {
      value: PlotKind.occurence,
      data: occurenceData.sort((a, b) => b.value - a.value),
      n: occurenceData.reduce((old, ele) => old + ele.value, 0),
    },
    {
      value: PlotKind.tagged_fn,
      data: tagged_fnData.sort((a, b) => b.value - a.value),
      n: tagged_fnData.reduce((old, ele) => old + ele.value, 0),
    },
  ]
})
const radioGroup = computed<RadioGroupItem[]>(() => plotData.value.map(({ value, n }) => ({
  label: `${value} (${n})`, value: value
})))
const selectedPlotData = computed<BarPlotData[]>(() => plotData.value.find(v => v.value === selectedPlotKind.value)?.data ?? [])

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
