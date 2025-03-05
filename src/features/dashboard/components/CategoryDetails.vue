<template>
  <div :id="id" class="overflow-hidden border-gray-200 border-b bg-white">
    <div 
      @click="selectCategory()" 
      :id="id+'title'" 
      class="flex items-center justify-between w-full px-5 py-3 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
    >
      <div class="flex items-center space-x-3">
        <span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-sm font-medium">
          {{ categoryItems.length }}
        </span>
        <span class="font-medium text-gray-800 capitalize">{{ categoryName }}</span>
        <span :class="[fontColor(categoryTotal), 'text-sm font-medium']">{{ catTotal }}</span>
      </div>
      <div class="text-gray-500">
        <span class="flex items-center justify-center w-5 h-5">
          <ChevronDown v-if="isSelected" class="w-4 h-4" />
          <ChevronRight v-else class="w-4 h-4" />
        </span>
      </div>
    </div>
    
    <div v-if="isSelected" class="border-t border-gray-200">
      <SelectedItems :state="state" :categoryName="categoryName" class="p-4" />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount } from 'vue';
import { ChevronDown, ChevronRight } from 'lucide-vue-next';
import SelectedItems from './SelectedItems.vue';
import { useUtils } from '@/shared/composables/useUtils';
import { useAppStore } from '@/stores/state';

const { stickify } = useAppStore();
const { fontColor, formatPrice } = useUtils();

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

onBeforeUnmount(() => {
  selectedTab.categoryName = null;
  stickify.deregister(id);
});

</script>