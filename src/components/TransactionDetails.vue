<template>
  <div class="grid p20y">
    <!-- Transaction Details -->
    <div class="cell-1 proper">
      <p>
        <b>Category:</b>
        <br />{{ prettyCategory }}
      </p>
      <p>
        <b>Paid:</b>
        <br />{{ item.payment_channel }}
      </p>
      <p>
        <b>Status:</b> <span v-if="item.pending">Pending</span><span v-else>Settled</span>
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
        <div v-if="item.recategorizeAs !== transactionState.originalCategory" class="grid">
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
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useAppStore } from '../stores/state';

const { api } = useAppStore();

const { item, state } = defineProps({
  item: Object,
  state: Object
});

const transactionState = ref({
  originalCategory: item.recategorizeAs,
  changedCategory: false,
  typingTimer: null
});

function waitUntilTypingStops(ms=500) {
  return new Promise((resolve) => {
    clearTimeout(transactionState.typingTimer);
    transactionState.typingTimer = setTimeout(resolve, ms);
  });
}

console.log({
  item,
  rules: state.allUserRules.find((rule) => {
    const [firstItem] = item.rulesApplied || [];
    return rule._id === firstItem;
  })
});

const prettyCategory = computed(() => {
  const category = item.category || '';

  return category.split(',').join(', ');
});

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