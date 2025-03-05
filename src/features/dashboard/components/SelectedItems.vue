<template>
  <div v-if="items.length" class="grid bg-[#f4f8f9] border-t-2 border-gray-500 p-[30px_20px]">

    <div class="w-full">
      <div 
        :class="[
          'grid py-1.5 px-2.5 mb-5 bg-white shadow-[3px_3px] border rounded cursor-pointer',
          itemIsSelected(item._id) ? 'p-[30px_20px] border-blue-500 shadow-[1px_1px_blue]' : ''
        ]" 
        v-for="(item, i) in items"
      >
        <div class="w-full">

          <!-- Minimized Transaction -->
          <div @click="selectTransaction(item)" class="grid grid-cols-24">
            <!-- Hide Details (minus) icon -->
            <div v-if="itemIsSelected(item._id)" class="col-span-24 text-right"><Minus /></div>

            <div class="col-span-4 pr-2.5">
              <img v-if="item.logo_url" :src="item.logo_url" class="h-[50px]" alt="Logo" />
              <img v-else :src="'/chart.svg'" class="h-[50px]" />
            </div>
            <div class="col-span-15">
              <small class="text-green-800 font-bold">#{{ i + 1 }}. {{ item.authorized_date }}</small>
              <br>{{ item.name }} <span v-if="item.check_number?.length">#{{ item.check_number }}</span>
              <br v-if="itemIsSelected(item._id)">
              <b v-if="itemIsSelected(item._id)" :class="fontColor(item.amount)">
                {{ formatPrice(item.amount) }}
              </b>
            </div>
            <div v-if="!itemIsSelected(item._id)" :class="['col-span-5 p-2.5 text-left font-bold', fontColor(item.amount)]">
              {{ formatPrice(item.amount, { toFixed: 0 }) }}
              <br v-if="item.pending">
              <small v-if="item.pending" class="text-gray-700">Pending</small>
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
import { fontColor, formatPrice } from '@/utils';
import { Minus } from 'lucide-vue-next';

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