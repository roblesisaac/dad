<template>
  <div class="relative group bg-[var(--theme-browser-chrome)] hover:bg-gray-50/50 transition-all duration-300">

    <button
      @click="selectCategory"
      class="flex items-center bg-[var(--theme-browser-chrome)] justify-between w-full py-6 text-left cursor-pointer focus:outline-none"
      type="button"
    >
      <div class="flex items-center gap-4 flex-1 min-w-0">
        <span class="text-base font-black text-gray-900 uppercase tracking-tight truncate group-hover:text-black transition-colors">
          {{ categoryName }}
        </span>
        <span v-if="isSelected" class="px-2 py-1 text-[10px] font-black group-count-badge rounded-lg uppercase tracking-widest transition-colors shrink-0">
          {{ categoryItems.length }}
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

<style scoped>
.group-count-badge {
  background-color: #f9fafb;
  color: #9ca3af;
  border: 1px solid #f3f4f6;
}

.group:hover .group-count-badge {
  color: #000000;
  border-color: #000000;
}

[data-theme='dark'] .group-count-badge {
  background-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  border-color: rgba(255, 255, 255, 0.2);
}

[data-theme='dark'] .group:hover .group-count-badge {
  color: #ffffff;
  border-color: #ffffff;
}

[data-theme='bw'] .group-count-badge {
  background-color: rgba(0, 0, 0, 0.05);
  color: #000000;
  border-color: #000000;
}
</style>
