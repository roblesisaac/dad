<template>
  <div v-if="node?.type === 'leaf'" :id="node.id" class="flex flex-col gap-2 p-4 rounded-xl border z-10 w-64 max-h-[400px] overflow-y-auto overflow-x-hidden custom-scrollbar bg-[var(--theme-browser-chrome)]" :class="isNodeActive(node.drillPath) ? 'border-[var(--theme-text)] shadow-sm' : 'border-[var(--theme-border)] opacity-60'">
     <div v-for="(tx, i) in node.transactions" :key="i" class="flex justify-between items-center gap-4 text-xs">
         <span class="truncate font-medium text-[var(--theme-text)]">{{ tx.name || 'Unknown' }}</span>
         <span class="opacity-70 text-[var(--theme-text-soft)]">{{ formatPrice(tx.amount || tx.amount_expected || 0) }}</span>
     </div>
  </div>

  <div v-else-if="node?.type === 'groups'" class="flex gap-12 justify-center">
    <div 
      v-for="grp in node.groups"
      :key="grp.key"
      class="flex flex-col items-center gap-20"
    >
      <VisualizerTreeNode 
        v-if="grp.childNode && direction === 'up'" 
        :node="grp.childNode"
        :active-path="activePath"
        :direction="direction"
        @select="$emit('select', $event)"
      />
      
      <div 
        :id="grp.id"
        class="flex-shrink-0 cursor-pointer whitespace-nowrap select-none node-base text-center"
        :class="isNodeActive(grp.drillPath) ? 'node-active' : 'node-inactive'"
        @click.stop="$emit('select', grp.drillPath)"
      >
        <div class="text-base font-medium">{{ grp.label }}</div>
        <div :class="isNodeActive(grp.drillPath) ? 'text-[var(--theme-text-soft)]' : 'opacity-70'" class="text-sm mt-1">
          {{ formatPrice(grp.total) }} <span class="text-xs ml-1 opacity-50">({{ grp.count }})</span>
        </div>
      </div>
      
      <VisualizerTreeNode 
        v-if="grp.childNode && direction === 'down'" 
        :node="grp.childNode"
        :active-path="activePath"
        :direction="direction"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { useUtils } from '@/shared/composables/useUtils.js';

const props = defineProps({
  node: { type: Object, required: true },
  activePath: { type: Array, required: true },
  direction: { type: String, default: 'down' }
});

defineEmits(['select']);

const { formatPrice } = useUtils();

function isNodeActive(path) {
  if (!path || !props.activePath) return false;
  if (path.length > props.activePath.length) return false;
  for (let i = 0; i < path.length; i++) {
    if (path[i] !== props.activePath[i]) return false;
  }
  return true;
}
</script>

<style scoped>
.node-base {
  border-radius: 12px;
  padding: 16px 28px;
  transition: opacity 0.2s ease, transform 0.1s ease;
}

.node-active {
  background-color: var(--theme-browser-chrome);
  border: 1px solid var(--theme-text);
  color: var(--theme-text);
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}

.node-inactive {
  background-color: transparent;
  border: 1px solid transparent;
  color: var(--theme-text-soft);
  opacity: 0.5;
}

.node-inactive:hover {
  opacity: 0.8;
}

.custom-scrollbar::-webkit-scrollbar {
  display: none;
}
.custom-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
