<template>
  <div class="item-repair">
    <div v-if="!hasItems" class="welcome-container">
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
        :disabled="loading"
      >
        {{ loading ? 'Connecting...' : 'Connect Your Bank' }}
      </button>
    </div>

    <div v-else class="repair-container">
      <div class="x-grid">
        <div class="cell-1 p20 text-center">
          <h2>Account Reconnection Required</h2>
          <p class="mb20">Some of your accounts need to be reconnected to continue syncing transactions.</p>
        </div>

        <div v-if="itemState.syncedItems.length" class="cell-1">
          <div v-for="item in itemState.syncedItems" :key="item.item_id" class="x-grid p20 dottedRow">
            <div class="cell auto proper bold left">
              <div class="institution-name">{{ item.institution_name || item.institution_id }}</div>
              <div class="error-message" v-if="item.error">
                {{ getErrorMessage(item.error) }}
              </div>
            </div>
            
            <div class="cell shrink">
              <button 
                @click="app.repairItem(item.item_id)" 
                :class="['button', item.error ? 'repair' : 'reconnect']"
                :disabled="itemState.isRepairing"
              >
                {{ item.error ? 'Repair Connection' : 'Reconnect' }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="itemState.error" class="cell-1 p20 error-message">
          {{ itemState.error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, onMounted, toRefs } from 'vue';
import { useApi } from '@/shared/composables/useApi';

const api = useApi();

const itemState = reactive({
  syncedItems: [],
  isRepairing: false,
  error: null,
  hasItems: false
});

const { loading } = useApi();

function getErrorMessage(error) {
  const errorMessages = {
    'ITEM_LOGIN_REQUIRED': 'Your login information needs to be updated',
    'INVALID_CREDENTIALS': 'The provided credentials are no longer valid',
    'INVALID_MFA': 'Additional authentication required',
    // Add more error mappings as needed
    'DEFAULT': 'There was an issue connecting to this account'
  };

  return errorMessages[error] || errorMessages.DEFAULT;
}

const app = function() {
  function createLink(token) {
    return Plaid.create({
      token,
      onSuccess: async function(publicToken) {
        try {
          itemState.isRepairing = true;
          itemState.error = null;
          
          await api.post('plaid/exchange/token', {
            publicToken
          });
          
          // Refresh the items list
          itemState.syncedItems = await syncItems();
          
          // If no more errors, return to main view
          if (!itemState.syncedItems.some(item => item.error)) {
            state.views.pop();
          }
        } catch (error) {
          itemState.error = 'Failed to complete reconnection. Please try again.';
          console.error('Error completing repair:', error);
        } finally {
          itemState.isRepairing = false;
        }
      },
      onExit: function(err, metadata) {
        itemState.isRepairing = false;
        if (err) {
          itemState.error = 'Connection process was interrupted. Please try again.';
        }
        console.log('Link exit:', { err, metadata });
      },
    });
  }

  async function syncItems() {
    try {
      const response = await api.get('plaid/sync/items');
      return response;
    } catch (error) {
      itemState.error = 'Failed to fetch account status. Please refresh the page.';
      console.error('Sync error:', error);
      return [];
    }
  }

  return {
    init: async () => {
      try {
        const items = await api.get('plaid/items');
        itemState.syncedItems = items;
        itemState.hasItems = items?.length > 0;
      } catch (err) {
        console.error('Error fetching items:', err);
        itemState.hasItems = false;
      }
    },
    repairItem: async (itemId) => {
      try {
        itemState.isRepairing = true;
        itemState.error = null;
        
        const linkToken = await api.post(`plaid/connect/link/${itemId}`);
        const link = createLink(linkToken);
        link.open();
      } catch (error) {
        itemState.error = 'Failed to start reconnection process. Please try again.';
        itemState.isRepairing = false;
        console.error('Repair initiation error:', error);
      }
    },
    connectBank: async () => {
      try {
        itemState.isRepairing = true;
        itemState.error = null;
        
        const linkToken = await api.post('plaid/connect/link');
        const link = createLink(linkToken);
        link.open();
      } catch (error) {
        itemState.error = 'Failed to start connection process. Please try again.';
        itemState.isRepairing = false;
        console.error('Connection initiation error:', error);
      }
    }
  }
}();

onMounted(async () => {
  await app.init();
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
  background: var(--primary);
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