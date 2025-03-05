<template>
  <div class="flex w-full bg-gray-200 border-b-2 border-black">
    <!-- Active Tab Display -->
    <div class="flex-grow flex items-center">
      <div class="flex items-center px-4 py-2.5">
        <button @click="router.push({ name: 'edit-tab' })" class="mr-3 text-blue-600 hover:text-blue-800">
          <MoreVertical size="16" />
        </button>
        <div class="flex items-center">
          <span class="font-bold text-gray-800 truncate leading-tight">{{ state.selected.tab?.tabName || 'No tab selected' }}</span>
          <span v-if="state.selected.tab" class="font-bold leading-tight ml-2" :class="fontColor(state.selected.tab.total)">{{ tabTotal }}</span>
        </div>
      </div>
    </div>

    <!-- All tabs dropdown button -->
    <div class="w-12 flex-shrink-0">
      <button 
        @click="router.push({ name: 'all-tabs' })" 
        class="h-full w-full bg-black flex items-center justify-center text-white hover:text-gray-100"
      >
        <ChevronDown size="16" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useDashboardState } from '../composables/useDashboardState';
import { ChevronDown, MoreVertical } from 'lucide-vue-next';
import { useUtils } from '@/shared/composables/useUtils';
import { computed } from 'vue';

const router = useRouter();
const { state } = useDashboardState();
const { fontColor, formatPrice } = useUtils();

const tabTotal = computed(() => {
  const tab = state.selected.tab;
  if (!tab) return '';
  
  const total = tab.total || 0;
  return formatPrice(total, { toFixed: 2 });
});
</script> 