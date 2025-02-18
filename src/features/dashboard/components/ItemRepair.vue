<template>
  <div class="item-repair">
    <div v-if="!state.hasItems" class="welcome-container">
      <h2>Welcome to Your Financial Dashboard!</h2>
      <p>Let's get started by connecting your first bank account.</p>
      <div class="benefits">
        <ul>
          <li>✓ Securely connect your accounts</li>
          <li>✓ Track your spending</li>
          <li>✓ Manage your finances</li>
        </ul>
      </div>
      <button 
        class="primary-button"
        @click="connectBank"
        :disabled="state.loading"
      >
        {{ state.loading ? 'Connecting...' : 'Connect Your Bank' }}
      </button>
    </div>

    <div v-else class="repair-container">
      <div class="x-grid">
        <div class="cell-1 p20 text-center">
          <h2>Account Reconnection Required</h2>
          <p class="mb20">Some of your accounts need to be reconnected to continue syncing transactions.</p>
        </div>

        <div v-if="state.syncedItems.length" class="cell-1">
          <div v-for="item in state.syncedItems" :key="item.item_id" class="x-grid p20 dottedRow">
            <div class="cell auto proper bold left">
              <div class="institution-name">{{ item.institution_name || item.institution_id }}</div>
              <div class="error-message" v-if="item.error">
                {{ getErrorMessage(item.error) }}
              </div>
            </div>
            
            <div class="cell shrink">
              <button 
                @click="repairItem(item.item_id)" 
                :class="['button', item.error ? 'repair' : 'reconnect']"
                :disabled="state.isRepairing"
              >
                {{ item.error ? 'Repair Connection' : 'Reconnect' }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="state.error" class="cell-1 p20 error-message">
          {{ state.error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { usePlaidIntegration } from '../composables/usePlaidIntegration.js';

const {
  state,
  getErrorMessage,
  initializePlaid,
  repairItem,
  connectBank
} = usePlaidIntegration();

onMounted(async () => {
  await initializePlaid();
});
</script>

<style scoped>
.reconnect, .repair {
  min-width: 140px;
  margin-bottom: 20px;
  box-shadow: 3px 3px #000;
  border: 1px solid #000;
  padding: 10px;
  cursor: pointer;
}

.reconnect {
  background: lightblue;
  color: #000;
}

.repair {
  background: lightcoral;
  color: #000;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.institution-name {
  font-size: 1.1em;
  margin-bottom: 5px;
}

.error-message {
  color: #d32f2f;
  font-size: 0.9em;
  margin-top: 5px;
}

.mb20 {
  margin-bottom: 20px;
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
}

.primary-button {
  padding: 1rem 2rem;
  font-size: 1.2rem;
  background: black;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.primary-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>