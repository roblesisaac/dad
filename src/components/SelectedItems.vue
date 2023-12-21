<template>
  <div v-if="items.length" class="grid items">

    <div class="cell-1">
      <div :class="[ifSelectedClass(item._id), 'grid bottom p5y p10x item']" v-for="(item, i) in items">
        <div :class="[ifSelectedClass(item._id), 'cell-1']">

          <!-- Minimized Transaction -->
          <div @click="selectTransaction(item)" class="grid">
            <!-- Hide Details (minus) icon -->
            <div v-if="itemIsSelected(item._id)" class="cell-1 right"><Minus /></div>

            <div class="cell-4-24 p10r">
              <img v-if="item.logo_url" :src="item.logo_url" style="height: 50px;" alt="Logo" />
              <img v-else :src="'/chart.svg'" style="height: 50px;" />
            </div>
            <div class="cell-15-24">
              <small class="colorDarkGreen bold">#{{ i + 1 }}. {{ item.date }}</small>
              <br>{{ item.name }} <span v-if="item.check_number?.length">#{{ item.check_number }}</span>
              <br v-if="itemIsSelected(item._id)">
              <b v-if="itemIsSelected(item._id)" :class="fontColor(item.amount)">
                {{ formatPrice(item.amount) }}
              </b>
            </div>
            <div v-if="!itemIsSelected(item._id)" :class="['cell-5-24 p10 left bold', fontColor(item.amount)]">
              {{ formatPrice(item.amount, { toFixed: 0 }) }}
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
import { fontColor, formatPrice } from '../utils';
import Minus from 'vue-material-design-icons/Minus.vue';

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

<style>

.dottedBottom {
  border-bottom: 1px dotted lightblue;
}

.transaction-selected.grid {
  padding: 30px 20px;
}

.items {
  background-image: radial-gradient(#000 10%,transparent 10%),radial-gradient(#000 10%,transparent 10%);
  background-position: 0;
  background-size: 10px 10px;
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
}
</style>