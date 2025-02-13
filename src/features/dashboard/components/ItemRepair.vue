<template>
  <div class="space-y-4">
    <div v-if="itemState.syncedItems.length">
      <div 
        v-for="item in itemState.syncedItems" 
        :key="item.item_id" 
        class="p-5 border-b border-gray-200 hover:bg-gray-50"
      >
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <div class="font-mono text-sm text-gray-600">{{ item.institution_id }}</div>
            <div class="font-mono text-sm">{{ item.item_id }}</div>
          </div>
          
          <div>
            <button 
              v-if="item.error"
              @click="app.repairItem(item.item_id)" 
              class="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition-colors"
            >
              Repair
            </button>
            <button 
              v-else 
              @click="app.repairItem(item.item_id)" 
              class="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md transition-colors"
            >
              Reconnect
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import { useAppStore } from '@/stores/state';

const { api } = useAppStore();

const itemState = reactive({
  syncedItems: []
});

const app = {
  init: async () => {
    itemState.syncedItems = [...itemState.syncedItems, ...await syncItems()];
  },
  repairItem: async (itemId) => {
    const linkToken = await api.post(`api/plaid/connect/link/${itemId}`);
    createLink(linkToken).open();
  }
};

function createLink(token) {
  return Plaid.create({
    token,
    onSuccess: async (publicToken) => {
      console.log(publicToken);
    },
    onExit: (err, metadata) => {
      console.log('Link exit:', { err, metadata });
    },
  });
}

async function syncItems() {
  return await api.get('api/plaid/sync/items');
}

app.init();
</script>

<style scoped>
.reconnect {
  background: lightblue;
  color: #000;
}
.repair {
  background: lightcoral;
  color: #000;
}
.button {
  margin-bottom: 20px;
  box-shadow: 3px 3px #000;
  border: 1px solid #000;
  padding: 10px;
}
</style>