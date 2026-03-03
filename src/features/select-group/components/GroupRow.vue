<template>
    <div
      ref="rowElement"
      :class="containerClasses"
      @click="handleSelectGroup(element)"
    >
        <!-- Selection indicator (left bar) -->
        <div
          v-if="isSelected && !editMode"
          :class="isDashboardVariant ? 'absolute left-0 top-0 bottom-0 w-1 bg-black' : 'absolute left-0 top-4 bottom-4 w-1 bg-black rounded-r-full'"
        ></div>

        <!-- Drag Handle / Edit Icon -->
        <div v-if="!isDashboardVariant || editMode" class="flex-shrink-0 flex items-center gap-2">
            <div v-if="editMode" class="handler-group text-gray-400">
                <GripVertical class="w-4 h-4" />
            </div>
            
            <button 
                v-if="!editMode && !isDashboardVariant"
                @click.stop="emit('edit-group', element)" 
                class="p-2 rounded-xl text-gray-300 hover:text-black hover:bg-gray-50 transition-colors"
                aria-label="Edit group"
            >
                <EllipsisVertical size="16" />
            </button>
        </div>
        
        <!-- Content Area -->
        <div :class="isDashboardVariant ? 'flex-1 min-w-0 flex items-center justify-between py-6' : 'flex-1 min-w-0 flex items-center justify-between'">
            <!-- Left side: Name and details -->
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <h3 :class="isDashboardVariant ? 'text-base font-black text-gray-900 truncate uppercase tracking-tight' : 'text-sm font-black text-gray-900 truncate uppercase tracking-tight'">
                        {{ displayName }}
                    </h3>
                    <span v-if="!isDashboardVariant && element.accounts.length > 1" class="text-[9px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        {{ element.accounts.length }} accounts
                    </span>
                </div>
                
                <div v-if="!isDashboardVariant" class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span v-if="isDefaultName" class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {{ accountInfo }}
                    </span>
                    
                    <span v-if="element.info" class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {{ element.info }}
                    </span>
                </div>
            </div>
            
            <!-- Right side: Balances -->
            <div class="flex-shrink-0 text-right flex flex-col items-end gap-1">
                <!-- Available Balance -->
                <div class="flex flex-col items-end leading-none">
                    <span :class="[isDashboardVariant ? 'text-base font-black tracking-tight' : 'text-base font-black tracking-tight', availableBalanceDisplay.color]">
                        {{ availableBalanceDisplay.value }}
                    </span>
                    <span v-if="!isDashboardVariant" class="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-1">Available</span>
                </div>
                
                <!-- Current Balance (Small) -->
                <div v-if="shouldShowCurrentBalance && !isDashboardVariant" class="flex items-center gap-1.5 pt-1 border-t border-gray-50">
                    <span class="text-[8px] font-black text-gray-300 uppercase tracking-widest">Current</span>
                    <span :class="['text-[10px] font-black', currentBalanceDisplay.color]">
                        {{ currentBalanceDisplay.value }}
                    </span>
                </div>
            </div>

            <div
              v-if="showDashboardActions"
              class="relative ml-3 flex-shrink-0"
              @click.stop
            >
              <button
                class="p-2 rounded-xl text-gray-300 hover:text-black hover:bg-gray-100 transition-all focus:outline-none opacity-0 group-hover:opacity-100"
                :class="{ 'opacity-100': showActionsMenu }"
                type="button"
                @click.stop="toggleActionsMenu"
              >
                <EllipsisVertical class="w-4 h-4" />
              </button>

              <div
                v-if="showActionsMenu"
                class="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.08)] z-40 min-w-[180px] py-1"
              >
                <button
                  v-for="option in actionOptions"
                  :key="option.action"
                  class="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-700 hover:text-black hover:bg-gray-50 transition-colors"
                  type="button"
                  @click.stop="handleRowAction(option.action)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
        </div>
        
        <!-- Selection Dot (Right) -->
        <div v-if="isSelected && !editMode && !isDashboardVariant" class="ml-4 flex-shrink-0">
            <div class="w-2 h-2 bg-black rounded-full"></div>
        </div>
        <div v-else-if="!editMode && !isDashboardVariant" class="ml-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight class="w-4 h-4 text-gray-200" />
        </div>
    </div>
</template>
    
<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useSelectGroup } from '../composables/useSelectGroup';
import { useBalanceDisplay } from '../composables/useBalanceDisplay';
import { EllipsisVertical, GripVertical, ChevronRight } from 'lucide-vue-next';

// Define emits
const emit = defineEmits(['edit-group', 'select-group', 'row-action']);

const props = defineProps({
    element: Object,
    variant: {
      type: String,
      default: 'modal'
    },
    editMode: {
        type: Boolean,
        default: false
    },
    showActions: {
      type: Boolean,
      default: false
    }
});

const { state } = useDashboardState();
const rowElement = ref(null);
const showActionsMenu = ref(false);
const elementRef = computed(() => props.element);
const { shouldShowCurrentBalance, availableBalanceDisplay, currentBalanceDisplay } = useBalanceDisplay(elementRef);
const isDashboardVariant = computed(() => props.variant === 'dashboard');
const isGroupEntry = computed(() => (props.element?.accounts?.length || 0) > 1);
const showDashboardActions = computed(() => {
  return isDashboardVariant.value && !props.editMode && props.showActions;
});
const actionOptions = computed(() => {
  if (isGroupEntry.value) {
    return [
      { action: 'rename-group', label: 'Rename Group' },
      { action: 'duplicate-group', label: 'Duplicate Group' },
      { action: 'remove-group', label: 'Remove Group' },
      { action: 'edit-accounts', label: 'Edit Accounts' }
    ];
  }

  return [
    { action: 'add-to-group', label: 'Add To Group' },
    { action: 'rename-account', label: 'Rename' }
  ];
});

const accountInfo = computed(() => {
    const account = state.allUserAccounts.find(
        account => account._id === props.element.accounts[0]?._id
    );
    
    return account?.subtype ? 
        account.subtype.charAt(0).toUpperCase() + account.subtype.slice(1) : 
        'Account';
});

const isSelected = computed(() => props.element.isSelected);
const isDefaultName = computed(() => props.element.name === props.element.accounts[0]?.mask);
const displayName = computed(() => {
  if (isDashboardVariant.value && props.element.accounts.length > 1) {
    return `${props.element.name} (${props.element.accounts.length})`;
  }

  return props.element.name;
});
const containerClasses = computed(() => {
  if (isDashboardVariant.value) {
    return [
      'relative group dashboard-row-bg hover:bg-[var(--theme-bg-soft)] transition-all duration-300 w-full',
      props.editMode ? 'cursor-move' : 'cursor-pointer',
      isSelected.value && !props.editMode ? 'bg-[var(--theme-bg-subtle)]' : ''
    ];
  }

  return [
    'flex items-center group-row-bg transition-all duration-300 py-4 relative group',
    isSelected.value
      ? 'selected-row-border z-10'
      : 'default-row-border',
    props.editMode ? 'edit-mode-row cursor-move' : 'cursor-pointer'
  ];
});

const { updateGroupSort } = useSelectGroup();

const handleSelectGroup = (group) => {
  if (showActionsMenu.value) {
    return;
  }

  if (props.editMode) return;
  
  emit('select-group', group);
};

function toggleActionsMenu() {
  showActionsMenu.value = !showActionsMenu.value;
}

function handleRowAction(action) {
  showActionsMenu.value = false;
  emit('row-action', { action, group: props.element });
}

function closeActionsMenuOnOutsideClick(event) {
  if (!showActionsMenu.value) {
    return;
  }

  if (!rowElement.value?.contains(event.target)) {
    showActionsMenu.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', closeActionsMenuOnOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closeActionsMenuOnOutsideClick);
});

watch(props.element, (newVal) => {
    updateGroupSort(newVal._id, newVal.sort);
});
</script>

<style scoped>
.dashboard-row-bg {
  background-color: var(--theme-bg);
}

.group-row-bg {
  background-color: var(--theme-bg);
}

.selected-row-border {
  border-left: 4px solid var(--theme-text);
}

.default-row-border {
  border-left: 4px solid transparent;
}

.edit-mode-row:hover {
  border-color: var(--theme-edit-row-border-hover);
  background-color: var(--theme-edit-row-bg-hover);
}

h3, span, div {
  color: var(--theme-text);
}

.text-gray-300, .text-gray-400, .text-gray-500 {
  color: var(--theme-text-soft);
}
</style>
