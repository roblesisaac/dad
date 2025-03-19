<template>
    <div :class="[
        'flex items-center bg-white transition-all duration-200',
        'border p-3 space-x-2',
        isSelected ? 'border-indigo-300 bg-indigo-50 shadow-indigo-100' : 'border-gray-200 hover:border-gray-300',
        editMode ? 'edit-mode-row' : ''
    ]">
        <!-- Drag Handle (only visible in edit mode) -->
        <div v-if="editMode" class="flex-shrink-0 handler-group text-blue-400">
            <GripVertical class="w-4 h-4 cursor-grab active:cursor-grabbing" />
        </div>
        
        <!-- Actions Menu (only visible when not in edit mode) -->
        <div v-if="!editMode" class="flex-shrink-0">
            <button 
                @click="emit('edit-group', element)" 
                class="p-1.5 rounded-full text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                aria-label="Edit group"
            >
                <Edit size="16" />
            </button>
        </div>
        
        <!-- Content Area (clickable for selection) -->
        <div 
            @click="handleSelectGroup(element)" 
            :class="[
                'flex-1 min-w-0 flex items-center',
                !editMode ? 'cursor-pointer' : ''
            ]"
        >
            <!-- Left side: Name and details -->
            <div class="flex-1 min-w-0">
                <!-- Group Name -->
                <h3 class="font-medium text-gray-900 truncate">
                    {{ element.name }}
                </h3>
                
                <!-- Account Type/Info -->
                <div class="mt-1 flex flex-col">
                    <span v-if="isDefaultName" class="text-xs text-gray-500">
                        {{ accountInfo }}
                    </span>
                    
                    <span v-if="element.info" class="text-xs text-gray-500">
                        {{ element.info }}
                    </span>
                    
                    <!-- Account numbers -->
                    <div v-if="element.accounts.length > 1" class="flex items-center flex-wrap mt-1">
                        <span class="text-xs font-medium text-gray-500 mr-1">Accounts:</span>
                        <div class="flex flex-wrap">
                            <span 
                                v-for="(account, accountIndex) in element.accounts" 
                                :key="account._id"
                                class="inline-flex items-center text-xs"
                            >
                                #{{ account.mask }}
                                <span v-if="accountIndex < element.accounts.length - 1" class="mx-1 text-gray-400">•</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Right side: Balance -->
            <div class="flex-shrink-0 text-right ml-4">
                <!-- Available Balance -->
                <div class="flex flex-col">
                    <span class="font-medium text-gray-900">
                        <NetBalance :accounts="element.accounts" :state="state" />
                    </span>
                    <span class="text-xs text-gray-500 mt-0.5">Available</span>
                </div>
                
                <!-- Current Balance -->
                <div v-if="element.totalAvailableBalance !== element.totalCurrentBalance" class="mt-1.5">
                    <span :class="['text-sm', fontColor(element.totalAvailableBalance)]">
                        {{ formatPrice(element.totalAvailableBalance) }}
                    </span>
                    <div class="text-xs text-gray-500 mt-0.5">Current</div>
                </div>
            </div>
        </div>
        
        <!-- Selection Chevron (only visible in normal mode) -->
        <div v-if="!editMode" class="flex-shrink-0">
            <ChevronRight class="w-4 h-4 text-gray-400" />
        </div>
    </div>
</template>
    
<script setup>
import { computed, watch } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useSelectGroup } from '../composables/useSelectGroup';
import NetBalance from './NetBalance.vue';
import { Edit, GripVertical, ChevronRight } from 'lucide-vue-next';
import { useUtils } from '@/shared/composables/useUtils';

// Define emits
const emit = defineEmits(['edit-group', 'select-group']);

const { fontColor, formatPrice } = useUtils();
const props = defineProps({
    element: Object,
    editMode: {
        type: Boolean,
        default: false
    }
});

const { state } = useDashboardState();

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
  
  // Emit the select-group event for the modal
  emit('select-group', group);
};

watch(props.element, (newVal) => {
    updateGroupSort(newVal._id, newVal.sort);
});
</script>

<style scoped>
.edit-mode-row:hover {
  border-color: #93c5fd; /* Light blue border for edit mode rows on hover */
  background-color: #f0f7ff; /* Very light blue background */
}
</style>