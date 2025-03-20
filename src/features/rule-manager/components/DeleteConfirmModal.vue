<template>
  <BaseModal 
    :is-open="true" 
    size="md"
    @close="$emit('cancel')"
    :hide-header="true"
  >
    <template #content>
      <div>
        <!-- Modal header -->
        <div class="px-4 py-5 border-b bg-red-50 border-red-100">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <AlertTriangle class="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <div class="ml-3">
              <h3 class="text-lg font-medium text-red-800">
                Delete Rule
              </h3>
            </div>
          </div>
        </div>
        
        <!-- Modal body -->
        <div class="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <div class="mt-2">
                <p class="text-sm text-gray-700">
                  Are you sure you want to delete this rule? This action cannot be undone.
                </p>
                
                <!-- Rule Preview -->
                <div class="mt-4 p-3 border border-gray-200 rounded-md bg-gray-50">
                  <div class="flex items-center mb-2">
                    <component 
                      :is="getRuleIcon(rule.rule[0])" 
                      class="w-4 h-4 mr-2 text-gray-500"
                    />
                    <span class="font-medium text-gray-700 capitalize">{{ rule.rule[0] }} Rule</span>
                  </div>
                  <div class="text-sm text-gray-600">
                    <RuleSyntaxDisplay :rule="rule" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Modal footer -->
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button 
            type="button" 
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            @click="$emit('confirm')"
          >
            Delete
          </button>
          <button 
            type="button" 
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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