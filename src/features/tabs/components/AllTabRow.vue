<template>
<div
  ref="rowElement"
  class="relative bg-white transition-all duration-300 w-full group shrink-0"
  @click.stop="!isEditMode && isEnabled && selectTabAndGoBack(element)"
  :class="[
    !isEditMode && isEnabled ? 'cursor-pointer hover:bg-gray-50/50' : 'opacity-60 grayscale',
    isActiveTab && !isEditMode ? 'bg-gray-50/30 active-z-index' : ''
  ]"
>
  <!-- Active Tab Indicator (Left Bar) -->
  <div v-if="isActiveTab && !isEditMode" class="absolute top-0 bottom-0 bg-black"></div>

  <div class="flex items-center justify-between py-5 w-full">
    <div class="flex items-center min-w-0 flex-1">
      <!-- Drag Handle -->
      <div v-if="isEditMode && isEnabled" class="handler-tab cursor-grab text-black mr-4" @mousedown.stop>
        <GripVertical size="18" />
      </div>
      
      <!-- Tab Info -->
      <div class="flex flex-col min-w-0">
        <h3 class="text-base font-black text-gray-900 truncate uppercase tracking-tight">
          {{ element.tabName }}
        </h3>
        <div v-if="element.description" class="text-[10px] font-black text-black uppercase tracking-widest mt-1 truncate">
          {{ element.description }}
        </div>
      </div>
    </div>
    
    <!-- Right side: Total & Actions -->
    <div class="flex items-center gap-4 ml-4 shrink-0">
      <!-- Total Display -->
      <div v-if="element.total !== undefined && !isEditMode" class="text-right">
        <span class="text-base font-black tracking-tight" :class="fontColor(element.total)">
          {{ formatPrice(element.total, { toFixed: 0 }) }}
        </span>
      </div>

      <div
        v-if="showInlineActions"
        class="relative"
        @click.stop
      >
        <button
          class="p-2 rounded-xl text-black hover:text-black hover:bg-gray-100 transition-all focus:outline-none opacity-0 group-hover:opacity-100"
          :class="{ 'opacity-100': showActionsMenu }"
          type="button"
          aria-label="Tab actions"
          @click.stop="toggleActionsMenu"
        >
          <EllipsisVertical class="w-4 h-4" />
        </button>

        <div
          v-if="showActionsMenu"
          class="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.08)] z-40 min-w-[150px] py-1"
        >
          <button
            class="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-700 hover:text-black hover:bg-gray-50 transition-colors"
            type="button"
            @click.stop="openTabEditor"
          >
            Edit Tab
          </button>
        </div>
      </div>

      <!-- Edit/Toggle (Edit Mode) -->
      <div v-if="isEditMode || !isEnabled" class="flex items-center gap-3">
        <button 
          v-if="isEnabled"
          @click.stop="editTab" 
          class="p-2 rounded-xl text-black hover:text-black hover:bg-gray-50 transition-colors"
          title="Edit tab rules"
        >
          <Settings size="16" />
        </button>
        
        <div @click.stop>
          <Switch 
            :model-value="isEnabled"
            :id="`toggle-${element._id}`"
            @update:model-value="toggleTabVisibility(element._id)"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Rule Manager Modal -->
  <RuleManagerModal
    :is-open="showRuleManagerModal"
    @close="showRuleManagerModal = false"
  />
</div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { GripVertical, Settings, EllipsisVertical } from 'lucide-vue-next';
import { useUtils } from '@/shared/composables/useUtils';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useTabs } from '../composables/useTabs';
import RuleManagerModal from '@/features/rule-manager/components/RuleManagerModal.vue';
import Switch from '@/shared/components/Switch.vue';
import {
  ALL_ACCOUNTS_GROUP_ID,
  ALL_ACCOUNTS_HIDDEN_GROUP_ID
} from '@/features/dashboard/constants/groups.js';

const { fontColor, formatPrice } = useUtils();
const { state } = useDashboardState();
const { toggleTabForGroup, selectTab, updateTabSort } = useTabs();

const rowElement = ref(null);
const showRuleManagerModal = ref(false);
const showActionsMenu = ref(false);

const props = defineProps({
  element: {
    type: Object,
    required: true
  },
  isEditMode: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'modal',
    validator: (value) => ['modal', 'dashboard'].includes(value)
  }
});

const emit = defineEmits(['tab-selected']);

// Determine if this is the active tab
const isActiveTab = computed(() => {
  return state.selected.tab?._id === props.element._id;
});

// Determine if this tab is enabled for the current group
const isAllAccountsScope = computed(() => {
  return state.selected.group?.isVirtualAllAccounts || state.selected.group?._id === ALL_ACCOUNTS_GROUP_ID;
});

const toggleTargetGroupId = computed(() => {
  if (isAllAccountsScope.value) {
    return ALL_ACCOUNTS_HIDDEN_GROUP_ID;
  }

  return state.selected.group?._id || '';
});

const isEnabled = computed(() => {
  const showForGroup = Array.isArray(props.element.showForGroup) ? props.element.showForGroup : [];

  if (isAllAccountsScope.value) {
    return !showForGroup.includes(ALL_ACCOUNTS_HIDDEN_GROUP_ID);
  }

  const currentGroupId = state.selected.group?._id;
  if (!currentGroupId) return false;
  return showForGroup.includes(currentGroupId);
});

const showInlineActions = computed(() => {
  return props.variant === 'dashboard' && !props.isEditMode;
});

function toggleActionsMenu() {
  showActionsMenu.value = !showActionsMenu.value;
}

async function openTabEditor() {
  showActionsMenu.value = false;
  await editTab();
}

function closeActionsMenuOnOutsideClick(event) {
  if (!showActionsMenu.value) return;

  if (!rowElement.value?.contains(event.target)) {
    showActionsMenu.value = false;
  }
}

async function editTab() {
  showActionsMenu.value = false;
  await selectTab(props.element);
  showRuleManagerModal.value = true;
}

// Select the tab and go back to dashboard
function selectTabAndGoBack(tab) {
  showActionsMenu.value = false;

  if (isEnabled.value) {
    selectTab(tab);
    emit('tab-selected', tab);
  } else {
    // If the tab is disabled, toggle it on first, then select it
    const currentGroupId = toggleTargetGroupId.value;
    if (currentGroupId) {
      toggleTabForGroup(tab._id, currentGroupId);
      // Short delay to allow the toggle to complete before selecting
      setTimeout(() => {
        selectTab(tab);
        emit('tab-selected', tab);
      }, 100);
    }
  }
}

// Toggle tab for current group
function toggleTabVisibility(tabId) {
  const currentGroupId = toggleTargetGroupId.value;
  if (!currentGroupId) return;
  
  // Call the toggleTabForGroup function from useTabs composable
  toggleTabForGroup(tabId, currentGroupId);
}

watch(() => props.isEditMode, (isEditMode) => {
  if (isEditMode) {
    showActionsMenu.value = false;
  }
});

watch(() => props.element.sort, (newSort) => {
  updateTabSort(props.element._id, newSort);
});

onMounted(() => {
  document.addEventListener('click', closeActionsMenuOnOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closeActionsMenuOnOutsideClick);
});
</script>
