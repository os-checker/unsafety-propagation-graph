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

const menuItems = ref<NavigationMenuItem[]>([{ label: "function", }]);

enum ViewType {
  Callees = "Callees",
  Adts = "Adts",
}

const viewSelected = ref<ViewType[]>([ViewType.Callees, ViewType.Adts]);
const views = ref<ViewType[]>([ViewType.Callees, ViewType.Adts]);
</script>

<style lang="css">
.top-menu {
  @apply flex items-center justify-between;
}
</style>
