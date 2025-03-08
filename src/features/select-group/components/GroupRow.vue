<template>
    <div :class="[
        'flex items-center rounded-md bg-white transition-all duration-200',
        'border shadow-sm hover:shadow p-3 space-x-2',
        isSelected ? 'border-indigo-300 bg-indigo-50 shadow-indigo-100' : 'border-gray-200 hover:border-gray-300'
    ]">
        <!-- Drag Handle -->
        <div class="flex-shrink-0 handler-group">
            <GripVertical class="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing" />
        </div>
        
        <!-- Content Area (clickable for selection) -->
        <div 
            @click="handleSelectGroup(element)" 
            class="flex-1 min-w-0 flex items-center cursor-pointer"
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
                        <NetWorth :accounts="element.accounts" :state="state" />
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
        
        <!-- Actions Menu -->
        <div class="flex-shrink-0">
            <button 
                @click="emit('edit-group', element)" 
                class="p-1 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-gray-100"
                aria-label="Edit group"
            >
                <Edit size="16" />
            </button>
        </div>
    </div>
</template>
    
<script setup>
import { computed, watch } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useSelectGroup } from '../composables/useSelectGroup';
import NetWorth from './NetWorth.vue';
import { Edit, GripVertical } from 'lucide-vue-next';
import { useUtils } from '@/shared/composables/useUtils';

// Define emits
const emit = defineEmits(['edit-group', 'select-group']);

const { fontColor, formatPrice } = useUtils();
const props = defineProps({
    element: Object
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
  // Call the original selectGroup function
  // Emit the select-group event for the modal
  emit('select-group', group);
};

watch(props.element, (newVal) => {
    updateGroupSort(newVal._id, newVal.sort);
});
</script>