<template>
  <div v-if="items.length" class="grid items">

    <div class="cell-1">
      <div :class="[ifSelectedClass(item._id), 'grid bottom p5y p10x']" v-for="(item, i) in items">
        <div :class="[ifSelectedClass(item._id), 'cell-1']">

          <!-- Minimized Transaction -->
          <div @click="selectTransaction(item)" class="grid">
            <div class="cell-4-24 p10r">
              <img v-if="item.logo_url" :src="item.logo_url" style="height: 50px;" alt="Logo" />
              <img v-else :src="'/chart.svg'" style="height: 50px;" />
            </div>
            <div class="cell-15-24">
              <small class="colorDarkGreen">#{{ i + 1 }}. {{ item.date }}</small>
              <br>{{ item.name }} <span v-if="item.check_number?.length">#{{ item.check_number }}</span>
            </div>
            <div :class="['cell-5-24 p10 left', fontColor(item.amount)]">
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
import { computed } from 'vue';
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

const fontColor = (amt) => {
  return amt > 0 ? 'font-color-positive' : 'font-color-negative';
};

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

<style>
.items {
  font-weight: normal;
}

.dottedBottom {
  border-bottom: 1px dotted lightblue;
}

.transaction-selected.grid {
  background-image: radial-gradient(#000 10%, transparent 10%), radial-gradient(#000 10%, transparent 10%);
  background-position: 0 0, 25px 25px;
  background-size: 5px 5px;
  padding: 10px;
}

.transaction-selected.cell-1 {
  background: #fff;
  border-radius: 3px;
  padding: 10px;
  box-shadow: 3px 3px;
  border: 1px solid;
}
</style>