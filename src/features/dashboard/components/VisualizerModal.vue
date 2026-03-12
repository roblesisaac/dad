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
        class="absolute origin-top-left transition-transform duration-75 ease-out" 
        :style="viewportStyle"
        ref="wrapperRef"
      >
        <div class="px-12 py-12 md:px-32 md:py-32 relative" style="min-width: max-content; min-height: max-content;">
        
          <!-- SVG Connections - Now part of the scaled container -->
          <svg class="absolute inset-0 pointer-events-none z-0 w-full h-full">
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto">
                <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--theme-border)" opacity="0.6" />
              </marker>
            </defs>
            <path 
              v-for="(p, i) in paths" 
              :key="i" 
              :d="p" 
              fill="none" 
              stroke="var(--theme-border)" 
              stroke-width="1.5" 
              stroke-opacity="0.6" 
              marker-end="url(#arrow)"
            />
          </svg>

        <!-- Nodes container -->
        <div class="relative z-10 flex flex-col gap-24 items-start focus:outline-none">
          
          <div v-for="(col, colIndex) in columns" :key="'col-'+colIndex" class="flex gap-8 items-center flex-nowrap">
            
            <template v-if="col.type === 'groups'">
              <div 
                v-for="(group, i) in col.items" 
                :key="group.key"
                :ref="el => setNodeRef(colIndex, i, el)"
                class="cursor-pointer whitespace-nowrap transition-all duration-300 select-none ease-out"
                :class="col.selectedIndex === i ? 'node-active' : 'node-inactive'"
                @click="selectGroup(col.depth, group.key)"
              >
                <span class="text-base font-medium">{{ group.label }}</span>
                <div :class="col.selectedIndex === i ? 'text-[var(--theme-text-soft)]' : 'opacity-70'" class="text-sm mt-1">
                  {{ formatPrice(group.total) }} <span class="text-xs ml-1 opacity-50">({{ group.count }})</span>
                </div>
              </div>
            </template>
            
            <template v-else-if="col.type === 'transactions'">
              <div 
                v-for="(tx, i) in col.items" 
                :key="'tx-'+i"
                :ref="el => setNodeRef(colIndex, i, el)"
                class="cursor-pointer whitespace-nowrap transition-all duration-300 select-none ease-out"
                :class="activeTransactionIndex === i ? 'node-active' : 'node-inactive'"
                @click="selectTransaction(i)"
              >
                <span class="text-base font-medium">{{ tx.name || 'Unknown' }}</span>
                <div :class="activeTransactionIndex === i ? 'text-[var(--theme-text-soft)]' : 'opacity-70'" class="text-sm mt-1">
                  {{ formatPrice(tx.amount) }}
                </div>
              </div>
            </template>

          </div>

          <!-- Transaction Details -->
          <div v-if="activeTransaction" class="flex gap-8 items-center mt-4">
            <div 
              ref="detailsRef" 
              class="font-bold tracking-tight text-[var(--theme-text)] node-details"
            >
               <span class="text-2xl">{{ formatPrice(activeTransaction.amount) }}</span> 
               <span class="font-normal text-[var(--theme-text-soft)] mx-2">at</span> 
               <span class="text-2xl">{{ activeTransaction.name || 'Unknown' }}</span>
               
               <div class="flex flex-col gap-1 mt-6 border-t border-[var(--theme-border)] pt-4">
                 <div class="text-sm font-medium text-[var(--theme-text-soft)] uppercase tracking-widest text-[10px]">
                   Date
                 </div>
                 <div class="text-base text-[var(--theme-text)]">
                   {{ formatDate(activeTransaction.date || activeTransaction.authorized_date) }}
                 </div>
               </div>
            </div>
          </div>

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
import { ref, computed, nextTick, onMounted, onBeforeUnmount, onBeforeUpdate, watch } from 'vue';
import { X } from 'lucide-vue-next';
import { useUtils } from '@/shared/composables/useUtils.js';
import { resolveDrillState } from '@/features/tabs/utils/drillEvaluator.js';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';

// Define props to avoid Vue warnings, even though we use state internally.
const props = defineProps({
  drillGroups: { type: Array, default: () => [] },
  transactions: { type: Array, default: () => [] },
  isLeaf: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);

const { formatPrice } = useUtils();
const { state } = useDashboardState();

// selected paths starting from depth 0
const localDrillExtensions = ref([]);
const activeTransactionIndex = ref(0);

// compute the columns dynamically
const columns = computed(() => {
  const cols = [];
  const baseDrillPath = state.selected.drillPath || [];
  let pathSoFar = [...baseDrillPath];
  
  let colState = resolveDrillState({
    tab: state.selected.tab,
    transactions: state.selected.allGroupTransactions,
    allRules: state.allUserRules,
    drillPath: pathSoFar
  });
  
  let currentDepth = 0;
  // To avoid infinite loops, max depth constraint:
  while (currentDepth < 10) {
    if (colState.isLeaf || !colState.groups || colState.groups.length === 0) {
      cols.push({
        type: 'transactions',
        depth: currentDepth,
        items: colState.transactions || []
      });
      break;
    } else {
      let selectedKey = localDrillExtensions.value[currentDepth];
      let selectedIndex = colState.groups.findIndex(g => g.key === selectedKey);
      
      if (selectedIndex === -1) {
        selectedIndex = 0;
        selectedKey = colState.groups[0].key;
      }
      
      cols.push({
        type: 'groups',
        depth: currentDepth,
        items: colState.groups,
        selectedIndex,
        selectedKey
      });
      
      pathSoFar.push(selectedKey);
      colState = resolveDrillState({
        tab: state.selected.tab,
        transactions: state.selected.allGroupTransactions,
        allRules: state.allUserRules,
        drillPath: pathSoFar
      });
      
      currentDepth++;
    }
  }
  
  return cols;
});

const activeTransaction = computed(() => {
  const lastCol = columns.value[columns.value.length - 1];
  if (lastCol && lastCol.type === 'transactions' && lastCol.items.length > 0) {
    return lastCol.items[activeTransactionIndex.value];
  }
  return null;
});

// Viewport State
const viewboxRef = ref(null);
const wrapperRef = ref(null);
const detailsRef = ref(null);

const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const isPanning = ref(false);

const viewportStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  cursor: isPanning.value ? 'grabbing' : 'auto'
}));

// Touch handling variables
let lastTouchPos = null;
let lastDist = 0;

function handleWheel(e) {
  // Check for pinch (ctrlKey)
  if (e.ctrlKey) {
    e.preventDefault(); // Prevent browser zoom
    const delta = -e.deltaY * 0.01;
    const newScale = Math.min(Math.max(0.2, scale.value + delta), 3);
    
    // Zoom towards cursor
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
    // Normal scroll = pan
    translateX.value -= e.deltaX;
    translateY.value -= e.deltaY;
  }
  updatePaths();
}

let lastMousePos = null;

function handleMouseDown(e) {
  if (e.button === 0) { // Left click
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
  updatePaths();
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
    
    // Midpoint for zoom
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    lastTouchPos = { x: midX, y: midY };
  }
}

function handleTouchMove(e) {
  if (!lastTouchPos) return;
  e.preventDefault();

  if (e.touches.length === 1) {
    // Pan
    const dx = e.touches[0].clientX - lastTouchPos.x;
    const dy = e.touches[0].clientY - lastTouchPos.y;
    translateX.value += dx;
    translateY.value += dy;
    lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.touches.length === 2) {
    // Pinch Zoom
    const d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    
    const delta = (d - lastDist) * 0.01;
    const newScale = Math.min(Math.max(0.2, scale.value + delta), 3);
    
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
    
    // Also follow the midpoint movement
    const dx = midX - lastTouchPos.x;
    const dy = midY - lastTouchPos.y;
    translateX.value += dx;
    translateY.value += dy;

    lastDist = d;
    lastTouchPos = { x: midX, y: midY };
  }
  updatePaths();
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

let nodeMap = {};

onBeforeUpdate(() => {
  nodeMap = {};
});

function setNodeRef(colIndex, itemIndex, el) {
  if (el) {
    nodeMap[`${colIndex}-${itemIndex}`] = el;
  }
}

const paths = ref([]);

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return new Date(d.getTime() + d.getTimezoneOffset() * 60000)
             .toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

function getPath(startEl, endEl, wrapperEl) {
  if (!startEl || !endEl || !wrapperEl) return '';
  
  const startRect = startEl.getBoundingClientRect();
  const endRect = endEl.getBoundingClientRect();
  const wrapperRect = wrapperEl.getBoundingClientRect();

  // Calculate coordinates relative to the wrapper, accounting for current scale
  const startX = (startRect.left - wrapperRect.left) / scale.value + (startRect.width / 2) / scale.value;
  const startY = (startRect.bottom - wrapperRect.top) / scale.value + 5; 
  
  const endX = (endRect.left - wrapperRect.left) / scale.value + (endRect.width / 2) / scale.value;
  const endY = (endRect.top - wrapperRect.top) / scale.value - 8;

  const midY = startY + (endY - startY) / 2;
  
  return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
}

const updatePaths = () => {
  paths.value = [];
  nextTick(() => {
    if (!wrapperRef.value) return;

    for (let c = 0; c < columns.value.length; c++) {
      const col = columns.value[c];
      let startEl;
      if (col.type === 'groups') {
        startEl = nodeMap[`${c}-${col.selectedIndex}`];
      } else if (col.type === 'transactions') {
        startEl = nodeMap[`${c}-${activeTransactionIndex.value}`];
      }
      
      let endEl;
      if (c + 1 < columns.value.length) {
         const nextCol = columns.value[c + 1];
         if (nextCol.type === 'groups') {
            endEl = nodeMap[`${c + 1}-${nextCol.selectedIndex}`];
         } else if (nextCol.type === 'transactions') {
            endEl = nodeMap[`${c + 1}-${activeTransactionIndex.value}`];
         }
      } else {
         if (activeTransaction.value) {
            endEl = detailsRef.value;
         }
      }
      
      if (startEl && endEl) {
         paths.value.push(getPath(startEl, endEl, wrapperRef.value));
      }
    }
  });
};

function selectGroup(depth, key) {
  localDrillExtensions.value = localDrillExtensions.value.slice(0, depth);
  localDrillExtensions.value[depth] = key;
  activeTransactionIndex.value = 0;
  nextTick(() => setTimeout(updatePaths, 50));
}

function selectTransaction(index) {
  activeTransactionIndex.value = index;
  nextTick(() => setTimeout(updatePaths, 50));
}

onMounted(() => {
  setTimeout(updatePaths, 100);
  window.addEventListener('resize', updatePaths);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updatePaths);
});

</script>

<style scoped>
.node-active {
  background-color: var(--theme-browser-chrome);
  border: 1px solid var(--theme-border);
  border-radius: 12px;
  padding: 16px 28px;
  color: var(--theme-text);
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
}

.node-inactive {
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 16px 28px;
  color: var(--theme-text-soft);
  opacity: 0.4;
}

.node-inactive:hover {
  opacity: 0.8;
}

.node-details {
  background-color: transparent;
  padding: 16px 28px;
}

.custom-scrollbar::-webkit-scrollbar {
  display: none;
}
.custom-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
