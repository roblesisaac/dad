<template>
  <div class="w-full bg-white">
    <div v-if="transactions.length">
      <div
        v-for="item in transactions"
        :key="item._id"
        class="relative group bg-white hover:bg-gray-50/50 transition-all duration-300"
      >
        <div v-if="itemIsSelected(item._id)" class="absolute left-0 top-0 bottom-0 w-1 bg-black z-20"></div>

        <button
          @click="selectTransaction(item)"
          class="w-full px-6 py-6 flex items-center justify-between text-left cursor-pointer focus:outline-none"
          type="button"
        >
          <div class="min-w-0 flex-1 pr-4">
            <div class="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">
              {{ transactionDate(item) }}
            </div>
            <div class="text-base font-black text-gray-900 uppercase tracking-tight truncate">
              {{ item.name }}
            </div>
            <div
              v-if="item.pending || item.check_number"
              class="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400"
            >
              <span v-if="item.pending">Pending</span>
              <span v-if="item.check_number">#{{ item.check_number }}</span>
            </div>
          </div>

          <div class="shrink-0 text-right">
            <span :class="[fontColor(item.amount), 'text-base font-black tracking-tight']">
              {{ formatPrice(item.amount, { toFixed: 0 }) }}
            </span>
          </div>
        </button>

        <div v-if="itemIsSelected(item._id)" class="border-t-2 border-gray-50 bg-gray-50/40">
          <TransactionDetails :state="state" :item="item" />
        </div>
      </div>
    </div>

    <div
      v-else
      class="py-12 text-center text-[10px] font-black uppercase tracking-widest text-gray-300"
    >
      No transactions in this category
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useUtils } from '@/shared/composables/useUtils';
import TransactionDetails from './TransactionDetails.vue';

const { state } = useDashboardState();
const { fontColor, formatPrice } = useUtils();

const transactions = computed(() => {
  const selectedCategoryName = state.selected.category;
  const categorizedItems = state.selected.tab?.categorizedItems || [];

  if (!selectedCategoryName) {
    return [];
  }

  const selectedCategory = categorizedItems.find(([categoryName]) => categoryName === selectedCategoryName);
  return Array.isArray(selectedCategory?.[1]) ? selectedCategory[1] : [];
});

function itemIsSelected(itemId) {
  return state.selected.transaction?._id === itemId;
}

function selectTransaction(item) {
  if (itemIsSelected(item._id)) {
    state.selected.transaction = false;
    return;
  }

  state.selected.transaction = item;
}

function transactionDate(item) {
  return item?.authorized_date || item?.date || '';
}
</script>
