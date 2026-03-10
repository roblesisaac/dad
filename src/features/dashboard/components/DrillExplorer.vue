<template>
  <div class="w-full bg-white">
    <template v-if="isLeaf">
      <div v-if="transactions.length || hiddenItems.length">
        <div
          v-for="item in transactions"
          :key="item._id"
          class="relative group bg-[var(--theme-browser-chrome)] hover:bg-gray-50/50 transition-all duration-300"
        >
          <button
            @click="selectTransaction(item)"
            class="w-full px-6 py-6 bg-[var(--theme-browser-chrome)] flex items-center justify-between text-left cursor-pointer focus:outline-none"
            type="button"
          >
            <div class="min-w-0 flex-1 pr-4">
              <div class="text-[10px] font-black text-black uppercase tracking-widest mb-1">
                {{ transactionDate(item) }}
              </div>
              <div class="text-base font-black text-gray-900 uppercase tracking-tight truncate">
                {{ item.name }}
              </div>
              <div
                v-if="shouldShowLeafSortLabel(item) || item.pending || item.check_number"
                class="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                <span
                  v-if="shouldShowLeafSortLabel(item)"
                  class="px-2 py-1 group-count-badge rounded-lg tracking-widest text-[10px] font-black"
                >
                  {{ resolveLeafSortLabel(item) }}
                </span>
                <span v-if="item.pending">Pending</span>
                <span v-if="item.check_number">#{{ item.check_number }}</span>
              </div>
            </div>

            <div class="shrink-0 text-right">
              <span :class="[fontColor(item.amount), 'text-base font-black tracking-tight']">
                {{ formatPrice(item.amount, { toFixed: 0 }) }}
              </span>
            </div>
          </button>

          <div v-if="itemIsSelected(item._id)" class="border-t-2 border-gray-50 bg-gray-50/40">
            <TransactionDetails :state="state" :item="item" />
          </div>
        </div>

        <HiddenItemsSection
          :items="hiddenItems"
          :with-horizontal-padding="true"
        />
      </div>

      <div
        v-else
        class="py-12 text-center text-[10px] font-black uppercase tracking-widest text-black"
      >
        No transactions in this level
      </div>
    </template>

    <template v-else>
      <div
        v-for="group in groups"
        :key="group.key"
        class="relative group bg-[var(--theme-browser-chrome)] hover:bg-gray-50/50 transition-all duration-300"
      >
        <button
          class="flex items-center bg-[var(--theme-browser-chrome)] justify-between w-full py-6 text-left cursor-pointer focus:outline-none"
          type="button"
          @click="emit('group-selected', group)"
        >
          <div class="flex items-center gap-4 flex-1 min-w-0">
            <span class="text-base font-black text-gray-900 uppercase tracking-tight truncate group-hover:text-black transition-colors">
              {{ group.label }}
            </span>
            <!-- Group Count Section -->
            <div class="flex items-center gap-1.5 shrink-0">
              <span v-if="group.count > 0" class="px-2 py-1 text-[10px] font-black group-count-badge rounded-lg uppercase tracking-widest transition-colors shrink-0">
                {{ group.count }}
              </span>
              <span
                v-if="shouldShowGroupSortLabel(group)"
                class="px-2 py-1 text-[10px] font-black group-count-badge rounded-lg tracking-widest transition-colors shrink-0"
              >
                {{ resolveGroupSortLabel(group) }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-4 ml-4 shrink-0">
            <div class="text-right">
              <span :class="[fontColor(group.total), 'text-base font-black tracking-tight']">
                {{ formatPrice(group.total, { toFixed: 0 }) }}
              </span>
            </div>
          </div>
        </button>
      </div>

      <HiddenItemsSection :items="hiddenItems" />
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useUtils } from '@/shared/composables/useUtils';
import TransactionDetails from './TransactionDetails.vue';
import HiddenItemsSection from './HiddenItemsSection.vue';

const props = defineProps({
  groups: {
    type: Array,
    default: () => []
  },
  transactions: {
    type: Array,
    default: () => []
  },
  hiddenItems: {
    type: Array,
    default: () => []
  },
  isLeaf: {
    type: Boolean,
    default: false
  },
  groupByMode: {
    type: String,
    default: 'none'
  },
  sortProperty: {
    type: String,
    default: 'date'
  },
  sortDirection: {
    type: String,
    default: 'desc'
  }
});

const emit = defineEmits(['group-selected']);
const { state } = useDashboardState();
const { fontColor, formatPrice } = useUtils();
const normalizedGroupByMode = computed(() => String(props.groupByMode || '').trim().toLowerCase());

function primaryLabel(item) {
  const normalizedPrimaryLabel = (rawValue) => {
    if (Array.isArray(rawValue)) {
      return rawValue
        .map(label => String(label || '').trim())
        .find(Boolean) || '';
    }

    if (typeof rawValue === 'string') {
      return rawValue.trim();
    }

    return '';
  };

  const fromLabels = normalizedPrimaryLabel(item?.labels);
  if (fromLabels) {
    return fromLabels;
  }

  return '';
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

function shouldShowGroupSortLabel(group) {
  const resolvedGroupSortLabel = resolveGroupSortLabel(group);
  return Boolean(
    normalizedGroupByMode.value !== 'label'
    && resolvedGroupSortLabel
  );
}

function resolveLeafSortLabel(item) {
  return primaryLabel(item) || 'unlabeled';
}

function resolveGroupSortLabel(group) {
  const explicitSortLabel = String(group?.sortLabel || '').trim();
  if (explicitSortLabel) {
    return explicitSortLabel;
  }

  const groupItems = Array.isArray(group?.items) ? group.items : [];
  if (groupItems.length) {
    return resolveLeafSortLabel(groupItems[0]);
  }

  const originalItems = Array.isArray(group?.originalItems) ? group.originalItems : [];
  if (originalItems.length) {
    return resolveLeafSortLabel(originalItems[0]);
  }

  return '';
}

function shouldShowLeafSortLabel(item) {
  return Boolean(
    normalizedGroupByMode.value === 'none'
    && resolveLeafSortLabel(item)
  );
}
</script>

<style scoped>
.group-count-badge {
  background-color: #f9fafb;
  color: #9ca3af;
  /* border: 1px solid #f3f4f6; */
}

.group:hover .group-count-badge {
  color: #000000;
  border-color: #000000;
}

[data-theme='dark'] .group-count-badge {
  background-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  /* border-color: rgba(255, 255, 255, 0.2); */
}

[data-theme='dark'] .group:hover .group-count-badge {
  color: #ffffff;
  /* border-color: #ffffff; */
}

[data-theme='bw'] .group-count-badge {
  background-color: rgba(0, 0, 0, 0.05);
  color: #000000;
  /* border-color: #000000; */
}
</style>
