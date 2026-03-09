<template>
  <div class="border-t border-gray-100 bg-gray-50 p-4 rounded-b-md">
    <!-- Transaction Details -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left column - Transaction Info -->
      <div class="space-y-4">
        <div class="bg-white p-4 rounded-md shadow-sm">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Account Information</h3>
          
          <div class="space-y-3">
            <div class="flex flex-col">
              <span class="text-xs text-gray-500">
                {{ item.amount < 0 ? 'Paid From' : 'Deposited To' }}
              </span>
              <span class="font-medium">
                {{ accountData.name }} 
                <span class="text-gray-500">#{{ accountData.mask }}</span>
              </span>
              <span v-if="accountName && accountName !== accountData.name" class="text-sm text-gray-600">
                {{ accountName }}
              </span>
            </div>
            
            <div class="flex justify-between pt-2 border-t border-gray-100">
              <span class="text-sm text-gray-600">Current Balance</span>
              <span class="font-medium text-emerald-600">{{ formatPrice(accountData.balances?.current) }}</span>
            </div>
          </div>
        </div>
        
        <div class="bg-white p-4 rounded-md shadow-sm">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Transaction Details</h3>
          
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div class="text-gray-500">Channel</div>
              <div class="font-medium">{{ item.payment_channel }}</div>
            </div>
            <div>
              <div class="text-gray-500">Status</div>
              <div class="font-medium">
                <span v-if="item.pending" class="flex items-center">
                  <span class="h-2 w-2 rounded-full bg-amber-400 mr-1"></span>
                  Pending
                </span>
                <span v-else class="flex items-center">
                  <span class="h-2 w-2 rounded-full bg-emerald-500 mr-1"></span>
                  Settled
                </span>
              </div>
            </div>
            <div class="col-span-2">
              <div class="text-gray-500">Category</div>
              <div class="font-medium">{{ prettyCategory }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Right column - Actions -->
      <div class="space-y-4">
        <!-- Notes -->
        <div class="bg-white p-4 rounded-md shadow-sm">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Transaction Notes</h3>
          <textarea 
            rows="3" 
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
            v-model="item.notes"
            placeholder="Add notes about this transaction..."
          ></textarea>
        </div>
        
        <!-- Recategorize -->
        <div class="bg-white p-4 rounded-md shadow-sm">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">
            Recategorize<span v-if="item.recategorizeAs">d</span> As
          </h3>
          
          <input 
            v-model="item.recategorizeAs" 
            type="text" 
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-3 focus:ring-indigo-500 focus:border-indigo-500" 
            placeholder="Enter a new category..."
          />
          
          <!-- Apply-to options -->
          <Transition name="fade">
            <div v-if="item.recategorizeAs !== transactionDetailsState.originalCategory" class="mt-4">
              <div class="text-sm font-medium text-gray-700 mb-2">Apply New Category To:</div>

              <div class="space-y-2">
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" id="this-item-only" name="apply-to" value="this-item-only" checked class="text-indigo-600">
                  <span>This item only</span>
                </label>

                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" id="anything-that-matches" name="apply-to" value="anything-that-matches" class="text-indigo-600">
                  <span>All matching transactions</span>
                </label>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
    
    <!-- Rules Applied -->
    <div v-if="rulesAppliedToItem && rulesAppliedToItem.length" class="mt-6 bg-white p-4 rounded-md shadow-sm">
      <h3 class="text-sm font-semibold text-gray-700 mb-3 text-xs uppercase tracking-widest font-black">Applied Rules</h3>
      <div class="space-y-2">
        <div 
          v-for="rule in rulesAppliedToItem" 
          :key="rule._id" 
          class="group rounded-2xl border border-gray-50 bg-gray-50/30 p-3 select-none flex items-start justify-between gap-3 relative"
          @touchstart.passive="handleRuleRowTouchStart($event, rule)"
          @touchmove="handleRuleRowTouchMove"
          @touchend="handleRuleRowTouchEnd"
          @touchcancel="handleRuleRowTouchEnd"
          @mousedown="handleRuleRowMouseDown($event, rule)"
          @mousemove="handleRuleRowMouseMove"
          @mouseup="handleRuleRowMouseUp"
          @mouseleave="handleRuleRowMouseUp"
        >
          <div class="flex min-w-0 flex-1 items-start gap-2">
            <RuleSyntaxDisplay :rule="rule" compact class="min-w-0" />
          </div>

          <div class="relative flex shrink-0 items-center gap-1" data-rule-menu-surface>
            <button
              type="button"
              class="rounded-xl p-1 text-gray-500 transition-all focus:outline-none opacity-0 pointer-events-none hover:bg-gray-100 hover:text-black group-hover:opacity-100 group-hover:pointer-events-auto"
              :class="shouldShowRuleMenuTrigger(rule) ? 'opacity-100 pointer-events-auto' : ''"
              data-rule-menu-surface
              @click.stop="toggleRuleActionsMenu(rule)"
            >
              <MoreVertical class="h-4 w-4" />
            </button>

            <div
              v-if="activeRuleMenuId === ruleKey(rule)"
              class="absolute right-0 top-full mt-1 min-w-[140px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_10px_25px_rgba(0,0,0,0.08)] z-40"
              data-rule-menu-surface
            >
              <button
                type="button"
                class="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-700 transition-colors hover:bg-gray-50 hover:text-black"
                @click.stop="handleRuleMenuAction('edit', rule)"
              >
                Edit
              </button>
              <button
                type="button"
                class="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-700 transition-colors hover:bg-gray-50 hover:text-black"
                @click.stop="handleRuleMenuAction('copy', rule)"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <RuleEditModal
    v-if="showRuleEditor"
    :rule="activeRule"
    :is-new="false"
    :scope="activeRule?.applyForTabs?.includes('_GLOBAL') ? 'global' : 'tab'"
    @close="closeRuleEditor"
    @save="saveRule"
  />
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { MoreVertical } from 'lucide-vue-next';
import RuleSyntaxDisplay from '@/features/rule-manager/components/RuleSyntaxDisplay.vue';
import RuleEditModal from '@/features/rule-manager/components/RuleEditModal.vue';
import { useApi } from '@/shared/composables/useApi';
import { useRulesAPI } from '@/features/rule-manager/composables/useRulesAPI';
import { useTabProcessing } from '@/features/tabs/composables/useTabProcessing';
import { useUtils } from '@/shared/composables/useUtils';

const api = useApi();
const rulesAPI = useRulesAPI();
const { processAllTabsForSelectedGroup } = useTabProcessing();
const { waitUntilTypingStops, formatPrice } = useUtils();
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


async function updateTransaction() {
  await waitUntilTypingStops();
  api.put(`transactions/${item._id}`, item);
}

watch(() => item.recategorizeAs, updateTransaction);
watch(() => item.notes, updateTransaction);

const LONG_PRESS_DURATION_MS = 450;
const LONG_PRESS_MOVE_THRESHOLD_PX = 12;

const showRuleEditor = ref(false);
const activeRule = ref(null);

const activeRuleMenuId = ref('');
const longPressVisibleRuleId = ref('');
const ruleLongPressTimeoutId = ref(null);
const ruleLongPressStart = ref({ x: 0, y: 0 });

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
  if (target.closest('[data-rule-menu-surface]')) return;
  closeRuleMenu();
}

async function handleRuleMenuAction(action, rule) {
  if (action === 'edit') {
    closeRuleMenu();
    activeRule.value = JSON.parse(JSON.stringify(rule));
    showRuleEditor.value = true;
  } else if (action === 'copy') {
    closeRuleMenu();
    await copyRuleJson(rule);
  }
}

function closeRuleEditor() {
  showRuleEditor.value = false;
  activeRule.value = null;
}

async function saveRule(rulePayload) {
  const normalizedRule = {
    ...rulePayload,
    filterJoinOperator: String(rulePayload?.filterJoinOperator || 'and'),
    orderOfExecution: Number(rulePayload?.orderOfExecution || 0)
  };

  const updatedRule = await rulesAPI.updateRule(normalizedRule._id, normalizedRule);
  const existingRuleIndex = state.allUserRules.findIndex(rule => rule._id === normalizedRule._id);
  
  if (existingRuleIndex !== -1 && updatedRule) {
    state.allUserRules[existingRuleIndex] = updatedRule;
  }

  await processAllTabsForSelectedGroup({ showLoading: false });
  closeRuleEditor();
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