<template>
  <div class="transaction-details-container p-4 sm:p-8 flex flex-col items-center" style="background-color: var(--theme-browser-chrome); border-top: 1px solid var(--theme-border);">
    
    <!-- Receipt Paper -->
    <div class="receipt-paper w-full max-w-2xl flex flex-col rounded overflow-hidden" 
         style="background-color: var(--theme-bg); border: 1px solid var(--theme-border);">
      

      <!-- Main Receipt Content -->
      <div class="p-6 sm:p-10 flex flex-col gap-8">
        
        <!-- Header Section -->
        <div class="flex flex-col items-center text-center gap-2">
          <div class="text-[10px] font-black uppercase tracking-[0.4em]" style="color: var(--theme-text-soft);">Transaction Receipt</div>
          <h2 class="text-3xl sm:text-4xl font-black tracking-tight leading-tight pt-2" style="color: var(--theme-text);">
            {{ item.name }}
          </h2>
          <div class="text-sm font-medium mt-1" style="color: var(--theme-text-muted);">
            {{ item.authorized_date || item.date }}
          </div>
        </div>

        <!-- Divider -->
        <div class="border-t-2 border-dashed mx-4" style="border-color: var(--theme-border); opacity: 0.3;"></div>

        <!-- Amount Section -->
        <div class="flex flex-col items-center py-4">
          <div class="text-[10px] font-black uppercase tracking-widest mb-1" style="color: var(--theme-text-soft);">Amount Summary</div>
          <div class="text-5xl sm:text-6xl font-black" :class="item.amount < 0 ? 'text-black-500' : 'text-black-500'">
            {{ formatPrice(item.amount) }}
          </div>
        </div>

        <!-- Divider -->
        <div class="border-t-2 border-dashed mx-4" style="border-color: var(--theme-border); opacity: 0.3;"></div>

        <!-- Info Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12 px-2 py-2">
          
          <!-- Account Details -->
          <div class="flex flex-col gap-2">
            <h3 class="text-[10px] font-black uppercase tracking-widest" style="color: var(--theme-text-soft);">Account Source</h3>
            <div class="flex flex-col">
              <span class="text-base font-bold" style="color: var(--theme-text);">{{ accountData.name }}</span>
              <span class="text-xs" style="color: var(--theme-text-muted);">#{{ accountData.mask }} {{ accountName !== accountData.name ? `• ${accountName}` : '' }}</span>
            </div>
            <div class="flex items-center justify-between mt-2 pt-2 border-t text-[10px] uppercase font-bold tracking-wider" style="border-color: var(--theme-border); border-style: solid; border-width: 1px 0 0 0; opacity: 0.6;">
              <span style="color: var(--theme-text-muted);">Current Balance</span>
              <span style="color: var(--theme-text);">{{ formatPrice(accountData.balances?.current) }}</span>
            </div>
          </div>

          <!-- Transaction Logistics -->
          <div class="flex flex-col gap-2">
            <h3 class="text-[10px] font-black uppercase tracking-widest" style="color: var(--theme-text-soft);">Transaction Context</h3>
            <div class="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div class="text-[9px] font-bold uppercase opacity-60">Payment Channel</div>
                <div class="font-medium" style="color: var(--theme-text);">{{ item.payment_channel || 'Physical' }}</div>
              </div>
              <div>
                <div class="text-[9px] font-bold uppercase opacity-60">Settlement Status</div>
                <div class="font-medium flex items-center gap-1.5" :class="item.pending ? 'text-amber-500' : 'text-black-500'">
                  <div class="h-1.5 w-1.5 rounded-full" :class="item.pending ? 'bg-amber-500' : 'bg-emerald-500'"></div>
                  {{ item.pending ? 'Pending' : 'Settled' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Category -->
          <div class="flex flex-col gap-2 sm:col-span-2">
            <h3 class="text-[10px] font-black uppercase tracking-widest" style="color: var(--theme-text-soft);">Original Categorization</h3>
            <div class="text-sm font-medium p-4 rounded-xl border border-dashed" style="background-color: var(--theme-bg-soft); border-color: var(--theme-border); color: var(--theme-text);">
              {{ prettyCategory }}
            </div>
          </div>

        </div>

        <!-- Divider -->
        <div class="border-t-2 border-dashed mx-4" style="border-color: var(--theme-border); opacity: 0.3;"></div>

        <!-- Notes Section -->
        <div class="flex flex-col gap-4 px-2">
          <div class="flex items-center justify-between">
            <h3 class="text-[10px] font-black uppercase tracking-widest" style="color: var(--theme-text-soft);">Metadata & Notes</h3>
            <div v-if="item.notes" class="relative" data-notes-menu-surface>
              <button type="button" class="p-1.5 transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5" style="color: var(--theme-text-muted);" @click.stop="toggleNotesMenu">
                <MoreVertical class="h-5 w-5" />
              </button>
              <div v-if="showNotesMenu" class="absolute right-0 top-full mt-1 min-w-[160px] overflow-hidden rounded-xl border z-40" style="background-color: var(--theme-bg); border-color: var(--theme-border);" data-notes-menu-surface>
                <button type="button" class="w-full px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-black/5 dark:hover:bg-white/5" style="color: var(--theme-text);" @click.stop="openNotesEditor">
                  Edit Note
                </button>
              </div>
            </div>
          </div>
          
          <div v-if="item.notes" class="text-base font-mono p-6 rounded-2xl border bg-opacity-50 text-left leading-relaxed" style="background-color: var(--theme-bg-soft); color: var(--theme-text); border-color: var(--theme-border);">
            {{ item.notes }}
          </div>
          <div v-else class="flex">
            <button @click="openNotesEditor" class="text-[10px] font-black uppercase tracking-[0.25em] px-6 py-3 rounded-2xl transition-all border w-full sm:w-auto" style="background-color: var(--theme-bg); color: var(--theme-text-soft); border-color: var(--theme-border);">
              + Attach Memo
            </button>
          </div>
        </div>

        <!-- Recategorize Section -->
        <div class="flex flex-col gap-4 px-2">
          <div class="flex items-center justify-between">
            <h3 class="text-[10px] font-black uppercase tracking-widest" style="color: var(--theme-text-soft);">Re-categorize this item</h3>
            <div v-if="item.recategorizeAs" class="relative" data-category-menu-surface>
              <button type="button" class="p-1.5 transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5" style="color: var(--theme-text-muted);" @click.stop="toggleCategoryMenu">
                <MoreVertical class="h-5 w-5" />
              </button>
              <div v-if="showCategoryMenu" class="absolute right-0 top-full mt-1 min-w-[160px] overflow-hidden rounded-xl border z-40" style="background-color: var(--theme-bg); border-color: var(--theme-border);" data-category-menu-surface>
                <button type="button" class="w-full px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-black/5 dark:hover:bg-white/5" style="color: var(--theme-text);" @click.stop="openCategoryEditor">
                  Update Category
                </button>
              </div>
            </div>
          </div>
          
          <div v-if="item.recategorizeAs" class="text-lg font-black p-6 rounded-2xl border flex items-center justify-between" style="background-color: var(--theme-bg-soft); color: var(--theme-text); border-color: var(--theme-border);">
            <span>{{ item.recategorizeAs }}</span>
            <div class="h-2.5 w-2.5 rounded-full bg-blue-500"></div>
          </div>
          <div v-else class="flex">
            <button @click="openCategoryEditor" class="text-[10px] font-black uppercase tracking-[0.25em] px-6 py-3 rounded-2xl transition-all border w-full sm:w-auto" style="background-color: var(--theme-bg); color: var(--theme-text-soft); border-color: var(--theme-border);">
              + Manual classification
            </button>
          </div>
        </div>

        <!-- Rules Applied -->
        <div v-if="rulesAppliedToItem && rulesAppliedToItem.length" class="flex flex-col gap-4 px-2">
          <h3 class="text-[10px] font-black uppercase tracking-widest" style="color: var(--theme-text-soft);">Applied Rule Set</h3>
          <div class="flex flex-col gap-3">
            <div 
              v-for="rule in rulesAppliedToItem" 
              :key="rule._id" 
              class="group rounded-2xl p-4 border border-dashed transition-all hover:bg-black/5 dark:hover:bg-white/5"
              style="background-color: var(--theme-bg-soft); border-color: var(--theme-border);"
              @touchstart.passive="handleRuleRowTouchStart($event, rule)"
              @touchmove="handleRuleRowTouchMove"
              @touchend="handleRuleRowTouchEnd"
              @touchcancel="handleRuleRowTouchEnd"
              @mousedown="handleRuleRowMouseDown($event, rule)"
              @mousemove="handleRuleRowMouseMove"
              @mouseup="handleRuleRowMouseUp"
              @mouseleave="handleRuleRowMouseUp"
            >
              <div class="flex items-center justify-between gap-4">
                <RuleSyntaxDisplay :rule="rule" compact class="min-w-0 flex-1 opacity-80 group-hover:opacity-100" />
                <div class="relative flex shrink-0 items-center gap-1" data-rule-menu-surface>
                  <button
                    type="button"
                    class="rounded-full p-1.5 transition-all opacity-0 pointer-events-none hover:bg-black/5 group-hover:opacity-100 group-hover:pointer-events-auto"
                    :class="shouldShowRuleMenuTrigger(rule) ? 'opacity-100 pointer-events-auto' : ''"
                    style="color: var(--theme-text-muted);"
                    data-rule-menu-surface
                    @click.stop="toggleRuleActionsMenu(rule)"
                  >
                    <MoreVertical class="h-4 w-4" />
                  </button>

                  <div
                    v-if="activeRuleMenuId === ruleKey(rule)"
                    class="absolute right-0 top-full mt-1 min-w-[140px] overflow-hidden rounded-xl border z-40"
                    style="background-color: var(--theme-bg); border-color: var(--theme-border);"
                    data-rule-menu-surface
                  >
                    <button
                      type="button"
                      class="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style="color: var(--theme-text);"
                      @click.stop="handleRuleMenuAction('edit', rule)"
                    >
                      Edit Rule
                    </button>
                    <button
                      type="button"
                      class="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style="color: var(--theme-text);"
                      @click.stop="handleRuleMenuAction('copy', rule)"
                    >
                      Copy JSON
                    </button>
                    <button
                      type="button"
                      class="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                      style="color: #b91c1c;"
                      @click.stop="handleRuleMenuAction('delete', rule)"
                    >
                      Delete Rule
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Receipt Edge -->
        <div class="flex flex-col items-center gap-5 mt-8 pt-8 border-t-2 border-dashed" style="border-color: var(--theme-border); opacity: 0.3;">
          <div class="text-[10px] font-mono uppercase tracking-[0.5em]" style="color: var(--theme-text-soft);">Verification Complete</div>
          <div class="flex gap-2">
            <div v-for="n in 15" :key="n" class="h-1.5 w-1.5 rounded-full" style="background-color: var(--theme-text-soft); opacity: 0.15;"></div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <RuleEditModal
    v-if="showRuleEditor"
    :rule="activeRule"
    :is-new="isCreatingRule"
    :scope="activeRule?.applyForTabs?.includes('_GLOBAL') ? 'global' : 'tab'"
    @close="handleRuleEditorClose"
    @save="saveRule"
  />

  <!-- Notes Editor Modal -->
  <BaseModal
    v-if="showNotesEditor"
    :is-open="showNotesEditor"
    :content-padding="false"
    :show-close-button="false"
    :hide-header="true"
    @close="closeNotesEditor"
  >
    <template #content>
      <div class="flex flex-col min-h-screen w-full" style="background-color: var(--theme-bg); color: var(--theme-text);">
        <!-- Header -->
        <div class="px-6 py-5 flex justify-between items-center border-b" style="border-color: var(--theme-border);">
          <h2 class="text-xl font-bold tracking-tight">Notes</h2>
          <button @click="closeNotesEditor" class="p-2 transition-colors rounded-full hover:bg-black/10 dark:hover:bg-white/10" style="color: var(--theme-text);">
            <X class="w-6 h-6" />
          </button>
        </div>
        
        <div class="p-6 flex flex-col flex-1 gap-6">
          <textarea
            v-model="notesDraft"
            rows="6"
            class="w-full p-4 text-sm font-mono rounded-xl outline-none transition-all placeholder:text-gray-500 bg-transparent border focus:ring-1"
            style="border-color: var(--theme-border); color: var(--theme-text);"
            onfocus="this.style.borderColor='var(--theme-ring)'"
            onblur="this.style.borderColor='var(--theme-border)'"
            placeholder="Add notes about this transaction..."
          ></textarea>
          
          <div class="flex w-full gap-4 mt-auto mb-6">
            <button
              @click="closeNotesEditor"
              class="flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border"
              style="background-color: var(--theme-bg); color: var(--theme-text); border-color: var(--theme-text);"
            >
              Cancel
            </button>
            <button
              @click="saveNotes"
              class="flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent"
              style="background-color: var(--theme-text); color: var(--theme-bg);"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </template>
  </BaseModal>

  <!-- Category Editor Modal -->
  <BaseModal
    v-if="showCategoryEditor"
    :is-open="showCategoryEditor"
    :content-padding="false"
    :show-close-button="false"
    :hide-header="true"
    @close="closeCategoryEditor"
  >
    <template #content>
      <div class="flex flex-col min-h-screen w-full" style="background-color: var(--theme-bg); color: var(--theme-text);">
        <!-- Header -->
        <div class="px-6 py-5 flex justify-between items-center border-b" style="border-color: var(--theme-border);">
          <h2 class="text-xl font-bold tracking-tight">Recategorize</h2>
          <button @click="closeCategoryEditor" class="p-2 transition-colors rounded-full hover:bg-black/10 dark:hover:bg-white/10" style="color: var(--theme-text);">
            <X class="w-6 h-6" />
          </button>
        </div>
        
        <div class="p-6 flex flex-col flex-1 gap-6">
          <input 
            v-model="categoryDraft" 
            type="text" 
            class="w-full p-4 text-sm font-mono rounded-xl outline-none transition-all placeholder:text-gray-500 bg-transparent border focus:ring-1"
            style="border-color: var(--theme-border); color: var(--theme-text);"
            onfocus="this.style.borderColor='var(--theme-ring)'"
            onblur="this.style.borderColor='var(--theme-border)'"
            placeholder="Enter a new category..."
          />

          <Transition name="fade">
            <div v-if="categoryDraft !== transactionDetailsState.originalCategory" class="flex flex-col gap-3">
              <div class="text-[10px] font-bold uppercase tracking-widest" style="color: var(--theme-text-soft);">Apply New Category To:</div>
              
              <div class="flex flex-col gap-3 relative z-0">
                <label class="flex items-center gap-3 cursor-pointer group">
                  <input type="radio" v-model="applyCategoryTo" value="this-item-only" class="w-5 h-5 text-black border-2 focus:ring-0 checked:bg-black checked:border-black dark:checked:bg-white dark:checked:border-white" style="border-color: var(--theme-border);" />
                  <span class="text-sm font-medium transition-colors" style="color: var(--theme-text-muted);" onmouseover="this.style.color='var(--theme-text)'" onmouseout="this.style.color='var(--theme-text-muted)'">This item only</span>
                </label>
                
                <label class="flex items-center gap-3 cursor-pointer group">
                  <input type="radio" v-model="applyCategoryTo" value="anything-that-matches" class="w-5 h-5 text-black border-2 focus:ring-0 checked:bg-black checked:border-black dark:checked:bg-white dark:checked:border-white" style="border-color: var(--theme-border);" @change="handleApplyCategoryTargetChange" />
                  <span class="text-sm font-medium transition-colors" style="color: var(--theme-text-muted);" onmouseover="this.style.color='var(--theme-text)'" onmouseout="this.style.color='var(--theme-text-muted)'">All matching transactions</span>
                </label>
              </div>
            </div>
          </Transition>

          <div class="flex w-full gap-4 mt-auto mb-6">
            <button
              @click="closeCategoryEditor"
              class="flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border"
              style="background-color: var(--theme-bg); color: var(--theme-text); border-color: var(--theme-text);"
            >
              Cancel
            </button>
            <button
              @click="saveCategory"
              class="flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent"
              style="background-color: var(--theme-text); color: var(--theme-bg);"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { MoreVertical, X } from 'lucide-vue-next';
import RuleSyntaxDisplay from '@/features/rule-manager/components/RuleSyntaxDisplay.vue';
import RuleEditModal from '@/features/rule-manager/components/RuleEditModal.vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import { useApi } from '@/shared/composables/useApi';
import { useRulesAPI } from '@/features/rule-manager/composables/useRulesAPI';
import { useTabProcessing } from '@/features/tabs/composables/useTabProcessing';
import { resolveDrillState, getTransactionKey } from '@/features/tabs/utils/drillEvaluator.js';
import { useUtils } from '@/shared/composables/useUtils';

const api = useApi();
const rulesAPI = useRulesAPI();
const { processAllTabsForSelectedGroup } = useTabProcessing();
const { formatPrice } = useUtils();
const { item, state } = defineProps({
  item: Object,
  state: Object
});

const transactionDetailsState = ref({
  originalCategory: item.recategorizeAs,
  changedCategory: false,
  typingTimer: null
});

const accountData = computed(() => state.allUserAccounts.find(account => account.account_id === item.account_id) || {});

const accountName = computed(() => accountData.value.official_name || accountData.value.name);

const prettyCategory = computed(() => {
  const category = item.category || '';
  return category.split(',').join(', ');
});

const rulesAppliedToItem = computed(() => {
  if(!item.rulesApplied?.size) {
    return [];
  }
  
  return [...item.rulesApplied].map((ruleId) => {
    return state.allUserRules.find((rule) => {
      return rule._id === ruleId;
    });
  });
});

const LONG_PRESS_DURATION_MS = 450;
const LONG_PRESS_MOVE_THRESHOLD_PX = 12;

const showRuleEditor = ref(false);
const activeRule = ref(null);
const isCreatingRule = ref(false);
const isRuleEditorFromCategoryFlow = ref(false);
const pendingCategoryRuleDraftValue = ref('');

const activeRuleMenuId = ref('');
const longPressVisibleRuleId = ref('');
const ruleLongPressTimeoutId = ref(null);
const ruleLongPressStart = ref({ x: 0, y: 0 });

const showNotesMenu = ref(false);
const showNotesEditor = ref(false);
const notesDraft = ref('');

const showCategoryMenu = ref(false);
const showCategoryEditor = ref(false);
const categoryDraft = ref('');
const applyCategoryTo = ref('this-item-only');

function transactionsMatch(leftTransaction, rightTransaction) {
  const leftKey = getTransactionKey(leftTransaction);
  const rightKey = getTransactionKey(rightTransaction);
  if (!leftKey || !rightKey) {
    return false;
  }

  return leftKey === rightKey;
}

function findSourceTransaction(targetTransaction) {
  const allTransactions = Array.isArray(state.selected?.allGroupTransactions)
    ? state.selected.allGroupTransactions
    : [];

  return allTransactions.find((sourceTransaction) => (
    transactionsMatch(sourceTransaction, targetTransaction)
  )) || null;
}

function patchTransactionLocally(targetTransaction, patch) {
  if (!patch || typeof patch !== 'object') {
    return;
  }

  Object.assign(item, patch);

  const sourceTransaction = findSourceTransaction(targetTransaction);
  if (sourceTransaction) {
    Object.assign(sourceTransaction, patch);
  }

  if (state.selected?.transaction && transactionsMatch(state.selected.transaction, targetTransaction)) {
    Object.assign(state.selected.transaction, patch);
  }
}

function buildDrillStateForPath(drillPath = []) {
  if (!state.selected?.tab) {
    return null;
  }

  return resolveDrillState({
    tab: state.selected.tab,
    transactions: state.selected.allGroupTransactions,
    allRules: state.allUserRules,
    drillPath
  });
}

function findTransactionInDrillTransactions(transactions, targetTransaction) {
  if (!Array.isArray(transactions)) {
    return null;
  }

  return transactions.find((candidateTransaction) => (
    transactionsMatch(candidateTransaction, targetTransaction)
  )) || null;
}

function findDrillPathForTransaction(targetTransaction) {
  const resolvedPath = [];
  const MAX_DRILL_DEPTH = 12;

  for (let depth = 0; depth < MAX_DRILL_DEPTH; depth += 1) {
    const drillState = buildDrillStateForPath(resolvedPath);
    if (!drillState) {
      return { path: resolvedPath, transaction: null, found: false };
    }

    if (drillState.isLeaf) {
      const transaction = findTransactionInDrillTransactions(drillState.transactions, targetTransaction);
      return {
        path: resolvedPath,
        transaction,
        found: Boolean(transaction)
      };
    }

    const matchedGroup = (Array.isArray(drillState.groups) ? drillState.groups : []).find((group) => (
      Array.isArray(group?.originalItems)
      && group.originalItems.some((candidateTransaction) => (
        transactionsMatch(candidateTransaction, targetTransaction)
      ))
    ));

    if (!matchedGroup?.key) {
      return { path: resolvedPath, transaction: null, found: false };
    }

    resolvedPath.push(matchedGroup.key);
  }

  const fallbackDrillState = buildDrillStateForPath(resolvedPath);
  const fallbackTransaction = findTransactionInDrillTransactions(
    fallbackDrillState?.transactions,
    targetTransaction
  );

  return {
    path: resolvedPath,
    transaction: fallbackTransaction,
    found: Boolean(fallbackTransaction)
  };
}

function showTransientBlueBarMessage(message, timeoutMs = 2200) {
  const normalizedMessage = String(message || '').trim();
  if (!normalizedMessage || state.blueBar.loading) {
    return;
  }

  state.blueBar.loading = false;
  state.blueBar.message = normalizedMessage;

  setTimeout(() => {
    if (state.blueBar.message === normalizedMessage && !state.blueBar.loading) {
      state.blueBar.message = '';
    }
  }, timeoutMs);
}

function refreshSelectionAfterCategoryMutation(previousDrillPath = [], destinationFallback = '') {
  const currentDrillState = buildDrillStateForPath(previousDrillPath);
  const visibleInCurrentPath = Boolean(
    findTransactionInDrillTransactions(currentDrillState?.transactions, item)
  );

  if (!visibleInCurrentPath) {
    const relocation = findDrillPathForTransaction(item);
    if (relocation.found) {
      state.selected.drillPath = relocation.path;
      state.selected.transaction = relocation.transaction;

      const destinationLabel = String(
        relocation.path[relocation.path.length - 1]
        || destinationFallback
        || 'updated category'
      ).trim();
      showTransientBlueBarMessage(`Moved to ${destinationLabel}.`);
      return;
    }

    state.selected.transaction = false;
    showTransientBlueBarMessage('Category updated. Transaction moved out of this view.');
    return;
  }

  const refreshedTransaction = findTransactionInDrillTransactions(currentDrillState?.transactions, item);
  if (refreshedTransaction) {
    state.selected.transaction = refreshedTransaction;
  }
}

function nextTabRuleOrder() {
  const tabId = String(state.selected?.tab?._id || '').trim();
  if (!tabId) {
    return 0;
  }

  const tabRules = (Array.isArray(state.allUserRules) ? state.allUserRules : [])
    .filter((rule) => {
      const applyForTabs = Array.isArray(rule?.applyForTabs) ? rule.applyForTabs : [];
      return applyForTabs.includes(tabId);
    });

  if (!tabRules.length) {
    return 0;
  }

  return tabRules.reduce((maxOrder, rule) => (
    Math.max(maxOrder, Number(rule?.orderOfExecution || 0))
  ), -1) + 1;
}

function buildAllMatchingCategoryRule(categoryValue) {
  const merchantText = String(item.merchant_name || item.name || '').trim();

  return {
    rule: ['categorize', 'name', 'includes', merchantText, categoryValue],
    applyForTabs: ['_GLOBAL'],
    filterJoinOperator: 'and',
    _isImportant: false,
    orderOfExecution: nextTabRuleOrder()
  };
}

function openRuleEditorForAllMatchingCategory(categoryValue) {
  pendingCategoryRuleDraftValue.value = categoryValue;
  isRuleEditorFromCategoryFlow.value = true;
  isCreatingRule.value = true;
  activeRule.value = buildAllMatchingCategoryRule(categoryValue);
  closeCategoryEditor();
  showRuleEditor.value = true;
}

function handleApplyCategoryTargetChange() {
  if (!showCategoryEditor.value) {
    return;
  }

  if (applyCategoryTo.value !== 'anything-that-matches') {
    return;
  }

  const nextCategory = String(categoryDraft.value || '').trim();
  openRuleEditorForAllMatchingCategory(nextCategory);
}

function toggleNotesMenu() {
  showNotesMenu.value = !showNotesMenu.value;
}
function openNotesEditor() {
  showNotesMenu.value = false;
  notesDraft.value = item.notes || '';
  showNotesEditor.value = true;
}
function closeNotesEditor() {
  showNotesEditor.value = false;
}
async function saveNotes() {
  const nextNotes = notesDraft.value ?? '';

  try {
    const updatedTransaction = await api.put(`transactions/${item._id}`, { notes: nextNotes });
    const savedNotes = updatedTransaction?.notes ?? nextNotes;
    patchTransactionLocally(item, { notes: savedNotes });
    closeNotesEditor();
  } catch (_error) {
  }
}

function toggleCategoryMenu() {
  showCategoryMenu.value = !showCategoryMenu.value;
}
function openCategoryEditor() {
  showCategoryMenu.value = false;
  categoryDraft.value = item.recategorizeAs || '';
  transactionDetailsState.value.originalCategory = item.recategorizeAs || '';
  applyCategoryTo.value = 'this-item-only';
  showCategoryEditor.value = true;
}
function closeCategoryEditor() {
  showCategoryEditor.value = false;
}
async function saveCategory() {
  const nextCategory = String(categoryDraft.value || '').trim();

  if (applyCategoryTo.value === 'anything-that-matches') {
    if (!nextCategory) {
      alert('Please enter a category before creating a matching rule.');
      return;
    }

    openRuleEditorForAllMatchingCategory(nextCategory);
    return;
  }

  const currentCategory = String(item.recategorizeAs || '').trim();
  if (nextCategory === currentCategory) {
    closeCategoryEditor();
    return;
  }

  const previousDrillPath = Array.isArray(state.selected?.drillPath)
    ? [...state.selected.drillPath]
    : [];

  try {
    const updatedTransaction = await api.put(`transactions/${item._id}`, { recategorizeAs: nextCategory });
    const savedCategory = String(updatedTransaction?.recategorizeAs ?? nextCategory).trim();

    patchTransactionLocally(item, { recategorizeAs: savedCategory });
    transactionDetailsState.value.originalCategory = savedCategory;

    await processAllTabsForSelectedGroup({ showLoading: false });
    refreshSelectionAfterCategoryMutation(previousDrillPath, savedCategory);

    closeCategoryEditor();
  } catch (_error) {
  }
}

function ruleKey(rule) {
  return String(rule?._id || '').trim();
}

function shouldShowRuleMenuTrigger(rule) {
  const key = ruleKey(rule);
  if (!key) return false;
  return activeRuleMenuId.value === key || longPressVisibleRuleId.value === key;
}

function toggleRuleActionsMenu(rule) {
  const key = ruleKey(rule);
  if (!key) return;
  longPressVisibleRuleId.value = key;
  activeRuleMenuId.value = activeRuleMenuId.value === key ? '' : key;
}

function closeRuleMenu() {
  activeRuleMenuId.value = '';
  longPressVisibleRuleId.value = '';
  clearRuleLongPressTimer();
}

function clearRuleLongPressTimer() {
  if (ruleLongPressTimeoutId.value) {
    clearTimeout(ruleLongPressTimeoutId.value);
    ruleLongPressTimeoutId.value = null;
  }
}

function shouldIgnoreRuleLongPressTarget(event) {
  const target = event?.target;
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('button, input, select, textarea, a, label'));
}

function shouldSkipLongPressStart(event) {
  if (shouldIgnoreRuleLongPressTarget(event)) return true;
  return false;
}

function startRuleLongPress(rule, x, y) {
  const key = ruleKey(rule);
  if (!key) return;
  clearRuleLongPressTimer();
  ruleLongPressStart.value = { x, y };

  ruleLongPressTimeoutId.value = setTimeout(() => {
    activeRuleMenuId.value = '';
    longPressVisibleRuleId.value = key;
    ruleLongPressTimeoutId.value = null;
  }, LONG_PRESS_DURATION_MS);
}

function handleRuleRowTouchStart(event, rule) {
  if (shouldSkipLongPressStart(event)) return;
  const touch = event.touches?.[0];
  if (!touch) return;
  startRuleLongPress(rule, touch.clientX, touch.clientY);
}

function handleRuleRowMouseDown(event, rule) {
  if (event.button !== 0) return;
  if (shouldSkipLongPressStart(event)) return;
  startRuleLongPress(rule, event.clientX, event.clientY);
}

function handleRuleRowTouchMove(event) {
  if (!ruleLongPressTimeoutId.value) return;
  const touch = event.touches?.[0];
  if (!touch) return;
  const deltaX = Math.abs(touch.clientX - ruleLongPressStart.value.x);
  const deltaY = Math.abs(touch.clientY - ruleLongPressStart.value.y);
  if (deltaX > LONG_PRESS_MOVE_THRESHOLD_PX || deltaY > LONG_PRESS_MOVE_THRESHOLD_PX) {
    clearRuleLongPressTimer();
  }
}

function handleRuleRowMouseMove(event) {
  if (!ruleLongPressTimeoutId.value) return;
  const deltaX = Math.abs(event.clientX - ruleLongPressStart.value.x);
  const deltaY = Math.abs(event.clientY - ruleLongPressStart.value.y);
  if (deltaX > LONG_PRESS_MOVE_THRESHOLD_PX || deltaY > LONG_PRESS_MOVE_THRESHOLD_PX) {
    clearRuleLongPressTimer();
  }
}

function handleRuleRowTouchEnd() {
  clearRuleLongPressTimer();
}

function handleRuleRowMouseUp() {
  clearRuleLongPressTimer();
}

function closeMenusOnOutsideClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  
  if (!target.closest('[data-rule-menu-surface]')) {
    closeRuleMenu();
  }
  
  if (!target.closest('[data-notes-menu-surface]')) {
    showNotesMenu.value = false;
  }
  
  if (!target.closest('[data-category-menu-surface]')) {
    showCategoryMenu.value = false;
  }
}

async function handleRuleMenuAction(action, rule) {
  if (action === 'edit') {
    closeRuleMenu();
    isCreatingRule.value = false;
    isRuleEditorFromCategoryFlow.value = false;
    pendingCategoryRuleDraftValue.value = '';
    activeRule.value = JSON.parse(JSON.stringify(rule));
    showRuleEditor.value = true;
  } else if (action === 'copy') {
    closeRuleMenu();
    await copyRuleJson(rule);
  } else if (action === 'delete') {
    closeRuleMenu();
    await deleteRule(rule);
  }
}

function handleRuleEditorClose() {
  closeRuleEditor({ reopenCategoryEditor: true });
}

function closeRuleEditor({ reopenCategoryEditor = false } = {}) {
  const shouldReopenCategoryEditor = reopenCategoryEditor && isRuleEditorFromCategoryFlow.value;
  const restoredCategoryDraft = pendingCategoryRuleDraftValue.value;

  showRuleEditor.value = false;
  activeRule.value = null;
  isCreatingRule.value = false;
  isRuleEditorFromCategoryFlow.value = false;
  pendingCategoryRuleDraftValue.value = '';

  if (shouldReopenCategoryEditor) {
    applyCategoryTo.value = 'this-item-only';
    if (restoredCategoryDraft) {
      categoryDraft.value = restoredCategoryDraft;
    }
    showCategoryEditor.value = true;
  }
}

async function saveRule(rulePayload) {
  const normalizedRule = {
    ...rulePayload,
    filterJoinOperator: String(rulePayload?.filterJoinOperator || 'and'),
    orderOfExecution: Number(rulePayload?.orderOfExecution || 0)
  };

  const rulePayloadForApi = { ...normalizedRule };
  delete rulePayloadForApi._makeGlobal;
  const shouldCreateRule = isCreatingRule.value || !rulePayloadForApi?._id;
  const previousDrillPath = Array.isArray(state.selected?.drillPath)
    ? [...state.selected.drillPath]
    : [];
  const categoryFallback = pendingCategoryRuleDraftValue.value;

  if (shouldCreateRule) {
    const createdRule = await rulesAPI.createRule(rulePayloadForApi);
    if (createdRule?._id) {
      state.allUserRules.push(createdRule);
    }
  } else {
    const updatedRule = await rulesAPI.updateRule(rulePayloadForApi._id, rulePayloadForApi);
    const existingRuleIndex = state.allUserRules.findIndex(rule => rule._id === rulePayloadForApi._id);
    if (existingRuleIndex !== -1 && updatedRule) {
      state.allUserRules[existingRuleIndex] = updatedRule;
    }
  }

  await processAllTabsForSelectedGroup({ showLoading: false });
  if (isRuleEditorFromCategoryFlow.value) {
    refreshSelectionAfterCategoryMutation(previousDrillPath, categoryFallback);
  }
  closeRuleEditor({ reopenCategoryEditor: false });
}

async function deleteRule(rule) {
  if (!rule?._id) {
    return;
  }

  const shouldDelete = confirm('Delete this rule?');
  if (!shouldDelete) {
    return;
  }

  const didDelete = await rulesAPI.deleteRule(rule._id);
  if (!didDelete) {
    return;
  }

  state.allUserRules = state.allUserRules.filter(existingRule => existingRule._id !== rule._id);
  await processAllTabsForSelectedGroup({ showLoading: false });
}

async function copyRuleJson(rule) {
  const ruleJson = JSON.stringify(rule || {}, null, 2);
  const didCopy = await copyToClipboard(ruleJson);
  if (!didCopy) {
    alert('Unable to copy rule JSON.');
  }
}

async function copyToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_error) {
    }
  }

  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (_error) {
    copied = false;
  }

  document.body.removeChild(textarea);
  return copied;
}

onMounted(() => {
  document.addEventListener('pointerdown', closeMenusOnOutsideClick);
});

onBeforeUnmount(() => {
  clearRuleLongPressTimer();
  document.removeEventListener('pointerdown', closeMenusOnOutsideClick);
});
</script>
