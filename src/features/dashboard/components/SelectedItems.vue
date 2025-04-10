<template>
  <div v-if="items.length" class="p-5 bg-gray-50 rounded-lg shadow-inner">
    <div class="space-y-4">
      <div 
        v-for="(item, i) in items"
        :key="item._id"
        :class="[
          'bg-white rounded-md shadow-sm transition-all duration-200',
          itemIsSelected(item._id) ? 'border-l-4 border-indigo-500' : 'hover:shadow-md'
        ]" 
      >
        <div class="w-full">
          <!-- Transaction Header -->
          <div 
            @click="selectTransaction(item)" 
            class="grid grid-cols-12 p-3 cursor-pointer"
          >
            <!-- Logo section -->
            <div class="col-span-2 flex items-center justify-center">
              <div class="bg-gray-100 rounded-full p-2 flex items-center justify-center">
                <img v-if="item.logo_url" :src="item.logo_url" class="h-8 w-8 object-contain" alt="Logo" />
                <img v-else :src="'/chart.svg'" class="h-8 w-8 object-contain" />
              </div>
            </div>
            
            <!-- Info section -->
            <div class="col-span-7 flex flex-col justify-center">
              <div class="text-xs text-emerald-600 font-medium">
                {{ formatDateTime(item.authorized_datetime) || item.authorized_date }}
              </div>
              <div class="text-gray-800 font-medium text-transform-capitalize">
                {{ item.name }} <span v-if="item.check_number?.length" class="text-gray-500 text-sm">#{{ item.check_number }}</span>
              </div>
              <div v-if="item.pending" class="text-xs text-gray-500 mt-1">
                <span class="inline-flex items-center">
                  <span class="h-2 w-2 rounded-full bg-amber-400 mr-1"></span>
                  Pending
                </span>
              </div>
            </div>
            
            <!-- Amount section -->
            <div class="col-span-3 flex flex-col items-end justify-center">
              <div :class="['font-semibold text-right', fontColor(item.amount)]">
                {{ formatPrice(item.amount) }}
              </div>
              <div class="text-xs text-gray-500 mt-1">#{{ i + 1 }}</div>
            </div>

            <!-- Expand/Collapse indicator -->
            <div class="absolute right-4">
              <ChevronDown v-if="itemIsSelected(item._id)" class="w-5 h-5 text-gray-400" />
              <ChevronRight v-else class="w-5 h-5 text-gray-400" />
            </div>
          </div>

          <!-- Expanded Transaction -->
          <TransactionDetails v-if="itemIsSelected(item._id)" :state="state" :item="item" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import TransactionDetails from './TransactionDetails.vue';
import { useUtils } from '@/shared/composables/useUtils';
import { ChevronDown, ChevronRight } from 'lucide-vue-next';

const { fontColor, formatPrice } = useUtils();
const { categoryName, state } = defineProps({
  categoryName: String,
  state: Object
});

function formatDateTime(datetimeStr) {
  if (!datetimeStr) return '';
  
  try {
    const date = new Date(datetimeStr);
    
    // Format the date in user's local timezone
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      // Display in user's local timezone instead of forcing PST
      // This matches what the user would expect based on when they made the transaction
    }).format(date);
  } catch (err) {
    return '';
  }
}

const items = computed(() => {
  const selectedCategory = state.selected.tab.categorizedItems.find(categorized => {
    return state.selected.tab.categoryName === categorized[0];
  });

  return selectedCategory[1];
});

function itemIsSelected(itemId) {
  if (!state.selected.transaction) {
    return;
  }

  return state.selected.transaction._id === itemId;
};

const ifSelectedClass = (itemId) => {
  return itemIsSelected(itemId) ? 'transaction-selected' : '';
};

function selectTransaction(item) {
  if (itemIsSelected(item._id)) {
    state.selected.transaction = false;
    return;
  }

  state.selected.transaction = item;
}

</script>