<template>
<div class="x-grid text-left allTabRow p10y middle b-bottom">
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
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useTabs } from '../composables/useTabs';
import { calculateTabTotal } from '../utils/tabUtils';

const props = defineProps({
  element: Object
});

const { state } = useDashboardState();
const { selectTab, updateTabSort } = useTabs();

const tabTotal = computed(() => calculateTabTotal(props.element));

function handleTabSelect() {
  selectTab(props.element, state.selected.tab);
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