<template>
<div v-if="items.length" class="grid items">

  <div class="cell-1">
    <div class="grid bottom p10b" v-for="(item, i) in items">
      <div class="cell-1">
        
        <!-- Minimized Transaction -->
        <div @click="selectTransaction(item)" class="grid">
          <div class="cell shrink">
            <img v-if="item.logo_url" :src="item.logo_url" style="height: 50px;" alt="Logo" />
          </div>
          <div class="cell auto p10l">
            <small class="colorDarkGreen">#{{ i+1 }}. {{ item.date }}</small>
            <br>{{  item.name }}  <span v-if="item.check_number?.length">#{{ item.check_number }}</span>
          </div>
          <div class="cell shrink">
            {{ formatPrice(item.amount) }}
          </div>
        </div>

        <!-- Expanded Transaction -->
        <TransactionDetails v-if="itemIsSelected(item._id)" :item="item" />

      </div>
    </div>
  </div>

</div>
</template>

<script setup>
import { computed, defineProps } from 'vue';
import TransactionDetails from './TransactionDetails.vue';
import { formatPrice } from '../utils';

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
  if(!state.selected.transaction) {
    return;
  }

  return state.selected.transaction._id === itemId;
};

function selectTransaction(item) {
  if(itemIsSelected(item._id)) {
    state.selected.transaction = false;
    return;
  }

  state.selected.transaction=item;
}

</script>

<style>
.items {
  font-weight: normal;
}
.dottedBottom {
  border-bottom: 1px dotted lightblue;
}
</style>