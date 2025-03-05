<template>
  <div class="flex w-full bg-gray-800 border-b border-gray-600">
    <!-- Tabs container with scroll buttons -->
    <div class="flex-grow relative overflow-hidden">
      <Transition>
        <div v-if="!state.reordering" class="relative w-full">
          <!-- Left scroll button with monospace styling -->
          <div 
            v-show="scrollPosition > 0"
            @click="scrollTabs('left')" 
            class="absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-gray-900 border-r border-gray-600"
          >
            <div class="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white">
              <ChevronLeft size="16" />
            </div>
          </div>
          
          <div ref="scrollContainer" class="w-full">
            <Draggable 
              ref="draggable"
              class="draggable flex overflow-x-auto whitespace-nowrap scrollbar-hide" 
              handle=".handleTab" 
              v-model="state.selected.tabsForGroup" 
              v-bind="dragOptions(1)"
              @scroll="updateScrollPosition"
            >
              <template #item="{element}">
                <TabButton
                  :state="state" 
                  :tab="element" 
                  :key="element._id" />
              </template>
            </Draggable>
          </div>
          
          <!-- Right scroll button with monospace styling -->
          <div 
            v-show="scrollPosition < maxScroll && maxScroll > 0"
            @click="scrollTabs('right')" 
            class="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-gray-900 border-l border-gray-600"
          >
            <div class="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white">
              <ChevronRight size="16" />
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Fixed width All/+ button container with vintage styling -->
    <div class="w-12 flex-shrink-0 border-l border-gray-600">
      <button v-if="state.selected.tabsForGroup.length>1" 
              @click="router.push({ name: 'all-tabs' })" 
              class="h-full w-full bg-gray-900 font-mono text-gray-300 hover:text-white px-1">
        ALL
      </button>
      <button v-else @click="createNewTab()" 
              class="h-full w-full bg-gray-900 font-mono text-gray-300 hover:text-white px-1">
        +
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, watch, ref, nextTick } from 'vue';
import TabButton from './TabButton.vue';
import { useRouter } from 'vue-router';
import { useDraggable } from '@/shared/composables/useDraggable';
import { useDashboardState } from '../composables/useDashboardState';
import { useDashboardTabs } from '../composables/useDashboardTabs';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const { dragOptions, Draggable } = useDraggable();

const router = useRouter();
const { state } = useDashboardState();
const { createNewTab } = useDashboardTabs();
const isSmallScreen = true;

const draggable = ref(null);
const scrollContainer = ref(null);
const scrollPosition = ref(0);
const maxScroll = ref(0);

function validIdString(inputString) {
  return inputString.replace(/[^a-zA-Z0-9]/g, '_');
}

const uniqueTabClassName = computed(() => {
  const selectedTab = state.selected.tab;
  return validIdString(selectedTab?._id);
});

function updateScrollPosition() {
  if (draggable.value) {
    scrollPosition.value = draggable.value.$el.scrollLeft;
    maxScroll.value = draggable.value.$el.scrollWidth - draggable.value.$el.clientWidth;
  }
}

function scrollTabs(direction) {
  if (!draggable.value) return;
  
  const scrollAmount = 200; // Adjust this value to control scroll distance
  const currentScroll = draggable.value.$el.scrollLeft;
  
  if (direction === 'left') {
    draggable.value.$el.scrollLeft = Math.max(0, currentScroll - scrollAmount);
  } else {
    draggable.value.$el.scrollLeft = Math.min(maxScroll.value, currentScroll + scrollAmount);
  }
  
  updateScrollPosition();
}

function scrollToSelectedTab(toTheLeft) {
  if (!draggable.value) return;
  const scrollableDiv = draggable.value.$el;
  const selectedTab = document.querySelector(`.${uniqueTabClassName.value}`);

  if(!selectedTab || !scrollableDiv) {
    return;
  }

  const selectedTabPosition = selectedTab.getBoundingClientRect();
  const newScrollPosition = scrollableDiv.scrollLeft + selectedTabPosition.left - toTheLeft;
  
  scrollableDiv.scrollLeft = newScrollPosition;
  updateScrollPosition();
}

function calculateMaxScroll() {
  if (draggable.value) {
    maxScroll.value = draggable.value.$el.scrollWidth - draggable.value.$el.clientWidth;
    updateScrollPosition();
  }
}

onMounted(() => {
  scrollToSelectedTab(20);
  calculateMaxScroll();
  
  window.addEventListener('resize', calculateMaxScroll);
  
  // Initial calculation after component is fully rendered
  setTimeout(calculateMaxScroll, 100);
});

watch(() => state.selected.tab?._id, (newId) => {
  if(newId) {
    scrollToSelectedTab(20);
  }
});

// Watch for changes in tab length to recalculate maxScroll
watch(() => state.selected.tabsForGroup.length, () => {
  // Use nextTick to ensure DOM is updated before calculations
  nextTick(calculateMaxScroll);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', calculateMaxScroll);
});

</script>