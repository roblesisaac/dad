<template>
  <div class="mb-2">
    <div class="flex justify-between items-center text-xs font-medium text-red-600 border-b border-red-200 pb-1 mb-1">
      <span>{{ transactions.length }} {{ title }}</span>
      <button @click="toggleExpanded" class="text-red-700">
        <ChevronUp v-if="isExpanded" class="h-4 w-4" />
        <ChevronDown v-else class="h-4 w-4" />
      </button>
    </div>
    
    <!-- Expanded failed transactions list -->
    <div v-if="isExpanded" class="space-y-2">
      <slot :transactions="transactions"></slot>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ChevronUp, ChevronDown } from 'lucide-vue-next';

const props = defineProps({
  transactions: {
    type: Array,
    required: true
  },
  title: {
    type: String,
    required: true
  }
});

const isExpanded = ref(false);

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};
</script> 