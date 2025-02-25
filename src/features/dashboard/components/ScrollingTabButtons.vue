<template>
<div class="x-grid">
  <div class="cell-20-24">
    <Draggable class="draggable button-container" :class="{ 'toggle-scroll': !isSmallScreen }" handle=".handleTab" v-model="state.selected.tabsForGroup" v-bind="dragOptions(1)">
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
    <button v-else @click="app.createNewTab" 
            class="view-all b-bottom b-left expanded">+</button>
  </div>
</div>

</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
import TabButton from './TabButton.vue';
import { useRouter } from 'vue-router';
import { useDraggable } from '@/shared/composables/useDraggable';

const { Draggable, dragOptions } = useDraggable();

const props = defineProps({
  app: Object,
  state: Object
});

const router = useRouter();

const isSmallScreen = true

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
watch(() => props.state.selected.tab?._id, (newId) => {
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