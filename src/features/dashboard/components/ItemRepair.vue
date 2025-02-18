<template>
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
</template>

<script setup>
import { reactive } from 'vue';
import { useApi } from '@/shared/composables/useApi';

const api = useApi();

const itemState = reactive({
  syncedItems: [],
  isRepairing: false,
  error: null
});

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
      itemState.syncedItems = await syncItems();
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
    }
  }
}();

app.init();
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
</style>