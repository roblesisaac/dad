<template>
  <div class="grid">
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

      <!-- Recategorize As -->
      <div class="grid p20b">
        <div class="cell-1">
          <b>Recategorize As:</b>
        </div>
        <div class="cell-1">
          <input type="text" />
        </div>

        <div class="cell-1 p10t">
          <b>Apply To:</b>
        </div>
        <div class="cell-1">
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

      <!-- Add Note -->
      <div class="grid">
        <div class="cell-1">
          <b>Add Note:</b>
        </div>
        <div class="cell-1">
          <textarea rows="3" class="add-note"></textarea>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const { item } = defineProps({
  item: Object
});

console.log(item);

const prettyCategory = computed(() => {
  const category = item.category || '';

  return category.split(',').join(', ');
});

</script>

<style>
.add-note {
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 5px;
}
</style>