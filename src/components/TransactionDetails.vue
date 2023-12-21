<template>
  <div class="grid">
    <!-- Transaction Details -->
    <div class="cell-1 proper">
      <p>
        <b>Category:</b>
        <br />{{ prettyCategory }}</p>
      <p>
        <b>Paid:</b> 
        <br />{{ item.payment_channel }}
      </p>
      <p>
        <b>Status</b> <span v-if="item.pending">Pending</span><span v-else>Settled</span>
      </p>
    </div>

    <!-- Transaction Controls -->
    <div class="cell-1">
      
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const { item } = defineProps({
  item: Object
});

const prettyCategory = computed(() => {
  const category = item.category || '';

  return category.split(',').join(', ');
});

</script>