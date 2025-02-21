<template>
  <div class="onboarding-container">
    <div v-if="!isSyncing && !isComplete" class="connect-bank-section">
      <h1>Connect Your Bank</h1>
      <p>Let's get started by connecting your bank account</p>
      
      <button 
        @click="startPlaidConnection"
        :disabled="isConnecting"
        class="primary-button"
      >
        {{ isConnecting ? 'Connecting...' : 'Connect Bank' }}
      </button>
      
      <p v-if="error" class="error-message">{{ error }}</p>
    </div>

    <div v-if="isSyncing" class="sync-status-section">
      <h2>Syncing Your Transactions</h2>
      <div class="progress-bar">
        <div 
          class="progress-fill"
          :style="{ width: `${syncProgress}%` }"
        ></div>
      </div>
      <p>{{ syncProgress }}% Complete</p>
    </div>

    <div v-if="isComplete" class="completion-section">
      <h2>Setup Complete!</h2>
      <p>Your transactions have been successfully imported</p>
      <button 
        @click="goToDashboard"
        class="primary-button"
      >
        Go to Dashboard
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlaidIntegration } from '../composables/usePlaidIntegration'
import { useSyncStatus } from '../composables/useSyncStatus'

const router = useRouter()
const { 
  initializePlaid, 
  handlePlaidSuccess, 
  isConnecting, 
  error 
} = usePlaidIntegration()

const {
  syncStatus,
  syncProgress,
  isSyncing,
  isComplete,
  startSync
} = useSyncStatus()

const startPlaidConnection = async () => {
  try {
    const linkToken = await initializePlaid()
    
    const plaidConfig = {
      token: linkToken,
      onSuccess: async (public_token, metadata) => {
        const { itemId } = await handlePlaidSuccess(public_token, metadata)
        await startSync(itemId)
      },
      onExit: () => {
        // Handle exit
      },
    }

    const handler = Plaid.create(plaidConfig)
    handler.open()
  } catch (err) {
    console.error('Plaid connection failed:', err)
  }
}

const goToDashboard = () => {
  router.push({ name: 'spending-report' })
}
</script>

<style scoped>
.onboarding-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s ease;
}

.error-message {
  color: #dc3545;
  margin-top: 1rem;
}

/* Add other necessary styles */
</style> 