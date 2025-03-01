<template>
<div class="x-grid">
  <div class="cell-20-24">
    <Draggable 
      class="draggable button-container" 
      :class="{ 'toggle-scroll': !isSmallScreen }" 
      handle=".handleTab" 
      v-model="tabsForGroup" 
      v-bind="dragOptions(1)"
      @end="handleDragEnd">
      <template #item="{element}">
        <TabButton
          :state="state" 
          :tab="element" 
          :key="element._id"
          class="reportTab" />
      </template>
    </Draggable>
  </div>
  <div class="cell-4-24">
    <button v-if="state.selected.tabsForGroup.length>1" 
            @click="router.push({ name: 'all-tabs' })" 
            class="view-all b-bottom b-left expanded">All</button>
    <button v-else @click="() => console.log('create new tab')" 
            class="view-all b-bottom b-left expanded">+</button>
  </div>
</div>

</template>

<script setup>
import { computed, onMounted, watch, ref } from 'vue';
import TabButton from './TabButton.vue';
import { useRouter } from 'vue-router';
import { useDraggable } from '@/shared/composables/useDraggable';
import { useDashboardTabs } from '../composables/useDashboardTabs';

const { Draggable, dragOptions } = useDraggable();
const { updateTabSort, updateTabsOrder } = useDashboardTabs();

const props = defineProps({
  state: Object
});

const router = useRouter();
const state = props.state;
const isSmallScreen = true;

// Create a reactive reference to tabs to ensure changes propagate
const tabsForGroup = computed({
  get: () => state.selected.tabsForGroup,
  set: (newTabs) => {
    state.selected.tabsForGroup = newTabs;
    // Update sort values whenever the array order changes
    updateTabsOrder(newTabs);
  }
});

function validIdString(inputString) {
  return inputString.replace(/[^a-zA-Z0-9]/g, '_');
}

const uniqueTabClassName = computed(() => {
  const selectedTab = state.selected.tab;
  return validIdString(selectedTab?._id);
});

function scrollToSelectedTab(toTheLeft) {
  const scrollableDiv = document.querySelector('.draggable');
  const selectedTab = document.querySelector(`.${uniqueTabClassName.value}`);

  if(!selectedTab) {
    return;
  }

  const selectedTabPosition = selectedTab.getBoundingClientRect();
  const newScrollPosition = scrollableDiv.scrollLeft + selectedTabPosition.left - toTheLeft;
  
  scrollableDiv.scrollLeft = newScrollPosition;
}

/**
 * Handle drag end event for tab reordering
 * This is a fallback for the reactive approach above
 */
function handleDragEnd() {
  // Force update with current tab order to ensure reactivity
  updateTabsOrder([...tabsForGroup.value]);
}

onMounted(() => scrollToSelectedTab(20));
watch(() => state.selected.tab?._id, (newId) => {
  if(newId) scrollToSelectedTab(20);
})

</script>

<style>
.button-container {
  display: flex;
  overflow-x: auto;
  white-space: nowrap;
}

.button-container::-webkit-scrollbar {
  width: 0;
  background: transparent;
}

.toggle-scroll:hover::-webkit-scrollbar {
  width: 8px;
  background-color: rgba(0, 0, 0, 0.1);
}

.toggle-scroll:hover::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.view-all {
  height: 50px;
  border-radius: 0 0 3px 3px;
}

.view-all:hover,
.view-all:active,
.view-all:focus {
  color: blue;
  outline: none;
}
</style>