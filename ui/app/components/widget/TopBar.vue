<template>
  <div class="top-menu">
    <UNavigationMenu :items="navi_menu" class="w-1/2" trailing-icon="tabler:chevron-right">
      <template #item-content="{ index: stack_idx }">
        <div class="flex gap-4 m-2">
          <div v-for="[kind, v_sub_navi_idx] in Object.entries(currentNaviItem(stack_idx)?.groups ?? {})">
            <div :class="[colorClass(kind), 'text-center font-bold']">{{ kind }}</div>
            <div>
              <ul @click="(event) => naviItemClick(event, stack_idx)">
                <li v-for="{ sub_navi_idx, item } in v_sub_navi_idx.map(
                  idx => ({ sub_navi_idx: idx, item: currentNaviItem(stack_idx)?.subitems[idx] })
                )" :data-idx="item?.idx" :data-sub-navi-idx="sub_navi_idx" class="my-1">
                  <UButton :label="item?.name ?? 'ERROR-NAME'" :icon="icon(kind)" size="md" color="neutral"
                    variant="ghost" class="w-full" />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </template>
    </UNavigationMenu>

    <div class="top-menu mr-2 gap-1">
      <UTooltip v-if="false" text="Layout Algorithm">
        <USelectMenu v-model="flowOpts.layout" placeholder="Layout" :items="ELK_LAYOUTS" :search-input="false"
          class="w-31" icon="tabler:layout-board-split-filled" />
      </UTooltip>
      <UTooltip text="Edge Type">
        <USelectMenu v-model="flowOpts.edge" placeholder="Edge Type" :items="EDGE_TYPES" :search-input="false"
          class="w-30" icon="tabler:line" />
      </UTooltip>
      <UTooltip text="Fit To Screen">
        <UButton icon="tabler:arrow-autofit-height" color="neutral" variant="ghost" @click="fitViewHandle" />
      </UTooltip>
      <UTooltip text="Graph View">
        <USelectMenu v-model="flowOpts.view" multiple :items="VIEW_TYPES" :search-input="false" class="w-45"
          icon="tabler:braces" />
      </UTooltip>
      <UColorModeButton />
      <!-- <ULink to="https://artisan-lab.github.io/RAPx-Book/6.4-unsafe.html" :external="true" target="_blank">Help</ULink> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
import { VIEW_TYPES, EMPTY_NAVI, NAVI_URL, icon, colorClass, DefPathKind, ELK_LAYOUTS, EDGE_TYPES, } from '~/lib/topbar';
import type { Navigation, NaviItem, FlowOpts } from '~/lib/topbar';

const flowOpts = defineModel<FlowOpts>('flowOpts', { required: true });
function fitViewHandle() { if (flowOpts.value) flowOpts.value.fit = true }

const navi = ref<Navigation>(EMPTY_NAVI);
$fetch(NAVI_URL)
  .then(text => navi.value = JSON.parse(text as string))
  .catch(err => console.log(err));

// Expanded navi items. The value is data idx in Navigation.
const navi_stack = ref<number[]>([]);
function stack_idx_to_data_idx(stack_idx: number): number | undefined {
  return navi_stack.value[stack_idx];
}
function currentNaviItem(stack_idx: number): NaviItem | undefined {
  const idx = stack_idx_to_data_idx(stack_idx);
  if (idx === undefined) return undefined;
  return navi.value.navi[idx]
}

const navi_menu = ref<NavigationMenuItem[]>([]);
watch(navi, val => {
  const data = val.data;
  const root = data[0]?.[0];
  if (!root) {
    navi_menu.value = [];
    navi_stack.value = [];
    return;
  }

  const tree: NavigationMenuItem[] = [{ label: root.name, icon: icon(root.kind) }];
  navi_menu.value = tree;
  navi_stack.value.push(0);
});

const itemName = defineModel<{ name: string, kind: DefPathKind }>("itemName");

/** Respond to which navi item is clicked.
* stack_idx refers to the current position in navi_stack.
* li id refers to navi data idx.
*/
function naviItemClick(event: MouseEvent, stack_idx: number) {
  const li = (event.target as HTMLElement).closest('li')
  if (!li || !(event.currentTarget as HTMLElement).contains(li)) return;
  const idx = parseInt(li.dataset.idx ?? "");
  const sub_navi_idx = parseInt(li.dataset.subNaviIdx ?? "");

  // This is never null, because we just clicked it.
  // const clicked = {
  //   full_path: navi.value.data[idx]!,
  //   short: navi.value.navi[stack_idx]?.subitems[sub_navi_idx]!
  // };
  const data_idx = stack_idx_to_data_idx(stack_idx);
  if (data_idx === undefined) return;
  const clicked = navi.value.navi[data_idx]?.subitems[sub_navi_idx];

  // This can be null when fn item is clicked or the item has no sub items.
  // const target = navi.value.navi[idx]?.subitems;
  // console.log("\nstack_idx:", stack_idx, "\nsub_navi_idx:", sub_navi_idx, "\nclicked:", clicked, "\ntarget:", target, "\nidx:", idx, "\ndata_dix:", data_idx);

  if (!clicked) return;
  const clicked_kind = clicked.kind;
  const clicked_idx = clicked.idx;
  if (clicked_kind !== DefPathKind.Fn && clicked_kind !== DefPathKind.AssocFn) {
    // Clear last fn item, because fn item don't have accessible items.
    const last_stack_idx = navi_stack.value.at(-1);
    if (last_stack_idx) {
      const last_data_idx = stack_idx_to_data_idx(last_stack_idx);
      if (last_data_idx) {
        if (navi.value.navi[last_data_idx]?.non_mod_kinds?.find(k => k === DefPathKind.Fn || k === DefPathKind.AssocFn)) {
          const newLen = stack_idx + 1;
          navi_menu.value.length = newLen;
          navi_stack.value.length = newLen;
        }
      }
    }

    // Update navi_stack only when the item is deeper.
    if (navi_stack.value.every(v => v < clicked_idx)) {
      navi_stack.value.push(clicked.idx);
      navi_menu.value.push({ label: clicked.name, icon: icon(clicked_kind) });
    }
  } else {
    // Shrink the stack when a shallow item is clicked.
    const newLen = stack_idx + 1;
    navi_menu.value.length = newLen;
    navi_stack.value.length = newLen;
    // Append the clicked function.
    navi_stack.value.push(clicked.idx);
    navi_menu.value.push({ label: clicked.name, icon: icon(clicked_kind) });
  }
  const name = navi.value.path_to_name[idx];
  if (name) itemName.value = { name, kind: clicked_kind };
}
</script>
