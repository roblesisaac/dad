<template>
<div :id="id" @click="selectCategory(category)" class="grid categoryRow proper">
  <div class="cell auto categoryTitle">
    <b>{{ category.length }}</b> {{ categoryName }} <b>{{  categoryTotal }}</b>
  </div>
  <div class="cell shrink categoryExpand">
    <a href="#"  class="bold colorJet icon">
      <Minus v-if="isSelected" />
      <Plus v-else />
    </a>
  </div>
  <div v-if="state.isSmallScreen() && isSelected" class="cell-1">
    <SelectedItems :state="state" :categoryName="categoryName" />
  </div>
</div>
</template>

<script setup>
import { computed, defineProps, watch } from 'vue';
import Plus from 'vue-material-design-icons/Plus.vue';
import Minus from 'vue-material-design-icons/Minus.vue';
import SelectedItems from './SelectedItems.vue';

import { formatPrice } from '../utils';
import { useAppStore } from '../stores/app';

const { sticky } = useAppStore();

const { category, categoryName, state, key } = defineProps({
  key: String,
  state: Object,
  category: Object,
  categoryName: String
});

const id = (categoryName+state.selectedTab.tabName).replace(/\s/g, '');

const isSelected = computed(() => {
  return state.selectedTab.categoryName === categoryName;
});

const categoryTotal = computed(() => {
  const total = category.reduce((acc, { amount }) => acc + parseFloat(amount), 0);
  return formatPrice(total);
});

function selectCategory(category) {
  state.selectedTab.categoryName = state.selectedTab.categoryName === categoryName ? null : categoryName;
  state.selectedTab.items = isSelected.value ? category : [];
}

watch(isSelected, () => {
  if(state.isSmallScreen()) {
    return;
  }

  const el = document.getElementById(id);

  if(isSelected.value) {
    sticky.stickify(id);
    hideRightBorder(el);
  } else {
    sticky.unstick(id);
    showRightBorder(el);
  }
});

function hideRightBorder(el) {
  const box = el.getBoundingClientRect();

  el.style.width = box.width - 37 + 'px';
  el.style.background = '#f3f4ee';
}

function showRightBorder(el) {
  el.style.width = '';
  el.style.background = '';
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

.expandedCat {
  position: absolute;
}

</style>