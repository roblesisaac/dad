<template>
  <div :id="id" class="relative group bg-white hover:bg-gray-50/50 transition-all duration-300">
    <!-- Active Category Indicator -->
    <div v-if="isSelected" class="absolute left-0 top-0 bottom-0 w-1 bg-black z-20"></div>

    <div 
      @click="selectCategory()" 
      :id="id+'title'" 
      class="flex items-center justify-between w-full px-6 py-6 cursor-pointer"
    >
      <!-- Left side: Count & Name -->
      <div class="flex items-center gap-4 flex-1 min-w-0">
        <span v-if="isSelected" class="px-2 py-1 text-[10px] font-black text-gray-400 bg-gray-50 rounded-lg uppercase tracking-widest border border-gray-100 group-hover:border-black group-hover:text-black transition-colors shrink-0">
          {{ categoryItems.length }}
        </span>
        <span class="text-base font-black text-gray-900 first-letter:uppercase tracking-tight truncate group-hover:text-black transition-colors">{{ categoryName }}</span>
      </div>

      <!-- Right side: Total -->
      <div class="flex items-center gap-4 ml-4 shrink-0">
        <div class="text-right">
          <span :class="[fontColor(categoryTotal), 'text-base font-black tracking-tight']">
            {{ formatPrice(categoryTotal, { toFixed: 0 }) }}
          </span>
        </div>
      </div>
    </div>
    
    <!-- Expanded Content -->
    <div v-if="isSelected" class="bg-gray-50/50 border-y-2 border-gray-50 p-6">
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