<template>
  <div class="grid grid-cols-24">
    <div class="col-span-20">
      <Draggable 
        class="flex overflow-x-auto scrollbar-hide" 
        :class="{ 'hover:scrollbar-default': !isSmallScreen }" 
        handle=".handleTab" 
        v-model="state.selected.tabsForGroup" 
        v-bind="state.dragOptions(100)"
      >
        <template #item="{element}">
          <TabButton
            :state="state" 
            :tab="element" 
            :key="element._id"
            class="flex-shrink-0" 
          />
        </template>
      </Draggable>
    </div>
    
    <div class="col-span-4">
      <button 
        v-if="state.selected.tabsForGroup.length > 1" 
        @click="state.views.push('AllTabs')" 
        class="w-full h-[50px] bg-gray-100 hover:bg-gray-200 border-l-2 border-b-2 border-gray-300 transition-colors"
      >
        All
      </button>
      <button 
        v-else 
        @click="app.createNewTab" 
        class="w-full h-[50px] bg-gray-100 hover:bg-gray-200 border-l-2 border-b-2 border-gray-300 transition-colors"
      >
        +
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
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
  const scrollableDiv = document.querySelector('.scrollbar-hide');
  const selectedTab = document.querySelector(`.${uniqueTabClassName.value}`);

  if (!selectedTab) return;

  const selectedTabPosition = selectedTab.getBoundingClientRect();
  const newScrollPosition = scrollableDiv.scrollLeft + selectedTabPosition.left - toTheLeft;
  
  scrollableDiv.scrollTo({
    left: newScrollPosition,
    behavior: 'smooth'
  });
}

onMounted(() => scrollToSelectedTab(20));
watch(() => props.state.selected.tab?._id, (newId) => {
  if (newId) scrollToSelectedTab(20);
});
</script>

<style>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-default::-webkit-scrollbar {
  @apply h-2 bg-gray-100;
}

.scrollbar-default::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full hover:bg-gray-400;
}
</style>