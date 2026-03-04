<template>
  <section class="w-full transaction-search-view">
    <div class="search-panel rounded-2xl border p-4 sm:p-5">
      <label class="block">
        <span class="search-label text-[10px] font-black uppercase tracking-[0.2em]">
          Keyword
        </span>

        <div class="search-input-wrap mt-2 flex items-center gap-2 rounded-xl border px-3 py-2">
          <Search class="h-4 w-4 search-muted shrink-0" />
          <input
            v-model="keyword"
            type="text"
            class="w-full bg-transparent text-sm font-black tracking-tight search-input focus:outline-none"
            placeholder="Search transactions, merchant names, notes, or categories"
            @keydown.enter.prevent="executeSearch"
          />
        </div>
      </label>

      <p class="search-muted mt-3 text-xs">
        Searches all accounts and all dates for matching transactions.
      </p>

      <div class="mt-4 min-h-[2.5rem] flex items-center justify-end">
        <button
          v-if="canSearch"
          type="button"
          class="search-button rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="isSearching"
          @click="executeSearch"
        >
          {{ isSearching ? 'Searching...' : 'Search' }}
        </button>
      </div>
    </div>

    <div v-if="searchError" class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ searchError }}
    </div>

    <div v-else-if="isSearching" class="mt-8 flex justify-center">
      <LoadingDots />
    </div>

    <div
      v-else-if="hasSearched && !results.length"
      class="mt-8 py-10 text-center text-[10px] font-black uppercase tracking-[0.2em] search-muted"
    >
      No matching transactions
    </div>

    <div v-else-if="results.length" class="mt-4">
      <p class="mb-2 text-[10px] font-black uppercase tracking-[0.16em] search-muted">
        Showing {{ results.length }} of {{ pagination.total }} matches
      </p>

      <div class="overflow-hidden rounded-2xl border search-border">
        <article
          v-for="transaction in results"
          :key="transactionKey(transaction)"
          class="search-row border-b search-border last:border-b-0"
        >
          <div class="px-4 py-4 sm:px-5 sm:py-5 flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="text-[10px] font-black uppercase tracking-[0.16em] search-muted">
                {{ transactionDate(transaction) }}
              </div>

              <div class="mt-1 text-base font-black uppercase tracking-tight truncate search-text">
                {{ transactionTitle(transaction) }}
              </div>

              <div class="mt-1 text-[10px] font-black uppercase tracking-[0.16em] search-muted truncate">
                {{ transactionCategory(transaction) }}
              </div>

              <div
                v-if="transactionMerchant(transaction)"
                class="mt-1 text-[10px] font-black uppercase tracking-[0.16em] search-muted truncate"
              >
                {{ transactionMerchant(transaction) }}
              </div>
            </div>

            <div class="shrink-0 text-right">
              <span :class="[fontColor(transactionAmount(transaction)), 'text-base font-black tracking-tight']">
                {{ formatPrice(transactionAmount(transaction), { toFixed: 0 }) }}
              </span>
            </div>
          </div>
        </article>
      </div>

      <div v-if="isLoadingMore" class="mt-6 flex justify-center">
        <LoadingDots />
      </div>

      <div
        v-if="canLoadMore"
        ref="loadMoreSentinel"
        class="h-8"
        aria-hidden="true"
      />
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { Search } from 'lucide-vue-next';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import { useApi } from '@/shared/composables/useApi.js';
import { useUtils } from '@/shared/composables/useUtils.js';

const SEARCH_LIMIT = 100;

const api = useApi();
const { fontColor, formatPrice } = useUtils();

const keyword = ref('');
const activeKeyword = ref('');
const results = ref([]);
const hasSearched = ref(false);
const isSearching = ref(false);
const isLoadingMore = ref(false);
const searchError = ref('');
const loadMoreSentinel = ref(null);
const loadMoreObserver = ref(null);
const pagination = ref({
  offset: 0,
  limit: SEARCH_LIMIT,
  nextOffset: null,
  hasMore: false,
  total: 0
});

const trimmedKeyword = computed(() => keyword.value.trim());
const canSearch = computed(() => trimmedKeyword.value.length > 0);
const canLoadMore = computed(() => (
  hasSearched.value
  && pagination.value.hasMore
  && Number.isFinite(pagination.value.nextOffset)
  && !isSearching.value
  && !isLoadingMore.value
  && !searchError.value
));

function transactionKey(transaction) {
  return transaction?.transaction_id || transaction?._id || `${transaction?.account_id || ''}-${transaction?.authorized_date || transaction?.date || ''}-${transaction?.amount || ''}-${transaction?.name || ''}`;
}

function transactionDate(transaction) {
  return transaction?.authorized_date || transaction?.date || 'Unknown date';
}

function normalizeCategoryValue(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(' / ');
  }

  if (typeof value === 'string') {
    return value.replaceAll(',', ' / ');
  }

  return '';
}

function prettyCategory(value) {
  if (!value) return '';
  return value
    .split('_')
    .join(' ')
    .trim();
}

function transactionCategory(transaction) {
  const category = normalizeCategoryValue(transaction?.category);
  if (category) return category;

  const detailed = prettyCategory(transaction?.personal_finance_category?.detailed);
  if (detailed) return detailed;

  const primary = prettyCategory(transaction?.personal_finance_category?.primary);
  if (primary) return primary;

  return 'Uncategorized';
}

function transactionTitle(transaction) {
  return transaction?.name || transaction?.merchant_name || 'Unnamed transaction';
}

function transactionMerchant(transaction) {
  if (!transaction?.merchant_name) {
    return '';
  }

  if (transaction.merchant_name === transactionTitle(transaction)) {
    return '';
  }

  return transaction.merchant_name;
}

function transactionAmount(transaction) {
  const parsed = Number(transaction?.amount);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePagination(paginationResponse = {}, fallbackOffset = 0, fallbackLimit = SEARCH_LIMIT) {
  const nextOffsetRaw = Number(paginationResponse?.nextOffset);
  const hasNextOffset = Number.isFinite(nextOffsetRaw) && nextOffsetRaw >= 0;
  const hasMore = Boolean(paginationResponse?.hasMore && hasNextOffset);

  return {
    offset: Number.isFinite(Number(paginationResponse?.offset))
      ? Number(paginationResponse.offset)
      : fallbackOffset,
    limit: Number.isFinite(Number(paginationResponse?.limit))
      ? Number(paginationResponse.limit)
      : fallbackLimit,
    nextOffset: hasMore ? nextOffsetRaw : null,
    hasMore,
    total: Number.isFinite(Number(paginationResponse?.total))
      ? Number(paginationResponse.total)
      : 0
  };
}

async function fetchSearchPage({ keywordValue, offset = 0 }) {
  const params = new URLSearchParams({
    keyword: keywordValue,
    offset: String(offset),
    limit: String(SEARCH_LIMIT)
  });

  return await api.get(`plaid/transactions/search?${params.toString()}`);
}

function disconnectObserver() {
  if (loadMoreObserver.value) {
    loadMoreObserver.value.disconnect();
    loadMoreObserver.value = null;
  }
}

async function executeSearch() {
  const keywordValue = trimmedKeyword.value;
  if (!keywordValue) {
    return;
  }

  hasSearched.value = true;
  activeKeyword.value = keywordValue;
  searchError.value = '';
  results.value = [];
  pagination.value = {
    offset: 0,
    limit: SEARCH_LIMIT,
    nextOffset: null,
    hasMore: false,
    total: 0
  };
  isSearching.value = true;

  try {
    const response = await fetchSearchPage({
      keywordValue,
      offset: 0
    });
    const nextItems = Array.isArray(response?.items) ? response.items : [];
    results.value = nextItems;
    pagination.value = normalizePagination(response?.pagination, 0, SEARCH_LIMIT);
  } catch (error) {
    searchError.value = error?.response?.data?.message || 'Unable to search transactions right now.';
  } finally {
    isSearching.value = false;
    await nextTick();
  }
}

async function loadMoreResults() {
  if (!canLoadMore.value) {
    return;
  }

  const nextOffset = Number(pagination.value.nextOffset);
  if (!Number.isFinite(nextOffset) || nextOffset < 0 || !activeKeyword.value) {
    return;
  }

  isLoadingMore.value = true;

  try {
    const response = await fetchSearchPage({
      keywordValue: activeKeyword.value,
      offset: nextOffset
    });
    const nextItems = Array.isArray(response?.items) ? response.items : [];
    results.value = [...results.value, ...nextItems];
    pagination.value = normalizePagination(response?.pagination, nextOffset, SEARCH_LIMIT);
  } catch (error) {
    searchError.value = error?.response?.data?.message || 'Unable to load more transactions.';
  } finally {
    isLoadingMore.value = false;
  }
}

watch(
  [loadMoreSentinel, canLoadMore],
  async ([sentinelElement, canObserve]) => {
    disconnectObserver();

    if (!sentinelElement || !canObserve) {
      return;
    }

    await nextTick();

    loadMoreObserver.value = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void loadMoreResults();
            return;
          }
        }
      },
      {
        root: null,
        rootMargin: '320px 0px',
        threshold: 0
      }
    );

    loadMoreObserver.value.observe(sentinelElement);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  disconnectObserver();
});
</script>

<style scoped>
.transaction-search-view {
  color: var(--theme-text);
}

.search-panel {
  border-color: var(--theme-border);
  background: var(--theme-bg);
}

.search-label {
  color: var(--theme-text-soft);
}

.search-input-wrap {
  border-color: var(--theme-border);
  background: var(--theme-bg);
}

.search-input {
  color: var(--theme-text);
}

.search-input::placeholder {
  color: var(--theme-text-soft);
}

.search-button {
  border: 1px solid var(--theme-border);
  background: var(--theme-bg);
  color: var(--theme-text);
}

.search-button:hover {
  background: var(--theme-bg-soft);
}

.search-border {
  border-color: var(--theme-border);
}

.search-row {
  background: inherit;
}

.search-row:hover {
  background: var(--theme-bg-soft);
}

.search-text {
  color: var(--theme-text);
}

.search-muted {
  color: var(--theme-text-soft);
}
</style>
