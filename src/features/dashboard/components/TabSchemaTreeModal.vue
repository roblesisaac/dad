<template>
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--theme-overlay-30)] backdrop-blur-md px-4 py-4"
    @click.self="close"
  >
    <div
      class="w-full max-w-lg rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-browser-chrome)] shadow-[0_20px_60px_-24px_var(--theme-overlay-50)] max-h-full flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Tab Schema Tree"
    >
      <div class="flex items-start justify-between gap-4 border-b border-[var(--theme-border)] px-4 py-3">
        <h3 class="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-[var(--theme-text)]">
          {{ tabName }} - Layout Tree
        </h3>
        <button
          type="button"
          class="rounded-full p-1 text-[var(--theme-text-soft)] transition-colors hover:text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
          aria-label="Close tree view"
          @click="close"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
      
      <div class="px-4 py-4 text-left overflow-y-auto min-h-[50vh] max-h-[70vh]">
        <div v-if="!tree.length" class="text-sm text-[var(--theme-text-soft)] text-center py-8">
          No schema available for this tab.
        </div>
        <div v-else class="schema-tree font-mono text-xs sm:text-sm">
          <ul class="space-y-1">
            <template v-for="node in tree" :key="node.key">
              <TabSchemaTreeNode :node="node" @select-path="handleNodeSelect" />
            </template>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';
import TabSchemaTreeNode from './TabSchemaTreeNode.vue';
import { resolveDrillState } from '@/features/tabs/utils/drillEvaluator.js';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);
const { state } = useDashboardState();

const tabName = computed(() => state.selected.tab?.tabName || 'Selected Tab');

function extractGroupBy(level) {
  if (!level || !level.groupByRules || !level.groupByRules[0] || !level.groupByRules[0].rule) {
    return 'none';
  }
  return level.groupByRules[0].rule[1] || 'none';
}

const tree = computed(() => {
  const selectedTab = state.selected.tab;
  const allGroupTransactions = state.selected.allGroupTransactions || [];
  const allRules = state.allUserRules || [];

  if (!selectedTab || !Array.isArray(selectedTab.drillSchema?.levels)) {
    return [];
  }

  return buildEvaluationTree([], 0);

  function buildEvaluationTree(drillPath, currentDepth) {
    if (currentDepth > 10) return []; // safety limit

    let colState;
    try {
      colState = resolveDrillState({
        tab: selectedTab,
        transactions: allGroupTransactions,
        allRules: allRules,
        drillPath
      });
    } catch(e) {
      return [];
    }

    if (colState.isLeaf || !colState.groups || colState.groups.length === 0) {
      // It's a leaf, no further branches
      return [];
    }
    
    // It's a branch, populate children from evaluated groups
    const children = [];
    
    const sortedGroups = [...colState.groups].sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    for (const group of sortedGroups) {
      const childDrillPath = [...drillPath, group.key];

      // Figure out what the next drill state would be to find what it's grouped by
      let nextState;
      try {
        nextState = resolveDrillState({
           tab: selectedTab,
           transactions: allGroupTransactions,
           allRules: allRules,
           drillPath: childDrillPath
        });
      } catch (e) {
        nextState = null;
      }
      
      const isNextLeaf = nextState ? (nextState.isLeaf || !nextState.groups || nextState.groups.length === 0) : true;
      const nextGroupBy = nextState && !isNextLeaf ? nextState.groupByMode : 'none';

      children.push({
        key: `node-group-${childDrillPath.join('-')}`,
        label: group.label || group.key,
        drillPath: childDrillPath,
        depth: currentDepth,
        groupBy: nextGroupBy,
        isDefault: false,
        total: group.total,
        count: group.count,
        children: buildEvaluationTree(childDrillPath, currentDepth + 1)
      });
    }

    return children;
  }
});



function handleNodeSelect(path) {
  state.selected.drillPath = [...(path || [])];
  close();
}

function close() {
  emit('close');
}

function handleEscape(e) {
  if (e.key === 'Escape' && props.isOpen) {
    close();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape);
});
</script>

<style scoped>
.schema-tree ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
</style>
