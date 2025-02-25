<template>
  <div :id="id" class="x-grid dottedRow proper">
    
    <div @click="selectCategory()" :id="id+'title'" class="cell-1 p20 categoryTitle">
      <div class="x-grid">
        <div class="cell auto">
          <b class="count">{{ categoryItems.length }}</b> {{ categoryName }} <b :class="fontColor(categoryTotal)">{{ catTotal }}</b>
        </div>
        <div class="cell shrink categoryExpand">
          <span class="bold colorJet icon">
            <Minus v-if="isSelected" />
            <Plus v-else />
          </span>
        </div>
      </div>
    </div>
    
    <div v-if="isSelected" class="cell-1">
      <SelectedItems :state="state" :categoryName="categoryName" />
    </div>
    
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue';
import { Plus, Minus } from 'lucide-vue-next';
import SelectedItems from './SelectedItems.vue';

import { fontColor, formatPrice } from '@/utils';
import { useAppStore } from '@/stores/state';

const { stickify } = useAppStore();

const { state, categoryName, categoryItems, categoryTotal } = defineProps({
  state: Object,
  categoryName: String,
  categoryItems: Object,
  categoryTotal: Number
});

const selectedTab = state.selected.tab;

const id = (categoryName).replace(/\s/g, '');

const isSelected = computed(() => {
  return selectedTab.categoryName === categoryName;
});

const catTotal = computed(() => {
  const toFixed = isSelected.value ? 2 : 0;
  
  return formatPrice(categoryTotal, { toFixed })
});

async function selectCategory() {
  selectedTab.categoryName = isSelected.value ? null : categoryName;
  
  window.scrollTo(0, 0);
  
  await nextTick();
  
  scrollToElement(id);
}

function makeSelectedCategorySticky() {
  const selector = id+'title';
  
  if(isSelected.value) {
    stickify.register(selector);
  } else {
    stickify.deregister(selector);  
  }

  const isSmallScreen = true;
  
  if(isSmallScreen) {
    return;
  }
  
  const el = document.getElementById(id);
  const leftPanel = document.getElementById('leftPanel');
  const rightPanel = document.getElementById('rightPanel');
  
  if(isSelected.value) {
    hideRightBorder(el);
  } else {
    showRightBorder(el);  
  }
  
  setPanelHeight(leftPanel, rightPanel);
}

function hideRightBorder(el) {
  el.style.width = getInnerWidth(el) + 2 + 'px';
}

function setPanelHeight(leftPanel, rightPanel) {
  const leftHeight = leftPanel.getBoundingClientRect().height;
  const leftHeightScroll = leftPanel.scrollHeight;
  const rightHeight = rightPanel.scrollHeight;
  
  leftPanel.style.height = Math.max(leftHeight, leftHeightScroll, rightHeight) + 'px';
}

function showRightBorder(el) {
  el.style.width = '';
  el.style.background = '';
}

function scrollToElement(id) {
  const element = document.getElementById(id);
  
  if (!element) {
    console.warn(`Element with id "${id}" not found.`);
    return;
  }
  
  const elementRect = element.getBoundingClientRect();
  const headerHeight = document.querySelector('.totalsRow')?.offsetHeight || 0;
  const scrollY = window.scrollY || window.pageYOffset;
  const absoluteElementTop = elementRect.top + scrollY;
  
  window.scrollTo({
    top: absoluteElementTop - headerHeight
  });
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

watch(isSelected, makeSelectedCategorySticky);
onMounted(makeSelectedCategorySticky);
onBeforeUnmount(() => {
  selectedTab.categoryName = null;
  stickify.deregister(id);
});

</script>

<style>
.categoryTitle {
  line-height: 2;
  cursor: pointer;
}

.expandedCat {
  position: absolute;
}

</style>