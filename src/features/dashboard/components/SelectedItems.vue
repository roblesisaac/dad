<template>
  <div v-if="items.length" class="space-y-3">
    <div 
      v-for="(item, i) in items"
      :key="item._id"
      class="bg-white rounded-2xl border-2 transition-all duration-300 relative overflow-hidden"
      :class="[
        itemIsSelected(item._id) 
          ? 'border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]' 
          : 'border-gray-100 hover:border-gray-200'
      ]"
    >
      <div class="w-full">
        <!-- Transaction Header -->
        <div 
          @click="selectTransaction(item)" 
          class="flex items-center gap-4 p-4 cursor-pointer"
        >
          <!-- Logo section -->
          <div class="flex-shrink-0">
            <div class="w-12 h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden">
              <img v-if="item.logo_url" :src="item.logo_url" class="h-8 w-8 object-contain" alt="Logo" />
              <div v-else class="text-[10px] font-black text-black uppercase">TX</div>
            </div>
          </div>
          
          <!-- Info section -->
          <div class="flex-grow min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                {{ item.authorized_date }}
              </span>
              <span v-if="item.pending" class="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                Pending
              </span>
            </div>
            <div class="text-sm font-black text-gray-900 truncate tracking-tight">
              {{ item.name }}
              <span v-if="item.check_number?.length" class="text-gray-400 font-bold ml-1">#{{ item.check_number }}</span>
            </div>
          </div>
          
          <!-- Amount section -->
          <div class="flex-shrink-0 text-right">
            <div class="text-lg font-black tracking-tight" :class="fontColor(item.amount)">
              {{ formatPrice(item.amount) }}
            </div>
            <div class="text-[9px] font-bold text-black uppercase tracking-widest">#{{ i + 1 }}</div>
          </div>
        </div>

        <!-- Expanded Transaction -->
        <div v-if="itemIsSelected(item._id)" class="border-t-2 border-gray-50 bg-gray-50/20">
          <TransactionDetails :state="state" :item="item" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import TransactionDetails from './TransactionDetails.vue';
import { useUtils } from '@/shared/composables/useUtils';
import { Minus } from 'lucide-vue-next';

const { fontColor, formatPrice } = useUtils();
const { categoryName, state } = defineProps({
  categoryName: String,
  state: Object
});

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