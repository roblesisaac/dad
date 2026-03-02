<template>
  <div :class="containerClasses">
    <!-- Enabled Tabs Header -->
    <div class="px-6 py-5 bg-white border-b-2 border-gray-100 flex items-center justify-between">
      <h2 class="text-[10px] font-black uppercase tracking-widest text-black">Active Tabs</h2>
      <span class="text-[10px] font-black text-gray-300">{{ enabledTabs.length }} enabled</span>
    </div>
    
    <!-- List of active tabs -->
    <div class="py-2">
      <div v-if="enabledTabs.length > 0">
        <Draggable 
          v-if="isEditMode"
          v-model="state.selected.tabsForGroup" 
          v-bind="dragOptions" 
          handle=".handler-tab"
          @end="handleDragEnd"
          item-key="_id"
        >
          <template #item="{element}">
            <AllTabRow
              :element="element"
              :key="element._id" 
              :is-edit-mode="isEditMode"
              @tab-selected="handleTabSelected"
            />
          </template>
        </Draggable>
        
        <!-- Regular list -->
        <div v-else>
          <AllTabRow
            v-for="element in enabledTabs"
            :key="element._id"
            :element="element"
            :is-edit-mode="isEditMode"
            @tab-selected="handleTabSelected"
          />
        </div>
      </div>
      <div v-else class="py-12 text-center text-[10px] font-black uppercase tracking-widest text-gray-300">
        No enabled tabs
      </div>
    </div>

    <!-- Disabled Tabs Section -->
    <div class="py-4 border-t-2 border-gray-50">
      <button 
        @click="toggleDisabledSection" 
        class="flex items-center justify-between w-full mb-4 px-6 group focus:outline-none"
      >
        <div class="flex items-center gap-2">
          <h2 class="text-[10px] font-black uppercase tracking-widest text-black">Hidden Tabs</h2>
          <span class="text-[10px] font-black text-gray-300">{{ disabledTabs.length }}</span>
        </div>
        <div class="text-gray-300 group-hover:text-black transition-colors">
          <ChevronDown v-if="showDisabledTabs" class="w-4 h-4" />
          <ChevronRight v-else class="w-4 h-4" />
        </div>
      </button>
      
      <div v-if="showDisabledTabs">
        <AllTabRow 
          v-for="tab in disabledTabs"
          :key="tab._id"
          :element="tab"
          :is-edit-mode="isEditMode" 
          @tab-selected="handleTabSelected"
        />
        <div v-if="disabledTabs.length === 0" class="py-8 text-center text-[10px] font-black uppercase tracking-widest text-gray-300">
          No hidden tabs
        </div>
      </div>
    </div>

    <!-- Create New Tab Button -->
    <div class="p-6 bg-gray-50/30 border-t-2 border-gray-100">
      <button 
        @click="handleCreateNew" 
        class="w-full px-6 py-4 bg-black hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] flex items-center justify-center gap-2 active:shadow-none active:translate-y-0.5"
      >
        <span>+</span>
        New Tab
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

const props = defineProps({
  variant: {
    type: String,
    default: 'modal',
    validator: (value) => ['modal', 'dashboard'].includes(value)
  },
  isEditMode: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['tab-selected']);

const { Draggable, dragOptions } = useDraggable();
const { state } = useDashboardState();
const { createNewTab } = useTabs();
const showDisabledTabs = ref(false);
const isDashboardVariant = computed(() => props.variant === 'dashboard');
const containerClasses = computed(() => {
  if (isDashboardVariant.value) {
    return 'bg-white w-full border-2 border-gray-100 rounded-2xl overflow-hidden';
  }

  return 'bg-white max-h-[80vh] overflow-y-auto w-full';
});

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

function handleTabSelected(tab) {
  emit('tab-selected', tab);
}

// Handle drag end event
function handleDragEnd() {
  // Update tab ordering in the database
  state.selected.tabsForGroup.forEach((tab, index) => {
    if (tab.sort !== index) {
      tab.sort = index;
    }
  });
}

onMounted(() => {
  if (isDashboardVariant.value) {
    window.scrollTo(0, 0);
  }
});
</script> 
