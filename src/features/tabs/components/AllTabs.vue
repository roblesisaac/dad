<template>
<div class="x-grid">
  <div class="cell-1">
    <Draggable 
      v-model="state.selected.tabsForGroup" 
      v-bind="dragOptions()" 
      handle=".handlerTab"
    >
      <template #item="{element}">
        <AllTabRow 
          :element="element" 
          :key="element._id" 
        />
      </template>
    </Draggable>
  </div>

  <div class="cell-1">
    <button @click="handleCreateNew" class="expanded create-new-tab">
      + New Tab
    </button>
  </div>
</div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import AllTabRow from './AllTabRow.vue';
import { useTabs } from '../composables/useTabs';
import { useDraggable } from '@/shared/composables/useDraggable';

const { Draggable, dragOptions } = useDraggable();
const { state } = useDashboardState();
const { createNewTab } = useTabs();

function handleCreateNew() {
  createNewTab();
}

onMounted(() => {
  window.scrollTo(0, 0);
});
</script>

<style scoped>
.create-new-tab {
  background: lightblue;
  color: black;
  border-bottom: 2px solid;
  padding: 20px;
}
</style> 