<template>
<div class="grid text-left allTabRow p10y middle b-bottom">
  <div class="cell-2-24">
    <MoreVertical />
  </div>

  <div @click="handleTabSelect" class="cell-20-24 pointer">
    <b class="proper bold">{{ element.tabName }}</b>
    <br />
    <span class="sectionContent bold">{{ tabTotal }}</span>
  </div>

  <div class="cell-2-24">
    <GripHorizontal class="handlerTab pointer" />
  </div>
</div>
</template>

<script setup>
import { computed, watch } from 'vue';
import { MoreVertical, GripHorizontal } from 'lucide-vue-next';
import { useTabs } from '../composables/useTabs';
import { calculateTabTotal } from '../utils/tabUtils';

const props = defineProps({
  app: Object,
  state: Object,
  element: Object
});

const { selectTab, updateTabSort } = useTabs();

const tabTotal = computed(() => calculateTabTotal(props.element));

function handleTabSelect() {
  selectTab(props.element, props.state.selected.tab, props.app.goBack);
}

watch(() => props.element.sort, (newSort) => {
  updateTabSort(props.element._id, newSort);
});
</script>

<style scoped>
.sectionContent {
  color: blue
}
</style> 