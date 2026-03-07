<template>
  <div class="w-full bg-white">
    <div v-if="transactions.length || hiddenItems.length">
      <div
        v-for="item in transactions"
        :key="item._id"
        class="relative group bg-[var(--theme-browser-chrome)] hover:bg-gray-50/50 transition-all duration-300"
      >

        <button
          @click="selectTransaction(item)"
          class="w-full px-6 py-6 bg-[var(--theme-browser-chrome)] flex items-center justify-between text-left cursor-pointer focus:outline-none"
          type="button"
        >
          <div class="min-w-0 flex-1 pr-4">
            <div class="text-[10px] font-black text-black uppercase tracking-widest mb-1">
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

      <HiddenItemsSection
        :items="hiddenItems"
        :with-horizontal-padding="true"
      />
    </div>

    <div
      v-else
      class="py-12 text-center text-[10px] font-black uppercase tracking-widest text-black"
    >
      No transactions in this category
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useUtils } from '@/shared/composables/useUtils';
import { NO_GROUPING_RULE_VALUE } from '@/features/tabs/utils/tabEvaluator.js';
import TransactionDetails from './TransactionDetails.vue';
import HiddenItemsSection from './HiddenItemsSection.vue';

const { state } = useDashboardState();
const { fontColor, formatPrice } = useUtils();

const transactions = computed(() => {
  const categorizedItems = state.selected.tab?.categorizedItems || [];
  const selectedCategoryName = state.selected.category
    || (state.selected.tab?.groupByMode === NO_GROUPING_RULE_VALUE
      ? categorizedItems[0]?.[0]
      : '');

  if (!selectedCategoryName) {
    return [];
  }

  const selectedCategory = categorizedItems.find(([categoryName]) => categoryName === selectedCategoryName);
  return Array.isArray(selectedCategory?.[1]) ? selectedCategory[1] : [];
});

const hiddenItems = computed(() => {
  const tabHiddenItems = state.selected.tab?.hiddenItems;
  return Array.isArray(tabHiddenItems) ? tabHiddenItems : [];
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
