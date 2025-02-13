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
const { waitUntilInitialized } = useAuth();

onMounted(async () => {
  try {
    await waitUntilInitialized();
    router.push('/spending-report');
  } catch (error) {
    console.error('Error in callback:', error);
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