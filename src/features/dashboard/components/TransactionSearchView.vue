<template>
  <section class="w-full transaction-search-view">
    <div class="search-panel">
      <label class="block">
        <span class="search-label text-[10px] font-black uppercase tracking-[0.2em]">
          Keyword
        </span>

        <div class="search-input-wrap mt-2 flex items-center gap-2 px-3 py-2">
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
          class="search-button px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="isSearching"
          @click="executeSearch"
        >
          {{ isSearching ? 'Searching...' : 'Search' }}
        </button>
      </div>
    </div>

    <div v-if="searchError" class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-black-700">
      {{ searchError }}
    </div>

    <div v-else-if="isSearching" class="mt-8 flex flex-col items-center gap-2">
      <LoadingDots />
      <p
        v-if="showDeepScanHint"
        class="text-[10px] font-black uppercase tracking-[0.16em] search-muted"
      >
        Digging deeper...
      </p>
    </div>

    <div
      v-else-if="hasSearched && !results.length"
      class="mt-8 py-10 text-center text-[10px] font-black uppercase tracking-[0.2em] search-muted"
    >
      No matching transactions
    </div>

    <div v-else-if="results.length" class="mt-4">
      <div class="search-results-summary mb-1 sticky top-12 sm:top-14 z-20 flex items-center justify-between gap-3 px-1 sm:px-2 py-2 text-[14px] font-black uppercase tracking-[0.16em] search-muted">
        <span>{{ results.length }} {{ results.length === 1 ? 'result' : 'results' }}</span>
        <span>{{ formatPrice(totalMatchingAmount, { toFixed: 0 }) }}</span>
      </div>

      <div class="search-results">
        <article
          v-for="transaction in results"
          :key="transactionKey(transaction)"
          class="search-row border-b search-border last:border-b-0"
        >
          <div class="px-1 sm:px-2 flex items-start justify-between gap-3 py-5 w-full">
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
const DEEP_SCAN_HINT_DELAY_MS = 2500;
const AUTO_CONTINUE_GUARD_LIMIT = 100;

const api = useApi();
const { fontColor, formatPrice } = useUtils();

const keyword = ref('');
const activeKeyword = ref('');
const results = ref([]);
const hasSearched = ref(false);
const isSearching = ref(false);
const isLoadingMore = ref(false);
const showDeepScanHint = ref(false);
const searchError = ref('');
const loadMoreSentinel = ref(null);
const loadMoreObserver = ref(null);
const deepScanHintTimeoutId = ref(null);
const pagination = ref({
  limit: SEARCH_LIMIT,
  nextCursor: null,
  hasMore: false
});

const trimmedKeyword = computed(() => keyword.value.trim());
const canSearch = computed(() => trimmedKeyword.value.length > 0);
const totalMatchingAmount = computed(() => (
  results.value.reduce((sum, transaction) => sum + transactionAmount(transaction), 0)
));
const canLoadMore = computed(() => (
  hasSearched.value
  && pagination.value.hasMore
  && typeof pagination.value.nextCursor === 'string'
  && pagination.value.nextCursor.length > 0
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

function buildDefaultPagination() {
  return {
    limit: SEARCH_LIMIT,
    nextCursor: null,
    hasMore: false
  };
}

function normalizePagination(paginationResponse = {}, fallbackLimit = SEARCH_LIMIT) {
  const limitRaw = Number(paginationResponse?.limit);
  const normalizedLimit = Number.isFinite(limitRaw) && limitRaw > 0
    ? limitRaw
    : fallbackLimit;
  const nextCursorRaw = typeof paginationResponse?.nextCursor === 'string'
    ? paginationResponse.nextCursor.trim()
    : '';
  const hasMore = Boolean(paginationResponse?.hasMore && nextCursorRaw);

  return {
    limit: normalizedLimit,
    nextCursor: hasMore ? nextCursorRaw : null,
    hasMore
  };
}

async function fetchSearchPage({ keywordValue, cursor = null }) {
  const params = new URLSearchParams({
    keyword: keywordValue,
    limit: String(SEARCH_LIMIT)
  });

  if (cursor) {
    params.set('cursor', cursor);
  }

  return await api.get(`plaid/transactions/search?${params.toString()}`);
}

function clearDeepScanHintTimer() {
  if (deepScanHintTimeoutId.value) {
    clearTimeout(deepScanHintTimeoutId.value);
    deepScanHintTimeoutId.value = null;
  }
}

function startDeepScanHintTimer() {
  clearDeepScanHintTimer();
  showDeepScanHint.value = false;

  deepScanHintTimeoutId.value = setTimeout(() => {
    if (isSearching.value && results.value.length === 0) {
      showDeepScanHint.value = true;
    }
  }, DEEP_SCAN_HINT_DELAY_MS);
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
  pagination.value = buildDefaultPagination();
  isSearching.value = true;
  startDeepScanHintTimer();

  try {
    let cursor = null;
    const seenCursors = new Set();
    let attempts = 0;
    let resolved = false;

    while (attempts < AUTO_CONTINUE_GUARD_LIMIT) {
      attempts += 1;
      const response = await fetchSearchPage({
        keywordValue,
        cursor
      });
      const nextItems = Array.isArray(response?.items) ? response.items : [];
      pagination.value = normalizePagination(response?.pagination, SEARCH_LIMIT);

      if (nextItems.length > 0) {
        results.value = nextItems;
        resolved = true;
        break;
      }

      if (!pagination.value.hasMore || !pagination.value.nextCursor) {
        resolved = true;
        break;
      }

      cursor = pagination.value.nextCursor;
      if (seenCursors.has(cursor)) {
        throw new Error('Search cursor repeated while scanning results');
      }
      seenCursors.add(cursor);
    }

    if (!resolved) {
      throw new Error('Search pagination exceeded safe limit');
    }
  } catch (error) {
    searchError.value = error?.response?.data?.message || 'Unable to search transactions right now.';
  } finally {
    isSearching.value = false;
    showDeepScanHint.value = false;
    clearDeepScanHintTimer();
    await nextTick();
  }
}

async function loadMoreResults() {
  if (!canLoadMore.value) {
    return;
  }

  const nextCursor = typeof pagination.value.nextCursor === 'string'
    ? pagination.value.nextCursor
    : '';

  if (!nextCursor || !activeKeyword.value) {
    return;
  }

  isLoadingMore.value = true;

  try {
    let cursor = nextCursor;
    const seenCursors = new Set([cursor]);
    let attempts = 0;
    let resolved = false;

    while (attempts < AUTO_CONTINUE_GUARD_LIMIT) {
      attempts += 1;
      const response = await fetchSearchPage({
        keywordValue: activeKeyword.value,
        cursor
      });
      const nextItems = Array.isArray(response?.items) ? response.items : [];
      pagination.value = normalizePagination(response?.pagination, SEARCH_LIMIT);

      if (nextItems.length > 0) {
        results.value = [...results.value, ...nextItems];
        resolved = true;
        break;
      }

      if (!pagination.value.hasMore || !pagination.value.nextCursor) {
        resolved = true;
        break;
      }

      cursor = pagination.value.nextCursor;
      if (seenCursors.has(cursor)) {
        throw new Error('Search cursor repeated while loading more results');
      }
      seenCursors.add(cursor);
    }

    if (!resolved) {
      throw new Error('Search pagination exceeded safe limit');
    }
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
  clearDeepScanHintTimer();
});
</script>

<style scoped>
.transaction-search-view {
  color: var(--theme-text);
  background-color: inherit;
}

.search-panel {
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--theme-border);
  background-color: inherit;
}

.search-label {
  color: var(--theme-text-soft);
}

.search-input-wrap {
  border: 1px solid var(--theme-border);
  border-radius: 0.75rem;
  background-color: inherit;
}

.search-input-wrap:focus-within {
  border-color: var(--theme-text);
}

.search-input {
  color: var(--theme-text);
  background-color: inherit;
}

.search-input::placeholder {
  color: var(--theme-text-soft);
}

.search-button {
  border: 1px solid var(--theme-border);
  border-radius: 0.75rem;
  background-color: inherit;
  color: var(--theme-text);
}

.search-button:hover {
  background-color: var(--theme-bg-soft);
}

.search-border {
  border-color: var(--theme-border);
}

.search-results-summary {
  background-color: var(--theme-browser-chrome);
  border-bottom: 1px solid var(--theme-border);
}

.search-row {
  background-color: inherit;
  transition: background-color 150ms ease;
}

.search-row:hover {
  background-color: var(--theme-bg-soft);
}

.search-text {
  color: var(--theme-text);
}

.search-muted {
  color: var(--theme-text-soft);
}
</style>
