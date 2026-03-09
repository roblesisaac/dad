<template>
  <BaseModal
    :is-open="isOpen"
    title="Global Rules"
    caption="Applied before tab-level categorize rules"
    @close="closeModal"
  >
    <template #content>
      <div class="mx-auto w-full max-w-3xl px-6 py-8">
        <div class="flex items-center justify-end gap-4">
          <button
            v-if="isReorderModeActive"
            type="button"
            class="rounded-xl border border-gray-300 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-gray-700 transition-colors hover:border-black hover:text-black"
            @click="exitReorderMode"
          >
            Done Reordering
          </button>
          <button
            type="button"
            class="rounded-xl border border-gray-300 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-gray-800 transition-colors hover:border-black hover:text-black"
            @click="openCreateRule"
          >
            Add Rule
          </button>
        </div>

        <div class="mt-6">
          <label for="global-rules-search" class="sr-only">
            Search global rules
          </label>
          <div class="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2">
            <Search class="h-4 w-4 shrink-0 text-gray-400" />
            <input
              id="global-rules-search"
              v-model="searchQuery"
              type="text"
              class="w-full bg-transparent text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
              placeholder="Search global rules"
              autocomplete="off"
            />
          </div>
        </div>

        <draggable
          v-if="displayedGlobalRules.length"
          v-model="displayedGlobalRules"
          item-key="_id"
          handle=".global-rule-drag-handle"
          class="mt-6 space-y-3"
          :disabled="!isReorderModeActive || !canReorderVisibleList"
          @end="onGlobalRulesDragEnd"
        >
          <template #item="{ element: rule }">
            <div
              class="global-rule-row group rounded-2xl border border-gray-200 bg-white p-4 select-none"
              @touchstart.passive="handleRuleRowTouchStart($event, rule)"
              @touchmove="handleRuleRowTouchMove"
              @touchend="handleRuleRowTouchEnd"
              @touchcancel="handleRuleRowTouchEnd"
              @mousedown="handleRuleRowMouseDown($event, rule)"
              @mousemove="handleRuleRowMouseMove"
              @mouseup="handleRuleRowMouseUp"
              @mouseleave="handleRuleRowMouseUp"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 flex-1 items-start gap-2">
                  <button
                    v-if="isReorderModeActive && canReorderVisibleList"
                    type="button"
                    class="global-rule-drag-handle rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black cursor-move"
                    title="Drag to reorder"
                  >
                    <GripVertical class="h-4 w-4" />
                  </button>

                  <RuleSyntaxDisplay :rule="rule" compact class="min-w-0" />
                </div>

                <div class="relative flex shrink-0 items-center gap-1" data-rule-menu-surface>
                  <button
                    type="button"
                    class="rounded-xl p-2 text-gray-500 transition-all focus:outline-none opacity-0 pointer-events-none hover:bg-gray-100 hover:text-black group-hover:opacity-100 group-hover:pointer-events-auto"
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
                    <button
                      type="button"
                      class="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-red-700 transition-colors hover:bg-red-50 hover:text-red-800"
                      @click.stop="handleRuleMenuAction('delete', rule)"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </draggable>

        <div
          v-else-if="globalCategorizeRules.length"
          class="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center"
        >
          <p class="text-xs font-black uppercase tracking-[0.14em] text-gray-500">
            No global rules match your search
          </p>
        </div>

        <div v-else class="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center">
          <p class="text-xs font-black uppercase tracking-[0.14em] text-gray-500">
            No global rules yet
          </p>
        </div>
      </div>
    </template>
  </BaseModal>

  <RuleEditModal
    v-if="showRuleEditor"
    :rule="activeRule"
    :is-new="isCreatingRule"
    scope="global"
    @close="closeRuleEditor"
    @save="saveRule"
  />
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { Search, MoreVertical, GripVertical } from 'lucide-vue-next';
import draggable from 'vuedraggable';
import BaseModal from '@/shared/components/BaseModal.vue';
import RuleEditModal from '@/features/rule-manager/components/RuleEditModal.vue';
import RuleSyntaxDisplay from '@/features/rule-manager/components/RuleSyntaxDisplay.vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';
import { useRulesAPI } from '@/features/rule-manager/composables/useRulesAPI.js';
import { useTabProcessing } from '@/features/tabs/composables/useTabProcessing.js';

const LONG_PRESS_DURATION_MS = 450;
const LONG_PRESS_MOVE_THRESHOLD_PX = 12;

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);
const { state } = useDashboardState();
const rulesAPI = useRulesAPI();
const { processAllTabsForSelectedGroup } = useTabProcessing();

const showRuleEditor = ref(false);
const isCreatingRule = ref(false);
const searchQuery = ref('');
const activeRuleMenuId = ref('');
const longPressVisibleRuleId = ref('');
const ruleLongPressTimeoutId = ref(null);
const ruleLongPressStart = ref({ x: 0, y: 0 });
const isReorderModeActive = ref(false);
const displayedGlobalRules = ref([]);
const activeRule = ref({
  rule: ['categorize', '', '', '', 'category', ''],
  applyForTabs: ['_GLOBAL'],
  filterJoinOperator: 'and',
  _isImportant: false,
  orderOfExecution: 0
});

const globalCategorizeRules = computed(() => {
  return state.allUserRules
    .filter((rule) => {
      const applyForTabs = Array.isArray(rule?.applyForTabs) ? rule.applyForTabs : [];
      const isGlobal = applyForTabs.includes('_GLOBAL');
      return isGlobal && rule?.rule?.[0] === 'categorize';
    })
    .sort((a, b) => Number(a?.orderOfExecution || 0) - Number(b?.orderOfExecution || 0));
});

const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase());
const filteredGlobalCategorizeRules = computed(() => {
  const query = normalizedSearchQuery.value;
  if (!query) {
    return globalCategorizeRules.value;
  }

  return globalCategorizeRules.value.filter((rule) => ruleSearchText(rule).includes(query));
});
const canReorderVisibleList = computed(() => !normalizedSearchQuery.value);

watch(
  filteredGlobalCategorizeRules,
  (rules) => {
    displayedGlobalRules.value = [...rules];
  },
  { immediate: true }
);

function closeModal() {
  exitReorderMode();
  searchQuery.value = '';
  emit('close');
}

function closeRuleEditor() {
  showRuleEditor.value = false;
}

function openCreateRule() {
  exitReorderMode();
  isCreatingRule.value = true;
  activeRule.value = {
    rule: ['categorize', '', '', '', 'category', ''],
    applyForTabs: ['_GLOBAL'],
    filterJoinOperator: 'and',
    _isImportant: false,
    orderOfExecution: globalCategorizeRules.value.length
  };
  showRuleEditor.value = true;
}

function openEditRule(rule) {
  exitReorderMode();
  isCreatingRule.value = false;
  activeRule.value = JSON.parse(JSON.stringify(rule));
  showRuleEditor.value = true;
}

async function saveRule(rulePayload) {
  const normalizedRule = {
    ...rulePayload,
    applyForTabs: ['_GLOBAL'],
    filterJoinOperator: String(rulePayload?.filterJoinOperator || 'and'),
    orderOfExecution: Number(rulePayload?.orderOfExecution || 0)
  };

  if (isCreatingRule.value || !normalizedRule._id) {
    const createdRule = await rulesAPI.createRule(normalizedRule);
    if (createdRule?._id) {
      state.allUserRules.push(createdRule);
    }
  } else {
    const updatedRule = await rulesAPI.updateRule(normalizedRule._id, normalizedRule);
    const existingRuleIndex = state.allUserRules.findIndex(rule => rule._id === normalizedRule._id);
    if (existingRuleIndex !== -1 && updatedRule) {
      state.allUserRules[existingRuleIndex] = updatedRule;
    }
  }

  await processAllTabsForSelectedGroup({ showLoading: false });
  exitReorderMode();
  closeRuleEditor();
}

async function deleteRule(rule) {
  if (!rule?._id) {
    return;
  }

  const shouldDelete = confirm('Delete this global rule?');
  if (!shouldDelete) {
    return;
  }

  const didDelete = await rulesAPI.deleteRule(rule._id);
  if (!didDelete) {
    return;
  }

  state.allUserRules = state.allUserRules.filter(existingRule => existingRule._id !== rule._id);
  await processAllTabsForSelectedGroup({ showLoading: false });
  closeRuleMenu();
}

function ruleKey(rule) {
  return String(rule?._id || '').trim();
}

function shouldShowRuleMenuTrigger(rule) {
  const key = ruleKey(rule);
  if (!key) {
    return false;
  }

  return activeRuleMenuId.value === key || longPressVisibleRuleId.value === key;
}

function toggleRuleActionsMenu(rule) {
  const key = ruleKey(rule);
  if (!key) {
    return;
  }

  longPressVisibleRuleId.value = key;
  activeRuleMenuId.value = activeRuleMenuId.value === key ? '' : key;
}

function closeRuleMenu() {
  activeRuleMenuId.value = '';
  longPressVisibleRuleId.value = '';
  clearRuleLongPressTimer();
}

function exitReorderMode() {
  isReorderModeActive.value = false;
  closeRuleMenu();
}

function clearRuleLongPressTimer() {
  if (ruleLongPressTimeoutId.value) {
    clearTimeout(ruleLongPressTimeoutId.value);
    ruleLongPressTimeoutId.value = null;
  }
}

function shouldIgnoreRuleLongPressTarget(event) {
  const target = event?.target;
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest('button, input, select, textarea, a, label'));
}

function shouldSkipLongPressStart(event) {
  if (isReorderModeActive.value && canReorderVisibleList.value) {
    return true;
  }

  if (shouldIgnoreRuleLongPressTarget(event)) {
    return true;
  }

  return false;
}

function startRuleLongPress(rule, x, y) {
  const key = ruleKey(rule);
  if (!key) {
    return;
  }

  clearRuleLongPressTimer();
  ruleLongPressStart.value = { x, y };

  ruleLongPressTimeoutId.value = setTimeout(() => {
    activeRuleMenuId.value = '';
    longPressVisibleRuleId.value = key;
    if (canReorderVisibleList.value) {
      isReorderModeActive.value = true;
    }
    ruleLongPressTimeoutId.value = null;
  }, LONG_PRESS_DURATION_MS);
}

function handleRuleRowTouchStart(event, rule) {
  if (shouldSkipLongPressStart(event)) {
    return;
  }

  const touch = event.touches?.[0];
  if (!touch) {
    return;
  }

  startRuleLongPress(rule, touch.clientX, touch.clientY);
}

function handleRuleRowMouseDown(event, rule) {
  if (event.button !== 0) {
    return;
  }

  if (shouldSkipLongPressStart(event)) {
    return;
  }

  startRuleLongPress(rule, event.clientX, event.clientY);
}

function handleRuleRowTouchMove(event) {
  if (!ruleLongPressTimeoutId.value) {
    return;
  }

  const touch = event.touches?.[0];
  if (!touch) {
    return;
  }

  const deltaX = Math.abs(touch.clientX - ruleLongPressStart.value.x);
  const deltaY = Math.abs(touch.clientY - ruleLongPressStart.value.y);
  if (deltaX > LONG_PRESS_MOVE_THRESHOLD_PX || deltaY > LONG_PRESS_MOVE_THRESHOLD_PX) {
    clearRuleLongPressTimer();
  }
}

function handleRuleRowMouseMove(event) {
  if (!ruleLongPressTimeoutId.value) {
    return;
  }

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
  if (!(target instanceof Element)) {
    return;
  }

  if (target.closest('[data-rule-menu-surface]')) {
    return;
  }

  closeRuleMenu();
}

async function handleRuleMenuAction(action, rule) {
  if (action === 'edit') {
    exitReorderMode();
    openEditRule(rule);
    return;
  }

  if (action === 'copy') {
    closeRuleMenu();
    await copyRuleJson(rule);
    return;
  }

  if (action === 'delete') {
    closeRuleMenu();
    await deleteRule(rule);
  }
}

async function onGlobalRulesDragEnd(event) {
  if (!isReorderModeActive.value || !canReorderVisibleList.value) {
    return;
  }

  if (!event || event.oldIndex === event.newIndex) {
    return;
  }

  const reorderedRules = displayedGlobalRules.value
    .map((rule, index) => ({ ruleId: ruleKey(rule), orderOfExecution: index }))
    .filter(({ ruleId }) => Boolean(ruleId));

  if (!reorderedRules.length) {
    return;
  }

  try {
    await Promise.all(
      reorderedRules.map(({ ruleId, orderOfExecution }) => (
        rulesAPI.updateRuleOrder(ruleId, orderOfExecution)
      ))
    );

    reorderedRules.forEach(({ ruleId, orderOfExecution }) => {
      const existingRule = state.allUserRules.find(rule => rule._id === ruleId);
      if (existingRule) {
        existingRule.orderOfExecution = orderOfExecution;
      }
    });

    await processAllTabsForSelectedGroup({ showLoading: false });
    exitReorderMode();
  } catch (error) {
    console.error('Error reordering global rules:', error);
    displayedGlobalRules.value = [...filteredGlobalCategorizeRules.value];
  }
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
      // Fallback to execCommand below.
    }
  }

  if (typeof document === 'undefined') {
    return false;
  }

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

function normalizeSearchValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeSearchValue).join(' ');
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function ruleSearchText(rule) {
  const segments = Array.isArray(rule?.rule) ? rule.rule : [];
  return segments
    .map(segment => normalizeSearchValue(segment))
    .join(' ')
    .toLowerCase();
}

onMounted(() => {
  document.addEventListener('pointerdown', closeMenusOnOutsideClick);
});

onBeforeUnmount(() => {
  clearRuleLongPressTimer();
  document.removeEventListener('pointerdown', closeMenusOnOutsideClick);
});
</script>

<style scoped>
.global-rule-row {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-touch-callout: none;
}

:deep(.rule-part) {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
  display: inline-block !important;
}
</style>
