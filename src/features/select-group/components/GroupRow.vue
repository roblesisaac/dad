<template>
    <div :class="[
        'flex items-center text-left rounded-md mb-5 px-4 py-3 border-2 border-gray-800 shadow-[4px_4px_0px_#000] bg-white transition-all duration-200 hover:shadow-[2px_2px_0px_#000]',
        isSelected ? 'bg-purple-50 shadow-[2px_2px_0px_#6366f1] border-indigo-500 text-indigo-700' : ''
    ]">
        <!-- Left Actions Section -->
        <div class="flex-shrink-0 mr-3">
            <!-- Drag Handle -->
            <GripHorizontal class="w-5 h-5 cursor-grab active:cursor-grabbing hover:text-indigo-600 handler-group" />
        </div>
        
        <!-- Main Content Section -->
        <div class="flex-grow cursor-pointer pr-4" @click="selectGroup(element)">
            <!-- Element Name and Info -->
            <div class="flex flex-col">
                <!-- Element Name -->
                <div class="mb-1">
                    <span class="font-bold tracking-wide text-base">{{ element.name }}</span>
                </div>
                
                <!-- Account Type -->
                <div v-if="isDefaultName" class="mb-1">
                    <span class="text-sm text-gray-600">{{ accountInfo }}</span>
                </div>
                
                <!-- Custom Info -->
                <div v-if="element.info" class="mb-1">
                    <span class="text-sm text-gray-600">{{ element.info }}</span>
                </div>
                
                <!-- Element Group -->
                <div v-if="element.accounts.length > 1" class="flex items-center flex-wrap">
                    <span class="font-bold text-sm mr-1">Accts:</span>
                    <span v-for="(account, accountIndex) in element.accounts" :key="index" class="text-sm">
                        #{{ account.mask }}<span v-if="accountIndex < element.accounts.length - 1" class="font-bold mx-1">+</span>
                    </span>
                </div>
            </div>
        </div>
        
        <!-- Balances Section -->
        <div class="flex-shrink-0 text-right cursor-pointer min-w-[120px]" @click="selectGroup(element)">
            <!-- Current Balance -->
            <div v-if="element.accounts.length" class="font-bold">
                <NetWorth :accounts="element.accounts" :state="state" />
                <div class="text-xs text-gray-600 mt-1">Available Balance</div>
            </div>
            
            <!-- Available Balance -->
            <div v-if="element.totalAvailableBalance !== element.totalCurrentBalance" class="mt-2">
                <span :class="fontColor(element.totalAvailableBalance)">{{ formatPrice(element.totalAvailableBalance) }}</span>
                <div class="text-xs text-gray-600 mt-1">Current</div>
            </div>
        </div>
        
        <!-- Edit Button (Moved to right) -->
        <div class="flex-shrink-0 ml-2 self-start mt-1">
            <MoreHorizontal 
                @click="emit('edit-group', element)" 
                class="w-5 h-5 cursor-pointer hover:text-indigo-600 p-0.5 rounded-full hover:bg-gray-100" 
            />
        </div>
    </div>
</template>
    
<script setup>
import { computed, watch } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useEditGroup } from '../composables/useEditGroup';
import NetWorth from './NetWorth.vue';
import { MoreHorizontal, GripHorizontal } from 'lucide-vue-next';
import { fontColor, formatPrice } from '@/utils';

// define emits
const emit = defineEmits(['edit-group']);

const props = defineProps({
    element: Object
});

const { state } = useDashboardState();

const accountInfo = computed(() => state.allUserAccounts.find(
    account => account._id === props.element.accounts[0]?._id)?.subtype
);

const isSelected = computed(() => props.element.isSelected ? 'isSelected' : '');
const isDefaultName = computed(() => props.element.name === props.element.accounts[0]?.mask);

const { selectGroup, updateGroupSort } = useEditGroup();

watch(props.element, (newVal) => {
    updateGroupSort(newVal._id, newVal.sort);
});
</script>