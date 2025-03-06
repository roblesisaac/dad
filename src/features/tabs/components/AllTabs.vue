<template>
  <div class="container mx-auto max-w-screen-lg bg-white border border-gray-200 shadow-sm">
    <!-- Enabled Tabs Section -->
    <div class="border-b border-gray-200 px-4 py-3 bg-blue-50">
      <h2 class="font-medium text-blue-800">Enabled Tabs ({{ enabledTabs.length }})</h2>
    </div>
    
    <!-- Draggable list of enabled tabs -->
    <div v-if="enabledTabs.length > 0">
      <Draggable 
        v-model="state.selected.tabsForGroup" 
        v-bind="dragOptions()" 
        handle=".handler-tab"
        @end="handleDragEnd"
        item-key="_id"
      >
        <template #item="{element}">
          <AllTabRow
            :element="element"
            :key="element._id" 
          />
        </template>
      </Draggable>
    </div>
    <div v-else class="px-4 py-6 text-center text-gray-500 italic">
      No enabled tabs for this group
    </div>

    <!-- Disabled Tabs Section -->
    <div class="border-t border-gray-200">
      <div 
        @click="toggleDisabledSection" 
        class="flex items-center justify-between px-4 py-3 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
      >
        <h2 class="font-medium text-gray-700">Disabled Tabs ({{ disabledTabs.length }})</h2>
        <div class="text-gray-500">
          <ChevronDown v-if="showDisabledTabs" class="w-5 h-5" />
          <ChevronRight v-else class="w-5 h-5" />
        </div>
      </div>
      
      <!-- Collapsible section of disabled tabs -->
      <div v-if="showDisabledTabs">
        <div v-if="disabledTabs.length > 0">
          <div v-for="tab in disabledTabs" :key="tab._id">
            <AllTabRow :element="tab" />
          </div>
        </div>
        <div v-else class="px-4 py-6 text-center text-gray-500 italic">
          No disabled tabs for this group
        </div>
      </div>
    </div>

    <!-- Create New Tab Button -->
    <div class="border-t border-gray-200 p-4">
      <button 
        @click="handleCreateNew" 
        class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors border border-blue-800 shadow-sm"
      >
        + New Tab
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ChevronDown, ChevronRight } from 'lucide-vue-next';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import AllTabRow from './AllTabRow.vue';
import { useTabs } from '../composables/useTabs';
import { useDraggable } from '@/shared/composables/useDraggable';

const { Draggable, dragOptions } = useDraggable();
const { state } = useDashboardState();
const { createNewTab } = useTabs();
const showDisabledTabs = ref(false);

// Separate tabs into enabled and disabled based on current group
const enabledTabs = computed(() => state.selected.tabsForGroup);

const disabledTabs = computed(() => {
  const currentGroupId = state.selected.group?._id;
  if (!currentGroupId) return [];
  
  return state.allUserTabs
    .filter(tab => !tab.showForGroup.includes(currentGroupId))
    .sort((a, b) => a.tabName.localeCompare(b.tabName));
});

function toggleDisabledSection() {
  showDisabledTabs.value = !showDisabledTabs.value;
}

function handleCreateNew() {
  createNewTab();
}

onMounted(() => {
  window.scrollTo(0, 0);
});
</script> 