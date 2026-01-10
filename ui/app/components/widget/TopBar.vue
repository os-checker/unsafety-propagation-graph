<template>
  <div class="top-menu">
    <UNavigationMenu :items="menuItems" />

    <div>
      Graph View:
      <USelectMenu v-model="viewSelected" multiple :items="views" :search-input="false" class="w-50" />
    </div>

    <div class="top-menu mr-2">
      <UColorModeButton />
      <!-- <ULink to="https://artisan-lab.github.io/RAPx-Book/6.4-unsafe.html" :external="true" target="_blank">Help</ULink> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
import { ViewType, ALL_VIEW_TYPES, EMPTY_NAVI, NAVI_URL, type Navigation } from '~/lib/topbar';

const menuItems = ref<NavigationMenuItem[]>([{ label: "function", }]);

const viewSelected = defineModel<ViewType[]>('viewSelected');

const views = ref<ViewType[]>(ALL_VIEW_TYPES);

const navi = ref<Navigation>(EMPTY_NAVI);
$fetch(NAVI_URL)
  .then(text => navi.value = JSON.parse(text as string))
  .catch(err => console.log(err));

watch(navi, a => console.log(a));
</script>

<style lang="css">
.top-menu {
  @apply flex items-center justify-between;
}
</style>
