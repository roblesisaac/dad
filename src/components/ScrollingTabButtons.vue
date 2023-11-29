<template>
<div class="grid">
  <div class="cell-20-24">
    <Draggable class="draggable button-container" :class="{ 'toggle-scroll': !isSmallScreen }" handle=".handleTab" v-model="props.state.selected.tabsForGroup" v-bind="props.state.dragOptions(100)">
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
    <button @click="props.state.views.push('AllTabs')" class="view-all b-bottom b-left expanded">All</button>
  </div>
</div>

</template>

<script setup>
import { computed, onMounted } from 'vue';
import TabButton from './TabButton.vue';
import Draggable from 'vuedraggable';

const props = defineProps({
  app: Object,
  state: Object
});

const isSmallScreen = computed(() => props.state.isSmallScreen());

function validIdString(inputString) {
  return inputString.replace(/[:\-]/g, '_');
}

const uniqueTabClassName = computed(() => {
  const selectedTab = props.state.selected.tab;

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

onMounted(() => scrollToSelectedTab(20));

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
  background: #f3f3ee;
  color: blue;
  border-radius: 0 0 3px 3px;
}

.view-all:hover,
.view-all:active,
.view-all:focus {
  background: #f3f3ee;
  color: blue;
  outline: none;
}
</style>