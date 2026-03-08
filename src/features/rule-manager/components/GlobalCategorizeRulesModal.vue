<template>
  <BaseModal
    :is-open="isOpen"
    title="Global Categories"
    @close="closeModal"
  >
    <template #content>
      <div class="mx-auto w-full max-w-3xl px-6 py-8">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-black tracking-tight text-gray-900">
              Global Category Rules
            </h3>
            <p class="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
              Applied before tab-level categorize rules
            </p>
          </div>
          <button
            type="button"
            class="rounded-xl border border-gray-300 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-gray-800 transition-colors hover:border-black hover:text-black"
            @click="openCreateRule"
          >
            Add Rule
          </button>
        </div>

        <div v-if="globalCategorizeRules.length" class="mt-6 space-y-3">
          <div
            v-for="rule in globalCategorizeRules"
            :key="rule._id"
            class="rounded-2xl border border-gray-200 bg-white p-4"
          >
            <RuleSyntaxDisplay :rule="rule" compact />
            <div class="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-gray-700 transition-colors hover:border-black hover:text-black"
                @click="openEditRule(rule)"
              >
                Edit
              </button>
              <button
                type="button"
                class="rounded-lg border border-red-300 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-red-700 transition-colors hover:border-red-500 hover:text-red-800"
                @click="deleteRule(rule)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <div v-else class="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center">
          <p class="text-xs font-black uppercase tracking-[0.14em] text-gray-500">
            No global category rules yet
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
import { computed, ref } from 'vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import RuleEditModal from '@/features/rule-manager/components/RuleEditModal.vue';
import RuleSyntaxDisplay from '@/features/rule-manager/components/RuleSyntaxDisplay.vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';
import { useRulesAPI } from '@/features/rule-manager/composables/useRulesAPI.js';
import { useTabProcessing } from '@/features/tabs/composables/useTabProcessing.js';

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

function closeModal() {
  emit('close');
}

function closeRuleEditor() {
  showRuleEditor.value = false;
}

function openCreateRule() {
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
  closeRuleEditor();
}

async function deleteRule(rule) {
  if (!rule?._id) {
    return;
  }

  const shouldDelete = confirm('Delete this global category rule?');
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
</script>

<style scoped>
:deep(.rule-part) {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
</style>
