<template>
  <BaseModal
    :is-open="isModalOpen"
    title="Account Reconnection Required"
    size="lg"
    @close="handleClose"
  >
    <template #content>
      <div class="w-full">
        <div class="text-center mb-8">
          <p class="text-gray-700">Some of your accounts need to be reconnected to continue syncing transactions.</p>
        </div>

        <div v-if="state.syncedItems.length" class="space-y-4">
          <div 
            v-for="item in state.syncedItems" 
            :key="item.item_id" 
            class="border-2 border-black p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            :class="{ 'bg-red-50': item.error, 'bg-gray-50': !item.error }"
          >
            <div class="flex-grow">
              <div class="font-bold text-lg mb-1">
                {{ item.institution_name || item.institution_id }}
              </div>
              <div v-if="item.error" class="flex items-center text-red-600 text-sm">
                <LucideAlertCircle class="w-4 h-4 mr-1" />
                {{ getErrorMessage(item.error) }}
              </div>
              <div v-else class="flex items-center text-green-600 text-sm">
                <LucideCheckCircle2 class="w-4 h-4 mr-1" />
                Connected
              </div>
            </div>
            
            <div>
              <button 
                @click="repairItem(item.item_id)" 
                :class="[
                  'px-4 py-2 border-2 border-black font-medium shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] transition-all duration-200',
                  item.error ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
                ]"
                :disabled="state.isRepairing"
              >
                <div class="flex items-center">
                  <LucideRefreshCw v-if="!state.isRepairing" class="w-4 h-4 mr-2" />
                  <LucideLoader v-else class="w-4 h-4 mr-2 animate-spin" />
                  {{ item.error ? 'Repair Connection' : 'Reconnect' }}
                </div>
              </button>
            </div>
          </div>
        </div>

        <div v-if="state.error" class="mt-6 p-4 bg-red-100 border-2 border-red-600 text-red-700 flex items-center">
          <LucideAlertCircle class="w-5 h-5 mr-2 flex-shrink-0" />
          <span>{{ state.error }}</span>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue';
import { usePlaidIntegration } from '../composables/usePlaidIntegration.js';
import BaseModal from '@/shared/components/BaseModal.vue';
import {
  LucideAlertCircle,
  LucideCheckCircle2,
  LucideRefreshCw,
  LucideLoader
} from 'lucide-vue-next';

const isModalOpen = ref(true);

const {
  state,
  getErrorMessage,
  repairItem
} = usePlaidIntegration();

const handleClose = () => {
  isModalOpen.value = false;
  console.log('Modal closed');
};
</script>