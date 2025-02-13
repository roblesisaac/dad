<template>
  <div 
    :class="[
      'bg-white border-2 rounded-lg shadow-sm transition-all duration-200 p-4',
      isSelected ? 'border-blue-500 text-blue-700' : 'border-gray-200 hover:border-gray-300'
    ]"
  >
    <div class="flex items-start justify-between">
      <!-- Left Side -->
      <div class="flex-1">
        <!-- Header with Edit & Drag -->
        <div class="flex items-center justify-between mb-4">
          <MoreHorizontal 
            @click="editGroup(element)" 
            class="handlerGroup w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer" 
          />
          <GripHorizontal 
            class="handlerGroup w-5 h-5 text-gray-400 hover:text-gray-600 cursor-move" 
          />
        </div>

        <!-- Group Info -->
        <div class="space-y-2 cursor-pointer" @click="selectGroup(element)">
          <div class="font-bold text-lg">{{ element.name }}</div>
          
          <div v-if="isDefaultName" class="text-sm text-gray-600 capitalize">
            {{ accountInfo }}
          </div>

          <div v-if="element.info" class="text-sm text-gray-600">
            {{ element.info }}
          </div>

          <div v-if="element.accounts.length > 1" class="text-sm">
            <span class="font-medium">Accounts: </span>
            <span v-for="(account, accountIndex) in element.accounts" :key="account._id">
              #{{ account.mask }}
              <span v-if="accountIndex < element.accounts.length - 1" class="font-bold">+</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Right Side - Balances -->
      <div class="text-right cursor-pointer" @click="selectGroup(element)">
        <div v-if="element.accounts.length" class="space-y-1">
          <div class="font-bold">
            <NetWorth :accounts="element.accounts" :state="state" />
          </div>
          <div class="text-sm text-gray-600">Available Balance</div>
        </div>

        <div v-if="element.totalAvailableBalance !== element.totalCurrentBalance">
          <div :class="[fontColor(element.totalAvailableBalance)]">
            {{ formatPrice(element.totalAvailableBalance) }}
          </div>
          <div class="text-sm text-gray-600">Current</div>
        </div>
      </div>
    </div>
  </div>
</template>
    
<script setup>
import { computed } from 'vue';
import NetWorth from './NetWorth.vue';
import { MoreHorizontal, GripHorizontal } from 'lucide-vue-next';
import { fontColor, formatPrice } from '@/utils';
import { useAppStore } from '@/stores/state';

const { api } = useAppStore();

const props = defineProps({
    element: Object,
    app: Object,
    state: Object
});

const accountInfo = computed(() => props.state.allUserAccounts.find(
    account => account._id === props.element.accounts[0]?._id)?.subtype
);

const isSelected = computed(() => props.element.isSelected ? 'isSelected' : '');
const isDefaultName = computed(() => props.element.name === props.element.accounts[0]?.mask);

// Extract methods from props.app for cleaner template usage
const { editGroup, selectGroup } = props.app;

</script>
    
<style>
.group-row {
    background-color: #fff;
    margin-bottom: 20px;
    border: 1px solid #000;
    box-shadow: 3px 3px #000;
    padding: 0 5px 15px 15px;
    border-radius: 3px;
}
.group-row.isSelected {
    background-color: whitesmoke;
    box-shadow: 1px 1px blue;
    border: 1px solid blue;
    color: blue
}
</style>