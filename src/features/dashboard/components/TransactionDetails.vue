<template>
  <div class="p-6 space-y-6 bg-gray-50">
    <!-- Transaction Details -->
    <div class="space-y-4">
      <!-- Account Info -->
      <div>
        <div class="font-medium mb-1">
          {{ item.amount < 0 ? 'Paid With:' : 'Deposited To:' }}
        </div>
        <div class="space-y-1">
          <div>{{ accountData.name }} 
            <span class="text-blue-600 font-medium">#{{ accountData.mask }}</span>
          </div>
          <div v-if="accountName && accountName !== accountData.name">
            {{ accountName }}
          </div>
          <div>
            Current Balance: 
            <span class="text-green-600 font-medium">
              {{ formatPrice(accountData.balances?.current) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Transaction Info -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="font-medium mb-1">Channel:</div>
          <div class="capitalize">{{ item.payment_channel }}</div>
        </div>
        <div>
          <div class="font-medium mb-1">Status:</div>
          <div>{{ item.pending ? 'Pending' : 'Settled' }}</div>
        </div>
        <div class="col-span-2">
          <div class="font-medium mb-1">Category:</div>
          <div class="capitalize">{{ prettyCategory }}</div>
        </div>
      </div>
    </div>

    <!-- Transaction Controls -->
    <div class="space-y-4">
      <!-- Notes -->
      <div>
        <label class="font-medium block mb-1">Add Note:</label>
        <textarea 
          v-model="item.notes"
          rows="3" 
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        ></textarea>
      </div>

      <!-- Recategorize -->
      <div>
        <label class="font-medium block mb-1">
          Recategorize{{ item.recategorizeAs ? 'd' : '' }} As:
        </label>
        <input 
          v-model="item.recategorizeAs" 
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
        />
        
        <!-- Apply-to options -->
        <Transition>
          <div v-if="item.recategorizeAs !== transactionDetailsState.originalCategory" class="mt-4">
            <div class="font-medium mb-2">Apply New Category To:</div>

            <div class="space-y-2 pl-4">
              <!-- This item only -->
              <label class="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="this-item-only" 
                  name="apply-to" 
                  value="this-item-only" 
                  checked
                  class="text-blue-600 focus:ring-blue-500"
                >
                <span>This item only</span>
              </label>

              <!-- Anything that matches -->
              <label class="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="anything-that-matches" 
                  name="apply-to" 
                  value="anything-that-matches"
                  class="text-blue-600 focus:ring-blue-500"
                >
                <span>Anything that matches</span>
              </label>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Applied Rules -->
    <div v-for="rule in rulesAppliedToItem" :key="rule._id">
      <EditRule 
        :ruleConfig="rule" 
        :state="state" 
        :showReorder="false" 
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import EditRule from '../../edit-tab/components/EditRule.vue';
import { useAppStore } from '@/stores/state';
import { formatPrice } from '@/utils';

const { api } = useAppStore();

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

function waitUntilTypingStops(ms=500) {
  return new Promise((resolve) => {
    clearTimeout(transactionDetailsState.typingTimer);
    transactionDetailsState.typingTimer = setTimeout(resolve, ms);
  });
}

async function updateTransaction() {
  await waitUntilTypingStops();
  api.put(`api/transactions/${item._id}`, item);
}

watch(() => item.recategorizeAs, updateTransaction);
watch(() => item.notes, updateTransaction);

</script>

<style>
.add-note {
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 5px;
}
</style>