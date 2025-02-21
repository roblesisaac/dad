<template>
  <div class="onboarding-view">
    <ItemRepair />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import ItemRepair from '../../onboarding/components/ItemRepair.vue';
import { usePlaidIntegration } from '../composables/usePlaidIntegration';

const router = useRouter();
const { state, initializePlaid } = usePlaidIntegration();

onMounted(async () => {
  try {
    await initializePlaid();
    
    // If user already has items, redirect to spending report
    if (state.hasItems && !state.isOnboarding) {
      router.push('/dashboard');
    }
  } catch (error) {
    console.error('Onboarding initialization error:', error);
  }
});
</script>

<style scoped>
.onboarding-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
</style> 