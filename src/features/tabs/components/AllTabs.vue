<template>
  <div :class="containerClasses">
    <!-- Enabled Tabs Header -->
    <div
      v-if="!isDashboardVariant"
      class="py-5 bg-white border-b-2 border-gray-100 flex items-center justify-between"
    >
      <h2 class="text-[10px] font-black uppercase tracking-widest text-black">Active Tabs</h2>
      <span class="text-[10px] font-black text-black">{{ enabledTabs.length }} enabled</span>
    </div>
    
    <!-- List of active tabs -->
    <div v-if="enabledTabs.length > 0" :class="isDashboardVariant ? '' : 'py-2'">

      <div v-if="enabledTabs.length > 0">
        <Draggable 
          v-if="effectiveEditMode"
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
              :is-edit-mode="effectiveEditMode"
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
            :is-edit-mode="effectiveEditMode"
            @tab-selected="handleTabSelected"
          />
        </div>
      </div>
    </div>

    <!-- Disabled Tabs Section -->
    <div :class="isDashboardVariant ? '' : 'py-4'">
      <button 
        @click="toggleDisabledSection" 
        :class="isDashboardVariant
          ? 'flex items-center justify-between w-full py-6 hover:bg-gray-50/50 transition-colors group focus:outline-none'
          : 'flex items-center justify-between w-full mb-4 group focus:outline-none'"
      >
        <div class="flex items-center gap-2">
          <h2 :class="isDashboardVariant ? 'text-base font-black text-gray-900 uppercase tracking-tight' : 'text-[10px] font-black uppercase tracking-widest text-black'">Hidden Tabs</h2>
          <span :class="isDashboardVariant ? 'text-sm font-black text-black' : 'text-[10px] font-black text-black'">{{ disabledTabs.length }}</span>
        </div>
        <div class="text-black group-hover:text-black transition-colors">
          <ChevronUp v-if="showDisabledTabs" class="w-4 h-4" />
          <ChevronDown v-else class="w-4 h-4" />
        </div>
      </button>
      
      <div v-if="showDisabledTabs">
        <AllTabRow 
          v-for="tab in disabledTabs"
          :key="tab._id"
          :element="tab"
          :is-edit-mode="effectiveEditMode" 
          @tab-selected="handleTabSelected"
        />
        <div v-if="disabledTabs.length === 0" class="py-8 text-center text-[10px] font-black uppercase tracking-widest text-black">
          No hidden tabs
        </div>
      </div>
    </div>

    <!-- Create New Tab Button -->
    <div :class="isDashboardVariant ? '' : 'p-6 bg-gray-50/30 border-t-2 border-gray-100'">
      <button 
        @click="handleCreateNew" 
        :class="isDashboardVariant
          ? 'w-full py-6 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors group focus:outline-none'
          : 'w-full py-4 bg-black hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] flex items-center justify-center gap-2 active:shadow-none active:translate-y-0.5'"
      >
        <template v-if="isDashboardVariant">
          <span class="text-base font-black text-gray-900 uppercase tracking-tight">Create New Tab</span>
          <span class="text-black group-hover:text-black transition-colors text-lg leading-none">+</span>
        </template>
        <template v-else>
          <span>+</span>
          Create New Tab
        </template>
      </button>
    </div>
  </div>
  <button
  v-if="isDashboardVariant"
  class="w-full py-6 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors group focus:outline-none"
  @click="toggleDashboardReorder"
>
  <span class="text-base font-black text-gray-900 uppercase tracking-tight">
    {{ effectiveEditMode ? 'Done Rearranging' : 'Rearrange Tabs' }}
  </span>
  <GripVertical class="w-4 h-4 text-black group-hover:text-black transition-colors" />
</button>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-vue-next';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import AllTabRow from './AllTabRow.vue';
import { useTabs } from '../composables/useTabs';
import { useDraggable } from '@/shared/composables/useDraggable';
import { ALL_ACCOUNTS_GROUP_ID } from '@/features/dashboard/constants/groups.js';

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
const dashboardEditMode = ref(false);
const isDashboardVariant = computed(() => props.variant === 'dashboard');
const effectiveEditMode = computed(() => {
  return isDashboardVariant.value ? dashboardEditMode.value : props.isEditMode;
});
const containerClasses = computed(() => {
  if (isDashboardVariant.value) {
    return 'bg-white w-full';
  }

  return 'bg-white max-h-[80vh] overflow-y-auto w-full';
});

// Separate tabs into enabled and disabled based on current group
const enabledTabs = computed(() => state.selected.tabsForGroup);

const disabledTabs = computed(() => {
  if (state.selected.group?.isVirtualAllAccounts || state.selected.group?._id === ALL_ACCOUNTS_GROUP_ID) {
    return [];
  }

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

function toggleDashboardReorder() {
  if (!isDashboardVariant.value) return;
  dashboardEditMode.value = !dashboardEditMode.value;
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
