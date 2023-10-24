<template>
<div :id="id" class="grid categoryRow proper">

  <div @click="selectCategory(category)" :id="id+'title'" class="cell-1">
    <div class="grid">
      <div class="cell auto categoryTitle">
        <b>{{ category.length }}</b> {{ categoryName }} <b>{{ formatPrice(category.categoryTotal, { toFixed: 0}) }}</b>
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

const { category, categoryName, state, key } = defineProps({
  key: String,
  state: Object,
  category: Object,
  categoryName: String
});

const id = (categoryName+state.selected.tab.tabName).replace(/\s/g, '');

const isSelected = computed(() => {
  return state.selected.tab.categoryName === categoryName;
});

function selectCategory(category) {
  state.selected.tab.categoryName = state.selected.tab.categoryName === categoryName ? null : categoryName;
  state.selected.tab.transactions = isSelected.value ? category : [];
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