<template>
  <div class="upg-left">
    <WidgetTopBar v-model:flowOpts="flowOpts" v-model:crate="crate" v-model="nodeItem" v-model:share="share"
      :tags="tags" :unsafeFns="unsafeFns" />
    <Flow :nodeItem="nodeItem" :tags="tags" :adtClicked="adtClicked" v-model:flowOpts="flowOpts"
      v-model:panelContent="panelContent" v-model:adtOpts="adtOpts" />
    <UModal :ui="{ content: 'w-[76vw] max-w-none' }" v-model:open="adtClicked.open">
      <template #content>
        <CodeAdtPopup :adt="adtOpts.data" :tags="tags" :unsafeFns="unsafeFns" :adtClicked="adtClicked" />
      </template>
    </UModal>
  </div>
  <div class="upg-right">
    <div class="upg-panel upg-panel-1">
      <WidgetSelectPanel v-model="upPanel" v-model:panelContent="panelContent" :adtOpts="adtOpts" :tags="tags"
        :unsafeFns="unsafeFns" />
    </div>
    <div class="upg-panel">
      <WidgetSelectPanel v-model="downPanel" v-model:panelContent="panelContent" :adtOpts="adtOpts" :tags="tags"
        :unsafeFns="unsafeFns" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FlowOpts, UnsafeFns } from "~/lib/topbar"
import { type DataTags, } from '~/lib/output/tag';
import { Panel, toPanel, toPanelStr, type PanelContent } from "~/lib/panel"
import { Crate, FLOW_OPTS, defaultCrateItemQuery, tagURL, toCrate, toViewTypes, unsafeFnsURL } from "~/lib/topbar";
import type { AdtClicked, AdtOpts } from "~/lib/output/adt";

const router = useRouter();
const route = useRoute();
// watch(route, val => console.log(val.query))

/** Parse route query to show the specified item; default to a std item if anything wrong. */
function init() {
  const query = route.query
  let krate: undefined | Crate = undefined

  const item = query.item
  if (item && typeof item === "string") {
    const matched = item.match(/^([^:]+)/)
    if (matched && matched[1]) {
      krate = toCrate(matched[1])
    }
  }

  let flowOpts_ = FLOW_OPTS
  const view = query.view
  if (typeof view === "string") {
    const viewTypes = toViewTypes(view)
    if (viewTypes) flowOpts_.view = viewTypes
  }

  const defaultCrate = Crate.alloc
  return {
    crate: krate ?? defaultCrate,
    item: (krate && item && item as string) ?? defaultCrateItemQuery(defaultCrate),
    flowOpts: flowOpts_,
    up: toPanel(query.up as string) ?? Panel.Src,
    down: toPanel(query.down as string) ?? Panel.Doc,
  }
}

const initState = init();
const crate = ref<Crate>(initState.crate);
const nodeItem = ref<string>(initState.item);
watch(crate, root => nodeItem.value = defaultCrateItemQuery(root))

const unsafeFns = ref<UnsafeFns>({})
const tags = ref<DataTags>({ v_fn: {}, spec: {} });
watch(crate, val => {
  $fetch(tagURL(val))
    .then(text => tags.value = JSON.parse(text as string))
  // .catch(err => console.log(err));
  $fetch(unsafeFnsURL(val))
    .then(text => unsafeFns.value = JSON.parse(text as string))
}, { immediate: true });

const panelContent = ref<PanelContent>({ nodeItem: nodeItem.value });
watch(nodeItem, item => {
  panelContent.value.nodeItem = item
  router.replace({ query: { item } })
})

const upPanel = ref(initState.up);
const downPanel = ref(initState.down);

const flowOpts = ref<FlowOpts>(initState.flowOpts);
const adtOpts = ref<AdtOpts>({});

const adtClicked = ref<AdtClicked>({ open: false })
watch(() => ({
  isAdtPanel: upPanel.value === Panel.Adt || downPanel.value === Panel.Adt,
  isClicked: adtClicked.value.clickedAdt || adtClicked.value.clickedField,
  adt: adtClicked.value
}), ({ isAdtPanel, isClicked, adt }) => {
  // Auto open adt panel when side panels doesn't show adt panel, and user clicked adt or field.
  if (!isAdtPanel && isClicked) {
    adtClicked.value = { open: true, lastClickedAdt: adt.clickedAdt, lastClickedField: adt.clickedField }
  }
})

const share = ref<boolean>(false)
watch(share, val => {
  if (!val) return;
  // Update URL with all queries.
  router.push({
    query: {
      item: nodeItem.value,
      view: flowOpts.value.view.join(","),
      up: toPanelStr(upPanel.value),
      down: toPanelStr(downPanel.value),
    }
  })
  share.value = false // share will be triggered again shen the button is clicked
})
</script>
