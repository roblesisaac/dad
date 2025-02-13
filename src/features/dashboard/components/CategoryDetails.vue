<template>
  <div :id="id" class="group">
    <div 
      @click="selectCategory()" 
      :id="id+'title'" 
      class="p-5 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <span class="text-blue-600 font-bold">{{ categoryItems.length }}</span>
          <span class="capitalize">{{ categoryName }}</span>
          <span :class="[fontColor(categoryTotal), 'font-bold']">{{ catTotal }}</span>
        </div>
        <div class="text-gray-700">
          <Minus v-if="isSelected" class="w-5 h-5" />
          <Plus v-else class="w-5 h-5" />
        </div>
      </div>
    </div>
    
    <div 
      v-if="state.isSmallScreen() && isSelected" 
      class="border-t border-gray-200"
    >
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
  return formatPrice(categoryTotal, { toFixed });
});

async function selectCategory() {
  selectedTab.categoryName = isSelected.value ? null : categoryName;
  window.scrollTo(0, 0);
  await nextTick();
  scrollToElement(id);
}

function makeSelectedCategorySticky() {
  const selector = state.isSmallScreen() ? id+'title' : id;
  
  if(isSelected.value) {
    stickify.register(selector);
    if (!state.isSmallScreen()) {
      hideRightBorder(document.getElementById(id));
      setPanelHeight(
        document.getElementById('leftPanel'),
        document.getElementById('rightPanel')
      );
    }
  } else {
    stickify.deregister(selector);
    if (!state.isSmallScreen()) {
      showRightBorder(document.getElementById(id));
    }
  }
}

function hideRightBorder(el) {
  if (!el) return;
  el.style.width = getInnerWidth(el) + 2 + 'px';
  el.classList.add('bg-white', 'shadow-md', 'z-10');
}

function showRightBorder(el) {
  if (!el) return;
  el.style.width = '';
  el.classList.remove('bg-white', 'shadow-md', 'z-10');
}

function setPanelHeight(leftPanel, rightPanel) {
  if (!leftPanel || !rightPanel) return;
  const leftHeight = leftPanel.getBoundingClientRect().height;
  const leftHeightScroll = leftPanel.scrollHeight;
  const rightHeight = rightPanel.scrollHeight;
  
  leftPanel.style.height = Math.max(leftHeight, leftHeightScroll, rightHeight) + 'px';
}

function scrollToElement(id) {
  const element = document.getElementById(id);
  if (!element) return;
  
  const elementRect = element.getBoundingClientRect();
  const headerHeight = document.querySelector('.border-b.border-gray-300')?.offsetHeight || 0;
  const scrollY = window.scrollY || window.pageYOffset;
  const absoluteElementTop = elementRect.top + scrollY;
  
  window.scrollTo({
    top: absoluteElementTop - headerHeight,
    behavior: 'smooth'
  });
}

function getInnerWidth(el) {
  if (!(el instanceof HTMLElement)) return null;
  
  const computedStyles = window.getComputedStyle(el);
  return el.clientWidth - parseFloat(computedStyles.paddingLeft) 
    - parseFloat(computedStyles.paddingRight)
    - parseFloat(computedStyles.borderLeftWidth)
    - parseFloat(computedStyles.borderRightWidth);
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