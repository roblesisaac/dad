<template>
  <div class="callback-view">
    <div class="loading">
      Loading...
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/shared/composables/useAuth';

const router = useRouter();
const { handleRedirectCallback, waitUntilInitialized } = useAuth();

onMounted(async () => {
  try {
    await waitUntilInitialized();
    
    // Try to handle callback but don't worry if it fails
    try {
      await handleRedirectCallback();
    } catch {
      // Ignore the error since authGuard will handle auth state
    }
    
    // Always redirect to spending report
    router.push('/spending-report');
  } catch (err) {
    // If something else goes wrong, just redirect
    router.push('/spending-report');
  }
});
</script>

<style scoped>
.callback-view {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.loading {
  font-size: 1.2rem;
  color: #666;
}
</style> 