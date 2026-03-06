<template>
  <div class="relative group bg-[var(--theme-browser-chrome)] hover:bg-gray-50/50 transition-all duration-300">
    <div v-if="isSelected" class="absolute left-0 top-0 bottom-0 w-1 bg-black z-20"></div>

    <button
      @click="selectCategory"
      class="flex items-center bg-[var(--theme-browser-chrome)] justify-between w-full py-6 text-left cursor-pointer focus:outline-none"
      type="button"
    >
      <div class="flex items-center gap-4 flex-1 min-w-0">
        <span v-if="isSelected" class="px-2 py-1 text-[10px] font-black text-gray-400 bg-gray-50 rounded-lg uppercase tracking-widest border border-gray-100 group-hover:border-black group-hover:text-black transition-colors shrink-0">
          {{ categoryItems.length }}
        </span>
        <span class="text-base font-black text-gray-900 uppercase tracking-tight truncate group-hover:text-black transition-colors">
          {{ categoryName }}
        </span>
      </div>

      <div class="flex items-center gap-4 ml-4 shrink-0">
        <div class="text-right">
          <span :class="[fontColor(categoryTotal), 'text-base font-black tracking-tight']">
            {{ formatPrice(categoryTotal, { toFixed: 0 }) }}
          </span>
        </div>
      </div>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useUtils } from '@/shared/composables/useUtils';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';

const emit = defineEmits(['category-selected']);
const { categoryName, categoryItems, categoryTotal } = defineProps({
  categoryName: String,
  categoryItems: {
    type: Array,
    default: () => []
  },
  categoryTotal: Number
});

const { state } = useDashboardState();
const { fontColor, formatPrice } = useUtils();

const isSelected = computed(() => state.selected.category === categoryName);

function selectCategory() {
  emit('category-selected', categoryName);
}
</script>
