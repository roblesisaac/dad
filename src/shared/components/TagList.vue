<template>
  <div class="tag-list-container">
    <div v-if="tags.length === 0" class="text-gray-500 text-xs italic">No tags</div>
    <div v-else class="flex flex-wrap gap-1.5">
      <span 
        v-for="(tag, index) in tags" 
        :key="index"
        class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
        :class="tagColorClass"
      >
        {{ tag.trim() }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // String of comma-separated values or array of tag strings
  tagString: {
    type: [String, Array],
    default: ''
  },
  // Color scheme for the tags
  color: {
    type: String,
    default: 'blue' // blue, green, teal, amber, purple, gray
  }
});

// Compute the array of tags from either string or array input
const tags = computed(() => {
  if (Array.isArray(props.tagString)) {
    return props.tagString.filter(tag => tag && tag.trim());
  }
  if (!props.tagString) return [];
  return props.tagString.split(',').filter(tag => tag && tag.trim());
});

// Get the appropriate color class based on the color prop
const tagColorClass = computed(() => {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    teal: 'bg-teal-100 text-teal-800',
    amber: 'bg-amber-100 text-amber-800',
    purple: 'bg-purple-100 text-purple-800',
    gray: 'bg-gray-100 text-gray-700'
  };
  
  return colorMap[props.color] || colorMap.blue;
});
</script> 