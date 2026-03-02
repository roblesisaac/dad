<template>
    <div :class="[
        'flex items-center bg-white transition-all duration-300',
        'border-2 px-4 py-4 rounded-2xl relative group',
        isSelected 
            ? 'border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] z-10' 
            : 'border-gray-50 hover:border-gray-200',
        editMode ? 'edit-mode-row cursor-move' : 'cursor-pointer'
    ]"
    @click="handleSelectGroup(element)"
    >
        <!-- Selection indicator (left bar) -->
        <div v-if="isSelected && !editMode" class="absolute left-0 top-4 bottom-4 w-1 bg-black rounded-r-full"></div>

        <!-- Drag Handle / Edit Icon -->
        <div class="flex-shrink-0 flex items-center gap-2">
            <div v-if="editMode" class="handler-group text-gray-400">
                <GripVertical class="w-4 h-4" />
            </div>
            
            <button 
                v-if="!editMode"
                @click.stop="emit('edit-group', element)" 
                class="p-2 rounded-xl text-gray-300 hover:text-black hover:bg-gray-50 transition-colors"
                aria-label="Edit group"
            >
                <EllipsisVertical size="16" />
            </button>
        </div>
        
        <!-- Content Area -->
        <div class="flex-1 min-w-0 flex items-center justify-between">
            <!-- Left side: Name and details -->
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <h3 class="text-sm font-black text-gray-900 truncate uppercase tracking-tight">
                        {{ element.name }}
                    </h3>
                    <span v-if="element.accounts.length > 1" class="text-[9px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        {{ element.accounts.length }} accounts
                    </span>
                </div>
                
                <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
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
                    <span :class="['text-base font-black tracking-tight', availableBalanceDisplay.color]">
                        {{ availableBalanceDisplay.value }}
                    </span>
                    <span class="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-1">Available</span>
                </div>
                
                <!-- Current Balance (Small) -->
                <div v-if="shouldShowCurrentBalance" class="flex items-center gap-1.5 pt-1 border-t border-gray-50">
                    <span class="text-[8px] font-black text-gray-300 uppercase tracking-widest">Current</span>
                    <span :class="['text-[10px] font-black', currentBalanceDisplay.color]">
                        {{ currentBalanceDisplay.value }}
                    </span>
                </div>
            </div>
        </div>
        
        <!-- Selection Dot (Right) -->
        <div v-if="isSelected && !editMode" class="ml-4 flex-shrink-0">
            <div class="w-2 h-2 bg-black rounded-full"></div>
        </div>
        <div v-else-if="!editMode" class="ml-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight class="w-4 h-4 text-gray-200" />
        </div>
    </div>
</template>
    
<script setup>
import { computed, watch } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useSelectGroup } from '../composables/useSelectGroup';
import { useBalanceDisplay } from '../composables/useBalanceDisplay';
import NetBalance from './NetBalance.vue';
import { EllipsisVertical, GripVertical, ChevronRight } from 'lucide-vue-next';

// Define emits
const emit = defineEmits(['edit-group', 'select-group']);

const props = defineProps({
    element: Object,
    editMode: {
        type: Boolean,
        default: false
    }
});

const { state } = useDashboardState();
const elementRef = computed(() => props.element);
const { shouldShowCurrentBalance, availableBalanceDisplay, currentBalanceDisplay } = useBalanceDisplay(elementRef);

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

const { updateGroupSort } = useSelectGroup();

const handleSelectGroup = (group) => {
  if (props.editMode) return;
  
  emit('select-group', group);
};

watch(props.element, (newVal) => {
    updateGroupSort(newVal._id, newVal.sort);
});
</script>

<style scoped>
.edit-mode-row:hover {
  border-color: var(--theme-edit-row-border-hover);
  background-color: var(--theme-edit-row-bg-hover);
}
</style>
