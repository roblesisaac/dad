<template>
  <div class="visualizer-root fixed inset-0 z-50 flex flex-col bg-[var(--theme-browser-chrome)] font-sans text-[var(--theme-text)]">
    
    <!-- Header -->
    <div class="flex-none flex items-center justify-between px-6 py-5 border-b border-[var(--theme-border)] z-20 bg-[var(--theme-browser-chrome)] bg-opacity-90 backdrop-blur-md">
      <h3 class="text-sm font-semibold tracking-wide">
        Transaction Flow Visualizer
      </h3>
      <button
        type="button"
        class="rounded-full p-2 text-[var(--theme-text-soft)] hover:text-[var(--theme-text)] transition-colors focus:outline-none"
        aria-label="Close visualizer"
        @click="$emit('close')"
      >
        <X class="h-5 w-5" />
      </button>
    </div>

    <!-- Scopes Canvas Area -->
    <div 
      class="flex-1 overflow-hidden bg-[var(--theme-bg)] relative touch-none select-none"
      ref="viewboxRef"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div 
        class="absolute origin-top-left" 
        :style="viewportStyle"
        ref="wrapperRef"
      >
        <div class="px-12 py-12 md:px-32 md:py-32 relative" style="min-width: max-content; min-height: max-content;">
        
          <!-- SVG Connections -->
          <svg class="absolute inset-0 pointer-events-none z-0 w-full h-full">
            <defs>
              <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto">
                <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--theme-text)" opacity="1" />
              </marker>
              <marker id="arrow-inactive" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto">
                <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--theme-border)" opacity="0.6" />
              </marker>
            </defs>
            <path 
              v-for="(p, i) in paths" 
              :key="i" 
              :d="p.d" 
              fill="none" 
              :stroke="p.active ? 'var(--theme-text)' : 'var(--theme-border)'" 
              :stroke-width="p.active ? '2' : '1.5'" 
              :stroke-opacity="p.active ? '1' : '0.6'" 
              :marker-end="p.active ? 'url(#arrow-active)' : 'url(#arrow-inactive)'"
            />
          </svg>

        <!-- Nodes container -->
        <div class="relative z-10 flex flex-col items-center justify-center gap-20 focus:outline-none p-24 min-h-[500px]">
           <VisualizerTreeNode 
             v-if="treeDataUp"
             :node="treeDataUp"
             :active-path="activeDrillPath"
             direction="up"
             @select="selectPath"
           />

           <div 
             id="node-root"
             class="cursor-pointer whitespace-nowrap select-none node-base flex-shrink-0 text-center"
             :class="activeDrillPath.length === 0 ? 'node-active' : 'node-inactive'"
             @click="selectPath([])"
           >
             <div class="text-base font-medium">All Transactions</div>
             <div class="text-sm mt-1" :class="activeDrillPath.length === 0 ? 'text-[var(--theme-text-soft)]' : 'opacity-70'">
                {{ formatPrice(rootTotal) }}
             </div>
           </div>
           
           <VisualizerTreeNode 
             v-if="treeDataDown"
             :node="treeDataDown"
             :active-path="activeDrillPath"
             direction="down"
             @select="selectPath"
           />
        </div>

        </div>
      </div>

      <!-- Controls -->
      <div class="absolute bottom-10 right-10 z-30 flex flex-col gap-2">
        <button 
          @click="resetViewport"
          class="bg-[var(--theme-browser-chrome)] border border-[var(--theme-border)] text-[var(--theme-text-soft)] px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:text-[var(--theme-text)] transition-all active:scale-95 shadow-sm"
        >
          Reset View
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue';
import { X } from 'lucide-vue-next';
import { useUtils } from '@/shared/composables/useUtils.js';
import { resolveDrillState } from '@/features/tabs/utils/drillEvaluator.js';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';
import VisualizerTreeNode from './VisualizerTreeNode.vue';

// Define props to avoid Vue warnings, even though we use state internally.
const props = defineProps({
  drillGroups: { type: Array, default: () => [] },
  transactions: { type: Array, default: () => [] },
  isLeaf: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);

const { formatPrice } = useUtils();
const { state } = useDashboardState();

const activeDrillPath = ref([...(state.selected.drillPath || [])]);

// Viewport State
const viewboxRef = ref(null);
const wrapperRef = ref(null);

const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const isPanning = ref(false);

const viewportStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  cursor: isPanning.value ? 'grabbing' : 'auto'
}));


// Build Tree Algorithm
const treeResult = computed(() => {
  const edgesData = [];

  function buildTreeRecursive(drillPath, parentId, currentDepth) {
    if (currentDepth > 10) return null; // safety
    
    let colState;
    try {
      colState = resolveDrillState({
        tab: state.selected.tab,
        transactions: state.selected.allGroupTransactions,
        allRules: state.allUserRules,
        drillPath
      });
    } catch(e) {
      return null;
    }

    if (colState.isLeaf || !colState.groups || colState.groups.length === 0) {
       const id = 'node-leaf-' + (drillPath.join('-') || 'root');
       edgesData.push({ startId: parentId, endId: id, drillPath });
       return { 
          type: 'leaf', 
          id,
          drillPath, 
          transactions: [...(colState.transactions || [])].sort((a,b) => b.amount - a.amount) 
       };
    } else {
       // Sort: positive > 0 goes up, < 0 goes down -> Large numbers at top.
       const sortedGroups = [...colState.groups].sort((a, b) => b.total - a.total);
       
       const groups = sortedGroups.map(g => {
          const id = 'node-group-' + [...drillPath, g.key].join('-');
          const childDrillPath = [...drillPath, g.key];
          
          edgesData.push({ startId: parentId, endId: id, drillPath: childDrillPath });
          
          return {
             ...g,
             id,
             drillPath: childDrillPath,
             childNode: buildTreeRecursive(childDrillPath, id, currentDepth + 1)
          };
       });
       
       return { type: 'groups', drillPath, groups };
    }
  }

  const rootData = buildTreeRecursive([], 'node-root', 0);
  return { rootData, edgesData };
});

const treeData = computed(() => treeResult.value.rootData);
const allEdges = computed(() => treeResult.value.edgesData);

const treeDataUp = computed(() => {
  if (!treeData.value || treeData.value.type === 'leaf') return null;
  const groups = treeData.value.groups.filter(g => g.total > 0);
  if (groups.length === 0) return null;
  return { ...treeData.value, groups };
});

const treeDataDown = computed(() => {
  if (!treeData.value || treeData.value.type === 'leaf') return null;
  const groups = treeData.value.groups.filter(g => g.total <= 0);
  if (groups.length === 0) return null;
  return { ...treeData.value, groups };
});

const rootTotal = computed(() => {
  if (!treeData.value) return 0;
  if (treeData.value.type === 'leaf') {
    return treeData.value.transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }
  return treeData.value.groups.reduce((sum, g) => sum + g.total, 0);
});

// Navigation
function selectPath(path) {
  activeDrillPath.value = path;
  updatePaths(true);
}

// Touch handling variables
let lastTouchPos = null;
let lastDist = 0;

function handleWheel(e) {
  if (e.ctrlKey) {
    e.preventDefault(); 
    const delta = -e.deltaY * 0.01;
    const newScale = Math.min(Math.max(0.1, scale.value + delta), 3);
    
    if (viewboxRef.value) {
      const rect = viewboxRef.value.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const worldX = (mouseX - translateX.value) / scale.value;
      const worldY = (mouseY - translateY.value) / scale.value;
      
      translateX.value = mouseX - worldX * newScale;
      translateY.value = mouseY - worldY * newScale;
      scale.value = newScale;
    }
  } else {
    translateX.value -= e.deltaX;
    translateY.value -= e.deltaY;
  }
  updatePaths(true);
}

let lastMousePos = null;

function handleMouseDown(e) {
  if (e.button === 0) { 
    isPanning.value = true;
    lastMousePos = { x: e.clientX, y: e.clientY };
  }
}

function handleMouseMove(e) {
  if (!isPanning.value || !lastMousePos) return;
  
  const dx = e.clientX - lastMousePos.x;
  const dy = e.clientY - lastMousePos.y;
  
  translateX.value += dx;
  translateY.value += dy;
  
  lastMousePos = { x: e.clientX, y: e.clientY };
  updatePaths(true);
}

function handleMouseUp() {
  isPanning.value = false;
  lastMousePos = null;
}

function handleTouchStart(e) {
  if (e.touches.length === 1) {
    isPanning.value = true;
    lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.touches.length === 2) {
    isPanning.value = true;
    const d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    lastDist = d;
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    lastTouchPos = { x: midX, y: midY };
  }
}

function handleTouchMove(e) {
  if (!lastTouchPos) return;
  e.preventDefault();

  if (e.touches.length === 1) {
    const dx = e.touches[0].clientX - lastTouchPos.x;
    const dy = e.touches[0].clientY - lastTouchPos.y;
    translateX.value += dx;
    translateY.value += dy;
    lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.touches.length === 2) {
    const d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    
    const delta = (d - lastDist) * 0.01;
    const newScale = Math.min(Math.max(0.1, scale.value + delta), 3);
    
    if (viewboxRef.value) {
      const rect = viewboxRef.value.getBoundingClientRect();
      const focusX = midX - rect.left;
      const focusY = midY - rect.top;
      
      const worldX = (focusX - translateX.value) / scale.value;
      const worldY = (focusY - translateY.value) / scale.value;
      
      translateX.value = focusX - worldX * newScale;
      translateY.value = focusY - worldY * newScale;
      scale.value = newScale;
    }
    
    const dx = midX - lastTouchPos.x;
    const dy = midY - lastTouchPos.y;
    translateX.value += dx;
    translateY.value += dy;

    lastDist = d;
    lastTouchPos = { x: midX, y: midY };
  }
  updatePaths(true);
}

function handleTouchEnd() {
  lastTouchPos = null;
  lastDist = 0;
  isPanning.value = false;
}

function resetViewport() {
  scale.value = 1;
  translateX.value = 0;
  translateY.value = 0;
  updatePaths();
}

const paths = ref([]);

function getPath(startEl, endEl, wrapperEl) {
  if (!startEl || !endEl || !wrapperEl) return '';
  const startRect = startEl.getBoundingClientRect();
  const endRect = endEl.getBoundingClientRect();
  const wrapperRect = wrapperEl.getBoundingClientRect();

  const startX = (startRect.left + startRect.width / 2 - wrapperRect.left) / scale.value;
  const endX = (endRect.left + endRect.width / 2 - wrapperRect.left) / scale.value;

  // Detect vertical direction
  const startIsAbove = startRect.bottom < endRect.top + endRect.height / 2;
  
  let startY, endY;
  
  if (startIsAbove) {
     // flowing DOWN
     startY = (startRect.bottom - wrapperRect.top) / scale.value + 4;
     endY = (endRect.top - wrapperRect.top) / scale.value - 12;
  } else {
     // flowing UP
     startY = (startRect.top - wrapperRect.top) / scale.value - 4;
     endY = (endRect.bottom - wrapperRect.top) / scale.value + 12;
  }

  const midY = startY + (endY - startY) / 2;
  
  return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
}

function isEdgeActive(edgeDrillPath) {
  if (edgeDrillPath.length > activeDrillPath.value.length) return false;
  for (let i = 0; i < edgeDrillPath.length; i++) {
    if (edgeDrillPath[i] !== activeDrillPath.value[i]) return false;
  }
  return true;
}

const updatePaths = (immediate = false) => {
  const calculate = () => {
    if (!wrapperRef.value) return;
    const newPaths = [];
    
    for (const edge of allEdges.value) {
      const startEl = document.getElementById(edge.startId);
      const endEl = document.getElementById(edge.endId);
      if (startEl && endEl) {
         newPaths.push({
           d: getPath(startEl, endEl, wrapperRef.value),
           active: isEdgeActive(edge.drillPath)
         });
      }
    }
    paths.value = newPaths;
  };

  if (immediate) {
    calculate();
  } else {
    nextTick(calculate);
  }
};

watch(treeData, () => {
  nextTick(() => updatePaths());
}, { immediate: true });

onMounted(() => {
  window.addEventListener('resize', updatePaths);
  // Center roughly
  if (viewboxRef.value) {
     const rect = viewboxRef.value.getBoundingClientRect();
     translateY.value = rect.height / 2 - 200;
     translateX.value = 100;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updatePaths);
});
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
