<template>
<div class="grid text-left allTabRow p10y middle b-bottom">
  <!-- Dots -->
  <div class="cell-2-24">
    <DotsVertical />
  </div>

  <!-- Title & Total -->
  <div @click="selectTab(element)" class="cell-20-24 pointer">
    <b class="proper bold">{{ element.tabName }}</b>
    <br />
    <span class="sectionContent bold">{{ tabTotal(element) }}</span>
  </div>

  <!-- Drag Handle -->
  <div class="cell-2-24">
    <DragHorizontalVariant class="handlerTab pointer" />
  </div>
</div>
</template>

<script setup>
import { nextTick, watch } from 'vue';
import { formatPrice } from '../utils';
import DragHorizontalVariant from 'vue-material-design-icons/DragHorizontalVariant.vue';
import DotsVertical from 'vue-material-design-icons/DotsVertical.vue';
import { useAppStore } from '../stores/state';

const { api } = useAppStore();

const props = defineProps({
  app: Object,
  state: Object,
  element: Object
});

function selectTab(tabToSelect) {
  if(tabToSelect.isSelected) {
    props.app.goBack();
    return;
  }

  const currentlySelectedTab = props.state.selected.tab;

  if(currentlySelectedTab) {
    currentlySelectedTab.isSelected = false;
    api.put(`api/tabs/${currentlySelectedTab._id}`, { isSelected: false });
  }

  tabToSelect.isSelected = true;
  api.put(`api/tabs/${tabToSelect._id}`, { isSelected: true });

  nextTick(() => {
    props.app.goBack();
  });
}

function tabTotal(tab) {
  const total = tab.total || 0;
  const toFixed = tab.isSelected ? 2 : 0;

  return formatPrice(total, { toFixed });
}

watch(() => props.element.sort, (newSort) => {
  api.put(`api/tabs/${props.element._id}`, { sort: newSort });
});

</script>

<style>
.sectionContent {
  color: blue
}
</style>