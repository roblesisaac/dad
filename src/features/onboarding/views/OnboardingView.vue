<template>
  <div class="onboarding-view">
    <!-- Onboarding Flow -->
    <div class="welcome-container">
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
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import OnboardingStatus from '../components/OnboardingStatus.vue';
import { usePlaidIntegration } from '../composables/usePlaidIntegration';
import { 
  LucideShieldCheck, 
  LucideLineChart, 
  LucideWallet,
  LucidePlus,
  LucideLoader,
  LucideAlertCircle
} from 'lucide-vue-next';

const router = useRouter();
const { 
  state, 
  initializePlaid, 
  connectBank, 
  checkSyncStatus 
} = usePlaidIntegration();

onMounted(async () => {
  try {
    await initializePlaid();
    
    // If user already has items and not in onboarding, redirect to dashboard
    if (state.hasItems && !state.isOnboarding) {
      router.push('/dashboard');
    }
  } catch (error) {
    console.error('Onboarding initialization error:', error);
  }
});

const handleRetry = async () => {
  state.error = null;
  await checkSyncStatus();
};
</script>

<style scoped>
.onboarding-view {
  max-width: 1200px;
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

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--error);
  margin-top: 1rem;
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