<template>
  <div v-if="items.length" class="space-y-4">
    <div 
      v-for="(item, i) in items" 
      :key="item._id"
      class="bg-white rounded-lg shadow-sm transition-all duration-200"
      :class="[itemIsSelected(item._id) ? 'ring-2 ring-blue-500' : 'hover:shadow-md']"
    >
      <!-- Minimized Transaction -->
      <div 
        @click="selectTransaction(item)" 
        class="p-4 cursor-pointer"
      >
        <div class="flex items-start gap-4">
          <!-- Logo -->
          <div class="w-12 h-12 flex-shrink-0">
            <img 
              v-if="item.logo_url" 
              :src="item.logo_url" 
              class="w-full h-full object-contain"
              alt="Logo" 
            />
            <img 
              v-else 
              src="/chart.svg" 
              class="w-full h-full object-contain"
              alt="Default logo" 
            />
          </div>

          <!-- Transaction Info -->
          <div class="flex-1">
            <div class="text-sm text-green-700 font-medium">
              #{{ i + 1 }}. {{ item.authorized_date }}
            </div>
            <div class="font-medium">
              {{ item.name }}
              <span v-if="item.check_number?.length">#{{ item.check_number }}</span>
            </div>
            <div v-if="itemIsSelected(item._id)" :class="[fontColor(item.amount), 'font-bold']">
              {{ formatPrice(item.amount) }}
            </div>
          </div>

          <!-- Amount (when not selected) -->
          <div 
            v-if="!itemIsSelected(item._id)" 
            class="text-right"
          >
            <div :class="[fontColor(item.amount), 'font-bold']">
              {{ formatPrice(item.amount, { toFixed: 0 }) }}
            </div>
            <div v-if="item.pending" class="text-sm text-gray-500">
              Pending
            </div>
          </div>

          <!-- Collapse Icon -->
          <div v-if="itemIsSelected(item._id)" class="text-gray-400">
            <Minus class="w-5 h-5" />
          </div>
        </div>
      </div>

      <!-- Expanded Transaction Details -->
      <TransactionDetails 
        v-if="itemIsSelected(item._id)" 
        :state="state" 
        :item="item" 
        class="border-t border-gray-100"
      />
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
  if (!state.selected.transaction) return false;
  return state.selected.transaction._id === itemId;
}

function selectTransaction(item) {
  state.selected.transaction = itemIsSelected(item._id) ? false : item;
}
</script>

<style>

.dottedBottom {
  border-bottom: 1px dotted lightblue;
}

.transaction-selected.grid {
  padding: 30px 20px;
  border: 1px solid blue;
  box-shadow: 1px 1px blue;
}

.items {
  background-color: #f4f8f9;
  border-top: 2px solid darkgray;
  padding: 30px 20px;
  font-weight: normal;
}

.item {
  background-color: #fff;
  box-shadow: 3px 3px;
  margin-bottom: 20px;
  border-radius: 3px;
  padding: 10px;
  border: 1px solid;
  cursor: pointer;
}
</style>