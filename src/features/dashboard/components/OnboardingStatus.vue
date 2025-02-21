<template>
  <div class="onboarding-status">
    <div v-if="state.onboardingStep === 'syncing'" class="sync-status">
      <h3>Setting Up Your Account</h3>
      <p>We're syncing your transactions. This may take a few minutes...</p>
      
      <div class="progress-container">
        <div class="progress-stats">
          <div class="stat-item">
            <span class="stat-label">Added</span>
            <span class="stat-value">{{ state.syncProgress.added }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Modified</span>
            <span class="stat-value">{{ state.syncProgress.modified }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Removed</span>
            <span class="stat-value">{{ state.syncProgress.removed }}</span>
          </div>
        </div>

        <div class="status-indicator">
          <div class="status-badge" :class="state.syncProgress.status">
            {{ formatStatus(state.syncProgress.status) }}
          </div>
        </div>

        <div v-if="state.error" class="error-message">
          {{ state.error }}
        </div>
      </div>
    </div>

    <div v-else-if="state.onboardingStep === 'complete'" class="sync-complete">
      <h3>Setup Complete!</h3>
      <p>Successfully synced:</p>
      <div class="final-stats">
        <div class="stat-item">
          <span class="stat-label">Transactions Added</span>
          <span class="stat-value">{{ state.syncProgress.added }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Accounts Connected</span>
          <span class="stat-value">{{ state.syncedItems.length }}</span>
        </div>
      </div>
      <button 
        class="primary-button" 
        @click="goToSpendingReport"
        :disabled="redirecting"
      >
        {{ redirecting ? 'Redirecting...' : 'Go to Dashboard' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const redirecting = ref(false);

const props = defineProps({
  state: {
    type: Object,
    required: true
  }
});

const formatStatus = (status) => {
  const statusMap = {
    'queued': 'Queued',
    'syncing': 'Syncing',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'error': 'Error'
  };
  return statusMap[status] || status;
};

const goToSpendingReport = async () => {
  redirecting.value = true;
  await router.push('/spending-report');
};
</script>

<style scoped>
.onboarding-status {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.progress-container {
  background: var(--surface-variant);
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1.5rem;
}

.progress-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
}

.status-indicator {
  display: flex;
  justify-content: center;
  margin: 1rem 0;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 500;
  text-transform: capitalize;
}

.status-badge.queued {
  background: var(--surface);
  color: var(--text-primary);
}

.status-badge.syncing,
.status-badge.in_progress {
  background: var(--primary-container);
  color: var(--on-primary-container);
}

.status-badge.completed {
  background: var(--success-container);
  color: var(--on-success-container);
}

.status-badge.error {
  background: var(--error-container);
  color: var(--on-error-container);
}

.final-stats {
  display: grid;
  gap: 1rem;
  margin: 1.5rem 0;
}

.error-message {
  color: var(--error);
  margin-top: 1rem;
  text-align: center;
}

.primary-button {
  width: 100%;
  padding: 1rem;
  margin-top: 1.5rem;
  background: var(--primary);
  color: var(--on-primary);
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
</style> 