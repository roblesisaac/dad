<template>
  <div class="transaction-details-container p-6 flex flex-col gap-6" style="background-color: var(--theme-bg-soft); border-top: 1px solid var(--theme-border);">
    
    <!-- Top row: Account & Transaction Details -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- Account Info -->
      <div class="flex flex-col gap-3 rounded-xl p-5" style="background-color: var(--theme-bg); border: 1px solid var(--theme-border);">
        <h3 class="text-[10px] font-black uppercase tracking-widest text-opacity-80" style="color: var(--theme-text-muted);">Account Information</h3>
        
        <div class="flex flex-col gap-0.5">
          <span class="text-[10px] font-bold uppercase tracking-widest mb-1" style="color: var(--theme-text-soft);">
            {{ item.amount < 0 ? 'Paid From' : 'Deposited To' }}
          </span>
          <span class="text-base font-medium" style="color: var(--theme-text);">
            {{ accountData.name }} <span style="color: var(--theme-text-soft); font-weight: normal;">#{{ accountData.mask }}</span>
          </span>
          <span v-if="accountName && accountName !== accountData.name" class="text-xs" style="color: var(--theme-text-muted);">
            {{ accountName }}
          </span>
        </div>
        
        <div class="flex justify-between items-end mt-2 pt-3" style="border-top: 1px solid var(--theme-border); opacity: 0.8;">
          <span class="text-[10px] font-bold uppercase tracking-widest" style="color: var(--theme-text-muted);">Current Balance</span>
          <span class="font-bold text-emerald-500">{{ formatPrice(accountData.balances?.current) }}</span>
        </div>
      </div>
      
      <!-- Transaction Details -->
      <div class="flex flex-col gap-3 rounded-xl p-5" style="background-color: var(--theme-bg); border: 1px solid var(--theme-border);">
        <h3 class="text-[10px] font-black uppercase tracking-widest text-opacity-80" style="color: var(--theme-text-muted);">Transaction Details</h3>
        
        <div class="grid grid-cols-2 gap-y-4 gap-x-4 text-sm mt-1">
          <div class="flex flex-col gap-1">
            <div class="text-[10px] font-bold uppercase tracking-widest" style="color: var(--theme-text-soft);">Channel</div>
            <div class="font-medium" style="color: var(--theme-text);">{{ item.payment_channel || 'Unknown' }}</div>
          </div>
          <div class="flex flex-col gap-1">
            <div class="text-[10px] font-bold uppercase tracking-widest" style="color: var(--theme-text-soft);">Status</div>
            <div class="font-medium flex items-center gap-1.5" style="color: var(--theme-text);">
              <span v-if="item.pending" class="flex items-center gap-1.5 text-amber-500">
                <span class="h-2 w-2 rounded-full bg-amber-500"></span> Pending
              </span>
              <span v-else class="flex items-center gap-1.5 text-emerald-500">
                <span class="h-2 w-2 rounded-full bg-emerald-500"></span> Settled
              </span>
            </div>
          </div>
          <div class="col-span-2 flex flex-col gap-1 mt-1">
            <div class="text-[10px] font-bold uppercase tracking-widest" style="color: var(--theme-text-soft);">Category</div>
            <div class="font-medium" style="color: var(--theme-text);">{{ prettyCategory }}</div>
          </div>
        </div>
      </div>
      
    </div>
    
    <!-- Middle row: Notes & Recategorize -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- Notes -->
      <div class="flex flex-col gap-3 rounded-xl p-5" style="background-color: var(--theme-bg); border: 1px solid var(--theme-border);">
        <div class="flex items-center justify-between">
          <h3 class="text-[10px] font-black uppercase tracking-widest text-opacity-80" style="color: var(--theme-text-muted);">Transaction Notes</h3>
          <div v-if="item.notes" class="relative" data-notes-menu-surface>
            <button type="button" class="rounded-lg p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/5" style="color: var(--theme-text-muted);" @click.stop="toggleNotesMenu">
              <MoreVertical class="h-4 w-4" />
            </button>
            <div v-if="showNotesMenu" class="absolute right-0 top-full mt-1 min-w-[140px] overflow-hidden rounded-xl border shadow-[0_10px_25px_rgba(0,0,0,0.08)] z-40" style="background-color: var(--theme-bg); border-color: var(--theme-border);" data-notes-menu-surface>
              <button type="button" class="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-black/5 dark:hover:bg-white/5" style="color: var(--theme-text);" @click.stop="openNotesEditor">
                Edit Notes
              </button>
            </div>
          </div>
        </div>
        
        <div v-if="item.notes" class="text-sm mt-1" style="color: var(--theme-text); white-space: pre-wrap;">{{ item.notes }}</div>
        <div v-else class="flex mt-1">
          <button @click="openNotesEditor" class="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border" style="background-color: var(--theme-bg-muted); color: var(--theme-text); border-color: var(--theme-border);">
            + Add Notes
          </button>
        </div>
      </div>
      
      <!-- Recategorize -->
      <div class="flex flex-col gap-3 rounded-xl p-5" style="background-color: var(--theme-bg); border: 1px solid var(--theme-border);">
        <div class="flex items-center justify-between">
          <h3 class="text-[10px] font-black uppercase tracking-widest text-opacity-80" style="color: var(--theme-text-muted);">
            Recategorized As
          </h3>
          <div v-if="item.recategorizeAs" class="relative" data-category-menu-surface>
            <button type="button" class="rounded-lg p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/5" style="color: var(--theme-text-muted);" @click.stop="toggleCategoryMenu">
              <MoreVertical class="h-4 w-4" />
            </button>
            <div v-if="showCategoryMenu" class="absolute right-0 top-full mt-1 min-w-[140px] overflow-hidden rounded-xl border shadow-[0_10px_25px_rgba(0,0,0,0.08)] z-40" style="background-color: var(--theme-bg); border-color: var(--theme-border);" data-category-menu-surface>
              <button type="button" class="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-black/5 dark:hover:bg-white/5" style="color: var(--theme-text);" @click.stop="openCategoryEditor">
                Edit Category
              </button>
            </div>
          </div>
        </div>
        
        <div v-if="item.recategorizeAs" class="text-sm mt-1 font-medium" style="color: var(--theme-text);">
          {{ item.recategorizeAs }}
        </div>
        <div v-else class="flex mt-1">
          <button @click="openCategoryEditor" class="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border" style="background-color: var(--theme-bg-muted); color: var(--theme-text); border-color: var(--theme-border);">
            + Recategorize
          </button>
        </div>
      </div>
      
    </div>
    
    <!-- Bottom Row: Rules Applied & Raw Data -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- Rules Applied -->
      <div v-if="rulesAppliedToItem && rulesAppliedToItem.length" class="flex flex-col gap-3 rounded-xl p-5" style="background-color: var(--theme-bg); border: 1px solid var(--theme-border);">
        <h3 class="text-[10px] font-black uppercase tracking-widest text-opacity-80" style="color: var(--theme-text-muted);">Applied Rules</h3>
        
        <div class="flex flex-col gap-2 mt-1">
          <div 
            v-for="rule in rulesAppliedToItem" 
            :key="rule._id" 
            class="group rounded-xl p-3 select-none flex items-start justify-between gap-3 relative transition-colors border"
            style="background-color: var(--theme-bg-muted); border-color: transparent;"
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
                class="rounded-lg p-1 transition-all focus:outline-none opacity-0 pointer-events-none hover:bg-black/5 dark:hover:bg-white/5 group-hover:opacity-100 group-hover:pointer-events-auto"
                style="color: var(--theme-text-muted);"
                :class="shouldShowRuleMenuTrigger(rule) ? 'opacity-100 pointer-events-auto' : ''"
                data-rule-menu-surface
                @click.stop="toggleRuleActionsMenu(rule)"
              >
                <MoreVertical class="h-4 w-4" />
              </button>

              <div
                v-if="activeRuleMenuId === ruleKey(rule)"
                class="absolute right-0 top-full mt-1 min-w-[140px] overflow-hidden rounded-xl border shadow-[0_10px_25px_rgba(0,0,0,0.08)] z-40"
                style="background-color: var(--theme-bg); border-color: var(--theme-border);"
                data-rule-menu-surface
              >
                <button
                  type="button"
                  class="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style="color: var(--theme-text);"
                  @click.stop="handleRuleMenuAction('edit', rule)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style="color: var(--theme-text);"
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
  </div>

  <RuleEditModal
    v-if="showRuleEditor"
    :rule="activeRule"
    :is-new="false"
    :scope="activeRule?.applyForTabs?.includes('_GLOBAL') ? 'global' : 'tab'"
    @close="closeRuleEditor"
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
                  <input type="radio" v-model="applyCategoryTo" value="anything-that-matches" class="w-5 h-5 text-black border-2 focus:ring-0 checked:bg-black checked:border-black dark:checked:bg-white dark:checked:border-white" style="border-color: var(--theme-border);" />
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
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { MoreVertical, X } from 'lucide-vue-next';
import RuleSyntaxDisplay from '@/features/rule-manager/components/RuleSyntaxDisplay.vue';
import RuleEditModal from '@/features/rule-manager/components/RuleEditModal.vue';
import BaseModal from '@/shared/components/BaseModal.vue';
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

const showNotesMenu = ref(false);
const showNotesEditor = ref(false);
const notesDraft = ref('');

const showCategoryMenu = ref(false);
const showCategoryEditor = ref(false);
const categoryDraft = ref('');
const applyCategoryTo = ref('this-item-only');

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
  item.notes = notesDraft.value;
  closeNotesEditor();
}

function toggleCategoryMenu() {
  showCategoryMenu.value = !showCategoryMenu.value;
}
function openCategoryEditor() {
  showCategoryMenu.value = false;
  categoryDraft.value = item.recategorizeAs || '';
  applyCategoryTo.value = 'this-item-only';
  showCategoryEditor.value = true;
}
function closeCategoryEditor() {
  showCategoryEditor.value = false;
}
async function saveCategory() {
  item.recategorizeAs = categoryDraft.value;
  closeCategoryEditor();
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