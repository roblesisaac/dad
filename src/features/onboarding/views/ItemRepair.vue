<template>
  <div class="item-repair">
    <!-- Onboarding Flow -->
    <div v-if="!state.hasItems" class="welcome-container">
      <h2>Welcome to Your Financial Dashboard!</h2>
      <p>Let's get started by connecting your first bank account.</p>
      
      <OnboardingStatus 
        v-if="['syncing', 'complete'].includes(state.onboardingStep)"
        :state="state"
        @retry="handleRetry"
      />

      <div v-else>
        <div class="benefits">
          <ul>
            <li>
              <LucideShieldCheck class="icon" />
              Securely connect your accounts
            </li>
            <li>
              <LucideLineChart class="icon" />
              Track your spending
            </li>
            <li>
              <LucideWallet class="icon" />
              Manage your finances
            </li>
          </ul>
        </div>
        
        <button 
          class="primary-button"
          @click="connectBank"
          :disabled="state.loading"
        >
          <LucidePlus v-if="!state.loading" class="icon" />
          <LucideLoader v-else class="icon spinning" />
          {{ state.loading ? 'Connecting...' : 'Connect Your Bank' }}
        </button>
      </div>

      <div v-if="state.error" class="error-message">
        <LucideAlertCircle class="icon" />
        {{ state.error }}
      </div>
    </div>

    <!-- Repair Flow -->
    <div v-else class="repair-container">
      <div class="x-grid">
        <div class="cell-1 p20 text-center">
          <h2>Account Reconnection Required</h2>
          <p class="mb20">Some of your accounts need to be reconnected to continue syncing transactions.</p>
        </div>

        <div v-if="state.syncedItems.length" class="cell-1">
          <div 
            v-for="item in state.syncedItems" 
            :key="item.item_id" 
            class="item-row"
            :class="{ 'has-error': item.error }"
          >
            <div class="institution-info">
              <div class="institution-name">
                {{ item.institution_name || item.institution_id }}
              </div>
              <div v-if="item.error" class="error-message">
                <LucideAlertCircle class="icon" />
                {{ getErrorMessage(item.error) }}
              </div>
              <div v-else class="sync-status">
                <LucideCheckCircle2 class="icon" />
                Connected
              </div>
            </div>
            
            <div class="action-buttons">
              <button 
                @click="repairItem(item.item_id)" 
                :class="['button', item.error ? 'repair' : 'reconnect']"
                :disabled="state.isRepairing"
              >
                <LucideRefreshCw v-if="!state.isRepairing" class="icon" />
                <LucideLoader v-else class="icon spinning" />
                {{ item.error ? 'Repair Connection' : 'Reconnect' }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="state.error" class="cell-1 p20 error-message">
          <LucideAlertCircle class="icon" />
          {{ state.error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { usePlaidIntegration } from '../composables/usePlaidIntegration.js';
import OnboardingStatus from '../components/OnboardingStatus.vue';
import { 
  LucideShieldCheck, 
  LucideLineChart, 
  LucideWallet,
  LucidePlus,
  LucideLoader,
  LucideAlertCircle,
  LucideCheckCircle2,
  LucideRefreshCw
} from 'lucide-vue-next';

const {
  state,
  getErrorMessage,
  initializePlaid,
  repairItem,
  connectBank,
  checkSyncStatus
} = usePlaidIntegration();

onMounted(async () => {
  await initializePlaid();
});

const handleRetry = async () => {
  state.error = null;
  await checkSyncStatus();
};
</script>

<style scoped>
.item-repair {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.welcome-container {
  text-align: center;
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.benefits {
  margin: 2rem 0;
  text-align: left;
}

.benefits ul {
  list-style: none;
  padding: 0;
}

.benefits li {
  margin: 1rem 0;
  font-size: 1.1rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.primary-button {
  padding: 1rem 2rem;
  font-size: 1.2rem;
  background: var(--primary);
  color: var(--on-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
}

.primary-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.primary-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
  transition: background-color 0.2s;
}

.item-row:hover {
  background-color: var(--surface-variant);
}

.item-row.has-error {
  background-color: var(--error-container);
}

.institution-info {
  flex: 1;
}

.institution-name {
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--success);
  font-size: 0.9rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--error);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
}

.button {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.button.repair {
  background: var(--error);
  color: var(--on-error);
  border: none;
}

.button.reconnect {
  background: var(--primary);
  color: var(--on-primary);
  border: none;
}

.button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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