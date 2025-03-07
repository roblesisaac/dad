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
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Applied Rules</h3>
      <div v-for="rule in rulesAppliedToItem" :key="rule._id">
        <RuleCard 
          :rule="rule" 
          :ruleType="getRuleType(rule)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import RuleCard from '@/features/rule-manager/components/RuleCard.vue';
import { useApi } from '@/shared/composables/useApi';
import { useUtils } from '@/shared/composables/useUtils';

const api = useApi();
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

// Helper function to determine rule type based on rule structure
function getRuleType(rule) {
  // Default colors and descriptions for different rule types
  const types = {
    filter: { id: 'filter', name: 'Filter Rules', color: 'blue', description: 'Controls which items are visible' },
    sort: { id: 'sort', name: 'Sort Rules', color: 'amber', description: 'Controls the order of items' },
    categorize: { id: 'categorize', name: 'Categorize Rules', color: 'emerald', description: 'Assigns categories to items' },
    groupBy: { id: 'groupBy', name: 'Group Rules', color: 'purple', description: 'Groups items by properties' }
  };
  
  // Determine rule type based on rule structure
  if (!rule.rule || !Array.isArray(rule.rule) || rule.rule.length < 1) {
    return types.filter; // Default fallback
  }
  
  const ruleType = rule.rule[0];
  return types[ruleType] || types.filter;
}

async function updateTransaction() {
  await waitUntilTypingStops();
  api.put(`transactions/${item._id}`, item);
}

watch(() => item.recategorizeAs, updateTransaction);
watch(() => item.notes, updateTransaction);

</script>