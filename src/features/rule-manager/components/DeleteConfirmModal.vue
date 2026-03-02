<template>
  <BaseModal 
    :is-open="true" 
    size="md"
    @close="$emit('cancel')"
    :hide-header="true"
  >
    <template #content>
      <div class="p-6 sm:p-8">
        <!-- Modal header -->
        <div class="flex flex-col items-center text-center mb-8">
          <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle class="h-8 w-8 text-red-600" aria-hidden="true" />
          </div>
          <h3 class="text-2xl font-black text-gray-900 tracking-tight">
            Delete Rule
          </h3>
          <p class="mt-2 text-sm text-gray-400 font-medium">
            This action is permanent and cannot be undone.
          </p>
        </div>
        
        <!-- Modal body: Rule Preview -->
        <div class="mb-8">
          <div class="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 mb-2 px-1">Rule Preview</div>
          <div class="p-4 rounded-2xl bg-gray-50 border-2 border-gray-100/50">
            <div class="flex items-center gap-2 mb-3">
              <component 
                :is="getRuleIcon(rule.rule[0])" 
                class="w-4 h-4 text-black"
              />
              <span class="text-xs font-black text-black uppercase tracking-widest">{{ rule.rule[0] }} Rule</span>
            </div>
            <div class="text-sm font-bold text-gray-700 leading-relaxed">
              <RuleSyntaxDisplay :rule="rule" />
            </div>
          </div>
        </div>
        
        <!-- Modal footer -->
        <div class="flex flex-col sm:flex-row-reverse gap-3 mt-8">
          <button 
            type="button" 
            class="flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all border-2 border-red-600 hover:translate-y-[-1px] active:translate-y-[0px] shadow-sm"
            @click="$emit('confirm')"
          >
            Delete Rule
          </button>
          <button 
            type="button" 
            class="flex-1 px-6 py-4 bg-white border-2 border-gray-100 text-gray-400 hover:text-black hover:border-black text-xs font-black uppercase tracking-widest rounded-xl transition-all hover:translate-y-[-1px] active:translate-y-[0px]"
            @click="$emit('cancel')"
          >
            Cancel
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { AlertTriangle, Filter, SortAsc, FolderCheck, Group } from 'lucide-vue-next';
import RuleSyntaxDisplay from './RuleSyntaxDisplay.vue';
import BaseModal from '@/shared/components/BaseModal.vue';

const props = defineProps({
  rule: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['cancel', 'confirm']);

// Map rule types to their icons
const ruleIcons = {
  'sort': SortAsc,
  'categorize': FolderCheck,
  'filter': Filter,
  'groupBy': Group
};

// Get the appropriate icon for a rule type
function getRuleIcon(ruleType) {
  return ruleIcons[ruleType] || Filter;
}
</script> 