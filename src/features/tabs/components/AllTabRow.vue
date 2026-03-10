<template>
<div
  ref="rowElement"
  class="relative bg-[var(--theme-browser-chrome)] transition-colors duration-150 w-full group shrink-0 select-none"
  @click.stop="handleRowClick"
  @mousedown="handleRowMouseDown"
  @mousemove="handleRowMouseMove"
  @mouseup="handleRowMouseUp"
  @mouseleave="handleRowMouseLeave"
  @touchstart.passive="handleRowTouchStart"
  @touchmove.passive="handleRowTouchMove"
  @touchend="handleRowTouchEnd"
  @touchcancel="clearLongPressTimer"
  :class="[
    !isEnabled ? 'opacity-60 grayscale' : '',
    !isEditMode && isEnabled ? 'cursor-pointer' : '',
    isEditMode && isEnabled ? 'cursor-move' : '',
    isActiveTab && !isEditMode ? 'bg-[var(--theme-bg-soft)] active-z-index' : ''
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
        <div class="flex items-center gap-1 min-w-0">
          <h3 class="text-base font-black text-gray-900 truncate uppercase tracking-tight min-w-0 flex-1">
            {{ element.tabName }}
          </h3>

          <div
            v-if="showInlineActions"
            class="relative shrink-0"
            @click.stop
          >
            <button
              class="tab-row-menu-trigger p-2 rounded-xl text-black hover:text-black hover:bg-gray-100 transition-all focus:outline-none"
              :class="{ 'tab-row-menu-trigger-visible': showActionsMenu || showLongPressActions }"
              type="button"
              aria-label="Tab actions"
              @click.stop="toggleActionsMenu"
            >
              <EllipsisVertical class="w-4 h-4" />
            </button>

            <div
              v-if="showActionsMenu"
              class="absolute left-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.08)] z-40 min-w-[150px] py-1"
            >
              <button
                v-if="isEnabled"
                class="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-700 hover:text-black hover:bg-gray-50 transition-colors"
                type="button"
                @click.stop="startTabReorderModeFromMenu"
              >
                Rearrange Row
              </button>

              <button
                class="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-700 hover:text-black hover:bg-gray-50 transition-colors"
                type="button"
                @click.stop="openTabEditor"
              >
                Edit Tab
              </button>

              <button
                v-if="isEnabled"
                class="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-700 hover:text-black hover:bg-gray-50 transition-colors"
                type="button"
                @click.stop="hideTabForCurrentGroup"
              >
                Hide Tab For Group
              </button>
            </div>
          </div>
        </div>
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

      <button
        v-if="showNevermindButton"
        type="button"
        class="px-3 py-2 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black hover:border-black transition-colors"
        @click.stop="cancelEditMode"
      >
        Nevermind
      </button>

      <!-- Edit/Toggle (Edit Mode) -->
      <div v-else-if="showEditControls" class="flex items-center gap-3">
        <button 
          v-if="isEnabled"
          @click.stop="editTab" 
          class="p-2 rounded-xl text-black hover:text-black hover:bg-gray-50 transition-colors"
          title="Edit tab"
        >
          <EllipsisVertical size="16" />
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
    v-if="showRuleManagerModal"
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
const { toggleTabForGroup, selectTab } = useTabs();

const rowElement = ref(null);
const showRuleManagerModal = ref(false);
const showActionsMenu = ref(false);
const showLongPressActions = ref(false);
const suppressNextRowClick = ref(false);
const longPressTimeoutId = ref(null);
const longPressStart = ref({ x: 0, y: 0 });

const LONG_PRESS_DURATION_MS = 450;
const LONG_PRESS_MOVE_THRESHOLD_PX = 8;

const props = defineProps({
  element: {
    type: Object,
    required: true
  },
  isEditMode: {
    type: Boolean,
    default: false
  },
  showCancelEditButton: {
    type: Boolean,
    default: false
  },
  reorderResetToken: {
    type: Number,
    default: 0
  },
  variant: {
    type: String,
    default: 'modal',
    validator: (value) => ['modal', 'dashboard'].includes(value)
  }
});

const emit = defineEmits(['tab-selected', 'request-reorder-mode', 'tab-actions-clicked', 'cancel-edit-mode']);

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
  return showForGroup.includes(currentGroupId) || showForGroup.includes('_GLOBAL');
});

const showInlineActions = computed(() => {
  return props.variant === 'dashboard' && (!props.isEditMode || showLongPressActions.value);
});
const showNevermindButton = computed(() => {
  return props.variant === 'dashboard' && props.isEditMode && props.showCancelEditButton;
});
const showEditControls = computed(() => {
  if (props.variant === 'dashboard' && props.isEditMode) {
    return false;
  }

  return props.isEditMode || !isEnabled.value;
});

function toggleActionsMenu() {
  emit('tab-actions-clicked');
  showActionsMenu.value = !showActionsMenu.value;
}

function startTabReorderModeFromMenu() {
  if (!isEnabled.value) return;

  showActionsMenu.value = false;
  showLongPressActions.value = true;
  suppressNextRowClick.value = true;
  emit('request-reorder-mode', props.element._id);
}

function clearLongPressTimer() {
  if (longPressTimeoutId.value) {
    clearTimeout(longPressTimeoutId.value);
    longPressTimeoutId.value = null;
  }
}

function triggerLongPress() {
  showLongPressActions.value = true;
  suppressNextRowClick.value = true;
  if (isEnabled.value) {
    emit('request-reorder-mode', props.element._id);
  }
}

function shouldIgnoreLongPressTarget(event) {
  const target = event?.target;
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest('button, input, select, textarea, a, label'));
}

function handleRowTouchStart(event) {
  if (!showInlineActions.value || props.isEditMode) return;

  const touch = event.touches?.[0];
  if (!touch) return;
  if (shouldIgnoreLongPressTarget(event)) return;

  longPressStart.value = { x: touch.clientX, y: touch.clientY };
  suppressNextRowClick.value = false;
  clearLongPressTimer();

  longPressTimeoutId.value = setTimeout(() => {
    triggerLongPress();
    longPressTimeoutId.value = null;
  }, LONG_PRESS_DURATION_MS);
}

function handleRowTouchMove(event) {
  if (!longPressTimeoutId.value) return;

  const touch = event.touches?.[0];
  if (!touch) return;

  const deltaX = Math.abs(touch.clientX - longPressStart.value.x);
  const deltaY = Math.abs(touch.clientY - longPressStart.value.y);

  if (deltaX > LONG_PRESS_MOVE_THRESHOLD_PX || deltaY > LONG_PRESS_MOVE_THRESHOLD_PX) {
    clearLongPressTimer();
  }
}

function handleRowTouchEnd() {
  clearLongPressTimer();
}

function handleRowMouseDown(event) {
  if (!showInlineActions.value || props.isEditMode) return;
  if (event.button !== 0) return;
  if (shouldIgnoreLongPressTarget(event)) return;

  longPressStart.value = { x: event.clientX, y: event.clientY };
  suppressNextRowClick.value = false;
  clearLongPressTimer();

  longPressTimeoutId.value = setTimeout(() => {
    triggerLongPress();
    longPressTimeoutId.value = null;
  }, LONG_PRESS_DURATION_MS);
}

function handleRowMouseMove(event) {
  if (!longPressTimeoutId.value) return;

  const deltaX = Math.abs(event.clientX - longPressStart.value.x);
  const deltaY = Math.abs(event.clientY - longPressStart.value.y);

  if (deltaX > LONG_PRESS_MOVE_THRESHOLD_PX || deltaY > LONG_PRESS_MOVE_THRESHOLD_PX) {
    clearLongPressTimer();
  }
}

function handleRowMouseUp() {
  clearLongPressTimer();
}

function handleRowMouseLeave() {
  clearLongPressTimer();
}

function handleRowClick() {
  if (suppressNextRowClick.value) {
    suppressNextRowClick.value = false;
    return;
  }

  if (!props.isEditMode && isEnabled.value) {
    selectTabAndGoBack(props.element);
  }
}

async function openTabEditor() {
  showActionsMenu.value = false;
  showLongPressActions.value = false;
  await editTab();
}

function closeActionsMenuOnOutsideClick(event) {
  if (!showActionsMenu.value && !showLongPressActions.value) return;

  if (!rowElement.value?.contains(event.target)) {
    showActionsMenu.value = false;
    showLongPressActions.value = false;
  }
}

async function editTab() {
  showActionsMenu.value = false;
  showLongPressActions.value = false;
  await selectTab(props.element);
  showRuleManagerModal.value = true;
}

async function hideTabForCurrentGroup() {
  showActionsMenu.value = false;
  showLongPressActions.value = false;
  if (!isEnabled.value) return;

  const currentGroupId = toggleTargetGroupId.value;
  if (!currentGroupId) return;

  await toggleTabForGroup(props.element._id, currentGroupId);
}

function cancelEditMode() {
  showActionsMenu.value = false;
  showLongPressActions.value = false;
  emit('cancel-edit-mode');
}

// Select the tab and go back to dashboard
function selectTabAndGoBack(tab) {
  showActionsMenu.value = false;
  showLongPressActions.value = false;

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
    clearLongPressTimer();
    return;
  }

  showLongPressActions.value = false;
});

watch(() => props.reorderResetToken, () => {
  showActionsMenu.value = false;
  showLongPressActions.value = false;
});

onMounted(() => {
  document.addEventListener('click', closeActionsMenuOnOutsideClick);
});

onBeforeUnmount(() => {
  clearLongPressTimer();
  document.removeEventListener('click', closeActionsMenuOnOutsideClick);
});
</script>

<style scoped>
.tab-row-menu-trigger {
  opacity: 0;
  pointer-events: none;
}

.tab-row-menu-trigger:focus-visible,
.tab-row-menu-trigger-visible {
  opacity: 1;
  pointer-events: auto;
}

@media (hover: hover) and (pointer: fine) {
  .group:hover .tab-row-menu-trigger {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
