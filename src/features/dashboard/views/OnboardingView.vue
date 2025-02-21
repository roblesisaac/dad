<template>
  <div class="container mx-auto max-w-2xl px-4 py-8">
    <ItemRepair
      :is-connecting="state.loading"
      :is-connected="state.onboardingStep !== 'connect'"
      :error="state.error"
      :sync-progress="state.syncProgress"
    />
  </div>
</template>

<script setup>
import { usePlaidIntegration } from '../composables/usePlaidIntegration';
import ItemRepair from '../components/ItemRepair.vue';

const { state } = usePlaidIntegration();
</script> 