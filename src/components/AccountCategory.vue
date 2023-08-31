<template>
<div class="grid categoryRow proper">
  <div @click="selectCategory(category)" class="cell auto categoryTitle">
    <b>{{ category.length }}</b> {{ categoryName }} <b>{{  categoryTotal }}</b>
  </div>
  <div @click="selectCategory(category)" class="cell shrink categoryExpand">
    <a href="#"  class="bold colorJet icon">
      <Minus v-if="isExpanded" />
      <Plus v-else />
    </a>
  </div>
  <div v-if="state.isSmallScreen() && isExpanded" class="cell-1">
    <SelectedItems :state="state" :categoryName="categoryName" />
  </div>
</div>
</template>

<script setup>
import { computed, defineProps, ref } from 'vue';
import Plus from 'vue-material-design-icons/Plus.vue';
import Minus from 'vue-material-design-icons/Minus.vue';
import SelectedItems from './SelectedItems.vue';

import { formatPrice } from '../utils';

const { category, categoryName, state } = defineProps({
  state: Object,
  category: Object,
  categoryName: String
});

const isExpanded = ref(false);

const categoryTotal = computed(() => {
  const total = category.reduce((acc, { amount }) => acc + parseFloat(amount), 0);
  return formatPrice(total);
});

function selectCategory(category) {
  isExpanded.value = !isExpanded.value;
  
  state.selected.items[categoryName] = isExpanded.value ? category : [];
}

</script>

<style>
.categoryRow {
  border-bottom: 2px dotted #000;
  padding: 20px;
  text-align: left;
  font-weight: bold;
  cursor: pointer;

}
.categoryTitle {
  line-height: 2;
}
.categoryTitle b {
  color: blue;
}
</style>