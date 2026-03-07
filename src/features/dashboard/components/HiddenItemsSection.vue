<template>
  <div v-if="hiddenItems.length" class="hidden-items-section">
    <div
      :class="[
        'flex items-center bg-[var(--theme-browser-chrome)] justify-between w-full py-6 transition-colors group focus:outline-none cursor-pointer select-none',
        rowPaddingClass
      ]"
      role="button"
      tabindex="0"
      @click="toggleHiddenItems"
      @keydown.enter.prevent="toggleHiddenItems"
      @keydown.space.prevent="toggleHiddenItems"
      @mousedown="handleHeaderMouseDown"
      @mousemove="handleHeaderMouseMove"
      @mouseup="handleHeaderMouseUp"
      @mouseleave="handleHeaderMouseLeave"
      @touchstart.passive="handleHeaderTouchStart"
      @touchmove.passive="handleHeaderTouchMove"
      @touchend="handleHeaderTouchEnd"
      @touchcancel="clearLongPressTimer"
    >
      <h2 class="text-[12px] font-black uppercase tracking-widest hidden-tone-soft">
        {{ hiddenItems.length }} hidden items totaling {{ formatPrice(hiddenItemsTotal, { toFixed: 0 }) }}
      </h2>

      <div class="flex items-center gap-2">
        <button
          v-if="showHiddenItems && showGroupByControl"
          type="button"
          class="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hidden-groupby-button transition-colors"
          @click.stop="cycleHiddenItemsGroupBy"
        >
          Group by {{ nextHiddenItemsGroupBy }}
        </button>

        <div class="hidden-tone-faint transition-colors">
          <ChevronUp v-if="showHiddenItems" class="w-4 h-4" />
          <ChevronDown v-else class="w-4 h-4" />
        </div>
      </div>
    </div>

    <div v-if="showHiddenItems">
      <template v-if="hiddenItemsGroupBy === 'name'">
        <div
          v-for="item in hiddenItemsByName"
          :key="hiddenItemKey(item)"
          class="relative group bg-gray-50/30 hover:bg-gray-50 transition-all duration-300 opacity-80 hover:opacity-95"
        >

          <button
            :class="[
              'w-full py-6 bg-[var(--theme-browser-chrome)] flex items-center justify-between text-left cursor-pointer focus:outline-none',
              rowPaddingClass
            ]"
            type="button"
            @click="selectTransaction(item)"
          >
            <div class="min-w-0 flex-1 pr-4">
              <div class="text-[10px] font-black hidden-tone-soft uppercase tracking-widest mb-1">
                {{ transactionDate(item) }}
              </div>
              <div class="text-base font-black hidden-tone-main uppercase tracking-tight truncate">
                {{ item.name }}
              </div>
              <div class="mt-2 text-[10px] font-black uppercase tracking-widest hidden-tone-faint">
                Excluded by tab filters
              </div>
              <div
                v-if="item.pending || item.check_number"
                class="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hidden-tone-faint"
              >
                <span v-if="item.pending">Pending</span>
                <span v-if="item.check_number">#{{ item.check_number }}</span>
              </div>
            </div>

            <div class="shrink-0 text-right">
              <span class="text-base font-black tracking-tight hidden-tone-main">
                {{ formatPrice(item.amount, { toFixed: 0 }) }}
              </span>
            </div>
          </button>

          <div v-if="itemIsSelected(item._id)" class="bg-gray-50/40">
            <TransactionDetails :state="state" :item="item" />
          </div>
        </div>
      </template>

      <template v-else>
        <div
          v-for="group in hiddenItemGroups"
          :key="group.key"
        >
          <div class="relative group bg-[var(--theme-browser-chrome)] hover:bg-gray-50/50 transition-all duration-300 opacity-85 hover:opacity-95">

            <button
              :class="[
                'flex items-center bg-[var(--theme-browser-chrome)] justify-between w-full py-6 text-left cursor-pointer focus:outline-none',
                rowPaddingClass
              ]"
              type="button"
              @click="toggleGroupExpanded(group.key)"
            >
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <span class="text-base font-black hidden-tone-main uppercase tracking-tight truncate transition-colors">
                  {{ group.label }}
                </span>
                <span
                  v-if="isGroupExpanded(group.key)"
                  class="text-[10px] font-black hidden-tone-soft uppercase tracking-widest shrink-0"
                >
                  ({{ group.items.length }})
                </span>
              </div>

              <div class="flex items-center gap-3 ml-4 shrink-0">
                <span class="text-base font-black tracking-tight hidden-tone-main">
                  {{ formatPrice(group.total, { toFixed: 0 }) }}
                </span>
                <ChevronUp v-if="isGroupExpanded(group.key)" class="w-4 h-4 hidden-tone-faint" />
                <ChevronDown v-else class="w-4 h-4 hidden-tone-faint" />
              </div>
            </button>
          </div>

          <div
            v-if="isGroupExpanded(group.key)"
            :class="nestedRowsIndentClass"
          >
            <div
              v-for="item in group.items"
              :key="hiddenItemKey(item)"
              class="relative group bg-gray-50/30 hover:bg-gray-50 transition-all duration-300 opacity-80 hover:opacity-95"
            >

              <button
                :class="[
                  'w-full py-6 bg-[var(--theme-browser-chrome)] flex items-center justify-between text-left cursor-pointer focus:outline-none',
                  rowPaddingClass
                ]"
                type="button"
                @click="selectTransaction(item)"
              >
                <div class="min-w-0 flex-1 pr-4">
                  <div class="text-[10px] font-black hidden-tone-soft uppercase tracking-widest mb-1">
                    {{ transactionDate(item) }}
                  </div>
                  <div class="text-base font-black hidden-tone-main uppercase tracking-tight truncate">
                    {{ item.name }}
                  </div>
                  <div class="mt-2 text-[10px] font-black uppercase tracking-widest hidden-tone-faint">
                    Excluded by tab filters
                  </div>
                  <div
                    v-if="item.pending || item.check_number"
                    class="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hidden-tone-faint"
                  >
                    <span v-if="item.pending">Pending</span>
                    <span v-if="item.check_number">#{{ item.check_number }}</span>
                  </div>
                </div>

                <div class="shrink-0 text-right">
                  <span class="text-base font-black tracking-tight hidden-tone-main">
                    {{ formatPrice(item.amount, { toFixed: 0 }) }}
                  </span>
                </div>
              </button>

              <div v-if="itemIsSelected(item._id)" class="bg-gray-50/40">
                <TransactionDetails :state="state" :item="item" />
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { format, isValid, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-vue-next';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useUtils } from '@/shared/composables/useUtils';
import { buildTabRulesForId } from '@/features/tabs/utils/tabEvaluator.js';
import { resolveAmountZeroHiddenFilter } from '@/features/tabs/utils/amountZeroFilter.js';
import TransactionDetails from './TransactionDetails.vue';

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  withHorizontalPadding: {
    type: Boolean,
    default: false
  }
});

const { state } = useDashboardState();
const { formatPrice } = useUtils();
const showHiddenItems = ref(false);
const showGroupByControl = ref(false);
const hiddenItemsGroupBy = ref('category');
const expandedGroupKeys = ref([]);
const longPressTimeoutId = ref(null);
const longPressStart = ref({ x: 0, y: 0 });
const lastLongPressTimestamp = ref(0);

const GROUP_BY_OPTIONS = ['category', 'name', 'date'];
const LONG_PRESS_DURATION_MS = 450;
const LONG_PRESS_MOVE_THRESHOLD_PX = 8;

const rowPaddingClass = computed(() => (props.withHorizontalPadding ? 'px-6' : ''));
const nestedRowsIndentClass = computed(() => (props.withHorizontalPadding ? 'pl-4' : 'pl-3'));
const sourceHiddenItems = computed(() => (Array.isArray(props.items) ? props.items : []));
const hiddenAmountFilter = computed(() => {
  const selectedTabId = state.selected.tab?._id;
  if (!selectedTabId) {
    return null;
  }

  const tabRules = buildTabRulesForId(state.allUserRules, selectedTabId);
  return resolveAmountZeroHiddenFilter(tabRules);
});
const hiddenItems = computed(() => {
  const amountFilter = hiddenAmountFilter.value;
  if (!amountFilter?.predicate) {
    return sourceHiddenItems.value;
  }

  return sourceHiddenItems.value.filter((item) => {
    const amount = Number(item?.amount);
    return Number.isFinite(amount) && amountFilter.predicate(amount);
  });
});
const hiddenItemsTotal = computed(() => {
  return hiddenItems.value.reduce((total, item) => total + toSafeAmount(item?.amount), 0);
});
const hiddenItemsByName = computed(() => {
  return [...hiddenItems.value].sort((itemA, itemB) => {
    const nameSort = String(itemA?.name || '').localeCompare(String(itemB?.name || ''));
    if (nameSort !== 0) {
      return nameSort;
    }

    return sortHiddenItemsByDateDesc(itemA, itemB);
  });
});
const hiddenItemGroups = computed(() => {
  if (hiddenItemsGroupBy.value === 'name') {
    return [];
  }

  const groupedHiddenItems = new Map();

  hiddenItems.value.forEach((item) => {
    const groupMeta = hiddenItemGroupMeta(item, hiddenItemsGroupBy.value);
    const existingGroup = groupedHiddenItems.get(groupMeta.key);
    const safeAmount = toSafeAmount(item?.amount);

    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.total += safeAmount;
      return;
    }

    groupedHiddenItems.set(groupMeta.key, {
      key: groupMeta.key,
      label: groupMeta.label,
      sortValue: groupMeta.sortValue,
      total: safeAmount,
      items: [item]
    });
  });

  const groups = Array.from(groupedHiddenItems.values());
  groups.forEach((group) => {
    group.items.sort(sortHiddenItemsByDateDesc);
  });

  if (hiddenItemsGroupBy.value === 'date') {
    groups.sort((groupA, groupB) => {
      if (groupA.sortValue !== groupB.sortValue) {
        return groupB.sortValue - groupA.sortValue;
      }

      return groupA.label.localeCompare(groupB.label);
    });
  } else {
    groups.sort((groupA, groupB) => groupA.label.localeCompare(groupB.label));
  }

  return groups;
});
const nextHiddenItemsGroupBy = computed(() => {
  const currentIndex = GROUP_BY_OPTIONS.indexOf(hiddenItemsGroupBy.value);
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (safeCurrentIndex + 1) % GROUP_BY_OPTIONS.length;
  return GROUP_BY_OPTIONS[nextIndex];
});

function toSafeAmount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hiddenItemGroupMeta(item, groupByMode) {
  if (groupByMode === 'date') {
    const { label, sortValue } = hiddenItemDateMeta(item);
    return {
      key: label,
      label,
      sortValue
    };
  }

  const category = String(item?.personal_finance_category?.primary || 'misc').trim() || 'misc';
  return {
    key: category.toLowerCase(),
    label: category,
    sortValue: 0
  };
}

function hiddenItemDateMeta(item) {
  const rawDate = transactionDate(item);
  if (!rawDate) {
    return { label: 'unknown date', sortValue: 0 };
  }

  const parsedDate = parseISO(rawDate);
  if (!isValid(parsedDate)) {
    return { label: 'unknown date', sortValue: 0 };
  }

  return {
    label: `${format(parsedDate, 'yyyy')}, ${format(parsedDate, 'MMM d')}`,
    sortValue: parsedDate.getTime()
  };
}

function hiddenItemKey(item) {
  return item?._id
    || item?.transaction_id
    || `${item?.account_id || ''}-${transactionDate(item)}-${item?.amount || ''}-${item?.name || ''}`;
}

function sortHiddenItemsByDateDesc(itemA, itemB) {
  const dateA = hiddenItemDateMeta(itemA).sortValue;
  const dateB = hiddenItemDateMeta(itemB).sortValue;
  if (dateA !== dateB) {
    return dateB - dateA;
  }

  return String(itemA?.name || '').localeCompare(String(itemB?.name || ''));
}

function resetGroupingState() {
  hiddenItemsGroupBy.value = 'category';
  showGroupByControl.value = false;
  expandedGroupKeys.value = [];
}

function toggleHiddenItems() {
  if (Date.now() - lastLongPressTimestamp.value < 500) {
    lastLongPressTimestamp.value = 0;
    return;
  }

  const nextOpen = !showHiddenItems.value;
  showHiddenItems.value = nextOpen;

  if (nextOpen) {
    resetGroupingState();
    return;
  }

  resetGroupingState();
}

function cycleHiddenItemsGroupBy() {
  const currentIndex = GROUP_BY_OPTIONS.indexOf(hiddenItemsGroupBy.value);
  const nextIndex = (currentIndex + 1) % GROUP_BY_OPTIONS.length;
  hiddenItemsGroupBy.value = GROUP_BY_OPTIONS[nextIndex];
  expandedGroupKeys.value = [];
}

function isGroupExpanded(groupKey) {
  return expandedGroupKeys.value.includes(groupKey);
}

function toggleGroupExpanded(groupKey) {
  if (isGroupExpanded(groupKey)) {
    expandedGroupKeys.value = expandedGroupKeys.value.filter(key => key !== groupKey);
    return;
  }

  expandedGroupKeys.value = [...expandedGroupKeys.value, groupKey];
}

function clearLongPressTimer() {
  if (longPressTimeoutId.value) {
    clearTimeout(longPressTimeoutId.value);
    longPressTimeoutId.value = null;
  }
}

function triggerLongPress() {
  if (!showHiddenItems.value) {
    return;
  }

  showGroupByControl.value = true;
  lastLongPressTimestamp.value = Date.now();
}

function startLongPress(clientX, clientY) {
  if (!showHiddenItems.value) {
    return;
  }

  longPressStart.value = { x: clientX, y: clientY };
  clearLongPressTimer();
  longPressTimeoutId.value = setTimeout(() => {
    triggerLongPress();
    longPressTimeoutId.value = null;
  }, LONG_PRESS_DURATION_MS);
}

function shouldIgnoreLongPressTarget(event) {
  const target = event?.target;
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest('button, input, select, textarea, a, label'));
}

function handleHeaderMouseDown(event) {
  if (event.button !== 0 || shouldIgnoreLongPressTarget(event)) {
    return;
  }

  startLongPress(event.clientX, event.clientY);
}

function handleHeaderMouseMove(event) {
  if (!longPressTimeoutId.value) return;

  const deltaX = Math.abs(event.clientX - longPressStart.value.x);
  const deltaY = Math.abs(event.clientY - longPressStart.value.y);

  if (deltaX > LONG_PRESS_MOVE_THRESHOLD_PX || deltaY > LONG_PRESS_MOVE_THRESHOLD_PX) {
    clearLongPressTimer();
  }
}

function handleHeaderMouseUp() {
  clearLongPressTimer();
}

function handleHeaderMouseLeave() {
  clearLongPressTimer();
}

function handleHeaderTouchStart(event) {
  if (shouldIgnoreLongPressTarget(event)) {
    return;
  }

  const touch = event.touches?.[0];
  if (!touch) {
    return;
  }

  startLongPress(touch.clientX, touch.clientY);
}

function handleHeaderTouchMove(event) {
  if (!longPressTimeoutId.value) return;

  const touch = event.touches?.[0];
  if (!touch) return;

  const deltaX = Math.abs(touch.clientX - longPressStart.value.x);
  const deltaY = Math.abs(touch.clientY - longPressStart.value.y);

  if (deltaX > LONG_PRESS_MOVE_THRESHOLD_PX || deltaY > LONG_PRESS_MOVE_THRESHOLD_PX) {
    clearLongPressTimer();
  }
}

function handleHeaderTouchEnd() {
  clearLongPressTimer();
}

function itemIsSelected(itemId) {
  return state.selected.transaction?._id === itemId;
}

function selectTransaction(item) {
  if (itemIsSelected(item._id)) {
    state.selected.transaction = false;
    return;
  }

  state.selected.transaction = item;
}

function transactionDate(item) {
  return item?.authorized_date || item?.date || '';
}

watch(
  () => state.selected.tab?._id,
  () => {
    showHiddenItems.value = false;
    lastLongPressTimestamp.value = 0;
    clearLongPressTimer();
    resetGroupingState();
  }
);

watch(
  () => hiddenItems.value.length,
  (hiddenCount) => {
    if (!hiddenCount) {
      showHiddenItems.value = false;
      lastLongPressTimestamp.value = 0;
      clearLongPressTimer();
      resetGroupingState();
    }
  }
);

onBeforeUnmount(() => {
  clearLongPressTimer();
});
</script>

<style>
.hidden-items-section {
  --hidden-tone-main: rgba(75, 85, 99, 0.92);
  --hidden-tone-soft: rgba(107, 114, 128, 0.9);
  --hidden-tone-faint: rgba(156, 163, 175, 0.9);
  --hidden-groupby-hover: rgba(75, 85, 99, 0.96);
}

[data-theme='dark'] .hidden-items-section {
  --hidden-tone-main: rgba(255, 255, 255, 0.62);
  --hidden-tone-soft: rgba(255, 255, 255, 0.52);
  --hidden-tone-faint: rgba(255, 255, 255, 0.42);
  --hidden-groupby-hover: rgba(255, 255, 255, 0.74);
}

[data-theme='bw'] .hidden-items-section {
  --hidden-tone-main: rgba(0, 0, 0, 0.62);
  --hidden-tone-soft: rgba(0, 0, 0, 0.42);
  --hidden-tone-faint: rgba(0, 0, 0, 0.28);
  --hidden-groupby-hover: rgba(0, 0, 0, 0.84);
}

.hidden-items-section .hidden-tone-main {
  color: var(--hidden-tone-main) !important;
}

.hidden-items-section .hidden-tone-soft {
  color: var(--hidden-tone-soft) !important;
}

.hidden-items-section .hidden-tone-faint {
  color: var(--hidden-tone-faint) !important;
}

.hidden-items-section .hidden-groupby-button {
  color: var(--hidden-tone-soft) !important;
}

.hidden-items-section .hidden-groupby-button:hover {
  color: var(--hidden-groupby-hover) !important;
}
</style>
