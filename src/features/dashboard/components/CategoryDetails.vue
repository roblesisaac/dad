<template>
  <div :id="id" class="group border-b-2 border-gray-50 bg-white last:border-b-0">
    <div 
      @click="selectCategory()" 
      :id="id+'title'" 
      class="flex items-center justify-between w-full px-6 py-6 cursor-pointer transition-all duration-300 hover:bg-gray-50/50"
    >
      <div class="flex items-center gap-4">
        <span class="px-2.5 py-1 text-[10px] font-black text-gray-400 bg-gray-50 rounded-lg uppercase tracking-widest border border-gray-100 group-hover:border-black group-hover:text-black transition-colors">
          {{ categoryItems.length }}
        </span>
        <div class="flex flex-col">
          <span class="text-lg font-black text-gray-900 first-letter:uppercase tracking-tight leading-none group-hover:text-black transition-colors">{{ categoryName }}</span>
          <span :class="[fontColor(categoryTotal), 'text-xs font-bold mt-1 opacity-80']">{{ catTotal }}</span>
        </div>
      </div>
      <div class="text-gray-300 group-hover:text-black transition-colors">
        <ChevronRight :class="['w-5 h-5 transition-transform duration-300', isSelected ? 'rotate-90 text-black' : '']" />
      </div>
    </div>
    
    <div v-if="isSelected" class="bg-gray-50/30 border-t-2 border-gray-50 p-6">
      <SelectedItems :state="state" :categoryName="categoryName" />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount } from 'vue';
import { ChevronDown, ChevronRight } from 'lucide-vue-next';
import SelectedItems from './SelectedItems.vue';
import { useUtils } from '@/shared/composables/useUtils';
import { useAppStore } from '@/stores/state';

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
});

</script>