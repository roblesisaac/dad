<template>
<div :id="id" class="grid dottedRow proper">

  <div @click="selectCategory()" :id="id+'title'" class="cell-1">
    <div class="grid">
      <div class="cell auto categoryTitle">
        <b>{{ categoryItems.length }}</b> {{ categoryName }} <b>{{ catTotal }}</b>
      </div>
      <div class="cell shrink categoryExpand">
        <span class="bold colorJet icon">
          <Minus v-if="isSelected" />
          <Plus v-else />
        </span>
      </div>
    </div>
  </div>

  <div v-if="state.isSmallScreen() && isSelected" class="cell-1">
    <SelectedItems :state="state" :categoryName="categoryName" />
  </div>

</div>
</template>

<script setup>
import { computed, defineProps, nextTick, watch } from 'vue';
import Plus from 'vue-material-design-icons/Plus.vue';
import Minus from 'vue-material-design-icons/Minus.vue';
import SelectedItems from './SelectedItems.vue';

import { formatPrice } from '../utils';
import { useAppStore } from '../stores/app';

const { sticky } = useAppStore();

const { state, categoryName, categoryItems, categoryTotal } = defineProps({
  state: Object,
  categoryName: String,
  categoryItems: Object,
  categoryTotal: Number
});

const selectedTab = state.selected.tab;

const id = (categoryName+selectedTab.tabName).replace(/\s/g, '');

const isSelected = computed(() => {
  return selectedTab.categoryName === categoryName;
});

const catTotal = computed(() => {
  const toFixed = isSelected.value ? 2 : 0;

  return formatPrice(categoryTotal, { toFixed })
});

function selectCategory() {
  const isCategorySelected = selectedTab.categoryName === categoryName;
  selectedTab.categoryName = isCategorySelected ? null : categoryName;
  selectedTab.transactions = isSelected.value ? categoryItems : [];
}

watch(isSelected, () => {
  if(state.isSmallScreen()) {
    return;
  }

  const el = document.getElementById(id);
  const leftPanel = document.getElementById('leftPanel');
  const rightPanel = document.getElementById('rightPanel');

  if(isSelected.value) {
    hideRightBorder(el);
    sticky.stickify(id);
    nextTick(() => matchPanelSizes(leftPanel, rightPanel));  
  } else {
    sticky.unstick(id);
    showRightBorder(el);
    leftPanel.style.height = null;
  }
});

function hideRightBorder(el) {
  el.style.width = getInnerWidth(el) + 2 + 'px';
  el.style.background = '#f3f4ee';
}

function matchPanelSizes(leftPanel, rightPanel) {
  leftPanel.style.height = rightPanel.scrollHeight + 'px';
}

function showRightBorder(el) {
  el.style.width = '';
  el.style.background = '';
}

function getInnerWidth(el) {
  if (!(el instanceof HTMLElement)) {
    console.error('Invalid element provided.');
    return null;
  }

  const computedStyles = window.getComputedStyle(el);
  const paddingLeft = parseFloat(computedStyles.paddingLeft);
  const paddingRight = parseFloat(computedStyles.paddingRight);
  const borderLeft = parseFloat(computedStyles.borderLeftWidth);
  const borderRight = parseFloat(computedStyles.borderRightWidth);

  const innerWidth = el.clientWidth - (paddingLeft + paddingRight + borderLeft + borderRight);

  return innerWidth;
}


</script>

<style>
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