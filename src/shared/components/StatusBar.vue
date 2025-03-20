<template>
  <div v-if="message" class="status-bar" :class="{ loading }">
    <div class="status-content">
      <LucideLoader v-if="loading" class="icon spinning" />
      <LucideCheckCircle v-else class="icon" />
      {{ message }}
    </div>
  </div>
</template>

<script setup>
import { LucideLoader, LucideCheckCircle } from 'lucide-vue-next';

defineProps({
  message: {
    type: String,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
});
</script>

<style scoped>
.status-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: var(--success);
  color: var(--on-success);
  padding: 0.75rem;
  text-align: center;
  z-index: 1000;
  transition: transform 0.3s ease;
  transform: translateY(0);
}

.status-bar.loading {
  background-color: var(--primary);
  color: var(--on-primary);
}

.status-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.icon {
  width: 1.2em;
  height: 1.2em;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 