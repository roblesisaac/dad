<template>
  <div class="grid py-4">
    <!-- Transaction Details -->
    <div class="w-full text-sm space-y-2.5">
      <div>
        <div class="font-medium mb-0.5">
          {{ item.amount < 0 ? 'Paid With:' : 'Deposited To:' }}
        </div>
        <div>{{ accountData.name }} <span class="text-gray-600 font-medium">#{{ accountData.mask }}</span></div>
        <div v-if="accountName && accountName !== accountData.name">{{ accountName }}</div>
        <div class="mt-1">
          Current Balance: <span class="text-green-700 font-medium">{{ formatPrice(accountData.balances?.current) }}</span>
        </div>
      </div>
      <div>
        <span class="font-medium">Channel:</span> {{ item.payment_channel }}
      </div>
      <div>
        <span class="font-medium">Status:</span> <span v-if="item.pending">Pending</span><span v-else>Settled</span>
      </div>
      <div>
        <span class="font-medium">Category:</span> {{ prettyCategory }}
      </div>
    </div>

    <!-- Transaction Controls -->
    <div class="w-full mt-3">

      <!-- Add Note -->
      <div class="grid pb-4">
        <div class="w-full mb-1">
          <span class="font-medium text-sm">Add Note:</span>
        </div>
        <div class="w-full">
          <textarea rows="3" class="w-full border border-gray-300 rounded-sm px-2 py-1 text-sm" 
                   v-model="item.notes"></textarea>
        </div>
      </div>

      <!-- Recategorize As -->
      <div class="grid">
        <div class="w-full mb-1">
          <span class="font-medium text-sm">Recategorize<span v-if="item.recategorizeAs">d</span> As:</span>
        </div>
        <div class="w-full">
          <input v-model="item.recategorizeAs" type="text" 
                class="w-full border border-gray-300 rounded-sm px-2 py-1 text-sm" />
        </div>
        
        <!-- Apply-to options -->
        <Transition>
        <div v-if="item.recategorizeAs !== transactionDetailsState.originalCategory" class="grid">
          <div class="w-full pt-2.5">
            <b>Apply New Category To:</b>
          </div>

          <div class="w-full pl-2.5">
            <!-- This item only -->
            <div class="grid grid-cols-12">
              <div class="col-span-1">
                <input type="radio" id="this-item-only" name="apply-to" value="this-item-only" checked>
              </div>
              <div class="col-span-11 pl-2.5">
                <label for="this-item-only">This item only</label>
              </div>
            </div>

            <!-- Anything that matches -->
            <div class="grid grid-cols-12">
              <div class="col-span-1">
                <input type="radio" id="anything-that-matches" name="apply-to" value="anything-that-matches">
              </div>
              <div class="col-span-11 pl-2.5">
                <label for="anything-that-matches">Anything that matches</label>
              </div>
            </div>
          </div>
        </div>
        </Transition>

      </div>

    </div>

    <!-- Rules Applied -->
    <div class="w-full" v-for="rule in rulesAppliedToItem" :key="rule._id">
      <EditRule :ruleConfig="rule" :state="state" :showReorder="false" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import EditRule from '../../edit-tab/components/EditRule.vue';
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

async function updateTransaction() {
  await waitUntilTypingStops();
  api.put(`transactions/${item._id}`, item);
}

watch(() => item.recategorizeAs, updateTransaction);
watch(() => item.notes, updateTransaction);

</script>