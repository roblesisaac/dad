<template>
  <li>
    <div class="flex items-start py-1.5 transition-colors group">
      <div 
        class="flex flex-col items-center mr-3 mt-1.5 relative w-4 cursor-pointer"
        @click="$emit('select-path', node.drillPath || [])"
      >
        <div class="w-1.5 h-1.5 rounded-full bg-[var(--theme-border)] group-hover:bg-[var(--theme-text)] transition-colors z-10"></div>
        <div v-if="hasChildren" class="absolute top-1.5 bottom-[-1.5rem] w-px bg-[var(--theme-border)] opacity-50 group-hover:opacity-100 transition-opacity z-0"></div>
      </div>
      
      <div class="flex-1 min-w-0">
        <div 
          class="flex items-center gap-2 flex-wrap cursor-pointer hover:opacity-80 transition-opacity"
          @click="$emit('select-path', node.drillPath || [])"
        >
          <span 
            class="font-black text-[var(--theme-text)] text-[11px] truncate whitespace-normal uppercase group-hover:text-[var(--theme-primary)] transition-colors"
            :class="{ 'opacity-75': node.isDefault && node.depth > 0 }"
          >
            {{ node.label }}
          </span>
          <span v-if="node.total" class="text-[10px] text-[var(--theme-text-soft)] ml-1">
            {{ formatPrice(node.total) }} <span class="opacity-50 text-[9px]">({{ node.count }})</span>
          </span>
        </div>
        
        <div v-if="hasChildren" class="mt-2 pl-2 border-l border-[var(--theme-border)] ml-1">
          <ul class="space-y-1">
            <template v-for="child in node.children" :key="child.key">
              <TabSchemaTreeNode :node="child" @select-path="$emit('select-path', $event)" />
            </template>
          </ul>
        </div>
      </div>
    </div>
  </li>
</template>

<script setup>
import { computed } from 'vue';
import { useUtils } from '@/shared/composables/useUtils.js';

const props = defineProps({
  node: {
    type: Object,
    required: true
  }
});

defineEmits(['select-path']);

const { formatPrice } = useUtils();

const hasChildren = computed(() => {
  return Array.isArray(props.node.children) && props.node.children.length > 0;
});
</script>
