<template>
  <div class="grid p20y">
    <!-- Transaction Details -->
    <div class="cell-1 proper">
      <p>
        <b v-if="item.amount<0">Paid With:</b>
        <b v-else>Debosited To:</b>
        <br />
        <span>{{ accountData.name }}</span> <span class="count bold">#{{ accountData.mask }}</span>
        <br v-if="accountName && accountName !== accountData.name" />
        <span v-if="accountName && accountName !== accountData.name">{{ accountName }}</span>
        <br />
        Current Balance: <span class="colorDarkGreen bold">{{ formatPrice(accountData.balances?.current) }}</span>
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
    <div class="cell-1">

      <!-- Add Note -->
      <div class="grid p20b">
        <div class="cell-1">
          <b>Add Note:</b>
        </div>
        <div class="cell-1">
          <textarea rows="3" class="add-note" v-model="item.notes"></textarea>
        </div>
      </div>

      <!-- Recategorize As -->
      <div class="grid">
        <div class="cell-1">
          <b>Recategorize<span v-if="item.recategorizeAs">d</span> As:</b>
        </div>
        <div class="cell-1">
          <input v-model="item.recategorizeAs" type="text" />
        </div>
        
        <!-- Apply-to options -->
        <Transition>
        <div v-if="item.recategorizeAs !== transactionDetailsState.originalCategory" class="grid">
          <div class="cell-1 p10t">
            <b>Apply New Category To:</b>
          </div>

          <div class="cell-1 p10l">
            <!-- This item only -->
            <div class="grid">
              <div class="cell shrink">
                <input type="radio" id="this-item-only" name="apply-to" value="this-item-only" checked>
              </div>
              <div class="cell auto p10l">
                <label for="this-item-only">This item only</label>
              </div>
            </div>

            <!-- Anything that matches -->
            <div class="grid">
              <div class="cell shrink">
                <input type="radio" id="anything-that-matches" name="apply-to" value="anything-that-matches">
              </div>
              <div class="cell auto p10l">
                <label for="anything-that-matches">Anything that matches</label>
              </div>
            </div>
          </div>
        </div>
        </Transition>

      </div>

    </div>

    <!-- Rules Applied -->
    <div class="cell-1" v-for="rule in rulesAppliedToItem" :key="rule._id">
      <EditRule :ruleConfig="rule" :state="state" :showReorder="false" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import EditRule from './EditRule.vue';
import { useAppStore } from '@/stores/state';
import { formatPrice } from '../../../utils';

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