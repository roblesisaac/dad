<template>
  <div class="grid p10l">
    <div class="cell-1">
      <p><b>Category:</b> {{ item.category }}</p>
      <p><b>Payment Channel:</b> {{ item.payment_channel }}</p>
      <p><b>Pending:</b> {{ item.pending ? 'Yes' : 'No' }}</p>
      <div v-if="item.logo_url">
        <img :src="item.logo_url" alt="Logo" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';

const { item } = defineProps({
  item: Object
});
</script>