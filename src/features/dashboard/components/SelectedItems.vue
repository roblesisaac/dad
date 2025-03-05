<template>
  <div v-if="items.length" class="grid bg-gray-100 border-t border-gray-400 p-4">

    <div class="w-full">
      <div 
        :class="[
          'grid py-2 px-3 mb-3 bg-white border rounded-sm cursor-pointer hover:bg-gray-50',
          itemIsSelected(item._id) ? 'border-blue-400' : 'border-gray-300'
        ]" 
        v-for="(item, i) in items"
      >
        <div class="w-full">

          <!-- Minimized Transaction -->
          <div @click="selectTransaction(item)" class="grid grid-cols-24">
            <!-- Hide Details (minus) icon -->
            <div v-if="itemIsSelected(item._id)" class="col-span-24 text-right"><Minus class="w-4 h-4 text-gray-700" /></div>

            <div class="col-span-4 pr-2">
              <img v-if="item.logo_url" :src="item.logo_url" class="h-10" alt="Logo" />
              <img v-else :src="'/chart.svg'" class="h-10" />
            </div>
            <div class="col-span-15">
              <div class="text-xs text-green-700 font-medium">#{{ i + 1 }}. {{ item.authorized_date }}</div>
              <div>{{ item.name }} <span v-if="item.check_number?.length">#{{ item.check_number }}</span></div>
              <div v-if="itemIsSelected(item._id)" :class="fontColor(item.amount)" class="font-medium mt-1">
                {{ formatPrice(item.amount) }}
              </div>
            </div>
            <div v-if="!itemIsSelected(item._id)" :class="['col-span-5 p-2 text-left font-medium', fontColor(item.amount)]">
              {{ formatPrice(item.amount, { toFixed: 0 }) }}
              <div v-if="item.pending" class="text-xs text-gray-600">Pending</div>
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