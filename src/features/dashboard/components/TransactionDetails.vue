<template>
  <div class="grid py-5">
    <!-- Transaction Details -->
    <div class="w-full">
      <p>
        <b v-if="item.amount<0">Paid With:</b>
        <b v-else>Debosited To:</b>
        <br />
        <span>{{ accountData.name }}</span> <span class="text-gray-600 font-bold">#{{ accountData.mask }}</span>
        <br v-if="accountName && accountName !== accountData.name" />
        <span v-if="accountName && accountName !== accountData.name">{{ accountName }}</span>
        <br />
        Current Balance: <span class="text-green-800 font-bold">{{ formatPrice(accountData.balances?.current) }}</span>
      </p>
      <p>
        <b>Channel:</b> {{ item.payment_channel }}
      </p>
      <p>
        <b>Status:</b> <span v-if="item.pending">Pending</span><span v-else>Settled</span>
      </p>
      <p>
        <b>Category:</b> {{ prettyCategory }}
      </p>
    </div>

    <!-- Transaction Controls -->
    <div class="w-full">

      <!-- Add Note -->
      <div class="grid pb-5">
        <div class="w-full">
          <b>Add Note:</b>
        </div>
        <div class="w-full">
          <textarea rows="3" class="w-full border border-gray-300 rounded" v-model="item.notes"></textarea>
        </div>
      </div>

      <!-- Recategorize As -->
      <div class="grid">
        <div class="w-full">
          <b>Recategorize<span v-if="item.recategorizeAs">d</span> As:</b>
        </div>
        <div class="w-full">
          <input v-model="item.recategorizeAs" type="text" class="w-full border border-gray-300 rounded" />
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
import { formatPrice } from '@/utils';
import { useApi } from '@/shared/composables/useApi';
import { useUtils } from '@/shared/composables/useUtils';

const api = useApi();
const { waitUntilTypingStops } = useUtils();
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